-- Expand supported language tags without changing ownership, visibility, RLS,
-- grants or any existing content. Tags use the app's explicit BCP 47 choices.
alter table public.posts drop constraint posts_content_language_check;
alter table public.posts add constraint posts_content_language_check
  check (content_language in ('ar','en','ja','fr','it','es','pt-BR','zh-CN'));
alter table public.comments drop constraint comments_content_language_check;
alter table public.comments add constraint comments_content_language_check
  check (content_language in ('ar','en','ja','fr','it','es','pt-BR','zh-CN'));
alter table public.recipes drop constraint recipes_content_language_check;
alter table public.recipes add constraint recipes_content_language_check
  check (content_language in ('ar','en','ja','fr','it','es','pt-BR','zh-CN'));
