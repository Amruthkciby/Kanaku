"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getQueue, flushQueue } from "@/lib/offline-queue";

export function OfflineQueueIndicator() {
  const router = useRouter();
  // Starts at 0 to match the server-rendered markup (localStorage doesn't exist there) and is
  // corrected right after mount below -- an intentional one-time hydration-safe read of
  // browser-only storage, not the "effect mirrors state" pattern react-hooks/set-state-in-effect
  // is meant to catch.
  const [count, setCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    function handleChange() {
      setCount(getQueue().length);
    }

    handleChange();

    async function handleOnline() {
      if (getQueue().length === 0) return;
      setSyncing(true);
      await flushQueue();
      setSyncing(false);
      setCount(getQueue().length);
      router.refresh();
    }

    window.addEventListener("kanakku:queue-changed", handleChange);
    window.addEventListener("online", handleOnline);

    if (navigator.onLine && getQueue().length > 0) handleOnline();

    return () => {
      window.removeEventListener("kanakku:queue-changed", handleChange);
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (count === 0 && !syncing) return null;

  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 bg-brass px-3 py-1.5 text-xs font-medium text-paper-raised sm:left-56 lg:left-64"
    >
      {syncing ? (
        <>Syncing {count} saved offline…</>
      ) : (
        <>
          {count} {count === 1 ? "entry" : "entries"} saved offline — will sync when you&apos;re back online.
        </>
      )}
    </div>
  );
}
