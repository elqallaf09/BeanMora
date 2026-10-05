import json, pathlib
root=pathlib.Path(__file__).parent
items=json.load(open(root/'catalog.json'))['items']
def sql(value):
    if value is None:return 'null'
    if isinstance(value,(dict,list)):return "'"+json.dumps(value,ensure_ascii=False).replace("'","''")+"'::jsonb"
    return "'"+str(value).replace("'","''")+"'"
queries=['-- Reviewed manufacturer catalog: bilingual presentation and version-specific facts.','-- Existing identities are retained. New records use generated database IDs.','begin;','set local statement_timeout = \'30s\';']
for i in items:
    metadata={k:i[k] for k in ['name_ar','description_ar','description_en','facts']};metadata.update(schema_version=1,evidence=i['source'],extra_sources=i.get('extra_sources',[]))
    url=i['source']['final_url'] or i['source']['url']; image=i['source']['image_url']
    methods="array["+','.join(sql(m) for m in i['methods'])+"]::text[]"
    if i['id']:
        sets=[f"description={sql(i['description_en'])}",f"specifications=coalesce(specifications,'{{}}'::jsonb)||jsonb_build_object('catalog',{sql(metadata)})"]
        if not i.get('identity_only'):sets.extend([f"source_url={sql(url)}",f"last_verified_at={sql(i['source']['checked_at'])}::timestamptz"])
        if image:sets.extend([f"image_url={sql(image)}",f"image_source_url={sql(url)}","image_usage_status='source_linked'"])
        queries.append(f"update public.equipment_models set {','.join(sets)} where id={sql(i['id'])}::uuid and name={sql(i['name'])} and requires_review=false;")
    else:
        name=i.get('catalog_name',i['name'])
        queries.append(f"insert into public.equipment_models(name,category,description,specifications,suitable_brew_methods,official_url,source_url,source_type,source_name,last_verified_at,data_confidence,requires_review,image_url,image_source_url,image_usage_status) select {sql(name)},{sql(i['category'])},{sql(i['description_en'])},jsonb_build_object('catalog',{sql(metadata)}),{methods},{sql(url)},{sql(url)},'official_product_page',{sql(i['source']['title'] or 'Manufacturer manual')},{sql(i['source']['checked_at'])}::timestamptz,'official',false,{sql(image)},{sql(url)},'{ 'source_linked' if image else 'placeholder_only'}' where not exists(select 1 from public.equipment_models where name={sql(name)} and category={sql(i['category'])});")
queries.extend(["do $$ begin if (select count(*) from public.equipment_models where not requires_review and specifications->'catalog'->>'schema_version'='1')<66 then raise exception 'reviewed equipment catalog is incomplete';end if;end $$;",'commit;',"select category,count(*) as models from public.equipment_models where not requires_review group by category order by category;"])
(root/'apply.sql').write_text('\n'.join(queries)+'\n')
print({'models':len(items),'sql_bytes':(root/'apply.sql').stat().st_size})
