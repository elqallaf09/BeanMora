# Completion of the 2,875 existing public serving classifications

The finite manifest matches public recipe ID, title, brew method and the MD5
of the existing source JSON. The migration aborts if any reviewed row changed
or the expected 2,875 updates do not occur. It never updates recipe amounts,
temperatures, steps, notes, equipment or visibility.

| Evidence | Count | Result |
| --- | ---: | --- |
| Explicit hot terms in the source title (Chinese/Japanese) | 20 | Published hot |
| Explicit ice terms in the source title (Chinese/Japanese) | 26 | Published iced |
| Heated preparation method without an explicit serving declaration | 2,829 | Suggested hot |

The last group is a retrieval suggestion, **not a publisher-confirmed serving
fact**. Its evidence sets `classification: inferred` and
`requires_source_confirmation: true`. Mobile cards/details label it
Suggested / مقترح. A later source review should replace a suggestion when
there is affirmative hot, cold or iced evidence. Brew-water temperature alone
was not used to claim an iced/cold serving style.

The migration was applied as `20261006135630`. Immediately afterward all
3,175 original public recipes had a serving category: 3,037 hot, 135 iced,
3 cold, zero unknown. The 300 previously classified records and the original
recipe facts had unchanged fingerprints after application. Subsequent new
published recipes are outside this historical finite correction.

`classifications.json` retains each decision, evidence basis and primary
source link for further review.
