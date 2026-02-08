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
      <div className="flex min-h-screen items-center justify-center bg-[#edf2f9] text-slate-600">
        Redirecting to login…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8fbff_0%,_#eef3fa_50%,_#e8edf7_100%)] p-3 md:p-6">
      <div className="mx-auto flex h-[calc(100vh-1.5rem)] max-w-7xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_60px_rgba(15,58,122,0.18)] md:h-[calc(100vh-3rem)]">
        <ConversationsSidebar
          conversations={conversations}
          loading={conversations === null}
          onLogout={() => void handleLogout()}
        />

        <section className="flex min-w-0 flex-1 flex-col bg-[#f4f7fc]">
          <header className="border-b border-slate-200/80 bg-white px-5 py-4 md:px-7">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Conversations
            </h1>
            <p className="text-sm text-slate-500">
              Pick a conversation from the menu and start chatting.
            </p>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {conversations === null ? (
              <ul className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <li
                    key={i}
                    className="rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
                    <div className="mt-2 h-3 w-28 animate-pulse rounded bg-slate-100" />
                  </li>
                ))}
              </ul>
            ) : error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
                {error}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 text-slate-500">
                No conversations yet.
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/conversations/${conversation.id}`)}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#2a6fda] hover:shadow-md"
                    >
                      <div className="line-clamp-1 text-base font-bold text-[#1d4ca7]">
                        {conversation.title || "Untitled conversation"}
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        {conversation.isGroup ? "Group" : "Direct"} •{" "}
                        {conversation.participants.length} participant
                        {conversation.participants.length === 1 ? "" : "s"}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </main>
        </section>
      </div>
    </div>
  );
}
