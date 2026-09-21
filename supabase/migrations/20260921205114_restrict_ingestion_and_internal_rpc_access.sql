-- Applied through the connected migration API; filename matches live history.
-- Preserve admin review access while enforcing the underlying tables' RLS.
alter view public.ingestion_review_queue set (security_invoker = true);
revoke all privileges on public.ingestion_review_queue from public, anon, authenticated;
grant select on public.ingestion_review_queue to authenticated;

-- Trigger firing does not require API roles to retain direct EXECUTE.
revoke all privileges on function public.handle_new_user() from public, anon, authenticated;

-- Preserve the existing signed-in, auth.uid()-scoped account deletion action.
-- This migration does not delete any account or modify its function body.
revoke all privileges on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

-- Admin maintenance now obeys ingestion_items RLS instead of bypassing it.
alter function public.purge_reviewed_excerpts() security invoker;
revoke all privileges on function public.purge_reviewed_excerpts() from public, anon;
grant execute on function public.purge_reviewed_excerpts() to authenticated, service_role;
