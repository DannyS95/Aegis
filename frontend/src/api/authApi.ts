import { apiFetch } from "@/api/apiClient";

export type CurrentUserResponse = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
};

export type LoginRequest = {
  username?: string;
  email?: string;
  password?: string;
};

export async function login(request: LoginRequest): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/login", {
    method: "POST",
    body: JSON.stringify(request),
  });
}

export async function logout(): Promise<{ ok: true }> {
  return apiFetch<{ ok: true }>("/auth/logout", {
    method: "POST",
  });
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  return apiFetch<CurrentUserResponse>("/users/me", {
    method: "GET",
  });
}
