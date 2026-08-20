"use client";

import { useEffect, useRef, useState } from "react";
import { appConfig } from "@/config/app";
import { LockScreen } from "@/components/LockScreen";

const LAST_ACTIVE_KEY = "kanakku:last-active";
const ACTIVITY_EVENTS = ["click", "keydown", "touchstart", "mousemove"] as const;

function isPastTimeout(): boolean {
  const raw = window.localStorage.getItem(LAST_ACTIVE_KEY);
  // No record yet means a fresh session (e.g. right after login) -- that's not a stale session
  // to lock, it's the absence of one. Only an actual elapsed gap since a real last-active
  // timestamp counts as inactivity.
  if (raw === null) return false;
  return Date.now() - Number(raw) > appConfig.lockTimeoutMs;
}

function recordActivity() {
  window.localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

/**
 * Re-locks the app after a period of inactivity -- including "closed the tab and came back"
 * (last-active is in localStorage, not just in-memory, so it survives a full reload). Renders
 * nothing until the very first check resolves rather than showing children and then locking, so
 * there's never a flash of financial data before the lock screen — fail closed, not fail open.
 */
export function ActivityLock({ email, children }: { email: string | null; children: React.ReactNode }) {
  const [status, setStatus] = useState<"checking" | "locked" | "unlocked">("checking");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function armTimer() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setStatus("locked"), appConfig.lockTimeoutMs);
    }

    function handleActivity() {
      setStatus((current) => {
        if (current === "locked") return current; // typing the unlock password shouldn't reset via stray events
        recordActivity();
        return "unlocked";
      });
      armTimer();
    }

    function handleVisibility() {
      if (document.visibilityState !== "visible") return;
      if (isPastTimeout()) {
        setStatus("locked");
      } else {
        recordActivity();
        setStatus("unlocked");
        armTimer();
      }
    }

    // Initial check on mount (covers "closed the tab and came back").
    handleVisibility();

    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, handleActivity, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity);
      document.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (status === "checking") {
    return <div className="fixed inset-0 z-[100] bg-paper" aria-hidden="true" />;
  }

  if (status === "locked") {
    return (
      <LockScreen
        email={email}
        onUnlock={() => {
          recordActivity();
          setStatus("unlocked");
        }}
      />
    );
  }

  return <>{children}</>;
}
