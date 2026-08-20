"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/config/app";

export function LockScreen({ email, onUnlock }: { email: string | null; onUnlock: () => void }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setPending(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setPending(false);
    if (signInError) {
      setError("That password isn't right.");
      return;
    }
    setPassword("");
    onUnlock();
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-ink">{appConfig.appName}</h1>
          <p className="mt-1 text-sm text-slate">Locked after inactivity — enter your password to continue.</p>
        </div>

        <form onSubmit={handleUnlock} className="rounded-2xl border border-border bg-paper-raised p-6 shadow-sm">
          <label htmlFor="lock-password" className="mb-1.5 block text-sm font-medium text-ink">
            {email ?? "Password"}
          </label>
          <input
            id="lock-password"
            type="password"
            autoFocus
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full min-h-11 rounded-lg border border-border bg-paper px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
          />

          {error && (
            <p role="alert" className="mt-2 text-sm text-maroon">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-4 min-h-11 w-full rounded-lg bg-brass px-4 font-medium text-paper-raised disabled:opacity-60"
          >
            {pending ? "Checking…" : "Unlock"}
          </button>

          <button
            type="button"
            onClick={handleSignOut}
            className="mt-3 min-h-11 w-full text-sm text-slate hover:text-ink"
          >
            Not you? Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
