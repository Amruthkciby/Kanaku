export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="px-4 py-5 sm:px-6">
      <h1 className="font-display text-2xl text-ink">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate">{subtitle}</p>}
    </div>
  );
}
