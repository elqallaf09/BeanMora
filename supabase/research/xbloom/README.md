# Public recipe and product source snapshot

Checked on 2026-10-03. `collective-facts.json` contains 3,012 public coffee recipe records from the xBloom Collective index and each public detail response, including 2,964 marked official by xBloom. `shared-links.json` contains 48 usable publicly shared recipes and two unavailable sharing links gathered from existing recipe sources and Redeemer recipe directories. The API's coffee/tea selector is not an official/community selector.

The reviewed replay matches existing catalog attribution and deduplicates by published sharing URL. After replay the live public library has 3,077 recipes: 3,048 xBloom recipes with source pours, including 2,962 classified manufacturer-official and 86 community recipes, plus 29 recipes for other methods. Counts differ from source-record counts because the same shared recipe can have several Collective/source identities.

Dose, published milliliters, ratio, grinder setting, available RPM, machine model, cup type and individual pours remain source facts. Unpublished flow, vibration, total time or compatibility remain unknown. Original-machine RPM is not asserted. Temperatures are displayed numerically in Celsius, as Collective displays them. The source volume is never silently treated as a measured gram weight in a brew result.

`../catalog-media.json` records 115 product-page associations: 87 coffees and 28 equipment models. Images remain remote at their publishers and are classified `source_linked`; this is attribution, not a license claim. An image of a newer Flair model was excluded from the older Flair 58 listing. Missing or broken model photos show a labeled fallback.

Public sources:

- https://collective.xbloom.com/
- https://share-h5.xbloom.com/
- https://www.redeemer.coffee/pages/recipe
- Each recipe's original source and sharing URL and each product's source page are retained in the snapshot and catalog.

The research scripts never control a device, authenticate to a member account, copy article bodies or create ratings. Account identifiers, avatars and contact data are not included in the snapshot. Existing BeanMora attribution is retained for imported catalog entries; source authors are shown separately.

To prepare a reviewable replay after applying schema migrations:

```sh
python3 scripts/prepare-reviewed-catalog.py --output /tmp/beanmora-reviewed-batches
```

Review the generated statements before applying them through an administrative database connection. The private invoker function is unavailable to anonymous and authenticated app clients. Replaying a source updates its matching entry instead of creating another recipe. No research or database credentials are bundled in the mobile app.
