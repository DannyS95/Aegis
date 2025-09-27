import React from "react";

type MessageBubbleProps = {
  text: string;
  sender: string;
  currentUser: string;
  type?: "user" | "system";
  timestamp?: string;
  status?: "sent" | "delivered" | "read";
};

export default function MessageBubble({
  text,
  sender,
  currentUser,
  type = "user",
  timestamp,
  status,
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
      className={`flex items-end space-x-2 ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      {!isCurrentUser && (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-sm font-semibold text-gray-700">
          {initial}
        </div>
      )}
      <div className="flex flex-col">
        <div
          className={`max-w-xs rounded-lg px-3 py-2 ${
            isCurrentUser
              ? "bg-blue-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {text}
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
