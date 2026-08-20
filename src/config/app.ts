// Central place for the defaults in the build brief (section 14). Swap values here rather than
// touching feature code.

export const appConfig = {
  appName: "Kanakku",
  currency: "INR",
  locale: "en-IN",
  // Indian financial year: April to March.
  financialYearStartMonth: 4, // 1-indexed (April)
  // A shared family device left signed in is a real exposure -- the app re-locks and requires
  // the password again after this much inactivity (see src/components/ActivityLock.tsx). The
  // underlying Supabase session stays valid; this is a local re-verification, not a full
  // sign-out, so it doesn't fight the "under five seconds" entry goal during active use.
  lockTimeoutMs: 10 * 60 * 1000, // 10 minutes
} as const;

export type AppConfig = typeof appConfig;
