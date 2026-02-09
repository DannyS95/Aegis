"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Conversation } from "@/clients/conversationsClient";

type ConversationsSidebarProps = {
  conversations: Conversation[] | null;
  activeConversationId?: string;
  loading?: boolean;
  onLogout?: () => void;
};

function resolveSidebarTitle(conversation: Conversation): string {
  return conversation.title || "Untitled conversation";
}

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
      resolveSidebarTitle(conversation).toLowerCase().includes(search),
    );
  }, [conversations, query]);

  return (
    <aside className="chat-sidebar hidden w-[18.25rem] shrink-0 flex-col md:flex">
      <div className="chat-sidebar-brand px-4 py-4">
        <div className="chat-brand-chip flex items-center gap-3.5 rounded-xl px-3 py-3">
          <Image
            src="/branding/aegis-logo.png"
            alt="Aegis logo"
            width={72}
            height={72}
            className="chat-brand-logo h-[4.1rem] w-[4.1rem] object-contain"
          />
          <span className="chat-brand-word font-bold tracking-tight">Aegis</span>
        </div>
      </div>

      <div className="px-3.5 pt-1">
        <label htmlFor="conversation-search" className="sr-only">
          Search conversations
        </label>
        <input
          id="conversation-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search..."
          className="chat-search-input w-full rounded-lg px-3 py-2 text-[1.06rem] outline-none"
        />
      </div>

      <nav className="mt-4 flex-1 overflow-y-auto px-3 py-3">
        <div className="chat-section-title mb-2 px-2 pb-1">Channels</div>
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="chat-loading-card h-10 animate-pulse rounded-lg" />
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="chat-list-empty rounded-lg p-3 text-sm">
            No conversations found.
          </div>
        ) : (
          <ul className="space-y-4">
            {filteredConversations.slice(0, 5).map((conversation) => {
              const label = resolveSidebarTitle(conversation);
              const active = conversation.id === activeConversationId;

              return (
                <li key={conversation.id}>
                  <Link
                    href={`/conversations/${conversation.id}`}
                    className={`chat-convo-row flex items-center justify-between gap-2 rounded-xl px-5 py-3.5 ${
                      active ? "chat-convo-row-active" : ""
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="chat-convo-row-title truncate font-medium">
                        {label}
                      </div>
                      <div className="chat-convo-row-subtitle mt-1 truncate">
                        {conversation.lastMessagePreview?.trim() || "No messages yet"}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="chat-sidebar-divider my-4" />
        <div className="chat-section-title px-2 pb-1">Projects</div>
        <ul className="space-y-1">
          <li className="chat-meta-row rounded-lg px-3 py-2 text-[0.95rem]">Project Alpha</li>
        </ul>
      </nav>

      <div className="chat-sidebar-footer px-3.5 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="chat-settings-btn rounded-xl px-4.5 py-2.5 text-[1.12rem]"
          >
            Settings
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="chat-logout-btn rounded-lg px-4.5 py-2.5 text-base font-semibold"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
