# Requested xBloom sources — 7 October 2026

Published 264 new public recipes and attributed six existing recipes without replacing their settings, steps or titles. The public catalog contains 3,448 recipes after this replay. All 270 reviewed recipes have steps and source links.

| Publisher | Sharing links checked | Complete entries | Unique complete recipes |
| --- | ---: | ---: | ---: |
| The Recipe Drop | 194 | 193 | 186 |
| Roots Roastery | 58 | 56 | 56 |
| Black Knight Roastery | 37 | 36 | 36 |

Eight recipes overlap between publishers; unique total is 270. The Recipe Drop's public directory had 205 entries; eleven had no xBloom share link. The four public sharing links with no pour steps are recorded in `excluded.json`; no missing settings were invented.

## Evidence and units

- Recipe Drop: public directory at https://therecipedrop.ae/ and its credential-free Recipe listing. Record links are retained in each recipe's provenance. Directory roaster/coffee attribution accompanies settings read from the linked xBloom share page.
- Roots: links observed on official product pages at https://rootsroastery.net/en/. The TSV records product slugs and public share IDs from 32 products with links; two other reviewed products had none.
- Black Knight: links observed on official product pages at https://b-k.coffee/. The TSV records 35 coffee-specific programs plus the shared iced program and one incomplete melon iced link. Forty-two 250g products were checked; seven had no share links.
- Public xBloom settings were retrieved using `scripts/research-xbloom-recipes.py`. Only public recipe facts and public creator display names are retained. Account IDs, avatars and credentials are excluded.
- Water is ml, summed from published pours, not an independently verified stated total. `water_grams` remains unknown. Published ratios are retained as stated; ice/dilution can explain differences. Total brew duration and device compatibility remain unknown. Raw model codes and pour-pattern codes are preserved without inventing a model mapping.
- The generic Black Knight iced program is cataloged once and is not attached to one specific coffee. Official roaster classification applies only when the roaster's own product page links the program. Recipe Drop submissions remain community provenance.

## Review and replay

`reviewed-*.json` contains the deduplicated, attributed factual snapshots. `replay.py` prints bounded transactional DML for the existing administrative publisher; it does not connect to the database or change schema/RLS. Use an authorized administrative connection after reviewing the generated SQL:

```sh
python3 replay.py reviewed-01.json > /tmp/beanmora-reviewed.sql
```

Repeat for the numbered files. The first batch was validated with a rollback before publishing. A replay resolves catalog-owned recipes by existing slug/share URL and calls the publisher only for absent recipes. Existing recipe settings, steps, ownership and visibility are preserved. Added source links and metadata support the existing public recipe search.
