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
        <div className="composer-reply flex items-start justify-between rounded-xl px-3 py-2 text-sm">
          <div className="max-w-xs pr-3">
            <div className="text-xs font-semibold uppercase tracking-wide">
              Replying to {replyingTo.sender}
            </div>
            <div className="truncate text-sm">{replyingTo.text}</div>
          </div>
          {onCancelReply && (
            <button
              type="button"
              onClick={onCancelReply}
              className="text-xs font-medium hover:underline"
            >
              Cancel
            </button>
          )}
        </div>
      )}
      <div className="composer-shell flex items-center gap-2 rounded-2xl p-2">
        <button
          type="button"
          className="composer-emoji h-11 w-11 rounded-2xl text-lg"
          aria-label="Attach file"
        >
          ↑
        </button>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          className="composer-input flex-1 rounded-xl px-4 py-2.5 text-[1.08rem] outline-none"
        />
        <button
          type="submit"
          className="composer-send h-11 min-w-[3rem] rounded-xl px-4 text-xl font-bold transition"
        >
          ▸
        </button>
      </div>
    </form>
  );
}
