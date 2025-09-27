"use client";

import { useState } from "react";
import Link from "next/link";

type Conversation = {
  id: number;
  name: string;
  lastMessage: string;
  unread: number;
};

const mockConversations: Conversation[] = [
  { id: 1, name: "Alice", lastMessage: "See you tomorrow!", unread: 2 },
  { id: 2, name: "Project Team", lastMessage: "Deploy done ✅", unread: 0 },
  { id: 3, name: "Bob", lastMessage: "Thanks man", unread: 5 },
];

export default function ConversationsPage() {
  const [conversations] = useState(mockConversations);

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Conversations</h1>
      <ul className="space-y-2">
        {conversations.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50"
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
    </div>
  );
}
