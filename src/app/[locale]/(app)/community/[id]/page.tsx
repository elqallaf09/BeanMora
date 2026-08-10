import { getTranslations } from "next-intl/server";
import { Coffee, MessageCircle, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ImageWithFallback } from "@/components/coffee/image-with-fallback";
import { RichEmptyState } from "@/components/coffee/empty-states";
import { SectionIntro, EditorialMedia } from "@/components/coffee/editorial";
import { PostLikeButton, FollowButton } from "../community-actions";
import { CommentBox } from "./comment-box";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = any;

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTranslations();
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: postRaw } = await supabase
    .from("posts")
    .select(
      "id, body, created_at, user_id, author:profiles(name, username, avatar_url), recipe:recipes(id, title), media:post_media(url, position), likes:post_likes(count)",
    )
    .eq("id", id)
    .maybeSingle();
  const post = postRaw as AnyRow;

  if (!post) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <RichEmptyState
          icon={Users}
          title={t("community.postNotFound")}
          action={
            <Button asChild variant="accent">
              <Link href="/community">{t("community.backToCommunity")}</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const [{ data: myLike }, { data: commentsRaw }, { data: isFollowingRow }] = await Promise.all([
    user ? supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    supabase
      .from("comments")
      .select("id, body, created_at, author:profiles(name, username, avatar_url)")
      .eq("post_id", id)
      .order("created_at", { ascending: true })
      .limit(50),
    user && post.user_id && user.id !== post.user_id
      ? supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", post.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const comments = ((commentsRaw ?? []) as AnyRow[]);
  const isFollowing = Boolean(isFollowingRow);
  const isSelf = Boolean(user?.id && post.user_id && user.id === post.user_id);
  const authorName = post.author?.name ?? post.author?.username ?? "";

  return (
    <div>
      {/* ============ Full-bleed post hero ============ */}
      <div className="texture-grain relative isolate min-h-[380px] overflow-hidden sm:min-h-[460px]">
        <div className="absolute inset-0 -z-20">
          <EditorialMedia
            src={post.media?.[0]?.url}
            alt={post.body ?? authorName}
            seed={post.id}
            artKind="post"
            kenBurns
            priority
            sizes="100vw"
          />
        </div>
        <div aria-hidden className="scrim-bottom absolute inset-0 -z-10" />

        <div className="relative mx-auto flex min-h-[380px] max-w-2xl flex-col justify-end gap-4 px-4 pb-8 pt-10 text-[var(--color-cream)] sm:min-h-[460px] sm:px-6">
          {/* Creator strip */}
          <div className="flex items-center gap-3">
            <Link
              href={`/profile/${post.author?.username ?? ""}`}
              className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl shadow-warm-lg ring-2 ring-white/25"
            >
              <ImageWithFallback
                src={post.author?.avatar_url}
                alt={authorName}
                fallbackSeed={post.author?.username ?? post.id}
                artKind="roaster"
                fill
                sizes="56px"
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/profile/${post.author?.username ?? ""}`} className="block truncate text-base font-extrabold hover:underline">
                {authorName}
              </Link>
              {post.author?.username ? (
                <p className="text-xs text-white/60">@{post.author.username}</p>
              ) : null}
            </div>
            {!isSelf && post.user_id ? (
              <FollowButton
                targetUserId={post.user_id}
                initialFollowing={Boolean(isFollowing)}
                isAuthenticated={Boolean(user)}
              />
            ) : null}
          </div>

          {post.body ? <p className="type-lede max-w-[46ch] text-balance">{post.body}</p> : null}

          {post.recipe?.title ? (
            <Link
              href={`/recipes/${post.recipe.id}`}
              className="glass inline-flex w-fit items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-transform hover:scale-[1.03]"
            >
              <Coffee className="h-3.5 w-3.5" aria-hidden />
              {post.recipe.title}
            </Link>
          ) : null}

          <div className="glass flex w-fit items-center gap-5 rounded-2xl px-5 py-3">
            <PostLikeButton
              postId={post.id}
              initialLiked={Boolean(myLike)}
              initialCount={post.likeCount ?? post.likes?.[0]?.count ?? 0}
              isAuthenticated={Boolean(user)}
            />
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-white/80">
              <MessageCircle className="h-4 w-4" aria-hidden />
              <span className="tabular-nums">{comments.length}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ============ Comment thread ============ */}
      <section className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <SectionIntro
          index="01"
          eyebrow={t("community.title")}
          title={t("community.commentsTitle")}
        />

        <div className="mb-6">
          <CommentBox postId={post.id} isAuthenticated={Boolean(user)} />
        </div>

        {comments.length === 0 ? (
          <p className="surface-panel rounded-[var(--radius-tile)] px-5 py-6 text-center text-sm text-[var(--color-muted-text)]">
            {t("community.noComments")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {comments.map((c: AnyRow) => (
              <li key={c.id} className="surface-panel flex gap-3.5 rounded-[var(--radius-card)] p-4">
                <Link
                  href={`/profile/${c.author?.username ?? ""}`}
                  className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full ring-2 ring-[var(--color-caramel)]/25"
                >
                  <ImageWithFallback
                    src={c.author?.avatar_url}
                    alt={c.author?.name ?? ""}
                    fallbackSeed={c.author?.username ?? c.id}
                    artKind="roaster"
                    fill
                    sizes="40px"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/profile/${c.author?.username ?? ""}`}
                      className="truncate text-sm font-extrabold text-[var(--color-espresso)] hover:underline"
                    >
                      {c.author?.name ?? c.author?.username}
                    </Link>
                    {c.created_at ? (
                      <span className="shrink-0 text-[11px] text-[var(--color-muted-text)]">
                        {new Date(c.created_at).toISOString().slice(0, 10)}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-dark-text)]">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
