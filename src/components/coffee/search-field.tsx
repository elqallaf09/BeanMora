"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function SearchField({
  defaultValue = "",
  placeholder,
  action = "/discover",
  size = "md",
  className,
  autoFocus,
}: {
  defaultValue?: string;
  placeholder?: string;
  action?: string;
  size?: "md" | "lg";
  className?: string;
  autoFocus?: boolean;
}) {
  const t = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? (`${action}?q=${encodeURIComponent(q)}` as `/${string}`) : (action as `/${string}`));
  }

  return (
    <form onSubmit={handleSubmit} role="search" className={cn("relative", className)}>
      <Search
        className={cn(
          "pointer-events-none absolute top-1/2 -translate-y-1/2 text-[var(--color-muted-text)] ltr:left-4 rtl:right-4",
          size === "lg" ? "h-5 w-5" : "h-4 w-4",
        )}
        aria-hidden
      />
      <input
        type="search"
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder ?? t("search")}
        aria-label={placeholder ?? t("search")}
        className={cn(
          "w-full rounded-full border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] text-[var(--color-dark-text)] outline-none placeholder:text-[var(--color-muted-text)] focus-visible:border-[var(--color-teal)] focus-visible:ring-2 focus-visible:ring-[var(--color-teal)]/30",
          size === "lg" ? "h-14 ps-12 pe-12 text-base" : "h-11 ps-10 pe-10 text-sm",
        )}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="clear"
          className="absolute top-1/2 -translate-y-1/2 text-[var(--color-muted-text)] hover:text-[var(--color-dark-text)] ltr:right-4 rtl:left-4"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}
