-- Five reviewed Crossbridge packaging rescues, 2026-10-04T12:49:14.364289+00:00.
-- Original official page is archived; original CDN images are live.
-- Chelelektu and Chire share the original two-bag photograph (left/right).
-- Oasis is approved only for the matched Uganda/Brazil/Colombia description.
-- No current stock claim and no rights_confirmed status.
-- Idempotent: only missing image fields are filled; repeat execution changes 0 rows.
WITH proposed(id, slug, expected_source_url, expected_description_en, image_url, image_source_url) AS (
  VALUES
  ('61bac2e2-5005-412d-a524-8d03ea072d9e', 'crossbridge-chelelektu', 'https://crossbridgecoffee.com/', 'Single-origin Ethiopian roast; roaster-stated tasting notes of berries, lavender and black tea. No process/varietal/altitude/bag size published.', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592739895522-PPAE5V3TZSZO3QR0SKB2/image-asset.jpeg', 'https://web.archive.org/web/20240822132556/https://crossbridgecoffee.com/'),
  ('7a095545-5136-4962-b17e-3cd4d872470c', 'crossbridge-chire', 'https://crossbridgecoffee.com/', 'Single-origin Ethiopian roast. No further process/varietal/altitude/notes published on the fetched page.', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592739895522-PPAE5V3TZSZO3QR0SKB2/image-asset.jpeg', 'https://web.archive.org/web/20240822132556/https://crossbridgecoffee.com/'),
  ('5c81bc4d-7a34-4ff4-8d23-2e8edda1db05', 'crossbridge-yemen-abu-wudiyyan', 'https://crossbridgecoffee.com/', 'Single-origin Yemeni beans named "Abu Wudiyyan" on the roaster''s own homepage. No process/varietal/altitude/notes published.', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592322352259-XAERMEVG77FCZH9Z5N3W/image-asset.jpeg', 'https://web.archive.org/web/20240822132556/https://crossbridgecoffee.com/'),
  ('6cb87075-99cd-4ed8-aff8-0bb4992e5942', 'crossbridge-brazil-roast', 'https://crossbridgecoffee.com/', 'Single-origin Brazilian roast. No process/varietal/altitude/notes published on the fetched page.', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592031396284-AIPHWSQR3DO48KI7X264/image-asset.jpeg', 'https://web.archive.org/web/20240822132556/https://crossbridgecoffee.com/'),
  ('08f9dfeb-375b-4578-bb24-8ca1639836c5', 'crossbridge-oasis-blend', 'https://crossbridgecoffee.com/', 'Signature house blend, stated as featuring beans from Uganda, Brazil and Colombia. No process/varietal/roast/bag size published.', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1593350415515-UAU8BG9WMUYTUTU2LK6P/image-asset.jpeg', 'https://web.archive.org/web/20240822132556/https://crossbridgecoffee.com/')
)
UPDATE public.beans b
SET image_url = p.image_url,
    image_source_url = p.image_source_url,
    image_usage_status = 'source_linked',
    image_kind = 'packaging'
FROM proposed p
WHERE b.id = p.id::uuid AND b.slug = p.slug
  AND b.is_published = true AND b.requires_review = false
  AND b.source_url IS NOT DISTINCT FROM p.expected_source_url
  AND b.description_en IS NOT DISTINCT FROM p.expected_description_en
  AND b.image_url IS NULL AND b.image_source_url IS NULL
  AND b.image_usage_status IS NULL
RETURNING b.id, b.slug, b.image_url, b.image_source_url, b.image_kind, b.image_usage_status;
