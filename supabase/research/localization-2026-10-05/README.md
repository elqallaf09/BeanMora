# Arabic catalog presentation — 2026-10-05

This repair retains source identities, original English/foreign titles, quantities,
units, tasting evidence and association keys. It changes only Arabic presentation
fields, plus removal of three old, explicitly interpolated pour timestamps.

- 3,037 public recipe titles receive Arabic presentation. Proper names use
  transcription; the 179 distinct East Asian titles are reviewed in
  `foreign-titles-ar.txt` and retained as exact original-title keys in the app.
  Numeric titles and model identifiers are deliberately preserved.
- 117 coffee descriptions and 31 roaster descriptions receive readable Arabic
  without imported database mapping prose or stale price/stock claims.
- Two published recipe notes retain their source inconsistencies. The GREY Sunda
  Wanoja recipe explicitly said its pour timestamps were linear estimates; only
  those exact old values are cleared. Published cumulative water targets, grinder
  setting, ratio and total duration remain unchanged.
- 3,016 distinct step translations cover 13,133 rows. Missing published flow
  rates remain missing: “unspecified” becomes “غير منشور”, without an invented
  number or temperature unit.

`translations.json`, `recipe-titles.json.gz` and `steps.json.gz` contain previous
values, original source values and the proposed display translations. The gzip
files keep the review evidence compact. `build_sql.py OUTPUT_DIRECTORY` produces
source-guarded DML chunks; it does not recreate schema or overwrite a concurrent
translation. Retrying a completed patch changes zero rows. `applied.json` and
`step-completion.json` record the live updates. Validation found zero missing
Arabic descriptions in reviewed coffees/roasters, zero missing notes on public
recipes and zero missing descriptions on public recipe steps.

No member prose, private catalog, community post, measured sensory score or
generated activity was added by this repair.
