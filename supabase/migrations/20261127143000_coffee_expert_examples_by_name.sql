-- Match examples by the record's name appearing in the question, not by how
-- alike two whole questions look. "How do I make espresso" must not retrieve a
-- recipe that merely has espresso in its title, and "Flair 58" must not
-- retrieve "Flair 49 PRO".
alter table public.coffee_expert_examples
  add column name_key text not null default '',
  add column alt_name_key text not null default '';

create or replace function private.refresh_coffee_expert_examples() returns integer
language plpgsql security definer set search_path = '' as $$
declare started timestamptz := clock_timestamp(); total integer;
begin
  with docs as (
    select d.id, d.kind, d.category, d.methods, d.facts,
      nullif(btrim(d.title_ar), '') as title_ar, nullif(btrim(d.title_en), '') as title_en,
      abs(hashtext(d.id::text)) as h
    from public.assistant_public_documents d
    where d.kind in ('recipe', 'coffee', 'roaster', 'equipment')
  ), named as (
    select *, coalesce(title_ar, title_en) as name_ar, coalesce(title_en, title_ar) as name_en,
      nullif(array_to_string(methods, ', '), '') as method_list,
      case when jsonb_typeof(facts -> 'notes') = 'array' then nullif((select string_agg(value, ', ') from jsonb_array_elements_text(facts -> 'notes')), '')
           when jsonb_typeof(facts -> 'notes') = 'string' then nullif(btrim(facts ->> 'notes'), '') end as notes,
      case when jsonb_typeof(facts -> 'locations') = 'array' then nullif((select string_agg(nullif(btrim(value ->> 'label'), ''), ', ') from jsonb_array_elements(facts -> 'locations')), '') end as places
    from docs where coalesce(title_ar, title_en) is not null
  ), variants as (
    select n.*, v.locale, v.variant from named n
    cross join (values ('ar', 0), ('ar', 1), ('en', 0)) as v(locale, variant)
  ), built as (
    select locale, kind, id as source_id, variant::smallint as variant,
      case
        when kind = 'recipe' and locale = 'ar' then (array['شلون أسوي وصفة ' || name_ar || '؟', 'عطني وصفة ' || name_ar, 'شنو مقادير ' || name_ar || '؟', 'أبي أحضّر ' || name_ar || ' شلون؟', 'شنو الجرعة والحرارة حق ' || name_ar || '؟', 'وصفة ' || name_ar || ' لو سمحت'])[(h + variant * 3) % 6 + 1]
        when kind = 'recipe' then (array['How do I brew ' || name_en || '?', 'Give me the recipe for ' || name_en, 'What are the dose and temperature for ' || name_en || '?', 'Recipe for ' || name_en])[h % 4 + 1]
        when kind = 'coffee' and locale = 'ar' then (array['شنو إيحاءات بن ' || name_ar || '؟', 'عرفني على بن ' || name_ar, 'بن ' || name_ar || ' من وين ومعالجته شنو؟', 'شرايك ببن ' || name_ar || '؟'])[(h + variant * 2) % 4 + 1]
        when kind = 'coffee' then (array['What are the tasting notes of ' || name_en || '?', 'Tell me about the coffee ' || name_en, 'Where is ' || name_en || ' from and how is it processed?'])[h % 3 + 1]
        when kind = 'roaster' and locale = 'ar' then (array['وين محمصة ' || name_ar || '؟', 'عرفني على محمصة ' || name_ar, 'محمصة ' || name_ar || ' من أي دولة؟', 'شنو تعرف عن محمصة ' || name_ar || '؟'])[(h + variant * 2) % 4 + 1]
        when kind = 'roaster' then (array['Where is the roaster ' || name_en || ' based?', 'Tell me about the roaster ' || name_en])[h % 2 + 1]
        when locale = 'ar' then (array['شرايك في ' || name_ar || '؟', 'شنو رأيك ب' || name_ar || '؟', 'أبي أعرف عن ' || name_ar, 'هل ' || name_ar || ' زين؟', 'عطني معلومات عن ' || name_ar, 'تنصحني آخذ ' || name_ar || '؟'])[(h + variant * 3) % 6 + 1]
        else (array['What do you think of ' || name_en || '?', 'Is ' || name_en || ' any good?', 'Tell me about ' || name_en])[h % 3 + 1]
      end as question,
      case
        when kind = 'recipe' and locale = 'ar' then 'وصفة «' || name_ar || '»' || coalesce(' (' || method_list || ')', '') || ': '
          || coalesce(nullif(concat_ws('، ', 'الجرعة ' || ((facts ->> 'dose')::numeric)::float8 || ' غ', 'الماء ' || ((facts ->> 'water')::numeric)::float8 || ' غ', 'الحرارة ' || ((facts ->> 'temperature')::numeric)::float8 || '°م', 'الوقت ' || ((facts ->> 'seconds')::numeric)::float8 || ' ث', 'درجة الطحن ' || nullif(btrim(facts ->> 'grind'), ''), 'الإيحاءات: ' || notes), ''), 'تفاصيلها في بطاقة الوصفة')
          || '.' || case when (facts ->> 'incomplete') = 'true' then ' بعض تفاصيل المصدر غير مكتملة.' else '' end
        when kind = 'recipe' then 'Recipe "' || name_en || '"' || coalesce(' (' || method_list || ')', '') || ': '
          || coalesce(nullif(concat_ws(', ', 'dose ' || ((facts ->> 'dose')::numeric)::float8 || ' g', 'water ' || ((facts ->> 'water')::numeric)::float8 || ' g', 'temperature ' || ((facts ->> 'temperature')::numeric)::float8 || '°C', 'time ' || ((facts ->> 'seconds')::numeric)::float8 || ' s', 'grind setting ' || nullif(btrim(facts ->> 'grind'), ''), 'notes: ' || notes), ''), 'its details are on the recipe card')
          || '.' || case when (facts ->> 'incomplete') = 'true' then ' Some source details are incomplete.' else '' end
        when kind = 'coffee' and locale = 'ar' then '«' || name_ar || '»' || coalesce(' من ' || nullif(btrim(facts ->> 'roaster'), ''), '') || ': '
          || coalesce(nullif(concat_ws('، ', 'المنشأ ' || nullif(btrim(facts ->> 'origin'), ''), 'المعالجة ' || nullif(btrim(facts ->> 'process'), ''), 'السلالة ' || nullif(btrim(facts ->> 'variety'), ''), 'التحميص ' || nullif(btrim(facts ->> 'roast'), ''), 'الإيحاءات: ' || notes), ''), 'لا توجد تفاصيل منشورة بعد') || '.'
        when kind = 'coffee' then '"' || name_en || '"' || coalesce(' by ' || nullif(btrim(facts ->> 'roaster'), ''), '') || ': '
          || coalesce(nullif(concat_ws(', ', 'origin ' || nullif(btrim(facts ->> 'origin'), ''), 'process ' || nullif(btrim(facts ->> 'process'), ''), 'variety ' || nullif(btrim(facts ->> 'variety'), ''), 'roast ' || nullif(btrim(facts ->> 'roast'), ''), 'notes: ' || notes), ''), 'no published details yet') || '.'
        when kind = 'roaster' and locale = 'ar' then 'محمصة «' || name_ar || '»: '
          || coalesce(nullif(concat_ws('، ', 'الدولة ' || nullif(btrim(facts ->> 'country'), ''), 'الفروع: ' || places), ''), 'لا توجد تفاصيل منشورة بعد') || '.'
        when kind = 'roaster' then 'Roaster "' || name_en || '": '
          || coalesce(nullif(concat_ws(', ', 'country ' || nullif(btrim(facts ->> 'country'), ''), 'locations: ' || places), ''), 'no published details yet') || '.'
        when locale = 'ar' then '«' || name_ar || '» مدرج في BeanMora' || coalesce(' ضمن فئة ' || category, '') || coalesce('، ويناسب: ' || method_list, '') || '. '
          || case when facts = '{}'::jsonb then 'لا توجد له مواصفات مراجَعة بعد؛ يبحث الخبير عنه في الويب ويذكر مصادره.' else 'مواصفاته المراجَعة في بطاقة المنتج.' end
        else '"' || name_en || '" is listed in BeanMora' || coalesce(' under ' || category, '') || coalesce(', suited to: ' || method_list, '') || '. '
          || case when facts = '{}'::jsonb then 'It has no reviewed specifications yet; the expert looks it up on the web and cites its sources.' else 'Its reviewed specifications are on the product card.' end
      end as answer,
      jsonb_build_object('intent', 'search', 'kind', kind, 'category', case when kind = 'equipment' then category end,
        'methods', case when kind = 'recipe' then to_jsonb(methods) else '[]'::jsonb end, 'terms', jsonb_build_array(name_en)) as plan,
      case when locale = 'ar' then name_ar else name_en end as own_name, case when locale = 'ar' then name_en else name_ar end as other_name
    from variants
  )
  insert into public.coffee_expert_examples (locale, kind, source_id, variant, question, question_key, answer, plan, name_key, alt_name_key, refreshed_at)
  select locale, kind, source_id, variant, left(question, 300), private.coffee_expert_question_key(question), left(answer, 1200), plan,
    private.coffee_expert_question_key(own_name), private.coffee_expert_question_key(other_name), started
  from built where question is not null and answer is not null and char_length(question) >= 3
  on conflict (locale, kind, source_id, variant) do update
    set question = excluded.question, question_key = excluded.question_key, answer = excluded.answer, plan = excluded.plan,
      name_key = excluded.name_key, alt_name_key = excluded.alt_name_key, refreshed_at = excluded.refreshed_at;
  -- Records that left the public catalog take their examples with them.
  delete from public.coffee_expert_examples where refreshed_at < started;
  select count(*) into total from public.coffee_expert_examples;
  return total;
end $$;

create or replace function public.search_coffee_expert_examples(p_question text, p_locale text default 'ar', p_limit integer default 3)
returns table (question text, answer text, plan jsonb, kind text, score real)
language sql stable security definer set search_path = '' as $$
  with wanted as (select private.coffee_expert_question_key(p_question) as key),
  scored as (
    select e.*, greatest(
        case when char_length(e.name_key) >= 4 then extensions.word_similarity(e.name_key, w.key) else 0 end,
        case when char_length(e.alt_name_key) >= 4 then extensions.word_similarity(e.alt_name_key, w.key) else 0 end) as named,
      extensions.similarity(e.question_key, w.key) as alike
    from public.coffee_expert_examples e, wanted w
    where char_length(w.key) >= 4 and e.locale = case when p_locale = 'ar' then 'ar' else 'en' end
  ), best as (
    -- One example per catalog record: the phrasing closest to the question.
    select distinct on (s.kind, s.source_id) s.* from scored s where s.named >= 0.85
    order by s.kind, s.source_id, s.alike desc, s.id
  )
  select b.question, b.answer, b.plan, b.kind, b.named as score from best b
  order by b.named desc, b.alike desc, b.id
  limit least(greatest(coalesce(p_limit, 3), 1), 5);
$$;

select private.refresh_coffee_expert_examples();
