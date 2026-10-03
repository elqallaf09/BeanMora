-- Supabase default function grants include anon explicitly, independently of PUBLIC.
revoke execute on function public.moderate_equipment_review(uuid, boolean, text) from anon;
