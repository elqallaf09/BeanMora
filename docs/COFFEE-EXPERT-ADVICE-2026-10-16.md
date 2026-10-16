# Coffee expert: useful answers when a budget cannot be verified

The reported question was «طلعي مكينة اسبريسو قيمتها ما بين ٢٠٠ الى ٤٠٠ دينار كويتي». The parser used the first amount as a ceiling, kept shopping filler as product-search terms, and stopped when the catalog had no recent convertible price. The local expert is a bounded system of reviewed lessons, typed catalog facts and arithmetic, not a trained generative model.

## Resulting behavior

- Parse both inclusive monetary bounds, preserving KWD and the range through a currency clarification. Replacing or removing a budget clears the old minimum. Invalid or reversed ranges require correction.
- When no recent priced offer meets the request, retain the original constraints and provide practical selection guidance. Documented devices with an HTTPS source and usable specifications may appear in a separate, explicitly labelled specification comparison. They are never described as matching the budget or local stock. Known priced records outside the request are not relabelled as unknown-price candidates; unsafe sources, unrelated kinds and unmatched brands are excluded. No price, seller link or stock claim is carried into this comparison or a follow-up comparison.
- Answer follow-ups such as «عندي طاحونة» and «الميزانية تشمل طاحونة» without switching the request to grinder shopping or losing the machine budget.
- Present knowledge answers with a title, explanation, practical next step and primary sources. Explicitly separated questions can receive up to three distinct explanations with deduplicated sources.
- Add four lessons: rotary/vibration pumps, flow control versus pressure adjustment, espresso-machine selection, and integrated/separate grinders. There are now 55 local learning topics. The selection lesson is editorial guidance synthesized from manufacturer descriptions, not a product test or live-price recommendation.
- Synchronize the mobile core and review all new messages in Japanese, French, Italian, Spanish, Brazilian Portuguese and simplified Chinese alongside Arabic/English. The refreshed inventory also covers existing support-contact copy and the peaches label.

## Primary sources reviewed October 16, 2026

- https://www.profitec-espresso.com/en/about-us
- https://www.profitec-espresso.com/en/service
- https://www.profitec-espresso.com/en/products/drive
- https://www.profitec-espresso.com/en/products/go
- https://www.profitec-espresso.com/en/products/pro-400
- https://www.lelit.com/en-us/product/elizabeth-pesel01
- https://www.sageappliances.com/en-gb/product/bes878
- https://www.baratza.com/en-us/product/encoretm-esp-zcg495

## Validation

Local: 1,355 Vitest cases plus 31 recommendation and 37 brew-outcome cases passed. Root TypeScript, lint and production build passed (existing Supabase Edge-runtime compatibility warnings remain). Mobile TypeScript, core consistency, unit/contract scripts, web export and translation coverage for 3,173 messages passed. All 48 focused browser scenarios passed. Visual review caught a reversed RTL budget range; the final UI explicitly renders monetary ranges left-to-right and the two reported viewport cases recheck direction and overflow. Publication receipts are recorded on the pull request once complete.

Root dependency audit: zero findings; nine security regression tests passed. Mobile audit policy passed with two verified installed security backports and zero risk exceptions. Raw npm audit still reports 15 high version findings associated with those already documented tooling packages; this is not a claim of a clean raw mobile audit. No dependency, authentication, database, production data, paid provider or runtime model was added.

Publication follows the existing checked-main Expo web-only release branch. Local fixture exports must never be deployed. No new APK, TestFlight build or physical-device validation is implied. The assistant remains limited to its authored coffee knowledge, supported calculations and available catalog evidence; it cannot answer every possible question or verify current prices without current source data.
