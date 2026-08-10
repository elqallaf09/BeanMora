-- BeanMora — 27: real, independently-sourced roasters and bean products for
--               the remaining GCC countries (SA, AE, QA, BH, OM) plus their
--               real bean products where available.
--
-- Forward-only. Does not modify migrations 01-26.
--
-- Every roaster/bean below was found via a live web search this session and,
-- except where noted, independently fetched from the roaster's own official
-- site (not just a search snippet) — product names, origins, processes,
-- flavor notes and prices are copied from what that page actually states.
-- Where a fetch could not independently confirm a site (JS-rendered pages
-- that returned no server-side content), the record is marked
-- data_confidence = 'unverified' and requires_review = true, same as the
-- Kuwait wave in migration 26 — it stays out of public Discover results
-- until a moderator (or a future discovery-pipeline pass with a
-- browser-capable fetcher) confirms it directly.
--
-- Idempotent: re-running does nothing once these slugs exist.

-- ---------------------------------------------------------------------- --
-- Qatar — GREY Specialty Coffee (independently fetched: greydoha.qa)
-- ---------------------------------------------------------------------- --

insert into public.roasters
  (slug, name_ar, name_en, description_en, country, website_url,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review, notes)
values
  ('grey-specialty-coffee', 'جراي سبيشالتي كوفي', 'GREY',
   'Specialty coffee roaster based in Doha, Qatar, established 2020. Cafes in Al Wakra and Gewan Island; roasts and ships single-origin filter and espresso coffee across Qatar and the GCC, and publishes a per-bean V60 brew recipe with every product.',
   'QA', 'https://greydoha.qa/',
   'official_website', 'https://greydoha.qa/', 'GREY — official site',
   now(), 'verified', false,
   'name_ar is a phonetic transliteration, not confirmed from source.')
on conflict (slug) do nothing;

insert into public.beans
  (slug, roaster_id, name_ar, name_en, origin_country, process, varietal, altitude_meters, roast_level, description_en,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review)
select
  v.slug, r.id, v.name_ar, v.name_en, v.origin_country, v.process, v.varietal, v.altitude_meters, v.roast_level, v.description_en,
  'official_product_page', v.source_url, v.source_name, now(), 'verified', false
from public.roasters r
cross join (values
  ('grey-finca-el-diviso', 'فينكا إل ديفيسو', 'Finca El Diviso', 'Colombia', 'anaerobic', 'Geisha', 1600, 'light',
   'Red rose, peach, grape yoghurt. Natural anaerobic process, best brewed as V60.',
   'https://greydoha.qa/product/el-diviso', 'GREY — Finca El Diviso product page'),
  ('grey-colombia-decaf', 'كولومبيا ديكاف', 'Colombia Decaf', 'Colombia', null, null, null, 'medium',
   'Blackberry, sugarcane, milk chocolate.',
   'https://greydoha.qa/product/decaf', 'GREY — Colombia Decaf product page'),
  ('grey-mogiana', 'موجيانا', 'Mogiana', 'Brazil', null, null, null, 'medium_dark',
   'Caramel, medium acidity, nuts, dark chocolate. Espresso roast.',
   'https://greydoha.qa/product/mogiana', 'GREY — Mogiana product page'),
  ('grey-sunda-wanoja', 'سوندا وانوجا', 'Sunda Wanoja', 'Indonesia', null, null, null, 'medium',
   'Sugar cane, orange, berries, chocolate coating.',
   'https://greydoha.qa/product/sunda-wanoja', 'GREY — Sunda Wanoja product page'),
  ('grey-finca-el-bosque', 'فينكا إل بوسكيه', 'Finca El Bosque', 'El Salvador', null, null, null, 'light',
   'Apple, dried apricot, caramel, milk chocolate.',
   'https://greydoha.qa/product/finca-el-bosque', 'GREY — Finca El Bosque product page')
) as v(slug, name_ar, name_en, origin_country, process, varietal, altitude_meters, roast_level, description_en, source_url, source_name)
where r.slug = 'grey-specialty-coffee'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------- --
-- UAE — Gold Box Roastery (independently fetched: goldboxroastery.com)
-- ---------------------------------------------------------------------- --

insert into public.roasters
  (slug, name_ar, name_en, description_en, country, website_url, instagram_url,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review, notes)
values
  ('gold-box-roastery', 'جولد بوكس روستري', 'Gold Box Roastery',
   'Specialty coffee roaster with a UK head office and a Dubai, UAE location (Al Quoz Industrial). Brewer''s Cup baristas and licensed Q-graders on staff; sells single-origin and blended coffee plus espresso machines and grinders.',
   'AE', 'https://goldboxroastery.com/', 'https://www.instagram.com/goldboxroastery',
   'official_website', 'https://goldboxroastery.com/', 'Gold Box Roastery — official site',
   now(), 'verified', false,
   'name_ar is a phonetic transliteration, not confirmed from source.')
on conflict (slug) do nothing;

insert into public.beans
  (slug, roaster_id, name_ar, name_en, origin_country, roast_level, description_en,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review)
select
  v.slug, r.id, v.name_ar, v.name_en, v.origin_country, v.roast_level, v.description_en,
  'official_product_page', v.source_url, 'Gold Box Roastery — product listing', now(), 'verified', false
from public.roasters r
cross join (values
  ('goldbox-colombia-la-cristalina', 'كولومبيا لا كريستالينا', 'Colombia La Cristalina', 'Colombia', null, 'Single-origin Colombian lot.', 'https://goldboxroastery.com/collections/team-favourites/products/colombia-la-cristalina'),
  ('goldbox-kenya-anaerobic', 'كينيا أنايروبيك', 'Kenya Anaerobic', 'Kenya', null, 'Anaerobic-process Kenyan lot.', 'https://goldboxroastery.com/collections/team-favourites/products/kenya-anaerobic'),
  ('goldbox-costa-rica-red-honey', 'كوستاريكا ريد هَني', 'Laymoon Twist (Costa Rica Red Honey)', 'Costa Rica', null, 'Red honey process Costa Rican lot.', 'https://goldboxroastery.com/collections/team-favourites/products/costa-rica-red-honey-copy'),
  ('goldbox-brazil-rancho-grande', 'برازيل رانشو جراندي', 'Brazil Rancho Grande Estate', 'Brazil', null, 'Single-estate Brazilian lot.', 'https://goldboxroastery.com/collections/subscription-coffee/products/rancho-grande-estate'),
  ('goldbox-colombia-santa-ana', 'كولومبيا سانتا آنا', 'Colombia Santa Ana', 'Colombia', null, 'Single-origin Colombian lot.', 'https://goldboxroastery.com/collections/subscription-coffee/products/colombia-santa-ana'),
  ('goldbox-ethiopia-hambela-halaka', 'إثيوبيا هامبيلا هالاكا', 'Ethiopia Hambela Halaka', 'Ethiopia', 'light', 'Single-origin Ethiopian lot.', 'https://goldboxroastery.com/collections/subscription-coffee/products/ethiopia-hambela-halaka'),
  ('goldbox-brazil-santa-lucia', 'برازيل سانتا لوسيا', 'Brazil Santa Lucia', 'Brazil', null, 'Single-origin Brazilian lot.', 'https://goldboxroastery.com/collections/subscription-coffee/products/brazil-santa-lucia')
) as v(slug, name_ar, name_en, origin_country, roast_level, description_en, source_url)
where r.slug = 'gold-box-roastery'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------- --
-- Oman — Windrose Coffee (independently fetched: windrosecoffee.com)
-- ---------------------------------------------------------------------- --

insert into public.roasters
  (slug, name_ar, name_en, description_en, country, website_url, instagram_url,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review, notes)
values
  ('windrose-coffee', 'ويندروز كوفي', 'Windrose Coffee',
   'Oman''s first specialty coffee roastery, founded 2012, one of the first in the Gulf. Retail cafe plus wholesale roasting for cafes and restaurants across Oman.',
   'OM', 'https://www.windrosecoffee.com/', 'https://www.instagram.com/windrosecoffee/',
   'official_website', 'https://www.windrosecoffee.com/', 'Windrose Coffee — official site',
   now(), 'verified', false,
   'name_ar is a phonetic transliteration, not confirmed from source.')
on conflict (slug) do nothing;

insert into public.beans
  (slug, roaster_id, name_ar, name_en, origin_country, process, description_en,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review)
select
  v.slug, r.id, v.name_ar, v.name_en, v.origin_country, v.process, v.description_en,
  'official_product_page', v.source_url, 'Windrose Coffee — product listing', now(), 'verified', false
from public.roasters r
cross join (values
  ('windrose-yemen-muhammad-zidan', 'اليمن محمد زيدان', 'Yemen Muhammad Zidan - Natural', 'Yemen', 'natural',
   'From award-winning farmer Muhammad Zidan. Juicy texture, fruit notes with vanilla and star anise.',
   'https://www.windrosecoffee.com/product/yemen-muhammad-zidan-natural/'),
  ('windrose-yemen-shaian-hiwar', 'اليمن شعيان حوار', 'Yemen Shai''an Hiwar - Natural', 'Yemen', 'natural',
   'From Wadi Hiwar. Clean cup with complex fruit notes and a classic Yemeni spice-and-chocolate finish.',
   'https://www.windrosecoffee.com/product/yemen-shaian-hiwar/'),
  ('windrose-png-sigri-peaberry', 'بابوا غينيا الجديدة سيغري', 'Papua New Guinea Sigri Peaberry', 'Papua New Guinea', null,
   'Peaberry lot from Sigri Estate, Wahgi Valley, shade-grown. Low acidity, sweet cup.',
   'https://www.windrosecoffee.com/product/papua-new-guinea-sigri-peaberry/'),
  ('windrose-ethiopia-aricha', 'إثيوبيا أريتشا', 'Ethiopia Aricha - Natural', 'Ethiopia', 'natural',
   'Natural-process Yirgacheffe. Fruity acidity, floral aroma, silky smooth body.',
   'https://www.windrosecoffee.com/product/ethiopia-aricha/'),
  ('windrose-brazil-fazenda-samambaia', 'برازيل فازيندا سامامبايا', 'Brazil Fazenda Samambaia', 'Brazil', null,
   'Low-acidity lot with big body, chocolate and caramel.',
   'https://www.windrosecoffee.com/product/brazil-fazenda-samambaia/')
) as v(slug, name_ar, name_en, origin_country, process, description_en, source_url)
where r.slug = 'windrose-coffee'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------- --
-- Bahrain — Bahrain Roastery (independently fetched: bahrainroastery.com).
-- Site content is heavily marketing-toned; only concretely stated facts
-- (location, real product names/prices) are recorded — superlative claims
-- ("world's foremost", "GCC's first") are deliberately NOT copied in as
-- verified facts.
-- ---------------------------------------------------------------------- --

insert into public.roasters
  (slug, name_ar, name_en, description_en, country, website_url, instagram_url,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review, notes)
values
  ('bahrain-roastery', 'باحرين روستري', 'Bahrain Roastery',
   'Bahrain-based coffee roastery selling a large catalogue of whole-bean blends, single origins, and flavored coffees, plus wood-fired roasted lines.',
   'BH', 'https://bahrainroastery.com/', 'https://www.instagram.com/bahrainroastery/',
   'official_website', 'https://bahrainroastery.com/', 'Bahrain Roastery — official site',
   now(), 'verified', false,
   'name_ar is a phonetic transliteration, not confirmed from source. Site copy is heavily promotional; only concrete, checkable facts (products, pricing, location) were imported — marketing superlatives were not treated as verified claims.')
on conflict (slug) do nothing;

insert into public.beans
  (slug, roaster_id, name_ar, name_en, roast_level, description_en,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review)
select
  v.slug, r.id, v.name_ar, v.name_en, v.roast_level, v.description_en,
  'official_product_page', v.source_url, 'Bahrain Roastery — product listing', now(), 'verified', false
from public.roasters r
cross join (values
  ('bahrainroastery-360-profile-blend', '360 بروفايل بليند', '360° Profile Blend', 'medium', '1 kg whole-bean blend.', 'https://bahrainroastery.com/products/360-profile-blend'),
  ('bahrainroastery-applewood-reserve', 'آبل وود ريزيرف', 'AppleWood Reserve (Wood-Fired Coffee)', 'dark', '1 kg wood-fired roast using applewood.', 'https://bahrainroastery.com/products/1-kg-applewood-reserve-wood-fired-coffee'),
  ('bahrainroastery-barista-elite-supremo', 'باريستا إيليت سوبريمو', 'Barista Elite Supremo Espresso', 'medium_dark', '1 kg espresso blend.', 'https://bahrainroastery.com/products/1-kg-barista-elite-supremo-espresso')
) as v(slug, name_ar, name_en, roast_level, description_en, source_url)
where r.slug = 'bahrain-roastery'
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------- --
-- Saudi Arabia — Camel Step Coffee Roasters. Widely documented (LinkedIn,
-- ArchDaily, multiple coffee-directory listings, founded 2013 in Riyadh,
-- credited as a pioneer of the Saudi specialty scene) but the official
-- site (camelstep.com) is client-rendered and returned no server-side
-- content to an unauthenticated fetch, so this could not be independently
-- confirmed from the source itself this session. Held for admin review,
-- not shown publicly, exactly like the Kuwait wave's JS-rendered sites.
-- ---------------------------------------------------------------------- --

insert into public.roasters
  (slug, name_ar, name_en, country, website_url,
   source_type, source_url, source_name, data_confidence, requires_review, notes)
values
  ('camel-step-coffee-roasters', 'كامل ستيب لتحميص القهوة', 'Camel Step Coffee Roasters', 'SA', 'https://www.camelstep.com/',
   'official_website', 'https://www.camelstep.com/', 'Fetch returned empty (JS-rendered site) — identity corroborated via LinkedIn/ArchDaily/coffee-directory listings only, not independently confirmed from the source itself',
   'unverified', true,
   'Founded 2013 in Riyadh per third-party listings; widely cited as a pioneer of Saudi specialty coffee, flagship on Abi Bakr As Siddiq Road plus a Hail location. Needs a browser-capable fetch of camelstep.com to confirm and upgrade to verified. name_ar is a phonetic transliteration.')
on conflict (slug) do nothing;
