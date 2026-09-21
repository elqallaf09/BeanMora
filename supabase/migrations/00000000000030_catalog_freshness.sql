-- Catalog freshness is derived from evidence timestamps, never guessed.
-- This view gives the UI/admin queue one consistent Fresh/Aging/Stale policy.
create or replace view public.roasted_product_freshness
with (security_invoker = true) as
select
  p.id as roasted_product_id,
  p.last_verified_at,
  case
    when p.last_verified_at is null then 'unverified'
    when p.last_verified_at >= now() - interval '30 days' then 'fresh'
    when p.last_verified_at >= now() - interval '90 days' then 'aging'
    else 'stale'
  end as freshness_status,
  case
    when p.last_verified_at is null then null
    else floor(extract(epoch from (now() - p.last_verified_at)) / 86400)::int
  end as days_since_verification,
  case
    when p.last_verified_at is null then true
    when p.last_verified_at < now() - interval '90 days' then true
    else false
  end as needs_reverification
from public.roasted_products p
where not p.requires_review;

comment on view public.roasted_product_freshness is
  'Derived product freshness: fresh <=30d, aging 31-90d, stale >90d; null verification is unverified and needs review.';
