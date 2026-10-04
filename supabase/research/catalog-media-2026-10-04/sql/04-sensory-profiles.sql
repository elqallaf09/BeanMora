-- 14 source-backed sensory profiles. Requires root sensory_profile migration.
-- All 11 48East profiles omit Body: current English metric is Aroma.
-- Proposal only, generated 2026-10-04T12:29:08.568055+00:00; exact public reviewed IDs and source guard.
WITH proposed(id, slug, expected_source_url, profile) AS (
  VALUES
  ('f8270341-8ff4-4f38-9335-3fc2df4a8f67', '48e-bani-ismail-yemen', 'https://48e.co/products/bani-ismail-yemen', '{"source_url":"https://48e.co/products/bani-ismail-yemen","scale_max":5,"sweetness":5,"acidity":4}'),
  ('a3c66b65-4330-4471-aea6-a4d4c888c92d', '48e-bossa-nova-brazil', 'https://48e.co/products/santa-lucia-brazil', '{"source_url":"https://48e.co/products/santa-lucia-brazil","scale_max":5,"sweetness":3,"acidity":2}'),
  ('0ec28062-0301-422d-8164-8d1fe177e483', '48e-buenos-dias', 'https://48e.co/products/buenos-dias', '{"source_url":"https://48e.co/products/buenos-dias","scale_max":5,"sweetness":3,"acidity":3}'),
  ('6b771104-0304-4ebd-8fed-f630d268160a', '48e-freddy-mellado-peru', 'https://48e.co/products/freddy-mellado-peru', '{"source_url":"https://48e.co/products/freddy-mellado-peru","scale_max":5,"sweetness":4,"acidity":4}'),
  ('7b8b9ea2-109c-4a2f-b256-134fedc5a607', '48e-guayata', 'https://48e.co/products/guayata-colombia', '{"source_url":"https://48e.co/cdn/shop/files/1_823fd739-8911-495a-917e-d9d2a7457fc1.png?v=1779096647&width=480","scale_max":5,"acidity":3,"sweetness":3}'),
  ('d2887ae7-d3f7-486b-b544-21d04ff0df54', '48e-los-colores-el-salvador', 'https://48e.co/products/los-colores-el-salvador', '{"source_url":"https://48e.co/cdn/shop/files/4_009a1d44-0110-4a49-b902-bbd3d734e530.png?v=1780900038&width=480","scale_max":5,"acidity":4,"sweetness":3}'),
  ('f8bfde66-fcf1-4161-bdd5-c9832178034b', '48e-mameria-native-community-peru', 'https://48e.co/products/mameria-native-community-peru', '{"source_url":"https://48e.co/products/mameria-native-community-peru","scale_max":5,"sweetness":4,"acidity":3}'),
  ('3baa9332-4708-426c-89eb-b20cf0ea877f', '48e-supernatural-karibu', 'https://48e.co/products/supernatural-karibu-kenya', '{"source_url":"https://48e.co/cdn/shop/files/1-3_39bee618-0acc-44a9-8755-12cb9421f284.png?v=1776839475&width=480","scale_max":5,"acidity":3,"sweetness":4}'),
  ('0b326ce4-f838-47af-827a-30aa42b38172', '48e-thageini-indigo-kenya', 'https://48e.co/products/thageini-indigo-kenya', '{"source_url":"https://48e.co/products/thageini-indigo-kenya","scale_max":5,"sweetness":4,"acidity":3}'),
  ('4384608f-ddd0-4919-956c-7e22371171f2', '48e-tropical-canopy-ethiopia', 'https://48e.co/products/tropical-canopy-ethiopia', '{"source_url":"https://48e.co/products/tropical-canopy-ethiopia","scale_max":5,"sweetness":4,"acidity":4}'),
  ('8574ec7f-2dba-4159-8d99-7a102d35a91d', '48e-yirgacheffe-chelchele', 'https://48e.co/products/yirgacheffe-chelchele-ethiopia', '{"source_url":"https://48e.co/collections/espresso-coffee/products/yirgacheffe-chelchele-ethiopia-espresso","scale_max":5,"acidity":4,"sweetness":4}'),
  ('0572cf80-9e66-42e4-8c7c-042c83bea9f2', 'archers-ethiopia-daye-bensa-hamasho', 'https://archerscoffee.com/products/ethiopia-daye-bensa-hamasho-natural-archers-lot-0126', '{"source_url":"https://archerscoffee.com/products/ethiopia-daye-bensa-hamasho-natural-archers-lot-0126","scale_max":5,"fermentation":2,"sweetness":5,"acidity":4,"roast":2}'),
  ('c6a39dd3-109d-474a-a96e-9f0fb5c10e0c', 'archers-ethiopia-rumudamo', 'https://archerscoffee.com/products/ethiopia-rumudamo-anaerobic-mini-archers-lot-0102-26', '{"source_url":"https://archerscoffee.com/products/ethiopia-rumudamo-anaerobic-mini-archers-lot-0102-26","scale_max":5,"fermentation":3,"sweetness":5,"acidity":4,"roast":2}'),
  ('3ea7eceb-2c8f-4ffa-b60c-c88570540d47', 'archers-panama-janson-hacienda', 'https://archerscoffee.com/products/panama-janson-family-hacienda-lot-26-127', '{"source_url":"https://archerscoffee.com/products/panama-janson-family-hacienda-lot-26-127","scale_max":5,"fermentation":3,"sweetness":5,"acidity":3,"roast":2}')
)
UPDATE public.beans b SET sensory_profile = p.profile::jsonb
FROM proposed p
WHERE b.id = p.id::uuid AND b.slug = p.slug
  AND b.is_published = true AND b.requires_review = false
  AND b.source_url IS NOT DISTINCT FROM p.expected_source_url
RETURNING b.id, b.slug, b.sensory_profile;

-- Correct the one legacy body number contradicted by current source wording.
UPDATE public.beans SET body_level = NULL
WHERE id = '0ec28062-0301-422d-8164-8d1fe177e483'::uuid
  AND slug = '48e-buenos-dias' AND body_level = 3
  AND is_published = true AND requires_review = false
RETURNING id, slug, body_level;
