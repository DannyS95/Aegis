"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import { useRequireAuthRedirect } from "@/hooks/useRequireAuthRedirect";
import ConversationsSidebar from "@/components/ConversationsSidebar";
import {
  type Conversation,
  getConversations,
} from "@/clients/conversationsClient";

export default function ConversationsListPage() {
  const router = useRouter();
  const { user, loading, logout } = useUser();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useRequireAuthRedirect(user, loading);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!user) {
      return;
    }

    const load = async () => {
      try {
        setError(null);
        const result = await getConversations();
        setConversations(result.items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load conversations.",
        );
        setConversations([]);
      }
    };

    load();
  }, [loading, user]);

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  if (loading || !user) {
    return (
      <div className="chat-app-bg text-muted flex min-h-screen items-center justify-center">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="chat-app-bg min-h-screen p-3 md:p-6">
      <div className="chat-shell mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-[96rem] overflow-hidden rounded-[2.2rem] md:h-[calc(100vh-3rem)]">
        <ConversationsSidebar
          conversations={conversations}
          loading={conversations === null}
          onLogout={() => void handleLogout()}
        />

        <section className="chat-main flex min-w-0 flex-1 flex-col">
          <header className="chat-header px-5 py-5 md:px-7">
            <h1 className="chat-title text-xl font-bold tracking-tight md:text-2xl">
              Conversations
            </h1>
            <p className="chat-subtitle text-base">
              Pick a conversation from the menu and start chatting.
            </p>
          </header>

          <main className="flex-1 overflow-y-auto p-3 md:p-4">
            {conversations === null ? (
              <ul className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <li
                    key={i}
                    className="chat-loading-card rounded-2xl p-4"
                  >
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-500/40" />
                    <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-500/25" />
                  </li>
                ))}
              </ul>
            ) : error ? (
              <div className="chat-alert-error rounded-xl p-3">
                {error}
              </div>
            ) : conversations.length === 0 ? (
              <div className="chat-empty-state flex h-full items-center justify-center rounded-[1.65rem]">
                No conversations yet.
              </div>
            ) : (
              <div className="chat-empty-state flex h-full items-center justify-center rounded-[1.65rem]">
                Select a conversation from the left sidebar.
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}
