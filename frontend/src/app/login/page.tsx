"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/context/UserContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { login, user, loading: userLoading } = useUser();

  useEffect(() => {
    if (!userLoading && user) {
      router.replace("/conversations");
    }
  }, [router, user, userLoading]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim()) {
      setError("Enter a username to continue.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await login({
        username: username.trim(),
        password: password || undefined,
      });

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
          placeholder="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
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
