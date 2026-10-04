BEGIN;

-- 40 exact-product image updates with active official product-page provenance
-- Proposal only; generated 2026-10-04T12:24:59.422076+00:00. Requires image_kind column added by root migration.
-- Explicitly scoped to reviewed public beans and their observed previous image URL.
-- source_linked does not claim redistribution rights.
WITH proposed(id, slug, expected_image_url, image_url, image_source_url, image_kind) AS (
  VALUES
  ('0572cf80-9e66-42e4-8c7c-042c83bea9f2', 'archers-ethiopia-daye-bensa-hamasho', 'https://archerscoffee.com/cdn/shop/files/daye_bensa_commu_product_2.jpg?v=1790350874', 'https://archerscoffee.com/cdn/shop/files/HamashoNaturalLot0126BlackBag_900x.png?v=1790363058', 'https://archerscoffee.com/products/ethiopia-daye-bensa-hamasho-natural-archers-lot-0126', 'packaging'),
  ('c6a39dd3-109d-474a-a96e-9f0fb5c10e0c', 'archers-ethiopia-rumudamo', 'https://archerscoffee.com/cdn/shop/files/daye_bensa_commu_product_2.jpg?v=1790350874', 'https://archerscoffee.com/cdn/shop/files/RumudamoNaturalanaerobicminiBox_900x.png?v=1790362095', 'https://archerscoffee.com/products/ethiopia-rumudamo-anaerobic-mini-archers-lot-0102-26', 'packaging'),
  ('3ea7eceb-2c8f-4ffa-b60c-c88570540d47', 'archers-panama-janson-hacienda', 'https://archerscoffee.com/cdn/shop/files/Janson_Coffee_Release-06.jpg?v=1789384493', 'https://archerscoffee.com/cdn/shop/files/JansonGeishaNatural26-127Box_900x.png?v=1789388938', 'https://archerscoffee.com/products/panama-janson-family-hacienda-lot-26-127', 'packaging'),
  ('c162490c-4357-47e8-af6f-974fbf34da15', 'goldbox-funky-weekend-blend', 'https://goldboxroastery.com/cdn/shop/files/Webp_-_Drip_Bag_9fa03a91-236e-4c4a-8e5d-7e43c54cd8b2_1200x1200.webp?v=1740381625', 'https://goldboxroastery.com/cdn/shop/products/2022-224g-bag-funky-weekend_6be1b55ec1b3275728796a96d6ddc5b0_960x.jpg?v=1688630819', 'https://goldboxroastery.com/collections/coffee/products/funky-weekend-blend', 'packaging'),
  ('d9e2fa86-72e9-403a-ab70-e15d30d18cc8', 'goldbox-rocko-mountain', 'https://goldboxroastery.com/cdn/shop/files/Webp_-_Drip_Bag_1200x1200.webp?v=1740379251', 'https://goldboxroastery.com/cdn/shop/products/image_9f22898c-d4a0-4d89-9fbc-ead8c38f1851_960x.jpg?v=1688630664', 'https://goldboxroastery.com/collections/coffee/products/rocko-mountain', 'packaging'),
  ('ad3508b8-401d-43ca-ba92-53f5d99ba34f', 'goldbox-colombia-santa-ana', 'https://goldboxroastery.com/cdn/shop/files/Webp_-_Drip_Bag_b0c8d06e-9bf9-4df5-8910-ba428015f74b_1200x1200.webp?v=1740381769', 'https://goldboxroastery.com/cdn/shop/products/2022-224g-bag-Colo-Santa-A_6be1b55ec1b3275728796a96d6ddc5b0_960x.jpg?v=1688630845', 'https://goldboxroastery.com/collections/subscription-coffee/products/colombia-santa-ana', 'packaging'),
  ('0e4b731c-6607-4d0a-98f3-85f2b7562fb6', 'goldbox-ethiopia-hambela-halaka', 'https://goldboxroastery.com/cdn/shop/files/Webp_-_Drip_Bag_a19353fa-0316-4a8e-a996-a033824c2909_1200x1200.webp?v=1740381707', 'https://goldboxroastery.com/cdn/shop/files/HH_960x.jpg?v=1690293087', 'https://goldboxroastery.com/collections/subscription-coffee/products/ethiopia-hambela-halaka', 'packaging'),
  ('cfcb6f79-d030-4414-b424-04e368a865cf', 'goldbox-colombia-la-cristalina', 'https://goldboxroastery.com/cdn/shop/files/Webp_-_Drip_Bag_a867c2ed-a583-4072-ad88-920381d6e79f_1200x1200.webp?v=1740382267', 'https://goldboxroastery.com/cdn/shop/files/Webp-ColombiaLaCristalina_dab4af39-a8d1-4180-868d-2cdc4be8fb0a_960x.webp?v=1778999905', 'https://goldboxroastery.com/collections/team-favourites/products/colombia-la-cristalina', 'packaging'),
  ('1090fec2-e4e1-4ff2-aec9-d00a3d8e054b', 'earth-ethiopia-korma-natural', 'https://kw.earthroastery.com/cdn/shop/files/ETHN25GH21_4067281f-1f9b-4835-872b-e6e6fb867a47.png?v=1779023866&width=2048', 'https://kw.earthroastery.com/cdn/shop/files/ETHN25GH_21-250G.png?v=1775136870&width=1500', 'https://kw.earthroastery.com/products/ethiopia-korma-natural', 'packaging'),
  ('451b7bd4-d084-476a-a154-7f23350bb96c', 'julith-colombia-finca-zarza-papayo-natural', NULL, 'https://julithcoffee.com/wp-content/uploads/2026/06/COLOMBIA-FINCA-ZARZA-FRUIT-FORWARD-PAPAYO-NATURAL.png', 'https://julithcoffee.com/colombia-finca-zarza-fruit-forward-papayo/', 'packaging'),
  ('2ee54616-a7f5-4447-8692-4ee85ef03567', 'julith-panama-janson-geisha-washed-lot-26-178', NULL, 'https://julithcoffee.com/wp-content/uploads/2026/09/PANAMA-NEW-COFFEE-MOCKUP-17-1024x1024.png', 'https://julithcoffee.com/panama-janson-coffee-geisha-washed-lot-26-178/', 'packaging'),
  ('c5e2422d-311c-4cfc-91f7-58c310db389a', 'julith-panama-kotowa-silvia-marina-geisha-natural-lot-26-4320', NULL, 'https://julithcoffee.com/wp-content/uploads/2026/09/Silvia-4320-1024x1024.jpg', 'https://julithcoffee.com/panama-kotowa-silvia-marina-geisha-natural-lot26-4320/', 'packaging'),
  ('015b13c8-fc4c-46b4-883c-326163b8d6a2', 'jazean-watad-mountain', NULL, 'https://media.zid.store/cdn-cgi/image/fit=scale-down,width=1000,height=1000/https://media.zid.store/c13c0944-c63e-46e9-bd1e-e3fe2cc3a534/abf8324e-9dbe-4848-856e-516ce077f8fb.png', 'https://store.jazeancoffee.com/products/WatadMountain', 'packaging'),
  ('0fadd092-b676-4d06-a9bb-aebd41681486', 'jazean-khayalah-mountain', NULL, 'https://media.zid.store/cdn-cgi/image/fit=scale-down,width=1000,height=1000/https://media.zid.store/c13c0944-c63e-46e9-bd1e-e3fe2cc3a534/bacd3041-5180-4e56-9909-9947fcf90c1c.png', 'https://store.jazeancoffee.com/products/KhayalahMountain', 'packaging'),
  ('bfad0a19-95a0-4e0c-ad15-e5c154cc439c', 'coffeesheep-ethiopia-guji', NULL, 'https://media.zid.store/c637d8cc-fb94-462b-9cf1-10cfa82beb9b/37308f0d-7c94-4418-b0ae-39044cb3e681.png', 'https://thecoffeesheep.com/products/اثيوبيا-قوجي', 'packaging'),
  ('1d157986-8f1c-4aca-a2c8-2565706c151f', 'coffeesheep-peru-cajamarca', NULL, 'https://media.zid.store/c637d8cc-fb94-462b-9cf1-10cfa82beb9b/e607898a-214c-44f7-ade4-591f5f7f8b58.png', 'https://thecoffeesheep.com/products/البيرو-كاجاماركا', 'packaging'),
  ('8cfefa25-4996-406d-b7e0-4e0a261ec81f', 'coffeesheep-yemen-kholani', NULL, 'https://media.zid.store/c637d8cc-fb94-462b-9cf1-10cfa82beb9b/18920539-cbcf-4a51-abe5-4729cfe41d59.png', 'https://thecoffeesheep.com/products/اليمن-خولاني', 'packaging'),
  ('ccb013f2-eced-46ed-945b-728bcec84fd8', 'cafinto-mystery-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/mystery.jpg', 'https://cafinto.com/product/mystery/', 'packaging'),
  ('833898d9-79b4-4062-9b4a-aefa4c09e50c', 'cafinto-wild-arabian-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/wild-arabian.jpg', 'https://cafinto.com/product/wild-arabian/', 'packaging'),
  ('1d9acf03-7d41-4f5c-9a97-0b8845744016', 'cafinto-desert-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/desert.jpg', 'https://cafinto.com/product/desert/', 'packaging'),
  ('e2ceaf0e-34fe-44d4-b2eb-7a5a38f1983f', 'cafinto-old-lady-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/old-lady.jpg', 'https://cafinto.com/product/old-lady-speciality-blend/', 'packaging'),
  ('110cff89-911e-4be4-92b4-f4e219d2c73d', 'cafinto-darkness-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/darkness.jpg', 'https://cafinto.com/product/darkness-speciality-blend/', 'packaging'),
  ('144cdbc9-8e15-48a1-8489-f8042c0609e5', 'cafinto-bright-eye-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/birght-eye.jpg', 'https://cafinto.com/product/bright-eye/', 'packaging'),
  ('72555d6f-77c1-4e0c-9579-e3049e34d16e', 'cafinto-shepherd-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/shepherd.jpg', 'https://cafinto.com/product/shepherd-speciality-blend/', 'packaging'),
  ('74bcdb41-3d01-409a-8c95-2e1bbb821204', 'cafinto-wilderness-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/wilderness.jpg', 'https://cafinto.com/product/wilderness-speciality-blend/', 'packaging'),
  ('0e0e6e24-f4f6-413e-bb91-5bdd5e17dde0', 'windrose-brazil-fazenda-samambaia', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2024/08/brazi-img-3.jpg', 'https://www.windrosecoffee.com/product/brazil-fazenda-samambaia/', 'origin_photo'),
  ('6a2d5237-dde9-4fcc-ab7d-e5109b3c4bd9', 'windrose-colombia-arcila', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/Jairo-1-600-400.jpg', 'https://www.windrosecoffee.com/product/colombia-arcila-anaerobic-honey/', 'origin_photo'),
  ('8b336d45-fe93-434e-8faa-df2a3feb0aef', 'windrose-colombia-calderon', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/Calderon-1-600-400.jpg', 'https://www.windrosecoffee.com/product/colombia-calderon-anaerobic-natural/', 'origin_photo'),
  ('081e9941-1213-48ae-ad8c-06910432ca24', 'windrose-dawn-blend', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2025/06/Dawn.png', 'https://www.windrosecoffee.com/product/dawn-crafted-filter-blend/', 'product_artwork'),
  ('b7da40da-ef3f-4eb7-a1f9-e7edc69bfc3d', 'windrose-dusk-blend', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2025/09/Dusk.png', 'https://www.windrosecoffee.com/product/dusk-crafted-espresso-blend/', 'product_artwork'),
  ('7989ebe3-b23a-4d20-8bd2-5308d4869dc8', 'windrose-ecuador-finca-la-aurum', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/La-Aurum-1-600-400.png', 'https://www.windrosecoffee.com/product/ecuador-finca-la-aurum-auction-lot/', 'origin_photo'),
  ('24201a74-12d3-412e-b555-8eee05547a8f', 'windrose-kenya-ruiruiru', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/Rui-3.-600-400.jpg.jpeg', 'https://www.windrosecoffee.com/product/kenya-ruiruiru-anaerobic-natural/', 'origin_photo'),
  ('caa0ae7c-61ba-4ad2-bb7c-fa87083c5d73', 'windrose-png-sigri-peaberry', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2025/05/PNG-Sigri-1.jpg', 'https://www.windrosecoffee.com/product/papua-new-guinea-sigri-peaberry/', 'origin_photo'),
  ('504103ad-9407-4281-b5fb-9bc48839fc8d', 'windrose-twilight-crafted-blend', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2025/09/Twilight-.png', 'https://www.windrosecoffee.com/product/twilight-crafted-blend/', 'product_artwork'),
  ('f70a61bf-f6e1-4499-a225-4aca9162ae1b', 'windrose-yemen-muhammad-zidan', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2026/05/Mohammad-Zidan-600-400.jpg', 'https://www.windrosecoffee.com/product/yemen-muhammad-zidan-natural/', 'origin_photo'),
  ('60633536-42a2-47fe-aaa4-0b57ecbd7b46', 'windrose-yemen-shaian-hiwar-peaberry', NULL, 'https://www.windrosecoffee.com/wp-content/uploads/2026/05/Haiwar-600-400.jpg', 'https://www.windrosecoffee.com/product/yemen-shaian-hiwar-peaberry/', 'origin_photo'),
  ('c6ff4d8f-b189-49c6-b0d3-eade4826be90', 'cafinto-el-kaif-speciality-blend', NULL, 'https://cafinto.com/wp-content/uploads/2023/01/elkaif.jpg', 'https://cafinto.com/product/el-kaif/', 'packaging'),
  ('6b1d138b-c3c9-46b5-8837-424de0f43d9c', 'vulcan-colombia-cerro-azul-honey-geisha', 'https://www.vulcanroastery.com/cdn/shop/files/POST03_5d49fc9a-5cbf-47f5-aa2b-333ee0b91b9b_1200x1200.jpg?v=1776170011', 'https://www.vulcanroastery.com/cdn/shop/files/POST01square_5e9bee90-ea67-40a6-955f-ee12475a3453_960x.jpg?v=1776170011', 'https://www.vulcanroastery.com/collections/all-coffee/products/colombia-cerro-azul-geisha-honey', 'packaging'),
  ('57f2ceda-dbfc-4b81-afea-352b94676a21', 'vulcan-el-salvador-finca-colombia-natural-gesha', 'https://www.vulcanroastery.com/cdn/shop/products/3_8b11b866-563c-4cdf-be3f-ed24df95b36d_1200x1200.jpg?v=1646807710', 'https://www.vulcanroastery.com/cdn/shop/products/1_beb5f041-0991-427d-9f39-b7574d6e61f4_960x.jpg?v=1646807710', 'https://www.vulcanroastery.com/collections/vulcan-treasury-series/products/finca-colombia-gesha-el-salvador', 'packaging'),
  ('8574ec7f-2dba-4159-8d99-7a102d35a91d', '48e-yirgacheffe-chelchele', NULL, 'https://48e.co/cdn/shop/files/5-2.png?v=1784278137&width=480', 'https://48e.co/collections/espresso-coffee/products/yirgacheffe-chelchele-ethiopia-espresso', 'product_artwork')
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

-- Final kind map for the original137 beans, including approved rescue imagery.
-- Apply only when the actual URL equals the reviewed URL; later imports excluded.
WITH reviewed(id, slug, image_url, image_kind) AS (
  VALUES
  ('2c268de1-8ee9-4890-b688-8d6d04c99b8a', '42-coffee-colombia-sanchez-monteblanco', 'https://42coffeeroasters.com/wp-content/uploads/2026/06/Sanchez-Finca-Montebalnco-42-Coffee-Roasters.jpg', 'packaging'),
  ('7ffc48be-9d5e-4b30-92c4-1218af89733c', '42-coffee-ethiopia-bona-zuria', 'https://42coffeeroasters.com/wp-content/uploads/2025/03/Ethiopia-Bona-Zuria.jpg', 'packaging'),
  ('f7126f88-c7f3-43ed-a79d-579e04fb9212', '42-coffee-ethiopia-goro-bedesa', 'https://42coffeeroasters.com/wp-content/uploads/2023/03/Ethiopia-Goro-Bedesa.jpg', 'packaging'),
  ('f8270341-8ff4-4f38-9335-3fc2df4a8f67', '48e-bani-ismail-yemen', 'https://48e.co/cdn/shop/files/2-5_173554a9-7c28-4297-a6b2-e75416711242.png?v=1788079542', 'product_artwork'),
  ('a3c66b65-4330-4471-aea6-a4d4c888c92d', '48e-bossa-nova-brazil', 'https://48e.co/cdn/shop/files/8.jpg?v=1760460774', 'product_artwork'),
  ('0ec28062-0301-422d-8164-8d1fe177e483', '48e-buenos-dias', 'https://48e.co/cdn/shop/files/16.jpg?v=1760461121', 'product_artwork'),
  ('6b771104-0304-4ebd-8fed-f630d268160a', '48e-freddy-mellado-peru', 'https://48e.co/cdn/shop/files/1-3_9fd93b1a-8b9b-42f9-a6dd-4e30a37577ec.png?v=1782893449', 'product_artwork'),
  ('7b8b9ea2-109c-4a2f-b256-134fedc5a607', '48e-guayata', 'https://48e.co/cdn/shop/files/1_823fd739-8911-495a-917e-d9d2a7457fc1.png?v=1779096647&width=480', 'product_artwork'),
  ('d2887ae7-d3f7-486b-b544-21d04ff0df54', '48e-los-colores-el-salvador', 'https://48e.co/cdn/shop/files/4_009a1d44-0110-4a49-b902-bbd3d734e530.png?v=1780900038&width=480', 'product_artwork'),
  ('f8bfde66-fcf1-4161-bdd5-c9832178034b', '48e-mameria-native-community-peru', 'https://48e.co/cdn/shop/files/1_727b1d39-d3c9-44da-9721-2a7bccf734f8.png?v=1786265739', 'product_artwork'),
  ('3baa9332-4708-426c-89eb-b20cf0ea877f', '48e-supernatural-karibu', 'https://48e.co/cdn/shop/files/1-3_39bee618-0acc-44a9-8755-12cb9421f284.png?v=1776839475&width=480', 'product_artwork'),
  ('0b326ce4-f838-47af-827a-30aa42b38172', '48e-thageini-indigo-kenya', 'https://48e.co/cdn/shop/files/3-5.png?v=1788080468', 'product_artwork'),
  ('4384608f-ddd0-4919-956c-7e22371171f2', '48e-tropical-canopy-ethiopia', 'https://48e.co/cdn/shop/files/3_5bdfdec2-0ff9-4868-aef3-72a7f47bcb49.png?v=1786265679', 'product_artwork'),
  ('8574ec7f-2dba-4159-8d99-7a102d35a91d', '48e-yirgacheffe-chelchele', 'https://48e.co/cdn/shop/files/5-2.png?v=1784278137&width=480', 'product_artwork'),
  ('fb696f05-4728-44c4-bfe2-9c761e8c1b2b', '80plus-elixir-brazil', 'https://80pluscoffeebh.com/cdn/shop/files/Brazil_Mogiana_Origins_Sticker.png?v=1749225967', 'product_artwork'),
  ('8e4dfbdf-f285-4547-ac2e-81f58db66436', '80plus-hambela-ethiopia', 'https://80pluscoffeebh.com/cdn/shop/files/BerryPopSticker.png?v=1769772951', 'product_artwork'),
  ('0572cf80-9e66-42e4-8c7c-042c83bea9f2', 'archers-ethiopia-daye-bensa-hamasho', 'https://archerscoffee.com/cdn/shop/files/HamashoNaturalLot0126BlackBag_900x.png?v=1790363058', 'packaging'),
  ('c6a39dd3-109d-474a-a96e-9f0fb5c10e0c', 'archers-ethiopia-rumudamo', 'https://archerscoffee.com/cdn/shop/files/RumudamoNaturalanaerobicminiBox_900x.png?v=1790362095', 'packaging'),
  ('3ea7eceb-2c8f-4ffa-b60c-c88570540d47', 'archers-panama-janson-hacienda', 'https://archerscoffee.com/cdn/shop/files/JansonGeishaNatural26-127Box_900x.png?v=1789388938', 'packaging'),
  ('8c6568c7-32c5-488c-a19c-a962c90291aa', 'bahrainroastery-360-profile-blend', 'https://bahrainroastery.com/cdn/shop/files/rn-image_picker_lib_temp_fffeb4e3-7e01-4412-9198-96d6a35bbb05.jpg?v=1766715590', 'product_artwork'),
  ('c0a4d04e-ce93-4452-bf89-37af9ce228d6', 'bahrainroastery-amberwood-reserve', 'https://bahrainroastery.com/cdn/shop/files/rn-image_picker_lib_temp_a9a669e1-63af-48ee-82a1-4ba729d02ebb.png?v=1790070089', 'product_artwork'),
  ('1b58e3d2-6b7a-41b1-9c33-9527c30324e4', 'bahrainroastery-applewood-reserve', 'https://bahrainroastery.com/cdn/shop/files/rn-image_picker_lib_temp_99292d2b-f5a4-4a97-9e8b-c04cfb70db3b.png?v=1785213956', 'product_artwork'),
  ('9e239c55-3d07-4f3b-a097-e785a0729c0e', 'bahrainroastery-barista-elite-supremo', 'https://bahrainroastery.com/cdn/shop/files/rn-image_picker_lib_temp_bc771943-b80f-4450-a9bb-ac97c3308082.png?v=1768513857', 'product_artwork'),
  ('04013dd4-13df-471d-afeb-260d4238ae2f', 'black-knight-excelso-colombia', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/f6a65a4f-3e16-4120-a6ce-737855e6e7fc/f114ca6a-0d8d-48dc-b734-c38a2646a92c.png', 'packaging'),
  ('6b6b4953-e7de-431c-9d8b-eb0d50842008', 'black-knight-lollit-ethiopia', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/f6a65a4f-3e16-4120-a6ce-737855e6e7fc/6cec92bb-739c-47ed-ad65-cda659c935a6.png', 'packaging'),
  ('4e38c68a-3349-4790-8850-c4af6512d893', 'black-knight-masar-yemen', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/f6a65a4f-3e16-4120-a6ce-737855e6e7fc/36579fe8-685c-4fcc-8c5f-2d27dd71419c.png', 'packaging'),
  ('6f7530e6-839a-4b73-9cc2-1c3e5b6921f2', 'black-knight-meloraa-costa-rica', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/f6a65a4f-3e16-4120-a6ce-737855e6e7fc/85df33a0-af45-4fb1-bc33-91a11c9b9220.png', 'packaging'),
  ('c757b135-ba1b-43c9-a796-27e809decff0', 'black-knight-nardos-ethiopia', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/f6a65a4f-3e16-4120-a6ce-737855e6e7fc/89f4c8ec-ea8a-4e4e-9dc5-c512d9a7eddc.png', 'packaging'),
  ('144cdbc9-8e15-48a1-8489-f8042c0609e5', 'cafinto-bright-eye-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/birght-eye.jpg', 'packaging'),
  ('110cff89-911e-4be4-92b4-f4e219d2c73d', 'cafinto-darkness-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/darkness.jpg', 'packaging'),
  ('1d9acf03-7d41-4f5c-9a97-0b8845744016', 'cafinto-desert-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/desert.jpg', 'packaging'),
  ('c6ff4d8f-b189-49c6-b0d3-eade4826be90', 'cafinto-el-kaif-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/elkaif.jpg', 'packaging'),
  ('ccb013f2-eced-46ed-945b-728bcec84fd8', 'cafinto-mystery-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/mystery.jpg', 'packaging'),
  ('e2ceaf0e-34fe-44d4-b2eb-7a5a38f1983f', 'cafinto-old-lady-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/old-lady.jpg', 'packaging'),
  ('72555d6f-77c1-4e0c-9579-e3049e34d16e', 'cafinto-shepherd-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/shepherd.jpg', 'packaging'),
  ('833898d9-79b4-4062-9b4a-aefa4c09e50c', 'cafinto-wild-arabian-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/wild-arabian.jpg', 'packaging'),
  ('74bcdb41-3d01-409a-8c95-2e1bbb821204', 'cafinto-wilderness-speciality-blend', 'https://cafinto.com/wp-content/uploads/2023/01/wilderness.jpg', 'packaging'),
  ('50e28b17-674d-4ee6-82f6-f9c0506bf5f8', 'camel-step-colombia-las-palmas', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/4d81b434-c24e-4364-a896-a2c5d766130c/17cfee59-c2e2-4a25-8150-859709676598.png', 'packaging'),
  ('842f8569-b4a0-4644-97b0-d4224a318a38', 'camel-step-costa-rica-baratila', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/4d81b434-c24e-4364-a896-a2c5d766130c/d6615671-1e66-47d6-aaba-13ccfd4e2e6a.png', 'packaging'),
  ('e415d288-a2f7-4f0c-8281-d535304f77f2', 'camel-step-ethiopia-jininet', 'https://media.zid.store/4d81b434-c24e-4364-a896-a2c5d766130c/696b6268-886a-4b1f-afa8-1c5329fd6dfd.png', 'packaging'),
  ('6cb87075-99cd-4ed8-aff8-0bb4992e5942', 'crossbridge-brazil-roast', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592031396284-AIPHWSQR3DO48KI7X264/image-asset.jpeg', 'packaging'),
  ('61bac2e2-5005-412d-a524-8d03ea072d9e', 'crossbridge-chelelektu', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592739895522-PPAE5V3TZSZO3QR0SKB2/image-asset.jpeg', 'packaging'),
  ('7a095545-5136-4962-b17e-3cd4d872470c', 'crossbridge-chire', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592739895522-PPAE5V3TZSZO3QR0SKB2/image-asset.jpeg', 'packaging'),
  ('b3fb9a14-395b-4008-a1e0-ad2b017336fb', 'crossbridge-guatemala-roast', NULL, 'unclassified'),
  ('08f9dfeb-375b-4578-bb24-8ca1639836c5', 'crossbridge-oasis-blend', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1593350415515-UAU8BG9WMUYTUTU2LK6P/image-asset.jpeg', 'packaging'),
  ('5c81bc4d-7a34-4ff4-8d23-2e8edda1db05', 'crossbridge-yemen-abu-wudiyyan', 'https://images.squarespace-cdn.com/content/v1/5626184ce4b0581ff0294cfe/1592322352259-XAERMEVG77FCZH9Z5N3W/image-asset.jpeg', 'packaging'),
  ('1bf374c0-347c-4b65-9936-d119580eed88', 'doha-roastery-ethiopia-guji', 'https://lcjkjukqjjfaljndhgji.supabase.co/storage/v1/object/public/product-images/products/1784968674824-2s3y99sbin7.png', 'packaging'),
  ('05dab7a3-7d48-43f2-b840-19e5e5073d77', 'doha-roastery-ethiopia-yirgacheffe', 'https://lcjkjukqjjfaljndhgji.supabase.co/storage/v1/object/public/product-images/products/1785942869368-ez39rir36tt.png', 'packaging'),
  ('385c9f0c-362c-4cf2-9b22-f4303ba79066', 'doha-roastery-india-single-origin', 'https://lcjkjukqjjfaljndhgji.supabase.co/storage/v1/object/public/product-images/products/1779179786292-q76rwjz7xei.png', 'packaging'),
  ('450ed2b1-59a8-4aab-8de0-51d59454174a', 'doha-roastery-yemen-rare-single-origin', 'https://lcjkjukqjjfaljndhgji.supabase.co/storage/v1/object/public/product-images/products/1785942697755-7p4hfsh5c4b.png', 'packaging'),
  ('bc63a3af-a665-4878-a198-7f1ce7cfda4e', 'earth-brazil-cascavel-vermelha-natural', 'https://kw.earthroastery.com/cdn/shop/files/BRZN25MG16-250G.png?v=1773740115&width=1500', 'packaging'),
  ('1090fec2-e4e1-4ff2-aec9-d00a3d8e054b', 'earth-ethiopia-korma-natural', 'https://kw.earthroastery.com/cdn/shop/files/ETHN25GH_21-250G.png?v=1775136870&width=1500', 'packaging'),
  ('d9f43409-6346-416d-a155-54c9fb730845', 'earth-indonesia-pantan-musara-washed', NULL, 'unclassified'),
  ('87162ebd-df97-48fc-b33f-bcc54c0d16fd', 'friedhats-costa-rica-adelina-fallas-honey', 'https://cdn.shopify.com/s/files/1/0015/3265/7724/files/CostaRica-Label-Bottle-2_1200x1200.png?v=1783066770', 'packaging'),
  ('1f582ab1-550a-4a42-a2ac-5d9e444119af', 'friedhats-ethiopia-bisrat-melaku-washed', 'https://cdn.shopify.com/s/files/1/0015/3265/7724/files/Ethiopia-label-2-V2-bottle_1200x1200.png?v=1748954449', 'packaging'),
  ('3e352196-03d4-4418-bc93-a14059e9453e', 'friedhats-kenya-gicherori-washed', 'https://cdn.shopify.com/s/files/1/0015/3265/7724/files/Kenya-label-2-V2-bottle_1200x1200.png?v=1740059879', 'packaging'),
  ('607a472b-06f9-422c-88d5-b70fad7da399', 'goldbox-arabic-gahwa', 'https://goldboxroastery.com/cdn/shop/files/ArabicGahwa--webp_1200x1200.webp?v=1744278469', 'packaging'),
  ('208a6c4a-69ef-40b1-a999-1e35477489af', 'goldbox-bond-street-espresso-blend', 'https://goldboxroastery.com/cdn/shop/products/2022-224g-bag-Bond-St_6be1b55ec1b3275728796a96d6ddc5b0_1200x1200.jpg?v=1688630863', 'packaging'),
  ('40268f9b-0217-4d87-8871-1e2989f7ed0f', 'goldbox-brazil-rancho-grande', 'https://goldboxroastery.com/cdn/shop/products/2022-224g-bag-Brazil-Rancho-G-est_6be1b55ec1b3275728796a96d6ddc5b0_1200x1200.jpg?v=1688630673', 'packaging'),
  ('0b5561fa-ce79-400e-8e56-1d7e368b7958', 'goldbox-brazil-santa-lucia', 'https://goldboxroastery.com/cdn/shop/files/SantaLuciawebp_1200x1200.webp?v=1713012090', 'packaging'),
  ('cfcb6f79-d030-4414-b424-04e368a865cf', 'goldbox-colombia-la-cristalina', 'https://goldboxroastery.com/cdn/shop/files/Webp-ColombiaLaCristalina_dab4af39-a8d1-4180-868d-2cdc4be8fb0a_960x.webp?v=1778999905', 'packaging'),
  ('ad3508b8-401d-43ca-ba92-53f5d99ba34f', 'goldbox-colombia-santa-ana', 'https://goldboxroastery.com/cdn/shop/products/2022-224g-bag-Colo-Santa-A_6be1b55ec1b3275728796a96d6ddc5b0_960x.jpg?v=1688630845', 'packaging'),
  ('268429cc-3b76-4fb5-ad6f-330ef98d0b0e', 'goldbox-dark-sugars', 'https://goldboxroastery.com/cdn/shop/files/DS_1200x1200.jpg?v=1690291921', 'packaging'),
  ('0e4b731c-6607-4d0a-98f3-85f2b7562fb6', 'goldbox-ethiopia-hambela-halaka', 'https://goldboxroastery.com/cdn/shop/files/HH_960x.jpg?v=1690293087', 'packaging'),
  ('c162490c-4357-47e8-af6f-974fbf34da15', 'goldbox-funky-weekend-blend', 'https://goldboxroastery.com/cdn/shop/products/2022-224g-bag-funky-weekend_6be1b55ec1b3275728796a96d6ddc5b0_960x.jpg?v=1688630819', 'packaging'),
  ('6ad6f1ba-0fd6-4604-8eb5-43dd7e14f2a0', 'goldbox-kenya-anaerobic', 'https://goldboxroastery.com/cdn/shop/files/webp-KenyaAnaerobic_1200x1200.webp?v=1767685942', 'packaging'),
  ('dbcf59f8-4e88-4f29-9e52-d37d3ab8228d', 'goldbox-costa-rica-red-honey', 'https://goldboxroastery.com/cdn/shop/files/webp-laymoon_960x.webp?v=1753965762', 'packaging'),
  ('d9e2fa86-72e9-403a-ab70-e15d30d18cc8', 'goldbox-rocko-mountain', 'https://goldboxroastery.com/cdn/shop/products/image_9f22898c-d4a0-4d89-9fbc-ead8c38f1851_960x.jpg?v=1688630664', 'packaging'),
  ('51423f52-16e6-450e-9c69-5ba6a554b00e', 'grey-colombia-decaf', 'https://i.imgur.com/lJdRa7e.jpeg', 'packaging'),
  ('0a811cf1-102c-4fb6-85c5-6ff6e9588c22', 'grey-finca-el-bosque', 'https://i.imgur.com/32bcATN.jpeg', 'packaging'),
  ('33deb576-a65e-4fcb-ae79-b8ef79b84803', 'grey-finca-el-diviso', 'https://i.imgur.com/cdazliw.jpeg', 'packaging'),
  ('b5625497-8196-4d3d-b0b5-79c2ddf7ac28', 'grey-mogiana', 'https://i.imgur.com/FKl8Fru.jpeg', 'packaging'),
  ('778874db-68c8-447f-8ad6-5b1d8ff1f992', 'grey-rivense-la-guaca', 'https://i.imgur.com/nmI5pPW.jpeg', 'packaging'),
  ('59dd3b44-19f3-43e4-b88a-4092153a511d', 'grey-sunda-wanoja', 'https://i.imgur.com/BYnKrVu.png', 'packaging'),
  ('443e7187-131e-407f-b1e9-8c34699c75db', 'haute-brazil-campo-das-vertentes', 'https://hautecoffeeroasters.com/cdn/shop/files/IMG_20230705_050008_508.png?v=1688519229', 'packaging'),
  ('884f86b5-3d5b-48d8-b6af-8a1d09bea559', 'haute-colombia-supremo', 'https://hautecoffeeroasters.com/cdn/shop/files/4new.png?v=1688693980', 'packaging'),
  ('25cebaa5-1eea-4ced-9ee8-4df141e4c973', 'haute-ethiopia-chelchele', 'https://hautecoffeeroasters.com/cdn/shop/files/IMG-20240506_171914_820.png?v=1715002272', 'packaging'),
  ('0fadd092-b676-4d06-a9bb-aebd41681486', 'jazean-khayalah-mountain', 'https://media.zid.store/cdn-cgi/image/fit=scale-down,width=1000,height=1000/https://media.zid.store/c13c0944-c63e-46e9-bd1e-e3fe2cc3a534/bacd3041-5180-4e56-9909-9947fcf90c1c.png', 'packaging'),
  ('015b13c8-fc4c-46b4-883c-326163b8d6a2', 'jazean-watad-mountain', 'https://media.zid.store/cdn-cgi/image/fit=scale-down,width=1000,height=1000/https://media.zid.store/c13c0944-c63e-46e9-bd1e-e3fe2cc3a534/abf8324e-9dbe-4848-856e-516ce077f8fb.png', 'packaging'),
  ('75f025c8-f42b-4a8b-b909-c8c8d32b2193', 'jeed-aquiares-costa-rica-natural', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/c338f653-3fac-4574-9643-bb0e646ef8f8/4aa95b03-8c17-4093-9611-dbf39dbba6f5.png', 'product_artwork'),
  ('f6beacc2-7e19-498e-b510-ae5d2db0bf98', 'jeed-benti-nenqa-ethiopia-washed', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/c338f653-3fac-4574-9643-bb0e646ef8f8/2e758812-b21a-43d0-b523-3a6d18e68297.png', 'product_artwork'),
  ('9975653b-1c43-47c7-bba9-0c668f6e2f9e', 'jeed-bombe-ethiopia-natural', 'https://media.zid.store/cdn-cgi/image/w=1200,h=630,q=90,fit=pad,background=white/https://media.zid.store/c338f653-3fac-4574-9643-bb0e646ef8f8/37492db8-6d0f-447c-8d61-235a9ef5539d.png', 'product_artwork'),
  ('451b7bd4-d084-476a-a154-7f23350bb96c', 'julith-colombia-finca-zarza-papayo-natural', 'https://julithcoffee.com/wp-content/uploads/2026/06/COLOMBIA-FINCA-ZARZA-FRUIT-FORWARD-PAPAYO-NATURAL.png', 'packaging'),
  ('c5e2422d-311c-4cfc-91f7-58c310db389a', 'julith-panama-kotowa-silvia-marina-geisha-natural-lot-26-4320', 'https://julithcoffee.com/wp-content/uploads/2026/09/Silvia-4320-1024x1024.jpg', 'packaging'),
  ('2ee54616-a7f5-4447-8692-4ee85ef03567', 'julith-panama-janson-geisha-washed-lot-26-178', 'https://julithcoffee.com/wp-content/uploads/2026/09/PANAMA-NEW-COFFEE-MOCKUP-17-1024x1024.png', 'packaging'),
  ('a7c1dbad-fd86-489d-9aa8-f3490d162cae', 'methods-hambela-supernatural', 'https://methods.coffee/cdn/shop/files/Package-sticker-N-Hambela-Supernatural.png?v=1787233049', 'packaging'),
  ('e556b549-4674-47b6-9efa-c92a0b2fd7cc', 'methods-papayo-hydro-natural', 'https://methods.coffee/cdn/shop/files/Package-sticker-N-Papayo-Hydro-NaturalPapayo-Hydro-Natural.png?v=1775034925', 'packaging'),
  ('ca6c4c9c-dafc-44a6-a5a0-db336f84ad4a', 'methods-yirgacheffe-washed-halo-bariti', 'https://methods.coffee/cdn/shop/files/Package-sticker-N-Yirgacheffe-Washed-Halo-Bariti.png?v=1775035284', 'packaging'),
  ('6642fc71-2ede-4cb2-b888-37789f1f4c83', 'oru-brazil-alta-mogiana', 'https://oruroasters.com/cdn/shop/files/2526-25.png?v=1784032058&width=2048', 'packaging'),
  ('29909e22-8890-45f2-8b20-b5390c56f01a', 'oru-colombia-catiope-bourbon', 'https://oruroasters.com/cdn/shop/files/newapricotpic-31-36.png?v=1788871224&width=2048', 'packaging'),
  ('3632b7a8-c652-4006-88bf-dfc1e814110a', 'oru-colombia-passion-fruit', 'https://oruroasters.com/cdn/shop/files/websitenewbeansaugusttt-32.png?v=1785589241&width=2048', 'packaging'),
  ('972a15e9-09ec-431a-8461-66984acce4df', 'oru-colombia-supremo', 'https://oruroasters.com/cdn/shop/files/21to24-24.png?v=1784029758&width=2048', 'packaging'),
  ('559a7d46-790d-4b18-b173-9169d81d9c17', 'oru-ethiopia-guji-g1-masina', 'https://oruroasters.com/cdn/shop/files/21to24-22.png?v=1784029697&width=2048', 'packaging'),
  ('c53534a9-10fc-49e8-a2e7-7f28878b6b6f', 'oru-mexico-altura-high-grown', 'https://oruroasters.com/cdn/shop/files/21to24-21.png?v=1784029880&width=2048', 'packaging'),
  ('a7ca90ca-3de5-464d-9470-2e39a662fcea', 'oru-blend', 'https://oruroasters.com/cdn/shop/files/orublend20-20.png?v=1784032241&width=2048', 'packaging'),
  ('c351b151-fda0-4bf7-9a21-6afdd628aaee', 'oru-uganda-mukhoto', 'https://oruroasters.com/cdn/shop/files/websitenewbeansaugusttt-31.png?v=1785586645&width=2048', 'packaging'),
  ('37c6d60c-9819-4e44-b776-79d33ac5a6dd', 'ozone-bolivia-gregorio-palli-anoxic-washed', 'https://ozonecoffee.co.uk/cdn/shop/files/Ozone_Coffee_Square_2025_BOL_Gregorio_Palli_Anoxic_f177082d-8b21-4866-a205-f979b08e07cd.png?v=1790694993', 'packaging'),
  ('c466eb6d-9017-4d72-a4d1-aefe824c1c70', 'ozone-costa-rica-granitos-ortiz-1800', 'https://ozonecoffee.co.uk/cdn/shop/files/Ozone_Coffee_Square_2026_CRI_Granitos_Ortiz.png?v=1790247110', 'packaging'),
  ('8f2ca4cd-9c96-4d01-a2ae-f44101860380', 'ozone-el-salvador-finca-argentina-yellow-pacamara-natural', 'https://ozonecoffee.co.uk/cdn/shop/files/Ozone_Coffee_Square_2025_SLV_Argentina_Y_Pacamara.png?v=1787748129', 'packaging'),
  ('8842eae8-c9d0-4d9d-94dd-3cc42c11b749', 'raw-coffee-company-ethiopian-enaria', 'https://rawcoffeecompany.com/cdn/shop/files/RAW-Coffee-Company_Ethiopian-Enaria-Coffee-250gm.jpg?v=1778660719', 'packaging'),
  ('2c02ea17-b8d6-4d1d-8ee0-793981125713', 'raw-coffee-company-uganda-elgon-anaerobic-natural', 'https://rawcoffeecompany.com/cdn/shop/files/RAW-Coffee-Company_Ugandan-Elgon-Anaerobic-Natural-Coffee-250gm.jpg?v=1776764585', 'packaging'),
  ('a1f1e8f6-60d3-49f3-b6e6-6458703db179', 'roastado-brazil-classic', 'https://roastado.qa/cdn/shop/files/69B8900A-3428-4F63-9362-39D7E60C78BA.png?v=1770926012', 'packaging'),
  ('0fd59367-2da9-4541-82d4-fc12a9218fad', 'roastado-colombia-decaf', 'https://roastado.qa/cdn/shop/files/rn-image_picker_lib_temp_56a94223-b4d7-4d05-817c-74a2e22f94d2.png?v=1785148958', 'packaging'),
  ('0dfd4f9b-047c-4697-8a5b-21d4d8a7466e', 'roastado-ethiopia-guji-filter', 'https://roastado.qa/cdn/shop/files/Ethiopia_Guji_Filter_v3.png?v=1770943562', 'packaging'),
  ('608f0dc6-e082-4105-a48f-6be71a912e6b', 'roots-black-forest-blend', 'https://rootsroastery.net/wp-content/uploads/2023/10/black-forest-blend.png', 'packaging'),
  ('6c900477-898b-46da-ba19-4d3c18ff52a2', 'roots-colombia-geisha-marcela', 'https://rootsroastery.net/wp-content/uploads/2024/04/colombia-geisha.png', 'packaging'),
  ('ceb93a1a-0af8-4e04-a8b3-60c92ee7d3b2', 'roots-ethiopia-hambella', 'https://rootsroastery.net/wp-content/uploads/2024/10/ethiopia-hambella_.png', 'packaging'),
  ('ead3b2c4-26db-422e-9cfd-d736fb00a123', 'the-barn-atlas-guatemala', 'https://thebarn.de/cdn/shop/files/bag_atlas_b2c.png?v=1784803222', 'packaging'),
  ('8c5f9fc6-b04d-47ce-a22e-fa96d9acb187', 'the-barn-elemental-brazil', 'https://thebarn.de/cdn/shop/files/bag_elemental_sito_das_cabras_b2c.png?v=1784033291', 'packaging'),
  ('497ec9d7-f918-4630-b67a-b345d8369740', 'the-barn-genesis-ethiopia', 'https://thebarn.de/cdn/shop/files/bag_genesis.png?v=1771412695', 'packaging'),
  ('bfad0a19-95a0-4e0c-ad15-e5c154cc439c', 'coffeesheep-ethiopia-guji', 'https://media.zid.store/c637d8cc-fb94-462b-9cf1-10cfa82beb9b/37308f0d-7c94-4418-b0ae-39044cb3e681.png', 'packaging'),
  ('1d157986-8f1c-4aca-a2c8-2565706c151f', 'coffeesheep-peru-cajamarca', 'https://media.zid.store/c637d8cc-fb94-462b-9cf1-10cfa82beb9b/e607898a-214c-44f7-ade4-591f5f7f8b58.png', 'packaging'),
  ('8cfefa25-4996-406d-b7e0-4e0a261ec81f', 'coffeesheep-yemen-kholani', 'https://media.zid.store/c637d8cc-fb94-462b-9cf1-10cfa82beb9b/18920539-cbcf-4a51-abe5-4729cfe41d59.png', 'packaging'),
  ('6e3c86c8-707a-4647-81ef-7425715770e1', 'vulcan-colombia-buesaco-natural', 'https://www.vulcanroastery.com/cdn/shop/files/ColombiaBuesaco-03-shopify_1200x1200.jpg?v=1780149840', 'origin_photo'),
  ('6b1d138b-c3c9-46b5-8837-424de0f43d9c', 'vulcan-colombia-cerro-azul-honey-geisha', 'https://www.vulcanroastery.com/cdn/shop/files/POST01square_5e9bee90-ea67-40a6-955f-ee12475a3453_960x.jpg?v=1776170011', 'packaging'),
  ('959d3e4a-6afd-44ba-8ce3-9ec69aa5aa9c', 'vulcan-costa-rica-los-robles-natural-reposado', 'https://www.vulcanroastery.com/cdn/shop/files/Costarica_Los_Robles-04_1200x1200.jpg?v=1780148148', 'origin_photo'),
  ('57f2ceda-dbfc-4b81-afea-352b94676a21', 'vulcan-el-salvador-finca-colombia-natural-gesha', 'https://www.vulcanroastery.com/cdn/shop/products/1_beb5f041-0991-427d-9f39-b7574d6e61f4_960x.jpg?v=1646807710', 'packaging'),
  ('f4b1796a-0a5a-430a-b7d4-ba901bf6c07f', 'vulcan-ethiopia-bench-maji-natural', 'https://www.vulcanroastery.com/cdn/shop/files/Benchmaji_Gesha_-_RESERVE_COLLECTION-04_1200x1200.jpg?v=1785591488', 'origin_photo'),
  ('0e0e6e24-f4f6-413e-bb91-5bdd5e17dde0', 'windrose-brazil-fazenda-samambaia', 'https://www.windrosecoffee.com/wp-content/uploads/2024/08/brazi-img-3.jpg', 'origin_photo'),
  ('6a2d5237-dde9-4fcc-ab7d-e5109b3c4bd9', 'windrose-colombia-arcila', 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/Jairo-1-600-400.jpg', 'origin_photo'),
  ('8b336d45-fe93-434e-8faa-df2a3feb0aef', 'windrose-colombia-calderon', 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/Calderon-1-600-400.jpg', 'origin_photo'),
  ('081e9941-1213-48ae-ad8c-06910432ca24', 'windrose-dawn-blend', 'https://www.windrosecoffee.com/wp-content/uploads/2025/06/Dawn.png', 'product_artwork'),
  ('b7da40da-ef3f-4eb7-a1f9-e7edc69bfc3d', 'windrose-dusk-blend', 'https://www.windrosecoffee.com/wp-content/uploads/2025/09/Dusk.png', 'product_artwork'),
  ('7989ebe3-b23a-4d20-8bd2-5308d4869dc8', 'windrose-ecuador-finca-la-aurum', 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/La-Aurum-1-600-400.png', 'origin_photo'),
  ('722d69fd-e014-4f60-8886-13d205a2a60e', 'windrose-ethiopia-aricha', NULL, 'unclassified'),
  ('24201a74-12d3-412e-b555-8eee05547a8f', 'windrose-kenya-ruiruiru', 'https://www.windrosecoffee.com/wp-content/uploads/2026/08/Rui-3.-600-400.jpg.jpeg', 'origin_photo'),
  ('645eac25-cff1-4331-a129-2b5dc6a4aa40', 'windrose-midnight-crafted-blend', NULL, 'unclassified'),
  ('caa0ae7c-61ba-4ad2-bb7c-fa87083c5d73', 'windrose-png-sigri-peaberry', 'https://www.windrosecoffee.com/wp-content/uploads/2025/05/PNG-Sigri-1.jpg', 'origin_photo'),
  ('504103ad-9407-4281-b5fb-9bc48839fc8d', 'windrose-twilight-crafted-blend', 'https://www.windrosecoffee.com/wp-content/uploads/2025/09/Twilight-.png', 'product_artwork'),
  ('f70a61bf-f6e1-4499-a225-4aca9162ae1b', 'windrose-yemen-muhammad-zidan', 'https://www.windrosecoffee.com/wp-content/uploads/2026/05/Mohammad-Zidan-600-400.jpg', 'origin_photo'),
  ('7ff8346e-067d-4bf7-ae5f-fd98986696d3', 'windrose-yemen-shaian-hiwar', NULL, 'unclassified'),
  ('60633536-42a2-47fe-aaa4-0b57ecbd7b46', 'windrose-yemen-shaian-hiwar-peaberry', 'https://www.windrosecoffee.com/wp-content/uploads/2026/05/Haiwar-600-400.jpg', 'origin_photo'),
  ('d033447d-b45b-4a43-ab46-1e98cd074dfe', 'wings-coffee-doha-brazil', NULL, 'unclassified'),
  ('fb682f41-734a-4bd5-9a87-e16c0cbdb4a0', 'wings-coffee-doha-colombia-decaf', NULL, 'unclassified'),
  ('1ff611a4-e1a4-48f6-9f5f-889355fa150b', 'wings-coffee-doha-el-salvador-gourmet', NULL, 'unclassified'),
  ('30868992-2873-4042-9bf0-451c616aea76', 'wings-coffee-doha-el-salvador-natural', NULL, 'unclassified'),
  ('725f39a1-2709-434d-b5ff-5ab12ad1f7b2', 'wings-coffee-doha-ethiopia-guji', NULL, 'unclassified')
)
UPDATE public.beans b SET image_kind = r.image_kind
FROM reviewed r
WHERE b.id = r.id::uuid AND b.slug = r.slug
  AND b.is_published = true AND b.requires_review = false
  AND b.image_url IS NOT DISTINCT FROM r.image_url
  AND b.image_kind IS DISTINCT FROM r.image_kind
RETURNING b.id, b.slug, b.image_kind;

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

COMMIT;
