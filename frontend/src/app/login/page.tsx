"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

type TokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

type CurrentUserResponse = {
  id: string;
  username: string;
  email: string;
  avatarUrl?: string | null;
};

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { setAuthState } = useUser();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!identifier.trim()) {
      setError("Enter a username or email to continue.");
      return;
    }

    setLoading(true); 
    setError(null);

    try {
      const loginResponse = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          identifier.includes("@")
            ? { email: identifier.trim().toLowerCase() }
            : { username: identifier.trim(), password: password || undefined },
        ),
      });

      if (!loginResponse.ok) {
        throw new Error("Invalid credentials");
      }

      const token: TokenResponse = await loginResponse.json();

      const meResponse = await fetch(`${API_BASE_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token.accessToken}`,
        },
      });

      if (!meResponse.ok) {
        throw new Error("Unable to load user profile");
      }

      const currentUser: CurrentUserResponse = await meResponse.json();

      setAuthState(
        {
          id: currentUser.id,
          username: currentUser.username,
          email: currentUser.email,
          avatarUrl: currentUser.avatarUrl,
        },
        token.accessToken,
      );

      router.push("/conversations");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to log in right now.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl bg-gray-900/80 p-8 backdrop-blur shadow-xl border border-gray-800"
      >
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
          <p className="text-sm text-gray-400">
            Access the conversations workspace with your seeded account.
          </p>
        </div>
        <input
          type="text"
          placeholder="Username or email"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-950/70 px-3 py-2 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          autoComplete="username"
        />
        <input
          type="password"
          placeholder="Password (optional for dev seed users)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-lg border border-gray-700 bg-gray-950/70 px-3 py-2 text-gray-100 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          autoComplete="current-password"
        />
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white shadow-sm shadow-blue-900/50 transition hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:cursor-not-allowed disabled:bg-blue-800/60"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
        <p className="text-xs text-gray-500 text-center">
          Try one of the seeded users: <span className="text-gray-300">alice</span>,{" "}
          <span className="text-gray-300">bob</span>, or <span className="text-gray-300">charlie</span>.
        </p>
      </form>
    </div>
  );
}
