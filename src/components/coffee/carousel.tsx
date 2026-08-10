import { Children, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Horizontally scrollable, snap-aligned row used for "Recommended beans",
 * "Trending recipes", etc. Pure CSS (scroll-snap + native touch/wheel
 * scrolling) — no carousel library needed, and it follows normal
 * inline-direction scrolling so RTL works without special handling.
 *
 * `Children.toArray` is important here: callers routinely pass a mix of a
 * mapped array and a trailing element (e.g. `{items.map(...)}<SeeAllTile/>`),
 * which arrives as a NESTED array. Mapping over `children` directly would
 * wrap that whole inner array in one flex item and the cards would stack
 * vertically instead of scrolling sideways. toArray flattens it.
 */
export function HorizontalCarousel({
  children,
  className,
  itemClassName,
}: {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
}) {
  const items = Children.toArray(children);

  return (
    <div
      className={cn(
        "snap-x-scroll -mx-4 flex flex-nowrap items-stretch gap-3.5 overflow-x-auto px-4 pb-3 pt-1 sm:-mx-6 sm:px-6",
        className,
      )}
    >
      {items.map((child, i) => (
        <div key={i} className={cn("shrink-0", itemClassName)}>
          {child}
        </div>
      ))}
    </div>
  );
}
