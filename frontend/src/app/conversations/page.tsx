"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";
import {
  type Conversation,
  getConversations,
} from "@/lib/conversationsApi";

export default function ConversationsListPage() {
  const router = useRouter();
  const { user, token } = useUser();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !token) {
      router.replace("/login");
      return;
    }

    const load = async () => {
      try {
        setError(null);
        const result = await getConversations(token);
        setConversations(result.items);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Unable to load conversations.",
        );
        setConversations([]);
      }
    };

    load();
  }, [router, token, user]);

  return (
    <div className="mx-auto max-w-md p-4">
      <h1 className="mb-4 text-2xl font-bold">Conversations</h1>

      {!user || !token ? (
        <div className="text-gray-600">Redirecting to login…</div>
      ) : conversations === null ? (
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
      ) : error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
          {error}
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-lg border border-dashed text-gray-500">
          No conversations yet. Start a new chat 👋
        </div>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li
              key={conversation.id}
              className="flex items-center justify-between rounded-lg border p-3 hover:bg-gray-50 cursor-pointer"
            >
              <Link href={`/conversations/${conversation.id}`} className="flex-1">
                <div className="font-medium">
                  {conversation.title || "Untitled conversation"}
                </div>
                <div className="text-sm text-gray-500">
                  {conversation.isGroup ? "Group" : "Direct"} •{" "}
                  {conversation.participants.length} participant
                  {conversation.participants.length === 1 ? "" : "s"}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
