# Reviewed roasting equipment — 2026-10-10

Eight manufacturer-backed models expand the three existing reviewed roasters to eleven. `reviewed.json` holds bilingual names, descriptions, bounded specifications, official links and photo verification. No price, stock, rating or performance claim is inferred.

| Added model | Official source |
| --- | --- |
| Behmor 2000AB Plus | https://behmor.com/behmor-2000ab-plus/ |
| Behmor Jake | https://behmor.com/jake-kilo-roaster/ |
| Fresh Roast SR540 | https://homeroastingsupplies.com/products/fresh-roast-sr540-coffee-roaster-green-beans |
| Fresh Roast SR800 | https://homeroastingsupplies.com/products/fresh-roast-sr800-coffee-roaster |
| Fresh Roast SR900 | https://homeroastingsupplies.com/products/fresh-roast-sr900-home-coffee-roaster-home-roasting-supplies |
| Nucleus LINK | https://nucleuscoffeetools.com/how-to-use-the-link/ |
| ROEST L200 Plus | https://www.roestcoffee.com/products/sample-roasters/l200-plus |
| ROEST L200 Ultra | https://www.roestcoffee.com/products/sample-roasters/l200-ultra |

Manufacturer text was retrieved and reviewed. Five new model images decoded successfully and were visually checked; their dimensions and SHA-256 digests are recorded. Behmor and Nucleus images returned access errors, so those records retain explicit placeholders. Source-linked images remain on the publisher's host and do not imply a redistribution licence. SR900 capacity uses the conservative 225 g stated in the manufacturer highlights rather than converting a conflicting range into a fixed claim.

## Replay and verification

Generate SQL with `python replay.py` and execute it against a compatible BeanMora schema. It defaults to a transaction ending in `ROLLBACK`. `python replay.py --commit` generates the same bounded operation ending in `COMMIT`.

The script uses a transaction lock, resolves brands by exact name, rejects conflicting identities and inserts only missing models. It preserves existing records and does not touch user equipment, profiles, authentication, policies or schema. Repeating it does not create duplicate models.

The rollback rehearsal and committed rollout both returned eleven reviewed public roasters, seven with direct `image_url` values. Existing gallery photographs are counted separately. An anonymous-role query after commit confirmed all eleven model names, brands and Arabic catalog names are readable with `requires_review = false`.
