"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Conversation = {
  id: number;
  name: string;
  lastMessage: string;
  unread: number;
};

export default function ConversationsListPage() {
  const [conversations, setConversations] = useState<Conversation[] | null>(null);

  // simulate fetch
  useEffect(() => {
    const timer = setTimeout(() => {
      setConversations([
        { id: 1, name: "Alice", lastMessage: "See you tomorrow!", unread: 2 },
        { id: 2, name: "Project Team", lastMessage: "Deploy done ✅", unread: 0 },
        { id: 3, name: "Bob", lastMessage: "Thanks man", unread: 5 },
      ]);
    }, 500); // short delay for skeleton
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Conversations</h1>

      {conversations === null ? (
        // skeleton loader
        <ul className="space-y-3">
          {[1, 2, 3].map((i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex flex-col space-y-2">
                <div className="h-4 w-32 rounded bg-gray-300 animate-pulse" />
                <div className="h-3 w-20 rounded bg-gray-200 animate-pulse" />
              </div>
              <div className="h-5 w-5 rounded-full bg-gray-300 animate-pulse" />
            </li>
          ))}
        </ul>
      ) : conversations.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-gray-500">
          No conversations yet. Start a new chat 👋
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
            >
              <Link href={`/conversations/${c.id}`} className="flex-1">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-500">{c.lastMessage}</div>
              </Link>
              {c.unread > 0 && (
                <span className="ml-2 rounded-full bg-blue-600 px-2 py-1 text-xs text-white">
                  {c.unread}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
