"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Conversation } from "@/clients/conversationsClient";

type ConversationsSidebarProps = {
  conversations: Conversation[] | null;
  activeConversationId?: string;
  loading?: boolean;
  onLogout?: () => void;
};

export default function ConversationsSidebar({
  conversations,
  activeConversationId,
  loading = false,
  onLogout,
}: ConversationsSidebarProps) {
  const [query, setQuery] = useState("");

  const filteredConversations = useMemo(() => {
    const items = conversations ?? [];
    const search = query.trim().toLowerCase();

    if (!search) {
      return items;
    }

    return items.filter((conversation) =>
      (conversation.title || "Untitled conversation")
        .toLowerCase()
        .includes(search),
    );
  }, [conversations, query]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-gradient-to-b from-[#0f4eb8] via-[#2165ce] to-[#2f7ae4] text-white md:flex">
      <div className="border-b border-white/15 px-5 py-4">
        <div className="flex items-center gap-3 text-3xl">
          <span aria-hidden="true">🛡️</span>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">Aegis</div>
            <div className="text-xs text-blue-100/90">Conversations</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <label htmlFor="conversation-search" className="sr-only">
          Search conversations
        </label>
        <input
          id="conversation-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="w-full rounded-xl border border-white/20 bg-white/90 px-3 py-2 text-sm text-slate-800 outline-none ring-0 placeholder:text-slate-500 focus:border-white"
        />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3">
        {loading ? (
          <div className="space-y-2 px-2 pt-1">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-11 animate-pulse rounded-xl bg-white/20"
              />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-blue-50">
            No conversations found.
          </div>
        ) : (
          <ul className="space-y-1">
            {filteredConversations.map((conversation) => {
              const label = conversation.title || "Untitled conversation";
              const active = conversation.id === activeConversationId;

              return (
                <li key={conversation.id}>
                  <Link
                    href={`/conversations/${conversation.id}`}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 transition ${
                      active
                        ? "bg-white/20 text-white"
                        : "text-blue-50 hover:bg-white/12"
                    }`}
                  >
                    <span className="truncate text-sm font-semibold">{label}</span>
                    {active ? (
                      <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide">
                        Live
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-white/15 px-4 py-3">
        <div className="mb-2 flex items-center gap-2 text-xl text-blue-100">
          <button type="button" className="rounded-lg bg-white/10 px-2 py-1">
            ⚙️
          </button>
          <button type="button" className="rounded-lg bg-white/10 px-2 py-1">
            🔔
          </button>
          <button type="button" className="rounded-lg bg-white/10 px-2 py-1">
            💬
          </button>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
