import type { SupabaseClient } from '@supabase/supabase-js';
import { contributionImage, requireMember } from './member-contributions';

export type SocialMedia = { id: string; uri: string; bytes: Uint8Array; type: 'image' | 'video'; mime: string; extension: string };
export type DirectAudience = 'everyone' | 'followers' | 'off';
export type DirectConversation = { id: string; user_a: string; user_b: string; created_at: string };
export type DirectMessage = { id: string; conversation_id: string; sender_id: string; kind: 'text' | 'post' | 'audio'; body: string | null; post_id: string | null; audio_path: string | null; duration_seconds: number | null; expires_at: string; created_at: string; edited_at: string | null };
export type CoffeeStory = { id: string; user_id: string; media_path: string; media_type: 'image' | 'video'; category: 'coffee' | 'brewing' | 'equipment' | 'coffee_corner'; caption: string; status: 'pending' | 'approved' | 'rejected'; expires_at: string | null; created_at: string; review_reason: string | null };
export type SocialSanction = { strikes: number; banned_at: string | null; reason: string | null };

export function socialMediaType(bytes: Uint8Array, type: 'image' | 'video') {
  if (!bytes.length || bytes.length > 15 * 1024 * 1024) throw new Error('MEDIA_SIZE');
  if (type === 'image') return contributionImage(bytes);
  const header = String.fromCharCode(...bytes.slice(4, 8));
  if (header === 'ftyp') return { mime: 'video/mp4', extension: 'mp4' };
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { mime: 'video/webm', extension: 'webm' };
  throw new Error('MEDIA_FORMAT');
}
export async function uploadSocialMedia(db: SupabaseClient, owner: string, bucket: 'post-media' | 'coffee-stories', media: SocialMedia) {
  await requireMember(db, owner);
  const format = socialMediaType(media.bytes, media.type);
  const path = `${owner}/${media.id}.${format.extension}`;
  const { error } = await db.storage.from(bucket).upload(path, media.bytes.slice().buffer, { contentType: format.mime, upsert: false });
  if (error && !('statusCode' in error && String(error.statusCode) === '409')) throw error;
  return path;
}
export async function saveCommunityPost(db: SupabaseClient, owner: string, values: { id: string; body: string; language: 'ar' | 'en' | 'ja'; path?: string | null; type?: 'image' | 'video' | null; brewId?: string | null; replaceMedia?: boolean }) {
  await requireMember(db, owner);
  if (values.body.trim().length > 3000) throw new Error('POST_LENGTH');
  const { data, error } = await db.rpc('save_community_post', { p_id: values.id, p_body: values.body.trim(), p_language: values.language, p_media_path: values.path ?? null, p_media_type: values.type ?? null, p_brew_id: values.brewId ?? null, p_replace_media: values.replaceMedia ?? true });
  if (error || data !== values.id) throw error ?? new Error('POST_SAVE');
}
export async function deleteCommunityPost(db: SupabaseClient, owner: string, id: string) {
  await requireMember(db, owner);
  const { data, error } = await db.from('posts').delete().eq('id', id).eq('user_id', owner).select('id').single();
  if (error || data?.id !== id) throw error ?? new Error('POST_DELETE');
}
export async function directAudience(db: SupabaseClient, owner: string): Promise<DirectAudience> {
  await requireMember(db, owner);
  const { data, error } = await db.from('direct_message_preferences').select('audience').eq('user_id', owner).maybeSingle();
  if (error) throw error;
  return data?.audience ?? 'everyone';
}
export async function saveDirectAudience(db: SupabaseClient, owner: string, audience: DirectAudience) {
  await requireMember(db, owner);
  const { data, error } = await db.from('direct_message_preferences').upsert({ user_id: owner, audience }).select('audience').single();
  if (error || data?.audience !== audience) throw error ?? new Error('MESSAGES_SETTINGS');
}
export async function startDirect(db: SupabaseClient, owner: string, recipient: string) {
  await requireMember(db, owner);
  const { data, error } = await db.rpc('start_direct_conversation', { p_recipient: recipient });
  if (error || typeof data !== 'string') throw error ?? new Error('MESSAGES_CLOSED');
  return data;
}
export async function sendDirect(db: SupabaseClient, owner: string, message: Omit<DirectMessage, 'created_at' | 'sender_id' | 'expires_at' | 'edited_at'>) {
  await requireMember(db, owner);
  if (message.kind === 'audio' && (!message.duration_seconds || message.duration_seconds > 60)) throw new Error('VOICE_LIMIT');
  const values = { ...message, sender_id: owner };
  const { data, error } = await db.from('direct_messages').insert(values).select('id').single();
  if (error?.code === '23505') {
    const retry = await db.from('direct_messages').select('id,sender_id,conversation_id').eq('id', message.id).single();
    if (!retry.error && retry.data?.sender_id === owner && retry.data.conversation_id === message.conversation_id) return;
  }
  if (error || data?.id !== message.id) throw error ?? new Error('MESSAGE_SEND');
}
export async function editDirect(db: SupabaseClient, owner: string, message: DirectMessage, body: string) {
  await requireMember(db, owner);
  if (message.sender_id !== owner || message.kind === 'audio' || Date.parse(message.expires_at) <= Date.now()) throw new Error('MESSAGE_EDIT_DENIED');
  const text = body.trim();
  if (text.length > 3000 || (message.kind === 'text' && !text)) throw new Error('MESSAGE_BODY');
  const { data, error } = await db.from('direct_messages').update({ body: text || null }).eq('id', message.id).eq('sender_id', owner).select('id').single();
  if (error || data?.id !== message.id) throw error ?? new Error('MESSAGE_EDIT');
}
export async function deleteDirect(db: SupabaseClient, owner: string, message: DirectMessage) {
  await requireMember(db, owner);
  if (message.sender_id !== owner) throw new Error('MESSAGE_OWNER_REQUIRED');
  const { data, error } = await db.from('direct_messages').delete().eq('id', message.id).eq('sender_id', owner).select('id').single();
  if (error || data?.id !== message.id) throw error ?? new Error('MESSAGE_DELETE');
  if (message.audio_path) await db.storage.from('direct-audio').remove([message.audio_path]);
}
export async function submitCoffeeStory(db: SupabaseClient, owner: string, media: SocialMedia, category: CoffeeStory['category'], caption: string) {
  await requireMember(db, owner);
  const path = await uploadSocialMedia(db, owner, 'coffee-stories', media);
  // Publication and the 24-hour lifetime are assigned by the server, including
  // submissions from older clients that still send status=pending.
  const values = { id: media.id, user_id: owner, media_path: path, media_type: media.type, category, caption: caption.trim(), rights_confirmed: true };
  const { data, error } = await db.from('coffee_stories').insert(values).select('id').single();
  if (error?.code === '23505') {
    const retry = await db.from('coffee_stories').select('id,user_id,media_path').eq('id', media.id).single();
    if (!retry.error && retry.data?.user_id === owner && retry.data.media_path === path) return;
  }
  if (error || data?.id !== media.id) throw error ?? new Error('STORY_SAVE');
}

export async function editProfilePhoto(db: SupabaseClient, owner: string, id: string, caption: string, kind: 'extraction' | 'corner', imagePath?: string) {
  await requireMember(db, owner);
  const { data, error } = await db.from('profile_photos').update({ caption: caption.trim(), kind, ...(imagePath ? { image_path: imagePath } : {}) }).eq('id', id).eq('user_id', owner).select('id').single();
  if (error || data?.id !== id) throw error ?? new Error('PHOTO_EDIT');
}
export async function removeProfilePhoto(db: SupabaseClient, owner: string, id: string) {
  await requireMember(db, owner);
  const { data, error } = await db.from('profile_photos').delete().eq('id', id).eq('user_id', owner).select('id,image_path').single();
  if (error || data?.id !== id) throw error ?? new Error('PHOTO_DELETE');
  // The visible entry is deleted first; an orphaned private file is still covered
  // by account deletion cleanup if Storage removal fails.
  if (data.image_path) await db.storage.from('profile-gallery').remove([data.image_path]);
}
