import { getTranslations } from "next-intl/server";
import { Award, Coffee, Flame, Package, Sparkles, Star, Target, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { brewMethodLabelKey } from "@/lib/catalog-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { AbstractCoffeeBackground } from "@/components/coffee/fallback-art";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { RecipeCard, EquipmentCard, StatTile, type RecipeCardData } from "@/components/coffee/cards";
import { SectionIntro } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { FollowButton } from "../../community/community-actions";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const ACH_ICON: Record<string, LucideIcon> = {
  flame: Flame,
  award: Award,
  coffee: Coffee,
  sparkles: Sparkles,
  users: Users,
  target: Target,
};

const ACH_KEY: Record<string, string> = {
  firstBrew: "profile.achFirstBrew",
  weekStreak: "profile.achWeekStreak",
  originExplorer: "profile.achOriginExplorer",
  recipeAuthor: "profile.achRecipeAuthor",
  communityVoice: "profile.achCommunityVoice",
  centurion: "profile.achCenturion",
};

function equipmentCategoryKey(c: string) {
  return `myGear.category${c.split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`;
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("id, name, username, avatar_url, bio, country, experience_level, is_verified")
    .eq("username", username)
    .maybeSingle();

  if (!profileRaw && !username) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <RichEmptyState icon={Users} title={t("profile.notFoundTitle")} />
      </div>
    );
  }

  // A profile that isn't in the DB yet still renders a complete page keyed on
  // the requested username, rather than a dead end.
  const profile = (profileRaw ?? {
    id: `demo-profile-${username}`,
    name: username,
    username,
    avatar_url: null,
    bio: null,
    country: null,
    experience_level: null,
    is_verified: false,
  }) as AnyRow;

  const isSelf = user?.id === profile.id;

  const [
    { data: preferences },
    { count: followerCount },
    { count: followingCount },
    { data: isFollowingRow },
    { data: recipesRaw },
    { data: gearRaw },
    { count: brewCount },
    { count: beanCount },
    { data: recentBrews },
    { data: recentRecipes },
  ] =
    await Promise.all([
      supabase.from("user_preferences").select("preferred_brew_methods, preferred_flavors").eq("user_id", profile.id).maybeSingle(),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profile.id),
      supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profile.id),
      user && !isSelf
        ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", profile.id).maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("recipes")
        .select("id, title, brew_method, dose_grams, water_grams, total_time_seconds")
        .eq("user_id", profile.id)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("user_equipment")
        .select("id, category, custom_name, is_default, equipment_model:equipment_models(name, image_url, brand:equipment_brands(name))")
        .eq("user_id", profile.id)
        .limit(6),
      supabase.from("brew_logs").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      supabase.from("user_bean_inventory").select("id", { count: "exact", head: true }).eq("user_id", profile.id),
      // Recent activity is assembled from real brew logs and recipes rather
      // than a fabricated feed; if a profile has neither, the section hides.
      supabase
        .from("brew_logs")
        .select("id, created_at, brew_method, recipe:recipes(title)")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("recipes")
        .select("id, created_at, title")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(3),
    ]);

  const recipes = ((recipesRaw ?? []) as AnyRow[]);
  const gear = ((gearRaw ?? []) as AnyRow[]);

  const brews = brewCount ?? 0;
  const beansTried = beanCount ?? 0;

  const stats = [
    { icon: Coffee, value: brews, label: t("profile.statBrews") },
    { icon: Award, value: recipes.length, label: t("profile.statRecipes") },
    { icon: Package, value: beansTried, label: t("profile.statBeans") },
    { icon: Users, value: followerCount ?? 0, label: t("profile.statFollowers") },
  ];

  // Achievements are DERIVED from real counts, not stored. Each is a
  // threshold over data we already have, so progress is always truthful and
  // there is no separate table to keep in sync.
  const achievements = [
    { id: "firstBrew", key: "firstBrew", icon: "coffee" as const, progress: Math.min(brews, 1), goal: 1 },
    { id: "recipeAuthor", key: "recipeAuthor", icon: "award" as const, progress: recipes.length, goal: 10 },
    { id: "originExplorer", key: "originExplorer", icon: "sparkles" as const, progress: beansTried, goal: 5 },
    { id: "communityVoice", key: "communityVoice", icon: "users" as const, progress: followerCount ?? 0, goal: 50 },
    { id: "centurion", key: "centurion", icon: "target" as const, progress: brews, goal: 250 },
  ].map((a) => ({ ...a, unlocked: a.progress >= a.goal }));

  // Merge the two real sources into one reverse-chronological feed.
  const activity = [
    ...((recentBrews ?? []) as AnyRow[]).map((b) => ({
      id: `brew-${b.id}`,
      label: t("profile.activityBrewed"),
      detail: b.recipe?.title ?? (b.brew_method ? t(brewMethodLabelKey(b.brew_method)) : ""),
      at: b.created_at as string,
    })),
    ...((recentRecipes ?? []) as AnyRow[]).map((r) => ({
      id: `recipe-${r.id}`,
      label: t("profile.activityPublished"),
      detail: r.title as string,
      at: r.created_at as string,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 5);

  function toRecipeCard(r: AnyRow): RecipeCardData {
    return {
      id: r.id,
      title: r.title,
      ratio: r.dose_grams && r.water_grams ? `1:${Math.round(r.water_grams / r.dose_grams)}` : null,
      brewTimeLabel: r.total_time_seconds
        ? `${Math.floor(r.total_time_seconds / 60)}:${String(r.total_time_seconds % 60).padStart(2, "0")}`
        : null,
      methodLabel: r.brew_method ? t(brewMethodLabelKey(r.brew_method)) : null,
      rating: r.rating ?? null,
      coverSeed: r.id,
    };
  }

  const displayName = profile.name ?? profile.username;

  return (
    <div>
      {/* ================= Hero header ================= */}
      <div className="relative isolate overflow-hidden">
        <AbstractCoffeeBackground seed={profile.id} className="absolute inset-0 -z-10" />
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-gradient-to-b from-[var(--color-espresso)]/50 to-[var(--color-espresso)]"
        />
        <div className="mx-auto max-w-4xl px-4 pb-8 pt-8 text-[var(--color-soft-white)] sm:px-6">
          <div className="flex items-start gap-4 sm:gap-5">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-3xl shadow-2xl ring-4 ring-white/20 sm:h-28 sm:w-28">
              <ImageWithFallback
                src={profile.avatar_url}
                alt={displayName}
                fallbackSeed={profile.id}
                artKind="roaster"
                fill
                sizes="112px"
              />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <div className="flex items-center gap-2">
                <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{displayName}</h1>
                {profile.is_verified ? (
                  <Star className="h-5 w-5 shrink-0 fill-[var(--color-teal)] text-[var(--color-teal)]" aria-hidden />
                ) : null}
              </div>
              <p className="text-sm text-white/70">@{profile.username}</p>
              {profile.bio ? <p className="mt-2 text-sm leading-relaxed text-white/85">{profile.bio}</p> : null}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {profile.experience_level ? (
                  <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                    {profile.experience_level}
                  </span>
                ) : null}
                {profile.country ? (
                  <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[11px] font-semibold backdrop-blur">
                    {profile.country}
                  </span>
                ) : null}
              </div>

              <div className="mt-4">
                {isSelf ? (
                  <Button asChild variant="accent" size="sm">
                    <Link href="/settings">{t("profile.editProfile")}</Link>
                  </Button>
                ) : (
                  <FollowButton
                    targetUserId={profile.id}
                    initialFollowing={Boolean(isFollowingRow)}
                    isAuthenticated={Boolean(user)}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-6 text-sm">
            <span>
              <strong className="text-lg font-extrabold tabular-nums">{followerCount ?? 0}</strong>{" "}
              <span className="text-white/65">{t("profile.followers")}</span>
            </span>
            <span>
              <strong className="text-lg font-extrabold tabular-nums">{followingCount ?? 0}</strong>{" "}
              <span className="text-white/65">{t("profile.following")}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-4xl flex-col gap-9 px-4 py-7 sm:px-6">
        {/* ================= Statistics ================= */}
        <section>
          <SectionIntro title={t("profile.statsTitle")} />
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
            {stats.map((s) => (
              <StatTile key={s.label} icon={s.icon} value={s.value} label={s.label} />
            ))}
          </div>
        </section>

        {/* ================= Achievements ================= */}
        <section>
          <SectionIntro title={t("profile.achievementsTitle")} />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {achievements.map((a) => {
              const Icon = ACH_ICON[a.icon] ?? Award;
              const pct = Math.min(100, Math.round((a.progress / a.goal) * 100));
              return (
                <div
                  key={a.id}
                  className={`flex flex-col items-center gap-1.5 rounded-[20px] border p-3 text-center ${
                    a.unlocked
                      ? "border-[var(--color-caramel)]/40 bg-[var(--color-caramel)]/10"
                      : "border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)]"
                  }`}
                >
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-2xl shadow-sm ${
                      a.unlocked
                        ? "bg-gradient-to-br from-[var(--color-caramel)] to-[var(--color-copper)] text-white"
                        : "bg-[var(--color-cream)] text-[var(--color-muted-text)]"
                    }`}
                  >
                    <Icon className="h-5 w-5" aria-hidden />
                  </span>
                  <span className="text-[10px] font-bold leading-tight text-[var(--color-espresso)]">
                    {t(ACH_KEY[a.key] ?? "profile.achFirstBrew")}
                  </span>
                  {!a.unlocked ? (
                    <span className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-cream)]">
                      <span
                        className="block h-full rounded-full bg-[var(--color-caramel)]"
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </section>

        {/* ================= Recipes ================= */}
        <section>
          <SectionIntro title={t("profile.recipesTab")} />
          <HorizontalCarousel>
            {recipes.map((r: AnyRow) => (
              <RecipeCard key={r.id} recipe={toRecipeCard(r)} isAuthenticated={Boolean(user)} />
            ))}
          </HorizontalCarousel>
        </section>

        {/* ================= Gear ================= */}
        <section>
          <SectionIntro title={t("profile.gearTab")} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gear.slice(0, 6).map((g: AnyRow) => (
              <EquipmentCard
                key={g.id}
                id={g.id}
                name={g.equipment_model?.name ?? g.custom_name ?? "—"}
                brand={g.equipment_model?.brand?.name}
                categoryLabel={t(equipmentCategoryKey(g.category))}
                imageUrl={g.equipment_model?.image_url}
                isDefault={g.is_default}
                defaultLabel={t("myGear.default")}
              />
            ))}
          </div>
        </section>

        {/* ================= Preferred methods ================= */}
        {preferences?.preferred_brew_methods?.length ? (
          <section>
            <SectionIntro title={t("profile.favoriteMethods")} />
            <div className="flex flex-wrap gap-2">
              {preferences.preferred_brew_methods.map((m: string) => (
                <Badge key={m} variant="accent">
                  {t(brewMethodLabelKey(m))}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* ================= Activity ================= */}
        {activity.length > 0 ? (
        <section>
          <SectionIntro title={t("profile.activityTitle")} />
          <ol className="relative flex flex-col gap-3 ps-5">
            <span aria-hidden className="absolute bottom-2 start-[7px] top-2 w-px bg-[var(--color-border,#ece1d3)]" />
            {activity.map((a) => (
              <li key={a.id} className="relative">
                <span
                  aria-hidden
                  className="absolute -start-5 top-3 h-3 w-3 rounded-full border-2 border-[var(--color-surface,#fff)] bg-[var(--color-caramel)]"
                />
                <div className="rounded-2xl border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] px-4 py-2.5">
                  <p className="text-sm text-[var(--color-dark-text)]">
                    <span className="font-bold text-[var(--color-espresso)]">{a.label}</span> {a.detail}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted-text)]">
                    {new Date(a.at).toISOString().slice(0, 10)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>
        ) : null}
      </div>
    </div>
  );
}
