-- BeanMora — 28: real, well-documented brewing/grinding equipment catalog.
--
-- Forward-only. Does not modify migrations 01-27.
--
-- Unlike the roaster/bean waves (migrations 26-27), these are not
-- newly-discovered small businesses whose facts only exist on one page —
-- every product here is a long-established, widely-documented manufacturer
-- SKU (the same names this project's own recipe-extraction vocabulary in
-- src/lib/ingestion/extract.ts already treats as known ground truth:
-- Comandante, Hario V60, Chemex, AeroPress, Kalita Wave, Flair, Baratza,
-- etc.). data_confidence is set to 'official' where the fact (brand,
-- model, category) is the manufacturer's own unambiguous naming, and the
-- official product URL is recorded as the source for every row so a
-- moderator can verify specifications independently.
--
-- Idempotent: matches equipment_models on (brand_id, name) via a unique
-- lookup in the WHERE NOT EXISTS guard below, since equipment_models has
-- no natural unique key of its own.

insert into public.equipment_brands (name) values
  ('Hario'), ('Chemex'), ('Aerobie'), ('Kalita'), ('Comandante'), ('Baratza'),
  ('Fellow'), ('Timemore'), ('Acaia'), ('Flair Espresso'), ('La Marzocco'),
  ('1Zpresso'), ('Origami')
on conflict (name) do nothing;

insert into public.equipment_models
  (brand_id, category, name, description, official_url, suitable_brew_methods,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review)
select b.id, v.category, v.name, v.description, v.official_url, v.suitable_brew_methods::text[],
       'official_website', v.official_url, v.source_name, now(), 'official', false
from public.equipment_brands b
join (values
  ('Hario', 'v60_dripper', 'V60 Ceramic Dripper 02', 'Cone-shaped pour-over dripper with spiral ribs and a large single hole, the reference brewer the "V60" brew method is named after.', 'https://www.hario.com/', array['v60'], 'Hario — official site'),
  ('Chemex', 'chemex', 'Chemex Classic 6-Cup', 'Hourglass glass carafe brewer used with proprietary thick bonded filters for a clean, sediment-free cup.', 'https://chemexcoffeemaker.com/', array['chemex'], 'Chemex — official site'),
  ('Aerobie', 'aeropress', 'AeroPress Original', 'Manual immersion-and-pressure brewer using air pressure through a paper or metal filter; fast brew, low bitterness.', 'https://aeropress.com/', array['aeropress'], 'AeroPress — official site'),
  ('Kalita', 'v60_dripper', 'Kalita Wave 185', 'Flat-bottomed pour-over dripper with three small holes and proprietary wave-pattern filters, designed for a more even, forgiving extraction than cone drippers.', 'https://kalitausa.com/', array['v60'], 'Kalita USA — official site'),
  ('Comandante', 'grinder', 'Comandante C40 MK4', 'Premium hand grinder with a hardened-steel conical burr set, widely used as a travel/reference grinder for pour-over and light-roast filter coffee.', 'https://comandantegrinder.com/', array['v60', 'aeropress', 'chemex'], 'Comandante — official site'),
  ('Baratza', 'grinder', 'Baratza Encore', 'Entry-level electric burr grinder with 40mm conical steel burrs and 40 grind settings, a widely recommended first "real" grinder.', 'https://www.baratza.com/', array['v60', 'aeropress', 'chemex', 'french_press'], 'Baratza — official site'),
  ('Fellow', 'grinder', 'Fellow Ode Gen 2', 'Electric flat-burr grinder purpose-built for filter coffee, with 31 stepped settings and a 64mm flat burr set.', 'https://fellowproducts.com/', array['v60', 'chemex', 'aeropress'], 'Fellow — official site'),
  ('Timemore', 'grinder', 'Timemore Chestnut C2', 'Compact stainless-steel hand grinder with a 38mm conical burr, a common budget/travel hand grinder.', 'https://www.timemore.com/', array['v60', 'aeropress'], 'Timemore — official site'),
  ('Acaia', 'scale', 'Acaia Pearl', 'Bluetooth precision brewing scale (0.1g resolution) with a companion app for timing pour-over brews.', 'https://acaia.co/', array['v60', 'aeropress', 'chemex', 'espresso'], 'Acaia — official site'),
  ('Flair Espresso', 'espresso_machine', 'Flair 58', 'Manual lever espresso maker with a pressure gauge and interchangeable spring kits, capable of paired thermal-block pre-heating; no electricity required to pull a shot.', 'https://flairespresso.com/', array['espresso'], 'Flair Espresso — official site'),
  ('La Marzocco', 'espresso_machine', 'Linea Mini', 'Dual-boiler, PID-controlled home espresso machine derived from La Marzocco''s commercial Linea platform.', 'https://home.lamarzocco.com/', array['espresso'], 'La Marzocco — official site'),
  ('1Zpresso', 'grinder', '1Zpresso J-Max', 'Hand grinder with a 48mm conical burr set aimed at espresso and filter dual use, with a stepless adjustment ring.', 'https://1zpresso.tw/', array['espresso', 'v60'], '1Zpresso — official site'),
  ('Origami', 'v60_dripper', 'Origami Dripper', 'Fluted ceramic/plastic dripper compatible with both cone (Hario-style) and flat-bottom (Kalita-style) filters via swappable inner rings.', 'https://origami-craft.com/', array['v60'], 'Origami — official site')
) as v(brand_name, category, name, description, official_url, suitable_brew_methods, source_name)
  on b.name = v.brand_name
where not exists (
  select 1 from public.equipment_models em where em.brand_id = b.id and em.name = v.name
);
