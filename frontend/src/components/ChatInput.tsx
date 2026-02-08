"use client";

import React, { useState } from "react";

type ReplyPreview = {
  id: string;
  sender: string;
  text: string;
};

type ChatInputProps = {
  onSend: (message: string) => void;
  replyingTo?: ReplyPreview | null;
  onCancelReply?: () => void;
};

export default function ChatInput({
  onSend,
  replyingTo = null,
  onCancelReply,
}: ChatInputProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSend(input.trim());
    setInput("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      {replyingTo && (
        <div className="flex items-start justify-between rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
          <div className="max-w-xs pr-3">
            <div className="text-xs font-semibold text-blue-600">
              Replying to {replyingTo.sender}
            </div>
            <div className="truncate text-sm text-gray-700">
              {replyingTo.text}
            </div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-2.5 py-1.5 text-lg text-slate-500"
        >
          😊
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-slate-700 outline-none focus:border-[#2b70db]"
        />
        <button
          type="submit"
          className="rounded-xl bg-[#2b70db] px-5 py-2 font-bold text-white shadow-sm transition hover:bg-[#205fc2]"
        >
          Send
        </button>
      </div>
    </form>
  );
}
