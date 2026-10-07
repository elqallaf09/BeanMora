# BeanMora 0.5.11

The equipment directory now uses a virtualized list instead of mounting the entire catalog. Cards show a compact model photo, name and two reviewed specifications, with a comparison action. Phones use one column; tablets use two or three. Brand, category and bilingual name filters compose, and the visible/total count reflects all filters. Returning within five minutes reuses the successful catalog read; failed reads are evicted and pull-to-refresh forces a fresh read.

Background home refresh no longer activates the native pull-to-refresh spinner, which reserved space above the hero on iOS. Manual pull-to-refresh remains available. Coffee cards without any known photo reserve less empty space. The compact header and scrolling home categories from 0.5.9/0.5.10 remain included.

The live equipment catalog grew from 66 to 110 entries, with 44 reviewed additions, 34 corrected brand links, and two corrected Aillio photos. Sources and replay instructions are in `supabase/research/equipment-2026-10-07/`. The older installed app can receive these catalog additions; the layout changes require installing this new binary.

Native versions: Android 21, iOS 4. TypeScript, mobile module checks and Android/iOS/web exports passed. Browser layout checks passed at 320, 390, 768, 1024 and 1536 px. A 120-model fixture verified bounded initial rendering, bilingual filters, reaching the last item by search, two-item comparison, no horizontal overflow and reuse of one catalog request on return at 390/1024 px. Native exports are not physical-device performance measurements; iPhone/MetaPad verification remains necessary after installation.
