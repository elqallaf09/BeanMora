import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { ImageWithFallback } from "./image-with-fallback";
import { AbstractCoffeeBackground, CoffeeArt, type ArtKind } from "./fallback-art";

/**
 * Editorial layout primitives.
 *
 * These deliberately replace the "white rounded card with a grey border"
 * pattern. The rules they encode:
 *
 *  - Imagery is the content; type sits ON it, not beneath it in a row.
 *  - Compositions are asymmetric and variably sized, not a uniform grid.
 *  - Panels are tonal layers of one warm material, never white-on-white.
 *  - Every surface has depth: scrim, glass, grain, layered warm shadow.
 *
 * Anything that needs to look like a magazine spread is built from these.
 */

/* ------------------------------------------------------------------ */
/* Media layer — photo when present, generated coffee art otherwise    */
/* ------------------------------------------------------------------ */

export function EditorialMedia({
  src,
  alt,
  seed,
  artKind,
  kenBurns,
  sizes,
  priority,
  className,
}: {
  src?: string | null;
  alt: string;
  seed: string;
  artKind?: ArtKind;
  kenBurns?: boolean;
  sizes?: string;
  priority?: boolean;
  className?: string;
}) {
  if (src) {
    return (
      <ImageWithFallback
        src={src}
        alt={alt}
        fallbackSeed={seed}
        artKind={artKind}
        fill
        sizes={sizes}
        priority={priority}
        className={cn(kenBurns && "animate-kenburns", className)}
      />
    );
  }

  // No photo. Render the generated illustration for this artKind layered
  // over the tonal gradient ground — NOT the gradient alone, which reads as
  // a flat brown wash at hero scale.
  return (
    <AbstractCoffeeBackground
      seed={seed}
      pattern={false}
      className={cn("relative h-full w-full", kenBurns && "animate-kenburns", className)}
    >
      <span className="absolute inset-0 block">
        <CoffeeArt seed={seed} kind={artKind} />
      </span>
    </AbstractCoffeeBackground>
  );
}

/* ------------------------------------------------------------------ */
/* SectionIntro — magazine section opener with oversized index numeral */
/* ------------------------------------------------------------------ */

export function SectionIntro({
  index,
  eyebrow,
  title,
  lede,
  href,
  hrefLabel,
  invert,
  className,
}: {
  index?: string;
  eyebrow?: string;
  title: string;
  lede?: string;
  href?: string;
  hrefLabel?: string;
  invert?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-5", className)}>
      <div className="flex min-w-0 items-start gap-4">
        {index ? (
          <span
            aria-hidden
            className={cn(
              "select-none font-mono text-[42px] font-extrabold leading-none tracking-tighter sm:text-[56px]",
              invert ? "text-white/15" : "text-[var(--color-caramel)]/25",
            )}
          >
            {index}
          </span>
        ) : null}
        <div className="min-w-0 pt-1">
          {eyebrow ? (
            <p
              className={cn(
                "type-eyebrow mb-2",
                invert ? "text-[var(--color-caramel)]" : "text-[var(--color-copper)]",
              )}
            >
              {eyebrow}
            </p>
          ) : null}
          <h2
            className={cn(
              "type-title",
              invert ? "text-[var(--color-cream)]" : "text-[var(--color-espresso)]",
            )}
          >
            {title}
          </h2>
          {lede ? (
            <p
              className={cn(
                "mt-2 max-w-prose text-sm leading-relaxed sm:text-base",
                invert ? "text-white/65" : "text-[var(--color-muted-text)]",
              )}
            >
              {lede}
            </p>
          ) : null}
        </div>
      </div>

      {href ? (
        <Link
          href={href}
          className={cn(
            "group hidden shrink-0 items-center gap-2 pb-1 text-sm font-bold transition-colors sm:inline-flex",
            invert
              ? "text-[var(--color-caramel)] hover:text-white"
              : "text-[var(--color-copper)] hover:text-[var(--color-espresso)]",
          )}
        >
          {hrefLabel}
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-current transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="icon-flip-rtl h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FeatureSpread — the big asymmetric hero block                       */
/* ------------------------------------------------------------------ */

export function FeatureSpread({
  eyebrow,
  title,
  subtitle,
  meta,
  chips,
  href,
  ctaLabel,
  seed,
  imageUrl,
  artKind = "cup",
  overlaySlot,
  height = "tall",
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: Array<{ label: string; value: string }>;
  chips?: string[];
  href: string;
  ctaLabel: string;
  seed: string;
  imageUrl?: string | null;
  artKind?: ArtKind;
  overlaySlot?: ReactNode;
  height?: "tall" | "epic";
  className?: string;
}) {
  const minH = height === "epic" ? "min-h-[560px] sm:min-h-[680px]" : "min-h-[440px] sm:min-h-[540px]";

  return (
    <article
      className={cn(
        "texture-grain group relative isolate overflow-hidden rounded-[var(--radius-hero)] shadow-feature",
        minH,
        className,
      )}
    >
      <div className="absolute inset-0 -z-20">
        <EditorialMedia
          src={imageUrl}
          alt={title}
          seed={seed}
          artKind={artKind}
          kenBurns
          priority
          sizes="(max-width: 768px) 100vw, 1100px"
        />
      </div>
      {/* Bottom-weighted scrim only — a full-bleed scrim flattens the art
          into a brown wash at hero scale. */}
      <div aria-hidden className="scrim-bottom absolute inset-0 -z-10" />

      {/* steam */}
      <div className="pointer-events-none absolute end-10 top-8 flex gap-2 opacity-50" aria-hidden>
        <span className="animate-steam h-16 w-2.5 rounded-full bg-white/40 blur-[3px]" />
        <span className="animate-steam-delay h-12 w-2.5 rounded-full bg-white/30 blur-[3px]" />
      </div>

      {overlaySlot ? <div className="absolute end-6 top-6 z-10 sm:end-8 sm:top-8">{overlaySlot}</div> : null}

      <div className={cn("relative flex flex-col justify-end gap-5 p-6 text-[var(--color-cream)] sm:p-10", minH)}>
        {eyebrow ? (
          <span className="type-eyebrow w-fit rounded-full bg-[var(--color-caramel)] px-4 py-2 text-[var(--color-espresso)] shadow-lg">
            {eyebrow}
          </span>
        ) : null}

        <h1 className="type-headline max-w-[15ch] text-balance drop-shadow-sm">{title}</h1>

        {subtitle ? <p className="type-lede max-w-[40ch] text-white/75">{subtitle}</p> : null}

        {chips && chips.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {chips.slice(0, 4).map((c) => (
              <span key={c} className="glass rounded-full px-4 py-1.5 text-xs font-semibold">
                {c}
              </span>
            ))}
          </div>
        ) : null}

        {meta && meta.length > 0 ? (
          <dl className="glass flex w-fit flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl px-6 py-4">
            {meta.map((m) => (
              <div key={m.label}>
                <dd className="text-xl font-extrabold leading-none tabular-nums">{m.value}</dd>
                <dt className="type-eyebrow mt-1.5 text-white/55">{m.label}</dt>
              </div>
            ))}
          </dl>
        ) : null}

        <Link
          href={href}
          className="group/cta mt-1 inline-flex h-14 w-fit items-center gap-3 rounded-full bg-[var(--color-cream)] pe-6 ps-3 text-[15px] font-bold text-[var(--color-ink-fixed)] shadow-warm-xl transition-transform duration-300 hover:scale-[1.03] active:scale-95"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-ink-fixed)] text-[var(--color-cream)]">
            <ArrowRight className="icon-flip-rtl h-4 w-4 transition-transform duration-300 group-hover/cta:translate-x-0.5" aria-hidden />
          </span>
          {ctaLabel}
        </Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* EditorialTile — variable-height image tile with type over the image */
/* ------------------------------------------------------------------ */

export function EditorialTile({
  href,
  title,
  kicker,
  footnote,
  seed,
  imageUrl,
  artKind,
  ratio = "portrait",
  badge,
  cornerSlot,
  chips,
  className,
}: {
  href: string;
  title: string;
  kicker?: string | null;
  footnote?: string | null;
  seed: string;
  imageUrl?: string | null;
  artKind?: ArtKind;
  ratio?: "portrait" | "tall" | "square" | "landscape";
  badge?: ReactNode;
  cornerSlot?: ReactNode;
  chips?: string[];
  className?: string;
}) {
  const aspect =
    ratio === "tall"
      ? "aspect-[3/4.6]"
      : ratio === "square"
        ? "aspect-square"
        : ratio === "landscape"
          ? "aspect-[4/3]"
          : "aspect-[3/4]";

  return (
    <div className={cn("group relative", className)}>
      <Link
        href={href}
        className={cn(
          "zoom-frame lift texture-grain relative block w-full overflow-hidden rounded-[var(--radius-card)] shadow-warm-lg",
          aspect,
        )}
      >
        <span className="absolute inset-0 block">
          <EditorialMedia
            src={imageUrl}
            alt={title}
            seed={seed}
            artKind={artKind}
            sizes="(max-width: 640px) 50vw, 320px"
          />
        </span>
        <span aria-hidden className="scrim-bottom absolute inset-0" />

        {badge ? <span className="absolute start-3 top-3 z-10">{badge}</span> : null}

        <span className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 p-4">
          {kicker ? (
            <span className="type-eyebrow text-[var(--color-caramel)]">{kicker}</span>
          ) : null}
          <span className="text-balance text-[17px] font-extrabold leading-[1.15] text-[var(--color-cream)]">
            {title}
          </span>
          {footnote ? <span className="text-xs text-white/60">{footnote}</span> : null}
          {chips && chips.length > 0 ? (
            <span className="mt-1 flex flex-wrap gap-1.5">
              {chips.slice(0, 3).map((c) => (
                <span key={c} className="glass rounded-full px-2.5 py-1 text-[10px] font-semibold text-white">
                  {c}
                </span>
              ))}
            </span>
          ) : null}
        </span>
      </Link>

      {cornerSlot ? <div className="absolute end-3 top-3 z-20">{cornerSlot}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SplitFeature — asymmetric image / text pair                         */
/* ------------------------------------------------------------------ */

export function SplitFeature({
  eyebrow,
  title,
  body,
  href,
  ctaLabel,
  seed,
  imageUrl,
  artKind = "beans",
  reverse,
  invert,
  className,
}: {
  eyebrow?: string;
  title: string;
  body?: string;
  href: string;
  ctaLabel: string;
  seed: string;
  imageUrl?: string | null;
  artKind?: ArtKind;
  reverse?: boolean;
  invert?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-6 sm:grid-cols-2 sm:gap-10",
        reverse && "sm:[&>*:first-child]:order-2",
        className,
      )}
    >
      <Link
        href={href}
        className="zoom-frame lift texture-grain relative block aspect-[4/3] overflow-hidden rounded-[var(--radius-feature)] shadow-warm-xl"
      >
        <span className="absolute inset-0 block">
          <EditorialMedia src={imageUrl} alt={title} seed={seed} artKind={artKind} sizes="(max-width: 640px) 100vw, 560px" />
        </span>
        <span aria-hidden className="absolute inset-0 bg-gradient-to-tr from-[var(--warm-950)]/45 to-transparent" />
      </Link>

      <div>
        {eyebrow ? (
          <p className={cn("type-eyebrow mb-3", invert ? "text-[var(--color-caramel)]" : "text-[var(--color-copper)]")}>
            {eyebrow}
          </p>
        ) : null}
        <h3
          className={cn(
            "type-subtitle text-balance",
            invert ? "text-[var(--color-cream)]" : "text-[var(--color-espresso)]",
          )}
        >
          {title}
        </h3>
        {body ? (
          <p
            className={cn(
              "mt-3 max-w-prose text-sm leading-relaxed sm:text-base",
              invert ? "text-white/70" : "text-[var(--color-muted-text)]",
            )}
          >
            {body}
          </p>
        ) : null}
        <Link
          href={href}
          className={cn(
            "group mt-5 inline-flex items-center gap-2.5 text-sm font-bold",
            invert ? "text-[var(--color-caramel)]" : "text-[var(--color-copper)]",
          )}
        >
          {ctaLabel}
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-current transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="icon-flip-rtl h-3.5 w-3.5" aria-hidden />
          </span>
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RoastBand — full-bleed inverted editorial band                      */
/* ------------------------------------------------------------------ */

export function RoastBand({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface-roast texture-grain relative overflow-hidden py-12 sm:py-16", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-[var(--color-caramel)]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -start-24 h-72 w-72 rounded-full bg-[var(--color-teal)]/12 blur-3xl"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* StatRibbon — inline editorial figures, not dashboard boxes          */
/* ------------------------------------------------------------------ */

export function StatRibbon({
  stats,
  invert,
  className,
}: {
  stats: Array<{ icon?: LucideIcon; value: string | number; label: string }>;
  invert?: boolean;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "flex items-stretch divide-x divide-[var(--border-soft)] overflow-hidden rounded-[var(--radius-card)]",
        invert ? "glass-dark text-[var(--color-cream)]" : "surface-panel",
        className,
      )}
    >
      {stats.map((s) => (
        <div key={s.label} className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-5 text-center">
          {s.icon ? (
            <s.icon
              className={cn("mb-0.5 h-4 w-4", invert ? "text-[var(--color-caramel)]" : "text-[var(--color-copper)]")}
              aria-hidden
            />
          ) : null}
          <dd
            className={cn(
              "text-2xl font-extrabold leading-none tabular-nums",
              invert ? "text-[var(--color-cream)]" : "text-[var(--color-espresso)]",
            )}
          >
            {s.value}
          </dd>
          <dt className={cn("type-eyebrow", invert ? "text-white/50" : "text-[var(--color-muted-text)]")}>
            {s.label}
          </dt>
        </div>
      ))}
    </dl>
  );
}

/* ------------------------------------------------------------------ */
/* PillLink — animated filter / category chip                          */
/* ------------------------------------------------------------------ */

export function PillLink({
  href,
  label,
  icon: Icon,
  active,
  className,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  active?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300",
        active
          ? "bg-[var(--color-ink-fixed)] text-[var(--color-cream)] shadow-warm-lg"
          : "border border-[var(--border-soft)] bg-[var(--surface-raised)] text-[var(--color-dark-text)] hover:-translate-y-0.5 hover:border-[var(--color-caramel)]/50 hover:shadow-warm-md",
        className,
      )}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {label}
    </Link>
  );
}
