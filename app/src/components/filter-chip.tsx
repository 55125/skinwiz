import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip({
  href,
  selected,
  children,
  showCheck,
}: {
  href: string;
  selected: boolean;
  children: React.ReactNode;
  showCheck?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={selected ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-card text-foreground/80 hover:border-brand/40 hover:bg-brand-soft hover:text-foreground",
      )}
    >
      {showCheck && selected && <Check className="h-3 w-3" />}
      {children}
    </Link>
  );
}
