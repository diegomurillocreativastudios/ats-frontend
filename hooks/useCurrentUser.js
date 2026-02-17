"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";

/**
 * Returns the currently logged-in user (from /api/auth/me or ats_user cookie).
 * @returns {{ user: { id, name, email, role? } | null, loading: boolean }}
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          return;
        }
        const fromCookie = getCurrentUser();
        if (fromCookie) setUser(fromCookie);
      } catch {
        if (!cancelled) {
          const fromCookie = getCurrentUser();
          if (fromCookie) setUser(fromCookie);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, []);

  return { user, loading };
};
