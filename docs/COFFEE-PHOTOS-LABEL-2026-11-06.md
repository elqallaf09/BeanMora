# Coffee photos and blend-label reading — 6 November 2026

The reported xBloom cards showed only missing-image icons. `RecipeVisual` read only the recipe cover, never the associated coffee, and both recipe and bean components had stopped using the approved bundled BeanMora artwork. `mapCoffee` also required an external publisher permission reference for private member uploads, which are already governed by Storage access policies.

Recipe reads now embed the explicitly linked bean/product media in the same request. Only those IDs supply fallback photos; similar-coffee recommendations cannot use the scanned bag's photo as though it belonged to another recipe. The display tries the recipe cover, associated coffee images, and then the existing `coffee-bag.jpg` illustration. Missing files, load failures, signing failures and image timeouts keep the illustration visible. Signing still uses the signed-in client's existing policies. Photos also appear in scan results.

The OCR failure had multiple causes: a thin footer could be selected as the entire label; sparse layout split the English tasting-note row; blend titles required a growing-country line; and the average confidence of tiny packaging print could erase an otherwise confident product name. The reader now rejects skinny footer regions, uses automatic layout for uncropped bilingual/Latin packaging, preserves the existing sparse path for Arabic-only labels/selected panels, and carries high-confidence name text separately. Explicit blend headings and spatial label titles no longer require an unstated growing country. Contrast preprocessing retains red/brown lettering on beige labels.

## Validation

- Mobile TypeScript and the complete mobile script suite passed; focused OCR/parser regressions also passed after the final reader changes.
- Web production export succeeded. The three focused Playwright suites passed 16 tests, with 2 existing optional photo tests skipped because their original photos were not attached.
- Actual browser Tesseract read the bag thumbnail cropped from `IMG_5557.png`: name **مزيج البلد**, notes **HAZELNUT, NUTTY, CHOCOLATE**, with origin, variety, process and roast blank. The supplied screenshot/crop is kept local and is not committed. Set `BEANMORA_BLEND_LABEL_PHOTO` to run this optional reproduction.
- Browser coverage includes successful signed photos, broken covers, signing failures, no-image fallback, recipe details, Arabic/English OCR and mobile/desktop catalog layouts.
- The expanded `RECIPE_FIELDS` query was exercised against the production public API: no error, both coffee relations returned. This was read-only.

## Existing catalog state and release limits

The production catalog still has the prior owner-authorized media holds: 245 beans and 3,474 recipe records. No archived photos were deleted or restored, no licence status was fabricated, and these holds were not changed by this fix. Held or missing photos therefore show the approved BeanMora illustration. At inspection, no bean row had a `member-media` upload reference; member-upload recovery was verified with isolated fixtures.

This change does not itself publish an Expo update or a new TestFlight build, and no physical iPhone test was performed. Native apps load the OCR reader from the deployed web site, so releasing the full fix requires both the updated web reader and the mobile JavaScript/build.
