const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type AuthenticatedFetchInit = RequestInit & {
  headers?: HeadersInit;
};

async function authFetch<T>(
  path: string,
  token: string,
  init: AuthenticatedFetchInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${token}`);

  if (init.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with status ${response.status}`);
  }

  return response.json();
}

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
};

export type MessageListResponse = {
  items: Message[];
  nextCursor: string | null;
};

export async function getConversations(
  token: string,
): Promise<ConversationListResponse> {
  return authFetch<ConversationListResponse>("/conversations", token, {
    method: "GET",
  });
}

export async function getConversation(
  token: string,
  conversationId: string,
): Promise<Conversation> {
  return authFetch<Conversation>(
    `/conversations/${encodeURIComponent(conversationId)}`,
    token,
    { method: "GET" },
  );
}

export async function getMessages(
  token: string,
  conversationId: string,
): Promise<MessageListResponse> {
  return authFetch<MessageListResponse>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    token,
    { method: "GET" },
  );
}

export async function sendMessage(
  token: string,
  conversationId: string,
  content: string,
): Promise<Message> {
  return authFetch<Message>(
    `/conversations/${encodeURIComponent(conversationId)}/messages`,
    token,
    {
      method: "POST",
      body: JSON.stringify({ content }),
    },
  );
}
