"""Build source-guarded display translations; original source text is retained.

Usage: python build_sql.py OUTPUT_DIRECTORY
The output is DML, deliberately separate from schema migrations. Each chunk can
be retried: rows only change if both their source and previous translation match.
"""
import gzip
import json
import pathlib
import sys

root = pathlib.Path(__file__).resolve().parent
out = pathlib.Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)


def items(name):
    path = root / name
    with (gzip.open(path, "rt") if name.endswith(".gz") else path.open()) as f:
        return json.load(f)["items"]


def data_sql(rows):
    value = json.dumps(rows, ensure_ascii=False, separators=(",", ":"))
    assert "$translations$" not in value
    return "$translations$" + value + "$translations$::jsonb"


index = []


def save(label, query):
    name = f"{len(index):02d}-{label}.sql"
    (out / name).write_text(query + "\n")
    index.append(name)


allowed = {("beans", "description_ar", "description_en"),
           ("roasters", "description_ar", "description_en"),
           ("recipes", "notes_ar", "notes")}
descriptions = items("translations.json")
assert len({(r["table"], r["id"], r["field"]) for r in descriptions}) == len(descriptions)
for table, field, source in sorted(allowed):
    rows = [r for r in descriptions if (r["table"], r["field"], r["source_field"]) == (table, field, source)]
    if not rows:
        continue
    scope = {"beans": "and not t.requires_review and t.is_published", "roasters": "and not t.requires_review", "recipes": "and t.visibility='public'"}[table]
    save(table, f"""with patches as (
  select * from jsonb_to_recordset({data_sql(rows)})
    as p(id uuid, before text, source_before text, after text)
), changed as (
  update public.{table} as t set {field}=p.after from patches p
  where t.id=p.id {scope} and t.{source} is not distinct from p.source_before
    and t.{field} is not distinct from p.before returning t.id
) select '{table}.{field}' as scope, count(*) as changed from changed;""")
assert all((r["table"], r["field"], r["source_field"]) in allowed for r in descriptions)

titles = items("recipe-titles.json.gz")
for start in range(0, len(titles), 500):
    rows = titles[start:start+500]
    save("recipe-titles", f"""with patches as (
  select * from jsonb_to_recordset({data_sql(rows)})
    as p(id uuid, before text, source_before text, after text)
), changed as (
  update public.recipes as t set title_ar=p.after from patches p
  where t.id=p.id and t.visibility='public' and t.title is not distinct from p.source_before
    and t.title_ar is not distinct from p.before returning t.id
) select 'recipes.title_ar' as scope, count(*) as changed from changed;""")

steps = items("steps.json.gz")
for start in range(0, len(steps), 400):
    rows = steps[start:start+400]
    save("recipe-steps", f"""with patches as (
  select * from jsonb_to_recordset({data_sql(rows)})
    as p(title text, description text, before jsonb, after jsonb)
), changed as (
  update public.recipe_steps as t
  set title_ar=p.after->>'title_ar', description_ar=p.after->>'description_ar'
  from patches p where t.title is not distinct from p.title
    and t.description is not distinct from p.description
    and exists(select 1 from public.recipes r where r.id=t.recipe_id and r.visibility='public')
    and (t.title_ar is not distinct from p.before->>'title_ar'
      or t.title_ar is not distinct from p.after->>'title_ar')
    and (t.description_ar is not distinct from p.before->>'description_ar'
      or t.description_ar is not distinct from p.after->>'description_ar')
    and (t.title_ar is distinct from p.after->>'title_ar'
      or t.description_ar is distinct from p.after->>'description_ar')
  returning t.id
) select 'recipe_steps' as scope, count(*) as changed from changed;""")

# The old source explicitly said these timestamps were linearly interpolated,
# while only cumulative water targets and total duration were published.
save("unpublished-pour-times", """with changed as (
  update public.recipe_pours p set start_at_seconds=null
  from public.recipes r where r.id=p.recipe_id
    and r.id='6bbdef1b-344a-46ea-841b-44a5069bcca4'
    and r.visibility='public'
    and r.notes like '%linear-interpolation estimate%'
    and ((p.pour_number=1 and p.start_at_seconds=42 and p.water_grams=58)
      or (p.pour_number=2 and p.start_at_seconds=113 and p.water_grams=100)
      or (p.pour_number=3 and p.start_at_seconds=122 and p.water_grams=12))
  returning p.id
) select 'unpublished_pour_times' as scope, count(*) as changed from changed;""")
(out / "index.json").write_text(json.dumps(index, indent=2)+"\n")
print(json.dumps({"chunks": len(index), "descriptions": len(descriptions),
                  "recipe_titles": len(titles), "distinct_step_translations": len(steps)}))
