export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-card border bg-card px-8 py-14 text-center shadow-card">
      <span
        aria-hidden
        className="mb-5 flex size-[54px] items-center justify-center rounded-card bg-muted text-foreground/60 [&_svg]:size-6"
      >
        {icon}
      </span>
      <h3 className="mb-2 text-xl font-semibold tracking-tight">{title}</h3>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground [text-wrap:pretty]">
        {description}
      </p>
      {actions && <div className="mt-6 flex gap-2">{actions}</div>}
    </div>
  );
}
