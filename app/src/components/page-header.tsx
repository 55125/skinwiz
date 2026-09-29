export function PageHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand">{eyebrow}</p>}
      <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
      {description && <p className="max-w-2xl text-muted-foreground">{description}</p>}
      {children}
    </div>
  );
}
