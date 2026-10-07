"""Emit bounded, idempotent catalog DML; --commit applies, default rolls back."""
import argparse
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--commit', action='store_true')
args = parser.parse_args()
data = json.loads(Path(__file__).with_name('reviewed.json').read_text())
assert len(data['models']) == 44
assert len({row['id'] for row in data['models']}) == 44
for row in data['models']:
    assert row['source_url'].startswith('https://')
    assert row['image_url'].startswith('https://')
    assert all(isinstance(v, list) and len(v) == 2 for v in row['facts'].values())
payload = json.dumps(data, ensure_ascii=False).replace("'", "''")
print("BEGIN;\nSELECT pg_advisory_xact_lock(hashtext('beanmora-equipment-review-20261007'));")
print("DO $review$\nDECLARE payload jsonb := '" + payload + "'::jsonb; row jsonb; target uuid; brand uuid; BEGIN")
print("""
  FOR row IN SELECT value FROM jsonb_array_elements(payload->'models') LOOP
    INSERT INTO public.equipment_brands(name) VALUES(row->>'brand') ON CONFLICT(name) DO NOTHING;
    SELECT id INTO brand FROM public.equipment_brands WHERE name=row->>'brand';
    SELECT id INTO target FROM public.equipment_models WHERE id=(row->>'id')::uuid;
    IF target IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.equipment_models WHERE id=target AND name=row->>'name') THEN
      RAISE EXCEPTION 'Equipment identity changed: %', row->>'id';
    END IF;
    IF target IS NULL AND EXISTS (SELECT 1 FROM public.equipment_models WHERE name=row->>'name') THEN
      RAISE EXCEPTION 'Model already exists under another id: %', row->>'name';
    END IF;
    INSERT INTO public.equipment_models(id, name, brand_id, category, description, specifications,
      official_url, source_url, source_name, source_type, last_verified_at, data_confidence,
      requires_review, image_url, image_source_url, image_usage_status, suitable_brew_methods)
    VALUES ((row->>'id')::uuid, row->>'name', brand, row->>'category', row->>'description_en',
      jsonb_build_object('catalog', jsonb_build_object('schema_version',1,'name_ar',row->>'name_ar',
        'description_ar',row->>'description_ar','description_en',row->>'description_en','facts',row->'facts')),
      row->>'source_url', row->>'source_url', row->>'brand', 'official_product_page',
      (row->>'verified_at')::timestamptz, 'official', false, row->>'image_url', row->>'image_source_url',
      'source_linked', CASE WHEN row->>'category'='espresso_machine' THEN ARRAY['espresso'] ELSE ARRAY[]::text[] END)
    ON CONFLICT(id) DO UPDATE SET
      brand_id=EXCLUDED.brand_id, category=EXCLUDED.category, description=EXCLUDED.description,
      specifications=coalesce(equipment_models.specifications,'{}'::jsonb) || EXCLUDED.specifications,
      official_url=EXCLUDED.official_url, source_url=EXCLUDED.source_url, source_name=EXCLUDED.source_name,
      source_type=EXCLUDED.source_type, last_verified_at=EXCLUDED.last_verified_at,
      data_confidence=EXCLUDED.data_confidence, requires_review=false,
      image_url=CASE WHEN equipment_models.image_usage_status IN ('rights_confirmed','removal_requested') THEN equipment_models.image_url ELSE EXCLUDED.image_url END,
      image_source_url=CASE WHEN equipment_models.image_usage_status IN ('rights_confirmed','removal_requested') THEN equipment_models.image_source_url ELSE EXCLUDED.image_source_url END,
      image_usage_status=CASE WHEN equipment_models.image_usage_status IN ('rights_confirmed','removal_requested') THEN equipment_models.image_usage_status ELSE EXCLUDED.image_usage_status END;
  END LOOP;
  FOR row IN SELECT value FROM jsonb_array_elements(payload->'brand_links') LOOP
    INSERT INTO public.equipment_brands(name) VALUES(row->>'brand') ON CONFLICT(name) DO NOTHING;
    SELECT id INTO brand FROM public.equipment_brands WHERE name=row->>'brand';
    UPDATE public.equipment_models SET brand_id=brand WHERE id=(row->>'id')::uuid AND name=row->>'name'
      AND (brand_id IS NULL OR name='AeroPress Original');
  END LOOP;
  FOR row IN SELECT value FROM jsonb_array_elements(payload->'photo_corrections') LOOP
    UPDATE public.equipment_models SET image_url=row->>'image_url',image_source_url=row->>'image_source_url',image_usage_status='source_linked'
      WHERE id=(row->>'id')::uuid AND name=row->>'name'
        AND image_usage_status NOT IN ('rights_confirmed','removal_requested');
  END LOOP;
END $review$;
SELECT count(*) FILTER (WHERE requires_review=false) AS public_models,
       count(*) FILTER (WHERE requires_review=false AND brand_id IS NULL) AS public_without_brand,
       count(*) FILTER (WHERE requires_review=false AND image_url IS NOT NULL) AS public_with_image
FROM public.equipment_models;
""")
print('COMMIT;' if args.commit else 'ROLLBACK;')
