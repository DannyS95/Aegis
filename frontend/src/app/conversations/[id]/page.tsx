"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MessageBubble from "@/components/MessageBubble";
import { useUser } from "@/context/UserContext";
import ChatInput from "@/components/ChatInput";
import {
  type Conversation,
  type Message,
  getConversation,
  getMessages,
  sendMessage,
} from "@/lib/conversationsApi";

export default function ChatWindowPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const { user, token } = useUser();

  const params = useParams();
  const router = useRouter();
  const convoId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : undefined;

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!user || !token) {
      router.replace("/login");
    }
  }, [router, token, user]);

  useEffect(() => {
    if (!user || !token || !convoId) {
      return;
    }

    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const [conversationResponse, messagesResponse] = await Promise.all([
          getConversation(token, convoId),
          getMessages(token, convoId),
        ]);

        setConversation(conversationResponse);
        setMessages(messagesResponse.items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load conversation.",
        );
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [convoId, token, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resolveSenderName = (senderId: string) => {
    const participant = conversation?.participants.find(
      (p) => p.user.id === senderId,
    );
    return (
      participant?.user.username ||
      participant?.user.email ||
      senderId
    );
  };

  const currentUserLabel = user ? resolveSenderName(user.id) : "";

  const formatTimestamp = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const orderedMessages =
    messages?.slice().sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    ) ?? [];

  const handleSend = async (text: string) => {
    if (!text.trim() || !user || !token || !convoId) return;

    try {
      setSendError(null);
      setSending(true);
      const created = await sendMessage(token, convoId, text.trim());
      setMessages((prev) => (prev ? [...prev, created] : [created]));
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <header className="flex items-center justify-between border-b p-4">
        <button
          onClick={() => router.push("/conversations")}
          className="flex items-center space-x-1 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
        >
          <span>←</span>
          <span>Back</span>
        </button>
        <span className="font-semibold">
          {conversation?.title || "Conversation"}
        </span>
        <div />
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto p-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex space-x-2">
                <div className="h-8 w-8 rounded-full bg-gray-300 animate-pulse" />
                <div className="flex flex-col space-y-2">
                  <div className="h-4 w-32 rounded bg-gray-300 animate-pulse" />
                  <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700">
            {error}
          </div>
        ) : orderedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No messages yet. Say hello 👋
          </div>
        ) : (
          <>
            {orderedMessages.map((m) => (
              <MessageBubble
                key={m.id}
                text={m.content}
                sender={resolveSenderName(m.senderId)}
                currentUser={currentUserLabel}
                timestamp={formatTimestamp(m.createdAt)}
              />
            ))}
          </>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="border-t">
        {sendError && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {sendError}
          </div>
        )}
        <ChatInput onSend={handleSend} replyingTo={null} onCancelReply={() => null} />
        {sending && (
          <div className="px-4 pb-2 text-xs text-gray-500">Sending…</div>
        )}
      </div>

    </div>
  );
}
