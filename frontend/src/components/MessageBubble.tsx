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
      <div className="my-2 flex justify-center">
        <span className="msg-system rounded px-2 py-1 text-xs">{text}</span>
      </div>
    );
  }

  const isCurrentUser = sender === currentUser;
  const initial = sender.charAt(0).toUpperCase();
  const showActions = Boolean(onReply || onDelete);

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
        className={`msg-reaction rounded-full px-2 py-0.5 text-xs transition ${
          reactedByCurrentUser ? "msg-reaction-active" : ""
        } disabled:cursor-not-allowed disabled:opacity-60`}
      >
        {emoji} {count > 0 ? count : ""}
      </button>
    );
  };

  return (
    <div
      className={`group relative flex w-full items-center gap-2.5 ${
        isCurrentUser ? "justify-end" : "justify-start"
      }`}
    >
      <div className={isCurrentUser ? "order-1" : ""}>
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={sender}
            className="msg-avatar rounded-xl object-cover"
          />
        ) : (
          <div className="msg-avatar flex items-center justify-center rounded-xl text-sm font-semibold">
            {initial}
          </div>
        )}
      </div>
      <div
        className={`flex flex-col ${
          isCurrentUser ? "items-end" : "items-start"
        } ${isCurrentUser ? "order-2" : ""}`}
      >
        <div className="relative">
          {replyTo && (
            <div className="msg-reply-preview mb-2 rounded px-3 py-2 text-xs">
              <div className="font-semibold">{replyTo.sender}</div>
              <div className="truncate">{replyTo.text}</div>
            </div>
          )}
          <div
            className={`msg-bubble max-w-[42rem] px-3.5 py-2.5 ${
              isCurrentUser ? "msg-bubble-self" : ""
            } ${isReplyTarget ? "msg-bubble-target" : ""}`}
          >
            <div className="mb-0.5 flex items-center gap-2">
              <span className="msg-sender font-bold">{sender}</span>
              {timestamp ? (
                <span className="msg-time text-xs font-bold">{timestamp}</span>
              ) : null}
            </div>
            <div className="msg-text">{text}</div>
          </div>
          {showActions && (
            <div
              className={`msg-actions absolute -top-8 flex space-x-1 rounded px-2 py-1 text-xs transition-opacity duration-150 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${
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
                  className="rounded px-2 py-0.5 font-medium"
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
                  className="rounded px-2 py-0.5 font-medium text-red-300 hover:bg-red-500/20"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
        {reactionOptions.length > 0 && (
          <div className="msg-reactions mt-2 flex flex-wrap items-center gap-1.5">
            {reactionOptions.map((emoji) => renderReactionButton(emoji))}
          </div>
        )}
        {isCurrentUser && status && (
          <span className="text-muted mt-1 text-xs">
            {getStatusSymbol()}
          </span>
        )}
      </div>
    </div>
  );
}
