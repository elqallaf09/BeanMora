-- BeanMora only; narrow correction to an importer-owned public step, reviewed 2026-10-15.
begin;
do $correct_temperature$
declare v_step uuid; v_before text; v_after text; v_count integer;
begin
 perform pg_advisory_xact_lock(1742026104,401);
 select s.id into strict v_step from public.recipe_steps s
 join public.recipes r on r.id=s.recipe_id join public.profiles p on p.id=r.user_id
 where r.slug='harenna-cauca-espresso-18g-33ml' and r.visibility='public'
 and p.username='beanmora_official' and s.step_number=1
 and r.source_brew_parameters->'global_roasters_import'->>'import_id'='reviewed-catalog-2026-10-14'
 and exists(select 1 from public.recipe_sources rs where rs.recipe_id=r.id and rs.source_url='https://harennaroastery.com/dbErwra');
 select md5(coalesce(string_agg(md5(to_jsonb(s)::text),'' order by s.id),'')) into v_before from public.recipe_steps s where s.id<>v_step;
 update public.recipe_steps set
 description='Use 18 g coffee; the source lists 33 ml espresso in 28 seconds and 90° without a unit. Grinder, machine model and preparation steps are not published.',
 description_ar='استخدم 18 g بن؛ المصدر يذكر 33 ml إسبريسو خلال 28 ثانية و90° دون وحدة. موديل الماكينة والطاحونة وخطوات تجهيز البن غير منشورة.'
 where id=v_step and description in (
 'Use 18 g coffee at 90°C; the source lists 33 ml espresso in 28 seconds. Grinder, machine model and preparation steps are not published.',
 'Use 18 g coffee; the source lists 33 ml espresso in 28 seconds and 90° without a unit. Grinder, machine model and preparation steps are not published.')
 and description_ar in (
 'استخدم 18 g بن عند 90°C؛ المصدر يذكر 33 ml إسبريسو خلال 28 ثانية. موديل الماكينة والطاحونة وخطوات تجهيز البن غير منشورة.',
 'استخدم 18 g بن؛ المصدر يذكر 33 ml إسبريسو خلال 28 ثانية و90° دون وحدة. موديل الماكينة والطاحونة وخطوات تجهيز البن غير منشورة.');
 get diagnostics v_count=row_count;
 if v_count<>1 then raise exception 'Source step changed; refusing correction'; end if;
 select md5(coalesce(string_agg(md5(to_jsonb(s)::text),'' order by s.id),'')) into v_after from public.recipe_steps s where s.id<>v_step;
 if v_before is distinct from v_after then raise exception 'Unrelated steps changed'; end if;
end
$correct_temperature$;
select r.slug,s.description_ar,s.description from public.recipe_steps s join public.recipes r on r.id=s.recipe_id where r.slug='harenna-cauca-espresso-18g-33ml' and s.step_number=1;
commit;
