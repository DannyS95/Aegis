import { apiFetch } from "@/clients/httpClient";

export type ConversationParticipant = {
  user: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  role: string;
  joinedAt: string;
  lastReadAt: string | null;
  muted: boolean;
  banned: boolean;
};

export type Conversation = {
  id: string;
  title: string | null;
  isGroup: boolean;
  lastMessageId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: ConversationParticipant[];
};

export type ConversationListResponse = {
  items: Conversation[];
  nextCursor: string | null;
};

export type Message = {
  id: string;
  content: string;
  senderId: string;
  conversationId: string;
  createdAt: string;
  readAt: string | null;
  reactions: MessageReaction[];
};

export type MessageReaction = {
  emoji: string;
  count: number;
  reactedByCurrentUser: boolean;
};

export type MessageListResponse = {
  items: Message[];
  nextCursor: string | null;
};

export type ToggleReactionResponse = {
  action: "added" | "removed";
  messageId: string;
  emoji: string;
  reactions: MessageReaction[];
};

export async function getConversations(): Promise<ConversationListResponse> {
  return apiFetch<ConversationListResponse>("/conversations", {
    method: "GET",
  });
}

export async function getConversation(conversationId: string): Promise<Conversation> {
  return apiFetch<Conversation>(`/conversations/${encodeURIComponent(conversationId)}`, {
    method: "GET",
  });
}

export async function getMessages(conversationId: string): Promise<MessageListResponse> {
  return apiFetch<MessageListResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "GET",
    },
  );
}

export async function sendMessage(conversationId: string, content: string): Promise<Message> {
  return apiFetch<Message>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
): Promise<ToggleReactionResponse> {
  return apiFetch<ToggleReactionResponse>(
    `/messages/${encodeURIComponent(messageId)}/reactions`,
    {
      method: "POST",
      body: JSON.stringify({ emoji }),
    },
  );
}
