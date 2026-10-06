# Serving correction evidence — 2026-10-06

`reviewed-corrections.json` records 156 existing published recipe IDs, exact
source titles and their previous unknown serving values. 48 titles explicitly
indicate HOT, 106 explicitly indicate ICE/ICED, and two published cold_brew
recipes describe cold-brew preparation. No existing known classification is
replaced. Fermentation descriptions and brewing-water temperatures alone are
not evidence for serving style; unspecified recipes remain unknown.

The migration `20261006095000_serving_filter_search_speed.sql` uses this finite
ID/title review, checks that the row is still public and unknown with no valid
metadata style, and records its evidence under discovery.serving_style_evidence.
It was tested in a transaction with anon assertions and rolled back before
application. It is applied to BeanMora. No source quantities, titles, visibility
or timestamps were rewritten.

Before/after public totals: Hot 140→188, Iced 3→109, Cold 1→3, Unknown 3031→2875;
total 3175. Run `supabase/tests/serving_search.sql` read-only for the active RPC
regressions. Unspecified source profiles still require source review before
classification and are available under All.
