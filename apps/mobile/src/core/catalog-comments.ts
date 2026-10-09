import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMember } from "./member-contributions";
export type CommentTarget = "recipe" | "bean" | "product";
export type CatalogComment = {
  id: string;
  body: string;
  created_at: string;
  author: { name: string; username: string } | null;
};
const table = (kind: CommentTarget) =>
  kind === "recipe" ? "comments" : "coffee_comments";
const column = (kind: CommentTarget) =>
  kind === "recipe" ? "recipe_id" : kind === "bean" ? "bean_id" : "product_id";
export async function loadCatalogComments(
  db: SupabaseClient,
  kind: CommentTarget,
  id: string,
): Promise<CatalogComment[]> {
  const { data, error } = await db
    .from(table(kind))
    .select("id,body,created_at,author:profiles(name,username)")
    .eq(column(kind), id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as CatalogComment[];
}
export async function addCatalogComment(
  db: SupabaseClient,
  kind: CommentTarget,
  target: string,
  id: string,
  body: string,
  locale: "ar" | "en" | "ja",
) {
  const owner = await requireMember(db);
  const text = body.trim();
  if (text.length < 2 || text.length > 2000) throw new Error("COMMENT_LENGTH");
  const { data, error } = await db
    .from(table(kind))
    .insert({
      id,
      user_id: owner,
      [column(kind)]: target,
      body: text,
      ...(kind === "recipe" ? { content_language: locale } : {}),
    })
    .select("id")
    .single();
  if (error?.code === "23505") {
    const { data: old, error: readError } = await db
      .from(table(kind))
      .select("id,body,user_id")
      .eq("id", id)
      .eq("user_id", owner)
      .eq(column(kind), target)
      .single();
    if (!readError && old?.body === text) return id;
  }
  if (error || data?.id !== id) throw new Error("COMMENT_SAVE");
  return id;
}
