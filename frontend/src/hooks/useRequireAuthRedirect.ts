"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/context/UserContext";

export function useRequireAuthRedirect(
  user: User | null,
  loading: boolean,
  redirectTo = "/login",
): void {
  const router = useRouter();

  useEffect(() => {
    if (loading || user) {
      return;
    }

    router.replace(redirectTo);
  }, [loading, redirectTo, router, user]);
}
