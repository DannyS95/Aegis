import React from "react";

type ReplyPreview = {
  id: string;
  sender: string;
  text: string;
};

type MessageBubbleProps = {
  text: string;
  sender: string;
  avatarUrl?: string | null;
  currentUser: string;
  type?: "user" | "system";
  timestamp?: string;
  status?: "sent" | "delivered" | "read";
  replyTo?: ReplyPreview;
  onReply?: () => void;
  onDelete?: () => void;
  isReplyTarget?: boolean;
  reactions?: MessageReaction[];
  reactionOptions?: readonly string[];
  onToggleReaction?: (emoji: string) => void;
  reactionsDisabled?: boolean;
};

type MessageReaction = {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
};

export default function MessageBubble({
  text,
  sender,
  avatarUrl = null,
  currentUser,
  type = "user",
  timestamp,
  status,
  replyTo,
  onReply,
  onDelete,
  isReplyTarget = false,
  reactions = [],
  reactionOptions = [],
  onToggleReaction,
  reactionsDisabled = false,
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

  const bubbleClasses = `max-w-xl rounded-2xl border px-4 py-3 shadow-sm ${
    isCurrentUser
      ? "border-blue-200 bg-blue-50/70 text-slate-900"
      : "border-slate-200 bg-white text-slate-900"
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

  const renderReactionButton = (emoji: string) => {
    const reaction = reactions.find((item) => item.emoji === emoji);
    const reactedByCurrentUser = reaction?.reactedByCurrentUser ?? false;
    const count = reaction?.count ?? 0;

    return (
      <button
        key={emoji}
        type="button"
        onClick={() => onToggleReaction?.(emoji)}
        disabled={reactionsDisabled || !onToggleReaction}
        className={`rounded-full border px-2 py-0.5 text-xs transition ${
          reactedByCurrentUser
            ? "border-blue-400 bg-blue-50 text-blue-700"
            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {emoji} {count > 0 ? count : ""}
      </button>
    );
  };

  return (
    <div
      className={`group relative flex items-start space-x-2 ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      <div className="mt-1">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={sender}
            className="h-9 w-9 rounded-full border border-slate-300 object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-300 text-sm font-semibold text-slate-700">
            {initial}
          </div>
        )}
      </div>
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
          <div className={bubbleClasses}>
            <div className="mb-1 flex items-center gap-2">
              <span className="text-lg font-bold text-[#1f63c9]">{sender}</span>
              {timestamp ? (
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {timestamp}
                </span>
              ) : null}
            </div>
            <div className="text-[1.35rem] leading-snug text-slate-800">{text}</div>
          </div>
          {showActions && (
            <div
              className={`absolute -top-8 flex space-x-1 rounded bg-white/90 px-2 py-1 text-xs text-gray-600 shadow transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
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
        {reactionOptions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {reactionOptions.map((emoji) => renderReactionButton(emoji))}
          </div>
        )}
        {isCurrentUser && status && (
          <span
            className={`mt-1 text-xs ${
              status === "read" ? "font-semibold text-blue-500" : "text-slate-400"
            }`}
          >
            {getStatusSymbol()}
          </span>
        )}
      </div>
    </div>
  );
}
