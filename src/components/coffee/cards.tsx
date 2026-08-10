import type { LucideIcon } from "lucide-react";
import { Star, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { EditorialTile, EditorialMedia } from "./editorial";
import { SaveButton } from "./save-button";

/**
 * Domain cards.
 *
 * These are thin, typed adapters over the editorial primitives — they map a
 * bean / recipe / roaster / post row onto EditorialTile. They deliberately
 * hold NO layout or chrome of their own: the previous "white rounded card
 * with a border and a metadata row underneath" is what made every screen
 * read as a dashboard. Type sits on imagery, tiles vary in ratio, and depth
 * comes from scrim + warm shadow rather than a border.
 */

/* ------------------------------------------------------------------ */
/* Bean                                                                */
/* ------------------------------------------------------------------ */

export interface BeanCardData {
  id: string;
  slug: string;
  name: string;
  roasterName?: string | null;
  originCountry?: string | null;
  originRegion?: string | null;
  processLabel?: string | null;
  roastLevel?: string | null;
  roastLevelLabel?: string | null;
  flavors?: string[];
  rating?: number | null;
  ratingCount?: number | null;
  price?: string | null;
  compatible?: { v60?: boolean; espresso?: boolean; xbloom?: boolean };
  imageUrl?: string | null;
  saved?: boolean;
}

export function BeanCard({
  bean,
  isAuthenticated,
  className,
  width = "w-[210px]",
  size = "md",
}: {
  bean: BeanCardData;
  isAuthenticated: boolean;
  /** Accepted for call-site compatibility; labels now render as chips. */
  labels?: { v60: string; espresso: string; xbloom: string };
  className?: string;
  width?: string;
  size?: "md" | "lg";
}) {
  return (
    <EditorialTile
      className={cn(width, className)}
      href={`/beans/${bean.slug}`}
      title={bean.name}
      kicker={bean.originCountry ?? undefined}
      footnote={[bean.roasterName, bean.price].filter(Boolean).join("  ·  ") || undefined}
      chips={[bean.roastLevelLabel, bean.processLabel].filter(Boolean) as string[]}
      seed={bean.id}
      imageUrl={bean.imageUrl}
      artKind="bag"
      ratio={size === "lg" ? "tall" : "portrait"}
      badge={
        typeof bean.rating === "number" ? (
          <span className="glass-dark inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
            <Star className="h-3 w-3 fill-[var(--color-caramel)] text-[var(--color-caramel)]" aria-hidden />
            <span className="tabular-nums">{bean.rating.toFixed(1)}</span>
          </span>
        ) : null
      }
      cornerSlot={
        <SaveButton
          table="bean_saves"
          itemId={bean.id}
          initialSaved={bean.saved}
          isAuthenticated={isAuthenticated}
          size="sm"
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Recipe                                                              */
/* ------------------------------------------------------------------ */

export interface RecipeCardData {
  id: string;
  title: string;
  authorName?: string | null;
  beanName?: string | null;
  ratio?: string | null;
  difficultyLabel?: string | null;
  rating?: number | null;
  saves?: number | null;
  brewTimeLabel?: string | null;
  methodLabel?: string | null;
  coverSeed: string;
  coverUrl?: string | null;
  saved?: boolean;
}

export function RecipeCard({
  recipe,
  isAuthenticated,
  className,
  width = "w-[250px]",
}: {
  recipe: RecipeCardData;
  isAuthenticated: boolean;
  className?: string;
  width?: string;
}) {
  return (
    <EditorialTile
      className={cn(width, className)}
      href={`/recipes/${recipe.id}`}
      title={recipe.title}
      kicker={recipe.methodLabel ?? undefined}
      footnote={
        [recipe.ratio, recipe.brewTimeLabel, recipe.authorName ?? recipe.beanName]
          .filter(Boolean)
          .join("  ·  ") || undefined
      }
      chips={recipe.difficultyLabel ? [recipe.difficultyLabel] : undefined}
      seed={recipe.coverSeed}
      imageUrl={recipe.coverUrl}
      artKind="pourover"
      ratio="portrait"
      badge={
        typeof recipe.rating === "number" ? (
          <span className="glass-dark inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
            <Star className="h-3 w-3 fill-[var(--color-caramel)] text-[var(--color-caramel)]" aria-hidden />
            <span className="tabular-nums">{recipe.rating.toFixed(1)}</span>
          </span>
        ) : null
      }
      cornerSlot={
        <SaveButton
          table="recipe_saves"
          itemId={recipe.id}
          initialSaved={recipe.saved}
          isAuthenticated={isAuthenticated}
          size="sm"
        />
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Roaster                                                             */
/* ------------------------------------------------------------------ */

export function RoasterCard({
  id,
  slug,
  name,
  country,
  logoUrl,
  isVerified,
  beanCount,
  beanCountLabel,
  className = "w-[190px]",
}: {
  id: string;
  slug: string;
  name: string;
  country?: string | null;
  logoUrl?: string | null;
  isVerified?: boolean;
  beanCount?: number;
  beanCountLabel?: string;
  className?: string;
}) {
  return (
    <EditorialTile
      className={className}
      href={`/roasters/${slug}`}
      title={name}
      kicker={country ?? undefined}
      footnote={typeof beanCount === "number" ? `${beanCount} ${beanCountLabel ?? ""}`.trim() : undefined}
      seed={id}
      imageUrl={logoUrl}
      artKind="roaster"
      ratio="square"
      badge={
        isVerified ? (
          <span className="glass-dark inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold text-white">
            <Star className="h-3 w-3 fill-[var(--color-teal)] text-[var(--color-teal)]" aria-hidden />
          </span>
        ) : null
      }
    />
  );
}

/* ------------------------------------------------------------------ */
/* Brew method                                                         */
/* ------------------------------------------------------------------ */

export function BrewMethodCard({
  icon: Icon,
  label,
  hint,
  href,
  seed,
  className,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  href: string;
  accent?: "caramel" | "teal" | "copper";
  seed?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "zoom-frame lift group relative flex aspect-[3/4] flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-4 shadow-warm-lg",
        className,
      )}
    >
      <span className="absolute inset-0 block">
        <EditorialMedia src={null} alt={label} seed={seed ?? `method-${label}`} artKind="beans" />
      </span>
      <span aria-hidden className="scrim-bottom absolute inset-0" />
      <span className="glass relative mb-auto flex h-11 w-11 items-center justify-center rounded-2xl text-white transition-transform duration-500 group-hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="relative mt-3 block text-sm font-extrabold text-[var(--color-cream)]">{label}</span>
      {hint ? <span className="relative mt-0.5 block text-[11px] leading-snug text-white/55">{hint}</span> : null}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Origin                                                              */
/* ------------------------------------------------------------------ */

export function OriginCard({
  name,
  count,
  countLabel,
  href,
  seed,
  className = "w-[190px]",
}: {
  name: string;
  count?: number;
  countLabel?: string;
  href: string;
  seed: string;
  className?: string;
}) {
  return (
    <EditorialTile
      className={className}
      href={href}
      title={name}
      kicker={typeof count === "number" ? `${count} ${countLabel ?? ""}`.trim() : countLabel}
      seed={seed}
      artKind="beans"
      ratio="square"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Equipment                                                           */
/* ------------------------------------------------------------------ */

export function EquipmentCard({
  id,
  name,
  brand,
  categoryLabel,
  imageUrl,
  isDefault,
  defaultLabel,
  onEdit,
  className,
  href,
}: {
  id: string;
  name: string;
  brand?: string | null;
  categoryLabel: string;
  imageUrl?: string | null;
  isDefault?: boolean;
  defaultLabel?: string;
  onEdit?: React.ReactNode;
  className?: string;
  /** Defaults to "/gear" (the user's own equipment list) — pass an explicit
   * "/equipment/[id]" catalog link from Discover, where the card represents
   * a real, browsable equipment_models row rather than the user's own gear. */
  href?: string;
}) {
  return (
    <EditorialTile
      className={className}
      href={href ?? "/gear"}
      title={name}
      kicker={brand ?? categoryLabel}
      footnote={brand ? categoryLabel : undefined}
      seed={id}
      imageUrl={imageUrl}
      artKind="gear"
      ratio="landscape"
      badge={
        isDefault ? (
          <span className="rounded-full bg-[var(--color-teal)] px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
            {defaultLabel}
          </span>
        ) : null
      }
      cornerSlot={onEdit}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Community post                                                      */
/* ------------------------------------------------------------------ */

export function CommunityPostCard({
  id,
  authorName,
  imageSeed,
  imageUrl,
  caption,
  contextLabel,
  likeCount,
  commentCount,
  timeLabel,
  className,
}: {
  id: string;
  authorName: string;
  authorUsername?: string | null;
  authorAvatarSeed?: string;
  authorAvatarUrl?: string | null;
  imageSeed: string;
  imageUrl?: string | null;
  caption?: string | null;
  contextLabel?: string | null;
  likeCount: number;
  commentCount: number;
  timeLabel?: string;
  actionSlot?: React.ReactNode;
  className?: string;
}) {
  return (
    <EditorialTile
      className={className}
      href={`/community/${id}`}
      title={caption ?? authorName}
      kicker={authorName}
      footnote={[timeLabel, `${likeCount} · ${commentCount}`].filter(Boolean).join("  ·  ")}
      chips={contextLabel ? [contextLabel] : undefined}
      seed={imageSeed}
      imageUrl={imageUrl}
      artKind="post"
      ratio="landscape"
    />
  );
}

/* ------------------------------------------------------------------ */
/* Small utilities still used by a few screens                         */
/* ------------------------------------------------------------------ */

export function StatTile({
  icon: Icon,
  value,
  label,
  className,
}: {
  icon: LucideIcon;
  value: string | number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("surface-panel flex flex-col items-center gap-1 rounded-[var(--radius-tile)] px-3 py-5 text-center", className)}>
      <Icon className="mb-0.5 h-4 w-4 text-[var(--color-copper)]" aria-hidden />
      <p className="text-2xl font-extrabold leading-none text-[var(--color-espresso)] tabular-nums">{value}</p>
      <p className="type-eyebrow text-[var(--color-muted-text)]">{label}</p>
    </div>
  );
}

export function QuickActionTile({
  icon: Icon,
  label,
  href,
  className,
}: {
  icon: LucideIcon;
  label: string;
  href: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "surface-panel lift group flex flex-col items-center gap-2 rounded-[var(--radius-tile)] px-3 py-4 text-center",
        className,
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-caramel)] to-[var(--color-copper)] text-white shadow-warm-md transition-transform duration-300 group-hover:scale-110">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-[11px] font-bold leading-tight text-[var(--color-espresso)]">{label}</span>
    </Link>
  );
}

export function SeeAllTile({ href, label, width }: { href: string; label: string; width?: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex aspect-[3/4] flex-col items-center justify-center gap-3 rounded-[var(--radius-card)] border-2 border-dashed border-[var(--color-caramel)]/40 bg-[var(--surface-sunken)] text-center text-xs font-bold text-[var(--color-copper)] transition-colors hover:border-[var(--color-caramel)]",
        width ?? "w-[140px]",
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-caramel)]/20">
        <Star className="h-4 w-4" aria-hidden />
      </span>
      {label}
    </Link>
  );
}

export { Users as CommunityIcon };
