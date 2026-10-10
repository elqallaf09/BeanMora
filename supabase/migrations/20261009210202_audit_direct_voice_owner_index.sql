-- Account deletion and voice cleanup filter by owner as well as object identity.
-- Keep the existing exact-object primary key and all access rules unchanged.
set local lock_timeout = '3s';
set local statement_timeout = '30s';
create index if not exists direct_voice_checks_user_id_idx
  on private.direct_voice_checks (user_id);
