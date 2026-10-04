-- 6 exact-product images with live official CDN and archived official product-page provenance
-- Proposal only; generated 2026-10-04T12:24:59.422076+00:00. Requires image_kind column added by root migration.
-- Explicitly scoped to reviewed public beans and their observed previous image URL.
-- source_linked does not claim redistribution rights.
WITH proposed(id, slug, expected_image_url, image_url, image_source_url, image_kind) AS (
  VALUES
  ('7b8b9ea2-109c-4a2f-b256-134fedc5a607', '48e-guayata', NULL, 'https://48e.co/cdn/shop/files/1_823fd739-8911-495a-917e-d9d2a7457fc1.png?v=1779096647&width=480', 'https://48e.co/products/guayata-colombia', 'product_artwork'),
  ('d2887ae7-d3f7-486b-b544-21d04ff0df54', '48e-los-colores-el-salvador', NULL, 'https://48e.co/cdn/shop/files/4_009a1d44-0110-4a49-b902-bbd3d734e530.png?v=1780900038&width=480', 'https://48e.co/products/los-colores-el-salvador', 'product_artwork'),
  ('3baa9332-4708-426c-89eb-b20cf0ea877f', '48e-supernatural-karibu', NULL, 'https://48e.co/cdn/shop/files/1-3_39bee618-0acc-44a9-8755-12cb9421f284.png?v=1776839475&width=480', 'https://48e.co/products/supernatural-karibu-kenya', 'product_artwork'),
  ('dbcf59f8-4e88-4f29-9e52-d37d3ab8228d', 'goldbox-costa-rica-red-honey', NULL, 'https://goldboxroastery.com/cdn/shop/files/webp-laymoon_960x.webp?v=1753965762', 'https://goldboxroastery.com/collections/team-favourites/products/costa-rica-red-honey-copy', 'packaging'),
  ('e415d288-a2f7-4f0c-8281-d535304f77f2', 'camel-step-ethiopia-jininet', NULL, 'https://media.zid.store/4d81b434-c24e-4364-a896-a2c5d766130c/696b6268-886a-4b1f-afa8-1c5329fd6dfd.png', 'https://camelstep.com/ar-ge/products/إثيوبيا-جينيت', 'packaging'),
  ('bc63a3af-a665-4878-a198-7f1ce7cfda4e', 'earth-brazil-cascavel-vermelha-natural', NULL, 'https://kw.earthroastery.com/cdn/shop/files/BRZN25MG16-250G.png?v=1773740115&width=1500', 'https://kw.earthroastery.com/ar/products/brazil-cascavel-vermelha-natural', 'packaging')
)
UPDATE public.beans b
SET image_url = p.image_url,
    image_source_url = p.image_source_url,
    image_usage_status = 'source_linked',
    image_kind = p.image_kind
FROM proposed p
WHERE b.id = p.id::uuid AND b.slug = p.slug
  AND b.is_published = true AND b.requires_review = false
  AND b.image_url IS NOT DISTINCT FROM p.expected_image_url
RETURNING b.id, b.slug, b.image_kind, b.image_url, b.image_source_url;
