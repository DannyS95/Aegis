import React from "react";

type ReplyPreview = {
  id: number;
  sender: string;
  text: string;
};

type MessageBubbleProps = {
  text: string;
  sender: string;
  currentUser: string;
  type?: "user" | "system";
  timestamp?: string;
  status?: "sent" | "delivered" | "read";
  replyTo?: ReplyPreview;
  onReply?: () => void;
  onDelete?: () => void;
  isReplyTarget?: boolean;
};

export default function MessageBubble({
  text,
  sender,
  currentUser,
  type = "user",
  timestamp,
  status,
  replyTo,
  onReply,
  onDelete,
  isReplyTarget = false,
}: MessageBubbleProps) {
  if (type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          {text}
        </span>
      </div>
    );
  }

  const isCurrentUser = sender === currentUser;
  const initial = sender.charAt(0).toUpperCase();
  const showActions = Boolean(onReply || onDelete);

  const bubbleClasses = `max-w-xs rounded-lg px-3 py-2 ${
    isCurrentUser
      ? "bg-blue-600 text-white"
      : "bg-gray-200 text-gray-800"
  } ${
    isReplyTarget ? "ring-2 ring-blue-400 ring-offset-2 ring-offset-white" : ""
  }`;

  const replyPreviewClasses = `mb-2 rounded border-l-4 px-3 py-2 text-xs ${
    isCurrentUser
      ? "border-blue-300 bg-blue-500/20 text-white"
      : "border-gray-300 bg-gray-100 text-gray-700"
  }`;

  const getStatusSymbol = () => {
    switch (status) {
      case "sent":
        return "✓";
      case "delivered":
        return "✓✓";
      case "read":
        return "✓✓";
      default:
        return "";
    }
  };

  return (
    <div
      className={`group relative flex items-end space-x-2 ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isCurrentUser && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700">
          {initial}
        </div>
      )}
      <div
        className={`flex flex-col ${
          isCurrentUser ? "items-end" : "items-start"
        }`}
      >
        <div className="relative">
          {replyTo && (
            <div className={replyPreviewClasses}>
              <div className="font-semibold">{replyTo.sender}</div>
              <div className="truncate">{replyTo.text}</div>
            </div>
          )}
          <div className={bubbleClasses}>{text}</div>
          {showActions && (
            <div
              className={`absolute -top-8 flex space-x-1 rounded bg-white/90 px-2 py-1 text-xs text-gray-600 shadow transition-opacity duration-150 opacity-0 group-hover:opacity-100 ${
                isCurrentUser ? "right-0" : "left-0"
              }`}
            >
              {onReply && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onReply();
                  }}
                  className="rounded px-2 py-0.5 font-medium hover:bg-gray-100"
                >
                  Reply
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete();
                  }}
                  className="rounded px-2 py-0.5 font-medium text-red-500 hover:bg-red-50"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        {timestamp && (
          <div className="mt-1 flex items-center space-x-1 text-xs text-gray-400">
            <span>{timestamp}</span>
            {isCurrentUser && status && (
              <span
                className={
                  status === "read" ? "text-blue-500 font-medium" : ""
                }
              >
                {getStatusSymbol()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
