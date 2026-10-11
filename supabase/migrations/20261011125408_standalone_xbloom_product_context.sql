-- A similar profile belongs to a different coffee, so its brew is standalone
-- evidence for the selected bean/product. Keep the existing authenticated,
-- payload-bound idempotency and RLS checks; validate the real product's bean.
do $patch$
declare
  definition text:=pg_get_functiondef('public.record_configured_brew_v1(uuid,jsonb,jsonb)'::regprocedure);
  old_fragment text:=$old$   select roasted_product_id into recipe_product from public.recipes where id=(p_payload->>'recipe_id')::uuid;
   if recipe_product is distinct from product_id then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;$old$;
  new_fragment text:=$new$   if p_payload->>'recipe_id' is null and p_payload->>'brew_method'='xbloom' then
    select legacy_bean_id into recipe_product from public.roasted_products where id=product_id and not requires_review;
    if recipe_product is distinct from (p_payload->>'bean_id')::uuid then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
   else
    select roasted_product_id into recipe_product from public.recipes where id=(p_payload->>'recipe_id')::uuid;
    if recipe_product is distinct from product_id then raise exception 'BREW_INVALID_INPUT' using errcode='22023'; end if;
   end if;$new$;
begin
  if strpos(definition,old_fragment)=0 then raise exception 'CONFIGURED_BREW_DEFINITION_DRIFT'; end if;
  execute replace(definition,old_fragment,new_fragment);
end $patch$;
