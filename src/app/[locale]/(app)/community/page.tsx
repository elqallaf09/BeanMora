import { getTranslations } from "next-intl/server";
import { Users } from "lucide-react";

import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { SectionIntro } from "@/components/coffee/editorial";
import { HorizontalCarousel } from "@/components/coffee/carousel";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { Button } from "@/components/ui/button";
import { PostLikeButton, FollowButton, PostMoreMenu } from "./community-actions";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

const POST_SELECT =
  "id, body, created_at, user_id, author:profiles(name, username, avatar_url), recipe:recipes(id, title), media:post_media(url, position), likes:post_likes(count), comment_list:comments(count)";

function timeAgo(iso: string | null | undefined): string | undefined {
  if (!iso) return undefined;
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "now";
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function CommunityPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "following" ? "following" : "explore";
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: myFollows }, { data: myLikes }] = await Promise.all([
    user ? supabase.from("follows").select("following_id").eq("follower_id", user.id) : Promise.resolve({ data: [] }),
    user ? supabase.from("post_likes").select("post_id").eq("user_id", user.id) : Promise.resolve({ data: [] }),
  ]);

  const followingIds = (myFollows ?? []).map((f: AnyRow) => f.following_id);
  const likedPostIds = new Set((myLikes ?? []).map((l: AnyRow) => l.post_id));

  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("visibility", "public")
    .eq("is_hidden", false);
  if (activeTab === "following" && followingIds.length > 0) {
    query = query.in("user_id", followingIds);
  }
  const { data: postsRaw } = await query.order("created_at", { ascending: false }).limit(20);

  const posts = ((postsRaw ?? []) as AnyRow[]);

  // Distinct authors, used for the "brewers to follow" rail at the top.
  const authors = Array.from(
    new Map(
      posts
        .filter((p: AnyRow) => p.author?.username)
        .map((p: AnyRow) => [p.author.username, { ...p.author, userId: p.user_id ?? p.author.username }]),
    ).values(),
  ).slice(0, 8) as AnyRow[];

  return (
    <div className="mx-auto max-w-2xl px-4 py-5 sm:px-6 lg:py-8">
      <header className="mb-6"><p className="type-eyebrow text-[var(--color-copper)]">{t("brand.name")}</p><h1 className="type-headline mt-2.5 text-[var(--color-espresso)]">{t("community.title")}</h1></header>

      <div className="mb-6 flex gap-1 rounded-full bg-[var(--color-cream)] p-1.5">
        {(["explore", "following"] as const).map((key) => (
          <Link
            key={key}
            href={`/community?tab=${key}`}
            className={`flex-1 rounded-full py-2.5 text-center text-sm font-bold transition-all ${
              activeTab === key
                ? "bg-[var(--color-surface,#fff)] text-[var(--color-espresso)] shadow-md"
                : "text-[var(--color-muted-text)] hover:text-[var(--color-espresso)]"
            }`}
          >
            {t(key === "explore" ? "community.tabExplore" : "community.tabFollowing")}
          </Link>
        ))}
      </div>

      {/* Brewers rail — story-style avatars */}
      {authors.length > 0 ? (
        <section className="mb-7">
          <SectionIntro title={t("community.brewersTitle")} />
          <HorizontalCarousel>
            {authors.map((a: AnyRow) => (
              <Link
                key={a.username}
                href={`/profile/${a.username}`}
                className="flex w-[76px] flex-col items-center gap-1.5 text-center"
              >
                <span className="relative block h-[68px] w-[68px] rounded-full bg-gradient-to-br from-[var(--color-caramel)] to-[var(--color-teal)] p-[2.5px]">
                  <span className="relative block h-full w-full overflow-hidden rounded-full ring-2 ring-[var(--color-surface,#fff)]">
                    <ImageWithFallback
                      src={a.avatar_url}
                      alt={a.name ?? a.username}
                      fallbackSeed={a.username}
                      artKind="roaster"
                      fill
                      sizes="68px"
                    />
                  </span>
                </span>
                <span className="line-clamp-1 text-[11px] font-semibold text-[var(--color-dark-text)]">
                  {a.name ?? a.username}
                </span>
              </Link>
            ))}
          </HorizontalCarousel>
        </section>
      ) : null}

      {/* Feed */}
      {posts.length === 0 ? (
        activeTab === "following" ? (
          <RichEmptyState
            icon={Users}
            title={t("community.followingEmptyTitle")}
            description={t("community.followingEmptyHint")}
            action={
              <Button asChild variant="accent">
                <Link href="/community?tab=explore">{t("community.followingEmptyCta")}</Link>
              </Button>
            }
          />
        ) : (
          <RichEmptyState
            icon={Users}
            title={t("community.exploreEmptyTitle")}
            description={t("community.exploreEmptyHint")}
          />
        )
      ) : (
      <div className="flex flex-col gap-6">
        {posts.map((post: AnyRow) => {
          const authorName = post.author?.name ?? post.author?.username ?? "";
          const isFollowingAuthor = followingIds.includes(post.user_id);
          const isSelf = user?.id === post.user_id;
          const likeCount = post.likeCount ?? post.likes?.[0]?.count ?? 0;
          const commentCount = post.commentCount ?? post.comment_list?.[0]?.count ?? 0;

          return (
            <article
              key={post.id}
              className="overflow-hidden rounded-[26px] border border-[var(--color-border,#ece1d3)] bg-[var(--color-surface,#fff)] shadow-sm transition-shadow hover:shadow-lg"
            >
              <header className="flex items-center gap-3 px-4 py-3.5">
                <Link
                  href={`/profile/${post.author?.username ?? ""}`}
                  className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--color-caramel)]/30"
                >
                  <ImageWithFallback
                    src={post.author?.avatar_url}
                    alt={authorName}
                    fallbackSeed={post.author?.username ?? post.id}
                    artKind="roaster"
                    fill
                    sizes="44px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/profile/${post.author?.username ?? ""}`}
                    className="line-clamp-1 text-sm font-bold text-[var(--color-espresso)] hover:underline"
                  >
                    {authorName}
                  </Link>
                  <p className="text-[11px] text-[var(--color-muted-text)]">
                    {[post.author?.username ? `@${post.author.username}` : null, timeAgo(post.created_at)]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                {!isSelf && post.user_id ? (
                  <FollowButton
                    targetUserId={post.user_id}
                    initialFollowing={isFollowingAuthor}
                    isAuthenticated={Boolean(user)}
                  />
                ) : null}
                <PostMoreMenu postId={post.id} />
              </header>

              {post.body ? (
                <p className="px-4 pb-3.5 text-[15px] leading-relaxed text-[var(--color-dark-text)]">
                  {post.body}
                </p>
              ) : null}

              {/* Every post gets imagery — generated coffee artwork stands in
                  when the post has no uploaded media, so the feed never
                  renders as a wall of bare text rows. */}
              <Link href={`/community/${post.id}`} className="group relative block aspect-[4/3] w-full overflow-hidden">
                <ImageWithFallback
                  src={post.media?.[0]?.url}
                  alt={post.body ?? authorName}
                  fallbackSeed={post.id}
                  artKind="post"
                  fill
                  sizes="(max-width: 768px) 100vw, 640px"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                {post.recipe?.title ? (
                  <span className="absolute bottom-3 start-3 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-ink-fixed)]/85 px-3.5 py-2 text-xs font-semibold text-[var(--color-soft-white)] backdrop-blur-md">
                    {post.recipe.title}
                  </span>
                ) : null}
              </Link>

              <footer className="flex items-center gap-5 px-4 py-3.5">
                <PostLikeButton
                  postId={post.id}
                  initialLiked={likedPostIds.has(post.id)}
                  initialCount={likeCount}
                  isAuthenticated={Boolean(user)}
                />
                <Link
                  href={`/community/${post.id}`}
                  className="text-xs font-semibold text-[var(--color-muted-text)] hover:text-[var(--color-espresso)]"
                >
                  {commentCount} {t("community.comment")}
                </Link>
              </footer>
            </article>
          );
        })}
      </div>
      )}
    </div>
  );
}
