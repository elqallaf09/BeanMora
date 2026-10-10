"""Emit bounded catalog inserts; default rehearses with ROLLBACK, --commit persists."""
import argparse,json
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--commit',action='store_true');args=parser.parse_args()
data=json.loads(Path(__file__).with_name('reviewed.json').read_text())['models']
assert len(data)==8 and len({r['name'] for r in data})==8
for r in data:
 assert r['source_url'].startswith('https://') and r['category']=='roaster'
 assert all(isinstance(v,list) and len(v)==2 and all(isinstance(x,str) for x in v) for v in r['facts'].values())
payload=json.dumps(data,ensure_ascii=False).replace("'","''")
print("BEGIN;\nSELECT pg_advisory_xact_lock(hashtext('beanmora-roaster-catalog-20261010'));")
print("DO $review$\nDECLARE payload jsonb := '"+payload+"'::jsonb; row jsonb; brand uuid; BEGIN")
print("""
 FOR row IN SELECT value FROM jsonb_array_elements(payload) LOOP
   INSERT INTO public.equipment_brands(name) VALUES(row->>'brand') ON CONFLICT(name) DO NOTHING;
   SELECT id INTO STRICT brand FROM public.equipment_brands WHERE name=row->>'brand';
   IF EXISTS (SELECT 1 FROM public.equipment_models WHERE name=row->>'name' AND (category<>'roaster' OR brand_id IS DISTINCT FROM brand)) THEN
     RAISE EXCEPTION 'Equipment identity conflict: %', row->>'name';
   END IF;
   INSERT INTO public.equipment_models(name,brand_id,category,description,specifications,
     official_url,source_url,source_name,source_type,last_verified_at,data_confidence,
     requires_review,image_url,image_source_url,image_usage_status,suitable_brew_methods)
   SELECT row->>'name',brand,'roaster',row->>'description_en',
     jsonb_build_object('catalog',jsonb_build_object('schema_version',1,'name_ar',row->>'name_ar',
       'description_ar',row->>'description_ar','description_en',row->>'description_en','facts',row->'facts')),
     row->>'source_url',row->>'source_url',row->>'brand','official_product_page',
     (row->>'verified_at')::timestamptz,'official',false,row->>'image_url',
     CASE WHEN row->>'image_url' IS NOT NULL THEN row->>'source_url' ELSE NULL END,
     CASE WHEN row->>'image_url' IS NOT NULL THEN 'source_linked' ELSE 'placeholder_only' END,
     ARRAY[]::text[]
   WHERE NOT EXISTS(SELECT 1 FROM public.equipment_models WHERE name=row->>'name');
 END LOOP;
END $review$;
SELECT count(*) AS public_roasters, count(*) FILTER(WHERE image_url IS NOT NULL) AS with_photo
FROM public.equipment_models WHERE category='roaster' AND requires_review=false;
""")
print('COMMIT;' if args.commit else 'ROLLBACK;')
