# Reviewed catalog — 2026-10-14

BeanMora only: ubvzdglrwkkuaigmkjap. Primary pages opened and reviewed on 2026-10-14:

- https://harennaroastery.com/dbErwra — Harenna's own Cauca Colombia product and V60/espresso parameters; footer identifies Medina, Saudi Arabia.
- https://www.al-gharb.coffee/recipes/moka-pot — Al-Gharb's Moka guide, 5-minute reference and 2–4 unspecified-volume cups.
- https://www.al-gharb.coffee/ — publisher identifies its Algarve/Albufeira, Portugal roastery.

Committed 3 recipes, 2 roasters, 9 bilingual steps, zero gram-denominated pours. Fresh totals: 3457 → 3460 recipes, 92 → 94 roasters. No existing recipe/roaster/bean/step/pour/source outside this batch changed: fingerprint guards passed rollback preflight, committed import and rollback replay. Replay remains 3/2/9/0, not additional new records.

Harenna's V60 uses 20 g coffee, 300 ml water, a publisher-stated 1:15 and 2:45 final time. Its espresso uses 18 g coffee, 33 ml output and 28 seconds. Milliliters remain in source metadata, never converted to grams or a mass ratio. Source pour times are not assumed to be starts/completions. The source prints 90° without a unit, so no Celsius field is guessed. Coffee name/origin/process/descriptors remain linked source metadata; no public bean was created without a rights-reviewed image.

Al-Gharb does not publish coffee/water weights, numeric temperature or grind; missing fields remain null. None of the three pages explicitly labels serving style, so it remains unknown. No invented hot/cold transformation, device setting, price or copied image. Instructions are short editorial bilingual summaries.

The existing compiler produced catalog.json and guarded import.sql. prepare.mjs rebuilds them; verify-rollback.sql verifies replay without committing. The snapshot contains only public catalog identity fields. Exclusions include a Clever-specific guide unsupported by current method taxonomy and a roastery whose country was not confirmed from the opened primary page.
