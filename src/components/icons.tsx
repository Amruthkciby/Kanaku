// Small hand-written stroke icons (no icon library dependency) — kept deliberately plain so the
// nav reads as UI chrome, not a decoration competing with the job-card badges.

type IconProps = { className?: string };

export function IconFamily({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden="true">
      <path d="M3 11.5 12 4l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1H9.5v-5.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V20h3a1 1 0 0 0 1-1v-9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconAdd({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export function IconBusiness({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden="true">
      <rect x="3.5" y="8" width="17" height="11" rx="1.5" />
      <path d="M8.5 8V6a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 6v2" strokeLinecap="round" />
      <path d="M3.5 12.5h17" strokeLinecap="round" />
    </svg>
  );
}

export function IconMore({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

export function IconLogout({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className={className} aria-hidden="true">
      <path d="M15 4H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 12h10m0 0-3-3m3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const NAV_ICONS: Record<string, (props: IconProps) => React.JSX.Element> = {
  family: IconFamily,
  add: IconAdd,
  business: IconBusiness,
  more: IconMore,
};

export function NavIcon({ navKey, className }: { navKey: string; className?: string }) {
  const Cmp = NAV_ICONS[navKey] ?? IconMore;
  return <Cmp className={className} />;
}
