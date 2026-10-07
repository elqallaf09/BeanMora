import type { SupabaseClient } from "@supabase/supabase-js";
import { requireMember } from "./member-contributions";
export type MemberIdentity = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  is_private: boolean;
  request_id?: string;
};
export type ProfileRecipe = {
  id: string;
  title: string;
  title_ar: string | null;
  brew_method: string;
  visibility?: string;
};
export type MemberProfileData = {
  profile: MemberIdentity & {
    bio: string | null;
    share_collection: boolean | null;
  };
  can_view: boolean;
  is_owner: boolean;
  relationship: "pending" | "accepted" | null;
  follower_count: number;
  following_count: number;
  followers?: MemberIdentity[];
  following?: MemberIdentity[];
  requests?: MemberIdentity[];
  recipes?: ProfileRecipe[];
  favorites?: ProfileRecipe[];
  equipment?: {
    id: string;
    equipment_model_id: string | null;
    category: string;
    name: string;
    name_ar: string | null;
    operation: [string, string] | null;
  }[];
  beans?: {
    id: string;
    coffee_id: string;
    kind: "bean" | "product";
    name_ar: string;
    name_en: string;
    slug: string;
  }[];
  comments?: {
    id: string;
    body: string;
    created_at: string;
    kind: "recipe" | "bean" | "product";
    target_id: string;
    name_ar: string;
    name_en: string;
  }[];
  photos?: {
    id: string;
    kind: "extraction" | "corner";
    image_url: string;
    caption: string;
    created_at: string;
  }[];
};
export async function memberDirectory(
  db: SupabaseClient,
  query: string,
  offset = 0,
): Promise<MemberIdentity[]> {
  const { data, error } = await db.rpc("search_member_profiles", {
    p_query: query.trim().replace(/^@/, ""),
    p_offset: offset,
  });
  if (error) throw error;
  return data ?? [];
}
export async function memberProfile(
  db: SupabaseClient,
  username: string,
): Promise<MemberProfileData | null> {
  const { data, error } = await db.rpc("get_member_profile", {
    p_username: username,
  });
  if (error) throw error;
  return data?.profile?.id ? data : null;
}
export async function ownUsername(db: SupabaseClient, owner: string) {
  await requireMember(db, owner);
  const { data, error } = await db
    .from("profiles")
    .select("username")
    .eq("id", owner)
    .single();
  if (error || !data?.username) throw new Error("PROFILE_LOAD");
  return data.username as string;
}
export async function updateMemberProfile(
  db: SupabaseClient,
  owner: string,
  values: {
    name: string;
    username: string;
    bio: string;
    is_private: boolean;
    share_collection: boolean;
  },
) {
  await requireMember(db, owner);
  const name = values.name.trim(),
    username = values.username.trim().toLowerCase().replace(/^@/, ""),
    bio = values.bio.trim();
  if (
    name.length < 2 ||
    name.length > 100 ||
    !/^[a-z0-9_]{3,30}$/.test(username) ||
    bio.length > 2000
  )
    throw new Error("PROFILE_FIELDS");
  const { data, error } = await db
    .from("profiles")
    .update({ ...values, name, username, bio })
    .eq("id", owner)
    .select("id")
    .single();
  if (error || data?.id !== owner)
    throw new Error(
      error?.code === "23505" ? "USERNAME_TAKEN" : "PROFILE_SAVE",
    );
  return username;
}
export async function changeMemberFollow(
  db: SupabaseClient,
  owner: string,
  target: string,
  current: "pending" | "accepted" | null,
) {
  await requireMember(db, owner);
  if (owner === target) throw new Error("SELF_FOLLOW");
  if (current) {
    const { error } = await db
      .from("follows")
      .delete()
      .eq("follower_id", owner)
      .eq("following_id", target);
    if (error) throw error;
    return null;
  }
  const { data, error } = await db
    .from("follows")
    .insert({ follower_id: owner, following_id: target })
    .select("status")
    .single();
  if (error || !["pending", "accepted"].includes(data?.status))
    throw new Error("FOLLOW_SAVE");
  return data.status as "pending" | "accepted";
}
export async function decideMemberRequest(
  db: SupabaseClient,
  owner: string,
  id: string,
  accept: boolean,
) {
  await requireMember(db, owner);
  const q = accept
    ? db.from("follows").update({ status: "accepted" })
    : db.from("follows").delete();
  const { data, error } = await q
    .eq("id", id)
    .eq("following_id", owner)
    .select("id")
    .single();
  if (error || data?.id !== id) throw new Error("FOLLOW_APPROVAL");
}
export async function setMemberFavorite(
  db: SupabaseClient,
  owner: string,
  recipeId: string,
  saved: boolean,
) {
  await requireMember(db, owner);
  if (saved) {
    const { data, error } = await db
      .from("recipe_saves")
      .upsert(
        { user_id: owner, recipe_id: recipeId },
        { onConflict: "recipe_id,user_id" },
      )
      .select("recipe_id")
      .single();
    if (error || data?.recipe_id !== recipeId) throw new Error("FAVORITE_SAVE");
  } else {
    const { error } = await db
      .from("recipe_saves")
      .delete()
      .eq("user_id", owner)
      .eq("recipe_id", recipeId);
    if (error) throw error;
  }
}
export async function saveProfilePhoto(
  db: SupabaseClient,
  owner: string,
  id: string,
  kind: "extraction" | "corner",
  path: string,
  caption: string,
) {
  await requireMember(db, owner);
  const { data, error } = await db.rpc("save_profile_photo", {
    p_id: id,
    p_kind: kind,
    p_path: path,
    p_caption: caption,
  });
  if (error || data !== id) throw new Error("PHOTO_SAVE");
}
