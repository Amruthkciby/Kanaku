// Central place for the defaults in the build brief (section 14). Swap values here rather than
// touching feature code.

export const appConfig = {
  appName: "Kanakku",
  currency: "INR",
  locale: "en-IN",
  // Indian financial year: April to March.
  financialYearStartMonth: 4, // 1-indexed (April)
} as const;

export type AppConfig = typeof appConfig;
