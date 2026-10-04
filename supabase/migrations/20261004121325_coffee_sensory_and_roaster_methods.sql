-- Published roaster scales retain their source and original denominator.
-- No numerical profiles are inferred from tasting-note words.
alter table public.beans add column if not exists sensory_profile jsonb not null default '{}'::jsonb
  check (jsonb_typeof(sensory_profile) = 'object' and octet_length(sensory_profile::text) <= 8000);
alter table public.roasted_products add column if not exists sensory_profile jsonb not null default '{}'::jsonb
  check (jsonb_typeof(sensory_profile) = 'object' and octet_length(sensory_profile::text) <= 8000);
comment on column public.beans.sensory_profile is 'Source-backed sensory values only. source_url, scale_max, optional acidity/sweetness/body/fermentation/roast. Unknown values absent; never infer intensity from flavor notes.';
comment on column public.roasted_products.sensory_profile is 'Source-backed sensory values only, preserving the source scale and source_url. Unknown values remain absent.';

alter table public.beans add column if not exists image_kind text not null default 'unclassified'
  check (image_kind in ('packaging','product_artwork','origin_photo','unclassified'));
alter table public.roasted_products add column if not exists image_kind text not null default 'unclassified'
  check (image_kind in ('packaging','product_artwork','origin_photo','unclassified'));
comment on column public.beans.image_kind is 'What the verified image depicts; product artwork and origin photographs are labelled separately from actual packaging.';
comment on column public.roasted_products.image_kind is 'What the verified image depicts; not an image-rights assertion.';

-- Preserve the complete validated outcome function and extend only its method
-- allowlist to the actual brewers used by the reviewed roaster recipe catalog.
do $patch$
declare
  definition text := pg_get_functiondef('public.record_brew_outcome_v1(uuid,jsonb)'::regprocedure);
  previous text := 'array[''v60'',''espresso'',''xbloom'',''aeropress'',''chemex'',''french_press'',''cold_brew'',''moka_pot'',''origami'',''kalita_wave'']';
  expanded text := 'array[''v60'',''espresso'',''xbloom'',''aeropress'',''chemex'',''french_press'',''cold_brew'',''moka_pot'',''origami'',''kalita_wave'',''april'',''orea'',''switch'',''pour_over'',''auto_drip'']';
begin
  if position(expanded in definition) > 0 then return; end if;
  if position(previous in definition) = 0 then raise exception 'Expected supported-method guard was not found'; end if;
  execute replace(definition, previous, expanded);
end;
$patch$;
