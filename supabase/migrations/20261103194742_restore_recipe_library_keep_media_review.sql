-- Restore the recipe library at the owner's explicit request, 3 November 2026.
-- This is a publication decision, not confirmation of third-party licensing.
-- Original media remains archived; no records or recipe children are deleted.
set local lock_timeout = '5s';
set local statement_timeout = '30s';
update private.content_rights_holds
set replacement_values=jsonb_build_object('rights_suspended',false,'cover_image_url',null,'cover_image_usage_status','placeholder_only','cover_image_permission_ref',null),
reason='Owner requested full recipe library restoration on 2026-11-03. Only publisher cover images remain held. Recipe rights review is still pending.'
where table_name='recipes' and active;
alter table public.recipes disable trigger maintain_recipe_search_documents;
update public.recipes r set rights_suspended=false
from private.content_rights_holds h where h.table_name='recipes' and h.record_id=r.id and h.active;
alter table public.recipes enable trigger maintain_recipe_search_documents;
notify pgrst, 'reload schema';
