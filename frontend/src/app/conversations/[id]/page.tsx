"use client";

import { useState, useRef, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import MessageBubble from "@/components/MessageBubble";
import { useUser } from "@/context/UserContext";

type Message = {
  id: number;
  sender: string;
  text: string;
  type?: "user" | "system";
  timestamp?: string;
  status?: "sent" | "delivered" | "read";
};

export default function ChatWindowPage() {
  const [messages, setMessages] = useState<Message[] | null>(null); // null = loading
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const { user } = useUser();

  const params = useParams();
  const router = useRouter();
  const convoId = params?.id;

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // simulate loading messages
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        { id: 1, sender: "system", text: "Alice joined the chat", type: "system" },
        { id: 2, sender: "Alice", text: "Hey, are we still on for tomorrow?", timestamp: "10:30 AM" },
        { id: 3, sender: "Danny", text: "Yep! 10am at the café.", timestamp: "10:31 AM", status: "read" },
      ]);
    }, 500); // shorter delay for more natural UX
    return () => clearTimeout(timer);
  }, []);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const newMessage: Message = {
      id: Date.now(),
      sender: user.name,
      text: input,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      status: "sent",
    };

    setMessages((prev) => (prev ? [...prev, newMessage] : [newMessage]));
    setInput("");

    // simulate server delivery after 1s
    setTimeout(() => {
      setMessages((prev) =>
        prev?.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "delivered" } : msg
        ) || []
      );
    }, 1000);

    // simulate recipient read after 3s
    setTimeout(() => {
      setMessages((prev) =>
        prev?.map((msg) =>
          msg.id === newMessage.id ? { ...msg, status: "read" } : msg
        ) || []
      );
    }, 3000);

    // simulate Alice typing a reply
    setTyping(true);
    setTimeout(() => {
      setTyping(false);
      const reply: Message = {
        id: Date.now(),
        sender: "Alice",
        text: "Sounds good 👍",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => (prev ? [...prev, reply] : [reply]));
    }, 4000);
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
        <span className="font-semibold">Conversation {convoId}</span>
        <div />
      </header>

      <main className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages === null ? (
          // loading skeleton
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
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No messages yet. Say hello 👋
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                text={m.text}
                sender={m.sender}
                currentUser={user?.name || ""}
                type={m.type}
                timestamp={m.timestamp}
                status={m.status}
              />
            ))}

            {typing && (
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.2s]"></div>
                <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400 [animation-delay:0.4s]"></div>
                <span>Alice is typing…</span>
              </div>
            )}
          </>
        )}
        <div ref={bottomRef} />
      </main>

      <form
        onSubmit={handleSend}
        className="flex border-t p-3 space-x-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Send
        </button>
      </form>
    </div>
  );
}
