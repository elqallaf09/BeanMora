import { cn } from "@/lib/utils";

/**
 * BeanMora monogram: a coffee bean silhouette whose center crease is drawn
 * as a soft "B" curve, with a small rising steam/drop mark above it. Kept
 * to two colors (teal mark + caramel bean) so it stays legible at favicon
 * size. See docs/design-system.md for the full logo system (horizontal,
 * vertical, light/dark/mono variants).
 */
export function BeanMoraLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="BeanMora"
    >
      <rect width="48" height="48" rx="12" fill="#1FA7A0" fillOpacity="0.08" />
      <ellipse cx="24" cy="26" rx="13" ry="16" fill="#D38746" />
      <path
        d="M24 12c-3 4-3 8 0 9.5 3 1.5 3 5.5 0 9.5"
        stroke="#2B1812"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M24 6c1.8 2 1.8 4 0 5.2"
        stroke="#1FA7A0"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
