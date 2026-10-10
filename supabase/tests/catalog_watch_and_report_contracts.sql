-- Actual roles and rollback-only fixtures: no real account or alert is retained.
begin;
set local statement_timeout='30s';
set local lock_timeout='3s';
do $test$
declare
  member uuid:=gen_random_uuid(); outsider uuid:=gen_random_uuid(); guest uuid:=gen_random_uuid(); reviewer uuid:=gen_random_uuid();
  roaster uuid:=gen_random_uuid(); product uuid:=gen_random_uuid(); hidden_product uuid:=gen_random_uuid();
  report uuid:=gen_random_uuid(); event uuid; denied boolean; changed integer; n integer;
begin
  insert into auth.users(id,email,is_anonymous) values
    (member,'watch-member-'||member||'@example.invalid',false),(outsider,'watch-other-'||outsider||'@example.invalid',false),
    (guest,'watch-guest-'||guest||'@example.invalid',true),(reviewer,'watch-admin-'||reviewer||'@example.invalid',false);
  insert into public.user_roles(user_id,role) values(reviewer,'admin') on conflict do nothing;
  insert into public.roasters(id,slug,name_en,name_ar) values(roaster,'audit-watch-'||roaster,'Audit watch roaster','محمصة اختبار');
  insert into public.roasted_products(id,roaster_id,slug,name_en,source_type,source_url,requires_review,last_verified_at) values
    (product,roaster,'audit-watch-'||product,'Audit watch coffee','official_website','https://example.invalid/coffee',false,now()),
    (hidden_product,roaster,'audit-hidden-'||hidden_product,'Private audit fixture','official_website','https://example.invalid/private',true,null);
  assert (select freshness_status='fresh' from public.roasted_product_freshness where roasted_product_id=product),'Freshness is evidence-derived';
  assert not exists(select 1 from public.roasted_product_freshness where roasted_product_id=hidden_product),'Unreviewed products excluded';
  insert into public.product_prices(roasted_product_id,price,currency,source_url) values(product,10,'KWD','https://example.invalid/price1');
  assert not exists(select 1 from public.catalog_change_events where roasted_product_id=product),'First observation is not a change';
  insert into public.product_prices(roasted_product_id,price,currency,source_url) values(product,8,'KWD','https://example.invalid/price2');
  select id into event from public.catalog_change_events where roasted_product_id=product and event_type='price_dropped';
  assert event is not null,'Price evidence creates a pending event';

  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',member::text,true);
  set local role authenticated;
  insert into public.product_watches(user_id,roasted_product_id) values(member,product);
  insert into public.product_watches(user_id,roasted_product_id) values(member,product) on conflict(user_id,roasted_product_id) do nothing;
  assert (select count(*) from public.product_watches)=1,'Watch retry is idempotent';
  assert not exists(select 1 from public.catalog_change_events where id=event),'Pending review is private';
  denied:=false; begin insert into public.product_watches(user_id,roasted_product_id) values(member,hidden_product);
    exception when insufficient_privilege then denied:=true; end; assert denied,'Cannot watch an unreviewed product';
  update public.product_watches set alert_sold_out=true where user_id=member and roasted_product_id=product;
  get diagnostics changed=row_count; assert changed=1,'Owner preferences are writable';
  insert into public.reports(id,reporter_id,target_type,target_id,reason) values(report,member,'post',gen_random_uuid(),'other');
  denied:=false; begin insert into public.reports(reporter_id,target_type,target_id,reason,status,reviewed_by,reviewed_at)
    values(member,'post',gen_random_uuid(),'other','actioned',member,now());
    exception when insufficient_privilege then denied:=true; end; assert denied,'Cannot forge a moderation result';
  denied:=false; begin insert into public.reports(reporter_id,target_type,target_id,reason,reviewed_by)
    values(member,'post',gen_random_uuid(),'other',reviewer);
    exception when insufficient_privilege then denied:=true; end; assert denied,'Cannot forge reviewer metadata';

  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',outsider,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',outsider::text,true);
  set local role authenticated;
  assert not exists(select 1 from public.product_watches),'Other member watches are private';
  update public.product_watches set alert_price_drop=false where user_id=member;
  get diagnostics changed=row_count; assert changed=0,'Cannot change another member preference';
  denied:=false; begin insert into public.product_watches(user_id,roasted_product_id) values(member,product);
    exception when insufficient_privilege then denied:=true; end; assert denied,'Cannot assign another owner';
  denied:=false; begin insert into public.catalog_change_events(roasted_product_id,event_type,current_value,review_status)
    values(product,'price_dropped','{}','confirmed');
    exception when insufficient_privilege then denied:=true; end; assert denied,'Cannot manufacture confirmed events';
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',guest,'role','authenticated','is_anonymous',true)::text,true);
  perform set_config('request.jwt.claim.sub',guest::text,true);
  set local role authenticated;
  denied:=false; begin insert into public.product_watches(user_id,roasted_product_id) values(guest,product);
    exception when insufficient_privilege then denied:=true; end; assert denied,'Guest cannot create member alerts';
  denied:=false; begin insert into public.reports(reporter_id,target_type,target_id,reason) values(guest,'post',gen_random_uuid(),'other');
    exception when insufficient_privilege then denied:=true; end; assert denied,'Guest cannot file member reports';
  reset role;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  set local role authenticated;
  update public.catalog_change_events set review_status='confirmed',reviewed_by=reviewer,reviewed_at=now() where id=event;
  get diagnostics changed=row_count; assert changed=1,'Admin confirms evidence';
  update public.catalog_change_events set review_status='pending' where id=event;
  update public.catalog_change_events set review_status='confirmed' where id=event;
  update public.reports set status='dismissed',reviewed_by=reviewer,reviewed_at=now() where id=report;
  get diagnostics changed=row_count; assert changed=1,'Moderator updates remain available';
  reset role;
  select count(*) into n from public.notifications where user_id=member and type='product_price_drop' and entity_id=product;
  assert n=1,'Repeated confirmation sends exactly one owned alert';
  assert (select count(*) from public.product_alert_deliveries where event_id=event)=1,'Exactly-once delivery';
  assert not has_function_privilege('authenticated','private.deliver_confirmed_product_alerts()','execute'),'Internal trigger is not a callable RPC';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated','is_anonymous',false)::text,true);
  perform set_config('request.jwt.claim.sub',member::text,true);
  set local role authenticated;
  assert exists(select 1 from public.my_product_alert_candidates where event_id=event),'Owned confirmed candidate is visible';
  assert (select count(*) from public.product_alert_deliveries)=1,'Owner sees own delivery';
  delete from public.product_watches where user_id=member and roasted_product_id=product;
  get diagnostics changed=row_count; assert changed=1,'Owner can stop watching';
  insert into public.product_watches(user_id,roasted_product_id) values(member,product);
  reset role;
  delete from auth.users where id=member;
  assert not exists(select 1 from public.product_watches where user_id=member),'Account cascade clears watches';
  assert not exists(select 1 from public.product_alert_deliveries where user_id=member),'Account cascade clears deliveries';
  set local role anon;
  assert not exists(select 1 from public.roasted_product_freshness where roasted_product_id=hidden_product),'Public freshness preserves privacy';
  reset role;
end $test$;
select 'PASS: catalog evidence, owner isolation, guest denial, private review, exactly-once alerts, report forgery rejection, moderator updates, account cascades' as verification;
rollback;
