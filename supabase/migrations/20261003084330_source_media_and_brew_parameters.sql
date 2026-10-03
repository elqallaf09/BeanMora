-- Preserve source volume units and all published pour settings without claiming device compatibility.
alter table public.recipes add column source_brew_parameters jsonb not null default '{}'
  check (jsonb_typeof(source_brew_parameters) = 'object' and octet_length(source_brew_parameters::text) <= 50000);
comment on column public.recipes.source_brew_parameters is 'Public-source numeric brew facts. water_ml stays in ml; source model codes are not a verified compatibility claim.';

-- Source-linked means a checked, remotely hosted product image with attribution.
-- It is distinct from rights_confirmed: never downloaded to Storage or relicensed.
alter table public.equipment_models drop constraint equipment_models_image_usage_status_check;
alter table public.equipment_models add constraint equipment_models_image_usage_status_check
  check (image_usage_status in ('rights_confirmed','source_linked','rights_unknown','placeholder_only','removal_requested'));
alter table public.bean_images drop constraint bean_images_image_usage_status_check;
alter table public.bean_images add constraint bean_images_image_usage_status_check
  check (image_usage_status in ('rights_confirmed','source_linked','rights_unknown','placeholder_only','removal_requested'));
alter table public.product_images drop constraint product_images_image_usage_status_check;
alter table public.product_images add constraint product_images_image_usage_status_check
  check (image_usage_status in ('rights_confirmed','source_linked','rights_unknown','placeholder_only','removal_requested'));
alter table public.beans add constraint beans_source_linked_photo_has_source
  check (image_usage_status <> 'source_linked' or (source_url is not null and image_url like 'https://%'));
alter table public.equipment_models add constraint equipment_source_linked_photo_has_source
  check (image_usage_status <> 'source_linked' or (source_url is not null and image_url like 'https://%'));
