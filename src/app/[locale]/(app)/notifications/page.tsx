import { getTranslations } from "next-intl/server";
import { Bell, Heart, MessageCircle, Sparkles, UserPlus, Zap, BadgeDollarSign, PackageCheck, PackageX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "@/i18n/navigation";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { MarkAllReadButton, NotificationRowLink } from "./notification-actions";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const TYPE_ICON: Record<string, LucideIcon> = {
  like: Heart,
  comment: MessageCircle,
  reply: MessageCircle,
  follow: UserPlus,
  recipe_save: Sparkles,
  new_recipe_from_followed: Sparkles,
  verification_approved: Sparkles,
  xbloom_sync_status: Zap,
  saved_recipe_updated: Sparkles,
  product_price_drop: BadgeDollarSign,
  product_back_in_stock: PackageCheck,
  product_sold_out: PackageX,
};

const TYPE_KEY: Record<string, string> = {
  like: "notificationsPage.typeLike",
  comment: "notificationsPage.typeComment",
  reply: "notificationsPage.typeReply",
  follow: "notificationsPage.typeFollow",
  recipe_save: "notificationsPage.typeRecipeSave",
  new_recipe_from_followed: "notificationsPage.typeNewRecipeFromFollowed",
  verification_approved: "notificationsPage.typeVerificationApproved",
  xbloom_sync_status: "notificationsPage.typeXbloomSyncStatus",
  saved_recipe_updated: "notificationsPage.typeSavedRecipeUpdated",
  product_price_drop: "notificationsPage.typeProductPriceDrop",
  product_back_in_stock: "notificationsPage.typeProductBackInStock",
  product_sold_out: "notificationsPage.typeProductSoldOut",
};

function targetHref(n: AnyRow): string {
  if (n.entity_type === "recipe" && n.entity_id) return `/recipes/${n.entity_id}`;
  if (n.entity_type === "post" && n.entity_id) return `/community/${n.entity_id}`;
  if (n.entity_type === "profile" && n.actor?.username) return `/profile/${n.actor.username}`;
  if (n.type === "follow" && n.actor?.username) return `/profile/${n.actor.username}`;
  if (n.entity_type === "xbloom_sync_job") return "/xbloom";
  if (n.entity_type === "roasted_product" && n.entity_id) return `/products/${n.entity_id}`;
  return "/community";
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect({ href: "/login", locale });
  }

  const { data: notificationsRaw } = await supabase
    .from("notifications")
    .select("id, type, entity_type, entity_id, is_read, created_at, actor:profiles(name, username, avatar_url)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const notifications = ((notificationsRaw ?? []) as AnyRow[]);
  const hasUnread = notifications.some((n) => !n.is_read);

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 lg:py-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("notificationsPage.title")}</h1></div>
        <MarkAllReadButton userId={user!.id} hasUnread={hasUnread} />
      </div>

      {notifications.length === 0 ? (
        <RichEmptyState icon={Bell} title={t("notificationsPage.emptyTitle")} description={t("notificationsPage.emptyHint")} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {notifications.map((n) => {
            const Icon = TYPE_ICON[n.type] ?? Bell;
            const actorName = n.actor?.name ?? n.actor?.username ?? "";
            return (
              <li key={n.id}>
                <NotificationRowLink
                  notificationId={n.id}
                  isRead={n.is_read}
                  href={targetHref(n)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 transition-colors ${
                    n.is_read
                      ? "border-transparent bg-[var(--color-surface,#fff)]"
                      : "border-[var(--color-teal)]/20 bg-[var(--color-teal)]/5"
                  }`}
                >
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-[var(--color-cream)]">
                    <ImageWithFallback src={n.actor?.avatar_url} alt={actorName} fallbackSeed={n.id} fill sizes="36px" />
                  </div>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-caramel)]/15 text-[var(--color-copper)]">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-[var(--color-dark-text)]">
                    {actorName ? <span className="font-semibold text-[var(--color-espresso)]">{actorName} </span> : null}
                    {t(TYPE_KEY[n.type] ?? "notificationsPage.typeComment")}
                  </p>
                  {!n.is_read ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-teal)]" aria-hidden /> : null}
                </NotificationRowLink>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
