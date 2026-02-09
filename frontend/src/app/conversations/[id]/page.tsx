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

const REACTION_OPTIONS = ["👍", "❤️", "😂"] as const;

type ReplyTarget = {
  id: string;
  sender: string;
  text: string;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <path
        d="M6.5 9.5a5.5 5.5 0 1111 0v3.4l1.5 2.1v1H5v-1l1.5-2.1V9.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M9.5 18a2.5 2.5 0 005 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5.5 18.5a6.5 6.5 0 0113 0"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
      <circle cx="6" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
    </svg>
  );
}

type UiMessage = Message & {
  replyTo?: ReplyTarget | null;
};

function applyOptimisticReactionToggle(
  messages: UiMessage[],
  messageId: string,
  emoji: string,
): UiMessage[] {
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
  const [messages, setMessages] = useState<UiMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const hasLoadedOnceRef = useRef(false);

  useRequireAuthRedirect(user, authLoading);

  useEffect(() => {
    if (authLoading || !user || !convoId) {
      return;
    }

    const load = async () => {
      try {
        setError(null);
        const isInitialLoad = !hasLoadedOnceRef.current;
        setLoading(isInitialLoad);
        setRefreshing(!isInitialLoad);
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
            replyTo: null,
          })),
        );
        hasLoadedOnceRef.current = true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load conversation.",
        );
        setSidebarConversations([]);
        setMessages([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    load();
  }, [authLoading, convoId, user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto" });
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
      const pendingReply = replyingTo;
      const created = await sendMessage(convoId, text.trim());
      setMessages((prev) =>
        prev
          ? [
              ...prev,
              {
                ...created,
                reactions: created.reactions ?? [],
                replyTo: pendingReply,
              },
            ]
          : [
              {
                ...created,
                reactions: created.reactions ?? [],
                replyTo: pendingReply,
              },
            ],
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
    <div className="chat-app-bg min-h-screen p-3 md:p-6">
      <div className="chat-shell mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-[96rem] overflow-hidden rounded-[2.2rem] md:h-[calc(100vh-3rem)]">
        <ConversationsSidebar
          conversations={sidebarConversations}
          loading={sidebarConversations === null}
          activeConversationId={typeof convoId === "string" ? convoId : undefined}
          onLogout={() => {
            void logout().then(() => router.replace("/login"));
          }}
        />

        <section className="chat-main flex min-w-0 flex-1 flex-col">
          <header className="chat-header flex items-center justify-between px-4 py-4 md:px-7">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/conversations")}
                className="chat-icon-btn rounded-xl px-2.5 py-1.5 md:hidden"
              >
                ←
              </button>
              <div className="msg-avatar flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold">
                {(conversation?.title || "C").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="chat-title text-xl font-bold tracking-tight md:text-2xl">
                  {conversation?.title || "Conversation"}
                </div>
                <div className="chat-subtitle text-base">
                  {conversation?.participants.length || 0} Online
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="button" className="chat-icon-btn rounded-xl p-2" aria-label="Notifications">
                <BellIcon />
              </button>
              <button type="button" className="chat-icon-btn rounded-xl p-2" aria-label="Search">
                <SearchIcon />
              </button>
              <button type="button" className="chat-icon-btn rounded-xl p-2" aria-label="Profile settings">
                <UserIcon />
              </button>
              <button type="button" className="chat-icon-btn rounded-xl p-2" aria-label="More options">
                <MoreIcon />
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-hidden px-2 py-3 md:px-3 md:py-3.5">
            {loading && messages === null ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 animate-pulse rounded-2xl border border-white/10 bg-[#242d3f]" />
                ))}
              </div>
            ) : error ? (
              <div className="chat-alert-error rounded-xl p-3">
                {error}
              </div>
            ) : orderedMessages.length === 0 ? (
              <div className="chat-empty-state flex h-full items-center justify-center rounded-[1.85rem]">
                No messages yet.
              </div>
            ) : (
              <div className="chat-timeline h-full space-y-2 overflow-y-auto p-2.5 md:p-3">
                {refreshing && (
                  <div className="text-muted px-1 pb-1 text-xs">Updating conversation…</div>
                )}
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
                      replyTo={m.replyTo ?? undefined}
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
                <div ref={bottomRef} />
              </div>
            )}
          </main>

          <div className="chat-footer px-3 py-3 md:px-4">
            {sendError && (
              <div className="chat-alert-error mb-2 rounded-lg px-4 py-2 text-sm">
                {sendError}
              </div>
            )}
            <ChatInput
              onSend={handleSend}
              replyingTo={replyingTo}
              onCancelReply={() => setReplyingTo(null)}
            />
            {sending && (
              <div className="text-muted px-1 pt-2 text-xs">Sending…</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
