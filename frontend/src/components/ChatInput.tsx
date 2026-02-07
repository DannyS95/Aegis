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
    <form onSubmit={handleSubmit} className="border-t p-3 space-y-2">
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
      <div className="flex space-x-2">
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
      </div>
    </form>
  );
}
