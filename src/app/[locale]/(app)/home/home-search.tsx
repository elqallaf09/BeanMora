"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useRouter } from "@/i18n/navigation";

/**
 * The prominent on-page search on Home. Distinct from the compact search in
 * the shared AppHeader — this one is a primary visual element of the landing
 * experience, so it gets its own larger treatment.
 */
export function HomeSearchBar({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/discover?q=${encodeURIComponent(q)}` : "/discover");
  }

  return (
    <form onSubmit={submit} role="search" className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-copper)] ltr:left-5 rtl:right-5"
        aria-hidden
      />
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="surface-panel h-16 w-full rounded-full text-[15px] text-[var(--color-dark-text)] outline-none transition-all duration-300 placeholder:text-[var(--color-muted-text)] focus-visible:border-[var(--color-caramel)]/60 focus-visible:shadow-warm-xl ltr:pl-14 ltr:pr-5 rtl:pl-5 rtl:pr-14"
      />
    </form>
  );
}
