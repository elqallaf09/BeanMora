# Coffee bag scan and recipe search

The uploaded screenshots showed OCR debris (`SE oe`) used as a coffee name, missed origin text, repetitive large recommendation cards, and no serving labels.

Changes:
- Keep full picker quality; prepare bounded, scaled images locally. Read with bilingual sparse OCR, then retry low-confidence readings with enhanced contrast and a dense layout. Keep only complete lines above a confidence floor, preserve the raw transcript for review, and reject short OCR fragments as names.
- Accept Arabic/English field headings with a value on the next line; scan origins beyond the first six lines while excluding roaster/address lines. Missing or ambiguous facts stay empty.
- Let users select two opposite label corners and reread that crop on web/native. Confirm reviewed image-derived facts before searching. The photo is never sent to recipe search.
- Use the additive, invoker-security `recipes_for_coffee_label_v2` RPC. Apply hot/cold filters before ranking, exact-coffee preference and limiting. Cold includes iced, serving variants are not deduplicated together, and six candidates are returned. The old RPC remains available for installed clients.
- Search all xBloom models; compact fields and source measurements, one shared explanation, individual match reasons, and visible serving badges. Inferred and missing serving styles remain explicitly qualified. Equal source temperature endpoints display once.

Validation:
- Mobile TypeScript and 13 matching/OCR parser regressions; 10 brewing regressions.
- Real Tesseract browser test (generated label, no mocked OCR), photo-review gate, local crop, hot/cold badges, bound search criteria, source milliliters, no image uploads, retry and empty state, Arabic layout at 320 px.
- Live anonymous read checks: six hot-only results for `hot`; six results drawn only from cold/iced for `cold_or_iced`; legacy RPC still returns three. Only public recipes returned.
- Supabase security advisor checked: no finding names the new invoker function. Existing unrelated extension/member-profile/policy findings were not changed.

Limits:
- The attachments are screenshots with a small embedded photo, not the original bag photograph. They cannot establish an OCR accuracy percentage for the original. Glare, tiny type, folded labels or severe blur can still require a closer photo and manual correction.
- Browser validation exercises React Native Web, not a physical iPhone/Android device. OCR remains local and free; no paid AI provider was added.
