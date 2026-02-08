"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MessageBubble from "@/components/MessageBubble";
import { useUser } from "@/context/UserContext";
import ChatInput from "@/components/ChatInput";
import { useRequireAuthRedirect } from "@/hooks/useRequireAuthRedirect";
import ConversationsSidebar from "@/components/ConversationsSidebar";
import {
  type Conversation,
  type Message,
  type MessageReaction,
  getConversations,
  getConversation,
  getMessages,
  sendMessage,
  toggleReaction,
} from "@/clients/conversationsClient";

const REACTION_OPTIONS = ["👍", "❤️", "😂", "🎉", "😮", "👀"] as const;

type ReplyTarget = {
  id: string;
  sender: string;
  text: string;
};

function applyOptimisticReactionToggle(
  messages: Message[],
  messageId: string,
  emoji: string,
): Message[] {
  return messages.map((message) => {
    if (message.id !== messageId) {
      return message;
    }

    const existing = message.reactions.find((reaction) => reaction.emoji === emoji);
    let nextReactions: MessageReaction[];

    if (!existing) {
      nextReactions = [...message.reactions, { emoji, count: 1, reactedByCurrentUser: true }];
    } else if (existing.reactedByCurrentUser) {
      nextReactions =
        existing.count <= 1
          ? message.reactions.filter((reaction) => reaction.emoji !== emoji)
          : message.reactions.map((reaction) =>
              reaction.emoji === emoji
                ? {
                    ...reaction,
                    count: reaction.count - 1,
                    reactedByCurrentUser: false,
                  }
                : reaction,
            );
    } else {
      nextReactions = message.reactions.map((reaction) =>
        reaction.emoji === emoji
          ? {
              ...reaction,
              count: reaction.count + 1,
              reactedByCurrentUser: true,
            }
          : reaction,
      );
    }

    return {
      ...message,
      reactions: nextReactions.sort((a, b) => a.emoji.localeCompare(b.emoji)),
    };
  });
}

export default function ChatWindowPage() {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [sidebarConversations, setSidebarConversations] = useState<Conversation[] | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [reactingMessageIds, setReactingMessageIds] = useState<string[]>([]);
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);
  const { user, loading: authLoading, logout } = useUser();

  const params = useParams();
  const router = useRouter();
  const convoId =
    typeof params?.id === "string"
      ? params.id
      : Array.isArray(params?.id)
        ? params.id[0]
        : undefined;

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useRequireAuthRedirect(user, authLoading);

  useEffect(() => {
    if (authLoading || !user || !convoId) {
      return;
    }

    const load = async () => {
      try {
        setError(null);
        setLoading(true);
        const [conversationResponse, messagesResponse, sidebarResponse] = await Promise.all([
          getConversation(convoId),
          getMessages(convoId),
          getConversations(),
        ]);

        setConversation(conversationResponse);
        setSidebarConversations(sidebarResponse.items);
        setMessages(
          messagesResponse.items.map((message) => ({
            ...message,
            reactions: message.reactions ?? [],
          })),
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load conversation.",
        );
        setSidebarConversations([]);
        setMessages([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [authLoading, convoId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const resolveSender = (senderId: string) => {
    const participant = conversation?.participants.find(
      (p) => p.user.id === senderId,
    );
    return {
      name: participant?.user.username || participant?.user.email || senderId,
      avatarUrl: participant?.user.avatarUrl ?? null,
    };
  };

  const currentUserLabel = user ? resolveSender(user.id).name : "";

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
    if (!text.trim() || !user || !convoId) return;

    try {
      setSendError(null);
      setSending(true);
      const created = await sendMessage(convoId, text.trim());
      setMessages((prev) =>
        prev
          ? [...prev, { ...created, reactions: created.reactions ?? [] }]
          : [{ ...created, reactions: created.reactions ?? [] }],
      );
      setReplyingTo(null);
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Unable to send message.",
      );
    } finally {
      setSending(false);
    }
  };

  const handleToggleReaction = async (messageId: string, emoji: string) => {
    if (!user || !messages) {
      return;
    }

    const previousMessages = messages;
    setSendError(null);
    setMessages((prev) =>
      prev ? applyOptimisticReactionToggle(prev, messageId, emoji) : prev,
    );
    setReactingMessageIds((prev) =>
      prev.includes(messageId) ? prev : [...prev, messageId],
    );

    try {
      const result = await toggleReaction(messageId, emoji);
      setMessages((prev) =>
        prev
          ? prev.map((message) =>
              message.id === messageId
                ? { ...message, reactions: result.reactions }
                : message,
            )
          : prev,
      );
    } catch (err) {
      setMessages(previousMessages);
      setSendError(
        err instanceof Error ? err.message : "Unable to update reaction.",
      );
    } finally {
      setReactingMessageIds((prev) =>
        prev.filter((currentId) => currentId !== messageId),
      );
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#eef3fa_50%,_#e8edf7_100%)] p-3 md:p-6">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_60px_rgba(15,58,122,0.18)] md:h-[calc(100vh-3rem)]">
        <ConversationsSidebar
          conversations={sidebarConversations}
          loading={sidebarConversations === null}
          activeConversationId={typeof convoId === "string" ? convoId : undefined}
          onLogout={() => {
            void logout().then(() => router.replace("/login"));
          }}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-[#f4f7fc]">
          <header className="flex items-center justify-between border-b border-slate-200/80 bg-white px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/conversations")}
                className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-slate-600 md:hidden"
              >
                ←
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2b70db] text-lg font-bold text-white">
                {(conversation?.title || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900">
                  {conversation?.title || "Conversation"}
                </div>
                <div className="text-sm text-slate-500">
                  {conversation?.participants.length || 0} members online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <button type="button" className="rounded-xl border border-slate-200 px-2 py-1.5">
                🔔
              </button>
              <button type="button" className="rounded-xl border border-slate-200 px-2 py-1.5">
                💬
              </button>
            </div>
          </header>

          <main className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ))}
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                {error}
              </div>
            ) : orderedMessages.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-500">
                No messages yet.
              </div>
            ) : (
              <>
                {orderedMessages.map((m) => {
                  const sender = resolveSender(m.senderId);
                  return (
                    <MessageBubble
                      key={m.id}
                      text={m.content}
                      sender={sender.name}
                      avatarUrl={sender.avatarUrl}
                      currentUser={currentUserLabel}
                      timestamp={formatTimestamp(m.createdAt)}
                      onReply={() => {
                        setReplyingTo({
                          id: m.id,
                          sender: sender.name,
                          text: m.content,
                        });
                      }}
                      isReplyTarget={replyingTo?.id === m.id}
                      reactions={m.reactions}
                      reactionOptions={REACTION_OPTIONS}
                      reactionsDisabled={reactingMessageIds.includes(m.id)}
                      onToggleReaction={(emoji) => void handleToggleReaction(m.id, emoji)}
                    />
                  );
                })}
              </>
            )}
            <div ref={bottomRef} />
          </main>

          <div className="border-t border-slate-200 bg-white/90 px-3 py-3 md:px-5">
            {sendError && (
              <div className="mb-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
                {sendError}
              </div>
            )}
            <ChatInput
              onSend={handleSend}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
            {sending && (
              <div className="px-1 pt-2 text-xs text-slate-500">Sending…</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
