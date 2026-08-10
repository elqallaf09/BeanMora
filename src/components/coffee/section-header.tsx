import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function SectionHeader({
  title,
  subtitle,
  seeAllHref,
  seeAllLabel,
  icon,
  className,
}: {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-caramel)] to-[var(--color-copper)] text-white shadow-md">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-[var(--color-espresso)] sm:text-xl">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-xs text-[var(--color-muted-text)] sm:text-sm">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {seeAllHref ? (
        <Link
          href={seeAllHref}
          className="flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--color-cream)] px-3 py-1.5 text-xs font-bold text-[var(--color-copper)] transition-colors hover:bg-[var(--color-caramel)]/25"
        >
          {seeAllLabel}
          <ChevronRight className="icon-flip-rtl h-3.5 w-3.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
