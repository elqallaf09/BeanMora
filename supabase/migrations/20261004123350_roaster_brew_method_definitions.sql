-- Stable brewer codes used verbatim by the reviewed roaster recipes.
-- Preserve existing definitions and let the database generate their IDs.
alter table public.brew_methods drop constraint brew_methods_code_check;
alter table public.brew_methods add constraint brew_methods_code_check
  check (code in ('v60','espresso','xbloom','aeropress','chemex','french_press','cold_brew','moka_pot','kalita_wave','origami','april','orea','switch','pour_over','auto_drip'));

insert into public.brew_methods (code, name_ar, name_en) values
  ('april', 'إبريل', 'April'),
  ('orea', 'OREA', 'OREA'),
  ('switch', 'هاريو سويتش', 'Hario Switch'),
  ('pour_over', 'ترشيح يدوي', 'Pour over'),
  ('auto_drip', 'تقطير آلي', 'Auto drip')
on conflict (code) do nothing;
