set local lock_timeout='3s';
set local statement_timeout='30s';
-- Cache stable identity helpers once per statement, preserving each policy's
-- role, permissiveness and boolean expression. Existing initplans stay intact.
do $$ declare p record; expression text; check_expression text; begin
  for p in select * from pg_policies where schemaname='public' loop
    expression:=p.qual;
    check_expression:=p.with_check;
    -- Protect already-wrapped calls before replacing direct calls.
    expression:=replace(replace(expression,'SELECT auth.uid()','SELECT __AUDIT_UID__'),'SELECT auth.jwt()','SELECT __AUDIT_JWT__');
    check_expression:=replace(replace(check_expression,'SELECT auth.uid()','SELECT __AUDIT_UID__'),'SELECT auth.jwt()','SELECT __AUDIT_JWT__');
    expression:=replace(replace(expression,'auth.uid()','(select auth.uid())'),'auth.jwt()','(select auth.jwt())');
    check_expression:=replace(replace(check_expression,'auth.uid()','(select auth.uid())'),'auth.jwt()','(select auth.jwt())');
    expression:=replace(replace(expression,'__AUDIT_UID__','auth.uid()'),'__AUDIT_JWT__','auth.jwt()');
    check_expression:=replace(replace(check_expression,'__AUDIT_UID__','auth.uid()'),'__AUDIT_JWT__','auth.jwt()');
    if expression is distinct from p.qual or check_expression is distinct from p.with_check then
      execute format('alter policy %I on %I.%I %s %s',p.policyname,p.schemaname,p.tablename,
        case when expression is null then '' else 'using ('||expression||')' end,
        case when check_expression is null then '' else 'with check ('||check_expression||')' end);
    end if;
  end loop;
end $$;

-- Cover unindexed FK lookups used by joins, ownership and account deletion.
-- Skip large tables so a future replay cannot hold a long production write lock.
do $$ declare fk record; column_list text; begin
  for fk in
    select c.oid,c.conname,c.conrelid,c.conkey,n.nspname,t.relname
    from pg_constraint c join pg_class t on t.oid=c.conrelid
    join pg_namespace n on n.oid=t.relnamespace
    where c.contype='f' and n.nspname='public' and pg_relation_size(t.oid)<10*1024*1024
    and not exists(select 1 from pg_index i where i.indrelid=c.conrelid and i.indisvalid and i.indpred is null
      and c.conkey <@ array(select key from unnest(i.indkey::smallint[]) with ordinality keys(key,ord) where ord<=cardinality(c.conkey)))
  loop
    select string_agg(quote_ident(a.attname),',' order by k.ord) into column_list
    from unnest(fk.conkey) with ordinality k(attnum,ord)
    join pg_attribute a on a.attrelid=fk.conrelid and a.attnum=k.attnum;
    execute format('create index if not exists %I on %I.%I (%s)',
      'audit_fk_'||substr(md5(fk.nspname||'.'||fk.relname||'.'||fk.conname),1,20),fk.nspname,fk.relname,column_list);
  end loop;
end $$;
