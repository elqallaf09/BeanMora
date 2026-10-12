-- Explicit membership checks also exclude anonymous authenticated sessions.
alter policy "owners read their recent profile visitors" on public.profile_visits
 using(profile_id=(select auth.uid()) and viewed_at>now()-interval '30 days'
  and coalesce((select auth.jwt()->>'is_anonymous'),'true')='false');
alter policy "only story owners read viewers" on public.coffee_story_views
 using(coalesce((select auth.jwt()->>'is_anonymous'),'true')='false'
  and exists(select 1 from public.coffee_stories s where s.id=story_id and s.user_id=(select auth.uid())));
