-- BeanMora — 26: import the staged Wave 1 Kuwait roaster research.
--
-- Forward-only. Does not modify migrations 01-25.
--
-- supabase/research/kuwait/roasters.json has sat as a staged, real,
-- sourced batch since an earlier session (task "Real Wave 1 research:
-- genuine Kuwait specialty coffee roasters") but was never actually
-- inserted into public.roasters — the admin research/import viewers even
-- point at this exact file as "pending import". This migration imports it
-- verbatim: no invented fields, no upgraded confidence beyond what the
-- research file itself recorded.
--
-- Three of the eight were independently fetched from their own official
-- sites (bio, locations, socials confirmed on-page) and are marked
-- data_confidence = 'verified' — those go live immediately
-- (requires_review = false). The other five were only found via a search
-- snippet and never independently fetched, so the file itself marks them
-- data_confidence = 'unverified' — those are inserted as
-- requires_review = true and stay in the admin research queue, not on the
-- public site, until someone (or the discovery pipeline's own follow-up
-- pass) actually confirms them from the source.
--
-- Idempotent: re-running does nothing once these slugs exist.

-- Countries this batch needs. Mirrors supabase/seed/countries.sql, which
-- may or may not have been applied to this environment — folded in here so
-- this migration has no unstated dependency.
insert into public.countries (code, name_ar, name_en, currency_code, is_gcc) values
  ('KW', 'الكويت', 'Kuwait', 'KWD', true),
  ('SA', 'المملكة العربية السعودية', 'Saudi Arabia', 'SAR', true),
  ('AE', 'الإمارات العربية المتحدة', 'United Arab Emirates', 'AED', true),
  ('QA', 'قطر', 'Qatar', 'QAR', true),
  ('BH', 'البحرين', 'Bahrain', 'BHD', true),
  ('OM', 'سلطنة عمان', 'Oman', 'OMR', true)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------- --
-- Verified (independently fetched from the roaster's own site) — live now.
-- ---------------------------------------------------------------------- --

-- name_ar is not-null on this table (migration 04). None of these three
-- roasters' Arabic branding was confirmed on the fetched pages, so name_ar
-- holds a plain phonetic transliteration of the Latin brand name — not a
-- translated/invented brand identity — flagged in `notes` for a moderator
-- to replace with the roaster's own Arabic name if they use one.
insert into public.roasters
  (slug, name_ar, name_en, description_en, country, website_url, instagram_url, tiktok_url,
   whatsapp_number, has_physical_store, ships_to_gcc,
   source_type, source_url, source_name, last_verified_at, data_confidence, requires_review, notes)
values
  ('oru-roasters', 'أورو روسترز', 'ORU Roasters',
   'Kuwait-based specialty coffee roastery, roasting since 2018. Sources and roasts single-origin and signature blend beans, with a Shuwaikh roastery/original branch plus three additional Kuwait City-area locations.',
   'KW', 'https://oruroasters.com/', 'https://www.instagram.com/oruroasters/', 'https://www.tiktok.com/@oruroasters',
   '+96599613881', true, null,
   'official_website', 'https://oruroasters.com/', 'ORU Roasters — official site',
   '2026-08-05T17:30:38Z', 'verified', false,
   'Physical stores confirmed via on-page Google Maps links (5 locations): Shuwaikh – The Roastery, ORU The Fourth, ORU City at Assima, ORU at Hamra, ORU at Wafra Twin Tower. Shipping-to-GCC not stated on the fetched page. name_ar is a phonetic transliteration, not confirmed from source — verify against the roaster''s own Arabic branding if any.'),

  ('48-east-coffee-roasters', '48 إيست لتحميص القهوة', '48 East Coffee Roasters',
   'Kuwait coffee roaster and multi-brand equipment retailer sourcing, roasting, and distributing specialty coffee to individuals and businesses; also runs in-person barista/latte-art/filter courses at its Shuwaikh Industrial roastery.',
   'KW', 'https://48e.co/', 'https://www.instagram.com/48e.co', 'https://www.tiktok.com/@48east.co',
   null, true, null,
   'official_website', 'https://48e.co/', '48 East Coffee Roasters — official site',
   '2026-08-05T17:30:38Z', 'verified', false,
   'Locations: Shuwaikh (77 68 St, Shuwaikh Industrial), Salmiya (123 Salem Al Mubarak St), Lothan Hospital Salmiya. Contact +965 2228 4848. Also resells third-party equipment brands — only their own-roasted coffee belongs in BeanMora''s bean catalog, not the equipment one. name_ar is a phonetic transliteration, not confirmed from source.'),

  ('roots-roastery', 'روتس روستري', 'Roots Roastery',
   'Kuwait specialty coffee roaster offering single-origin beans from origins including Ethiopia, Colombia, and Yemen, with online ordering and a Shuwaikh Industrial shop.',
   'KW', 'https://rootsroastery.net/en/', 'https://www.instagram.com/roots.roastery/', null,
   '+96594930170', true, null,
   'official_website', 'https://rootsroastery.net/en/', 'Roots Roastery — official site',
   '2026-08-05T17:30:38Z', 'verified', false,
   'Location: Shuwaikh Industrial, Block 3 Street 78, Building 109, Shop 11. name_ar is a phonetic transliteration, not confirmed from the fetched EN page — check the /ar/ version.')
on conflict (slug) do nothing;

-- ---------------------------------------------------------------------- --
-- Unverified (search-snippet only, never independently fetched) — held in
-- the admin research queue via requires_review, not shown publicly.
-- ---------------------------------------------------------------------- --

insert into public.roasters
  (slug, name_ar, name_en, country, website_url,
   source_type, source_url, source_name, data_confidence, requires_review, notes)
values
  ('methods-academy-and-roastery', 'ميثودز أكاديمي آند روستري', 'Methods Academy and Roastery', 'KW', 'https://methods.coffee/',
   'official_website', 'https://methods.coffee/', 'Search result snippet only — not yet fetched',
   'unverified', true, 'Discovered via search, described as a roastery + coffee academy. Not yet independently fetched/verified. name_ar is a phonetic transliteration only.'),

  ('speak-coffee-roaster', 'سبيك كوفي روستر', 'Speak Coffee Roaster', 'KW', 'https://speakcoffeeroaster.com/',
   'official_website', 'https://speakcoffeeroaster.com/', 'Search result snippet only — not yet fetched',
   'unverified', true, 'Search snippet describes physical cafés + online store. Not yet independently fetched/verified. name_ar is a phonetic transliteration only.'),

  ('legacy-roastery', 'ليجاسي روستري', 'Legacy Roastery', 'KW', 'https://www.legacyroastery.com/',
   'official_website', 'https://www.legacyroastery.com/', 'Search result snippet only — fetch returned empty (JS-rendered site)',
   'unverified', true, 'Direct HTTP fetch returned no content, likely a client-rendered site requiring a browser-based fetch to verify. name_ar is a phonetic transliteration only.'),

  ('air-roastery', 'إير روستري', 'Air Roastery', 'KW', 'https://airroastery.com/en/',
   'official_website', 'https://airroastery.com/en/', 'Search result snippet only — not yet fetched',
   'unverified', true, 'Not yet independently fetched/verified. name_ar is a phonetic transliteration only.'),

  ('earth-roastery', 'إيرث روستري', 'Earth Roastery', 'KW', 'https://kw.earthroastery.com/',
   'official_website', 'https://kw.earthroastery.com/', 'Search result snippet only — not yet fetched',
   'unverified', true, 'Search snippet states founded 2014. Not yet independently fetched/verified. name_ar is a phonetic transliteration only.')
on conflict (slug) do nothing;
