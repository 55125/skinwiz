import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Link
          href={action.href}
          className="group flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline"
        >
          {action.label}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      )}
    </div>
  );
}
