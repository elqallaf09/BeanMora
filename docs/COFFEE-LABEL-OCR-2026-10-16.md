# Coffee label OCR: Arabic and decorated bags

The reported bag put `Alarba` (the roaster logo) into the coffee-name field and missed the smaller bilingual label. Arabic model files were already shipped; this was not a missing-language installation.

## Changes

- Never use the first plausible OCR line as a coffee name. Require a name heading or a product title associated with a growing-country line, and reject mixed-script fragments, separators and short OCR debris.
- Interpret RTL value-before-heading rows, retain explicitly labeled processes outside the small normalization vocabulary, and recognize a standalone tasting note.
- Exclude sensory text such as `جوز الهند` from growing-country detection. It must not introduce `India` or make a Colombian origin ambiguous.
- On difficult scans, find an inset light label when present and retry with separate English/Arabic recognition, local adaptive thresholding and bounded image dimensions. Arabic text always receives a dedicated Arabic pass even when the mixed-language average appears high. Preserve trustworthy lines from both passes instead of replacing the entire result with the longest, potentially noisier pass. Clear English scans retain the single-pass path. Low-confidence scan results cannot fill a product name.
- Preserve manual review, the existing 120-second deadline, cancellation, same-origin message checks, image-size/crop validation, and on-device image processing. No paid API or image upload was added.
- Refresh the self-hosted reader files before every export so an existing local installation cannot export an older reader script.

## Validation and limits

- Passed the mobile test suite, TypeScript check, installed security-backport verification, web production export, and all six focused browser scenarios including the supplied-photo regression. No physical-device test or production deployment was performed.
- Reproduced the issue with the supplied 1080 × 1440 photo using the actual reader script, Tesseract worker and bundled language models, with a local Canvas adapter. The amended parser leaves the untrustworthy product name blank and recovers Colombia; it does **not** reliably recover all the tiny product/flavor/process text from this photo. No image-specific names, origins, coordinates or catalog records were hardcoded.
- Real Arabic OCR on a generated Arabic label recovered Colombia, Castillo and coconut; those facts were then parsed without inferring India. This is an OCR-engine test, not a physical iPhone/Safari test.
- Added parser regressions, reader lifecycle/language/validation tests, and a real Arabic OCR browser regression alongside the existing English OCR/review/privacy flow. The optional `BEANMORA_REPORTED_LABEL_PHOTO` browser regression also exercises the locally supplied photo without committing it.
- The reader remains assistive OCR. Blur, small type, decorative backgrounds, non-light panels and perspective can still require a closer photo or manual label crop. Missing variety/roast data stays blank.

The user's original photo is not included in this repository.
