"use client";
import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

const INACTIVITY_MS = 15 * 60 * 1000; // 15 minutes
const SESSION_KEY = "labora_session_active";

export function AutoLogout() {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const logout = useCallback(async (reason: "inactivity" | "session_end") => {
    sessionStorage.removeItem(SESSION_KEY);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(`/login?reason=${reason}`);
  }, [router]);

  const resetTimer = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      logout("inactivity");
    }, INACTIVITY_MS);
  }, [logout]);

  useEffect(() => {
    // Force login if no active session flag (browser was closed/reopened)
    const isActive = sessionStorage.getItem(SESSION_KEY);
    if (!isActive) {
      // No session flag — log out immediately
      fetch("/api/auth/logout", { method: "POST" }).finally(() => {
        router.push("/login?reason=session_end");
      });
      return;
    }

    // Set up inactivity detection
    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      if (timer.current) clearTimeout(timer.current);
    };
  }, [resetTimer, router, logout]);

  return null;
}
