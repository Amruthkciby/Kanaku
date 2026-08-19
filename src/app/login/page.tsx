"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInAction, requestPasswordResetAction, type LoginState, type ResetState } from "./actions";
import { appConfig } from "@/config/app";

const initialLoginState: LoginState = { error: null };
const initialResetState: ResetState = { error: null, sent: false };

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";
  const [mode, setMode] = useState<"sign-in" | "reset">("sign-in");

  const [loginState, loginFormAction, loginPending] = useActionState(signInAction, initialLoginState);
  const [resetState, resetFormAction, resetPending] = useActionState(
    requestPasswordResetAction,
    initialResetState,
  );

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-3xl text-ink">{appConfig.appName}</h1>
          <p className="mt-1 text-sm text-slate">Family and business, one ledger each.</p>
        </div>

        <div className="rounded-2xl border border-border bg-paper-raised p-6 shadow-sm">
          {mode === "sign-in" ? (
            <form action={loginFormAction} className="space-y-4">
              <input type="hidden" name="next" value={next} />
              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full min-h-11 rounded-lg border border-border bg-paper px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
                />
              </div>
              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="w-full min-h-11 rounded-lg border border-border bg-paper px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
                />
              </div>

              {loginState.error && (
                <p role="alert" className="text-sm text-maroon">
                  {loginState.error}
                </p>
              )}

              <button
                type="submit"
                disabled={loginPending}
                className="min-h-11 w-full rounded-lg bg-brass px-4 font-medium text-paper-raised disabled:opacity-60"
              >
                {loginPending ? "Signing in…" : "Sign in"}
              </button>

              <button
                type="button"
                onClick={() => setMode("reset")}
                className="min-h-11 w-full text-sm text-slate hover:text-ink"
              >
                Forgot your password?
              </button>
            </form>
          ) : (
            <form action={resetFormAction} className="space-y-4">
              <p className="text-sm text-slate">
                We&apos;ll email you a link to set a new password.
              </p>
              <div>
                <label htmlFor="reset-email" className="mb-1.5 block text-sm font-medium text-ink">
                  Email
                </label>
                <input
                  id="reset-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="w-full min-h-11 rounded-lg border border-border bg-paper px-3.5 text-base text-ink focus-visible:outline-2 focus-visible:outline-brass"
                />
              </div>

              {resetState.sent ? (
                <p role="status" className="text-sm text-forest">
                  If that email has an account, a reset link is on its way.
                </p>
              ) : (
                resetState.error && (
                  <p role="alert" className="text-sm text-maroon">
                    {resetState.error}
                  </p>
                )
              )}

              <button
                type="submit"
                disabled={resetPending}
                className="min-h-11 w-full rounded-lg bg-brass px-4 font-medium text-paper-raised disabled:opacity-60"
              >
                {resetPending ? "Sending…" : "Send reset link"}
              </button>

              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className="min-h-11 w-full text-sm text-slate hover:text-ink"
              >
                Back to sign in
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-slate">
          New accounts are created by the family, not signed up here.
        </p>
      </div>
    </div>
  );
}
