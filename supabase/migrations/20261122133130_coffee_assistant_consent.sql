-- No legacy preferences imply agreement. This registry starts empty.
create table public.coffee_assistant_consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  policy text not null,
  choice text not null check (choice in ('allow', 'guide')),
  generation uuid not null,
  decided_at timestamptz not null,
  primary key (user_id, policy)
);
alter table public.coffee_assistant_consents enable row level security;
revoke all on public.coffee_assistant_consents from public, anon, authenticated, service_role;
grant select, insert, update on public.coffee_assistant_consents to service_role;
