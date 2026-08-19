"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { appConfig } from "@/config/app";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [ready, setReady] = useState(!code);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!code) return;

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
      if (exchangeError) {
        setError("This reset link has expired. Request a new one from the login page.");
      }
      setReady(true);
    });
  }, [code]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setPending(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-ink">{appConfig.appName}</h1>
          <p className="mt-1 text-sm text-slate">Set a new password.</p>
        </div>

        <div className="rounded-2xl border border-border bg-paper-raised p-6 shadow-sm">
          {!ready ? (
            <p className="text-sm text-slate">Checking your link…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                  New password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full min-h-11 rounded-lg border border-border bg-paper px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-ink">
                  Confirm password
                </label>
                <input
                  id="confirm"
                  name="confirm"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full min-h-11 rounded-lg border border-border bg-paper px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-maroon">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="min-h-11 w-full rounded-lg bg-brass px-4 font-medium text-paper-raised disabled:opacity-60"
              >
                {pending ? "Saving…" : "Save password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
