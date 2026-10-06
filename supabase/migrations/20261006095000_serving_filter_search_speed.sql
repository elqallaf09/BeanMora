-- Correct only reviewed, explicit publisher titles and the two published cold-brew methods.
-- Brewing water temperature never determines serving style. Unknown rows stay unknown.
with reviewed(id, source_title, style, evidence) as (values
  ('83edfbe0-a406-4537-a69b-0b6f02815107'::uuid,'5g Hot Coffee','hot','explicit_source_title'),
  ('11887d04-9422-4da3-897e-e7dcaf948a34'::uuid,'5g Iced Coffee','iced','explicit_source_title'),
  ('f0dc99a7-778e-4e34-8882-70b5edbbc1c5'::uuid,'A71RJ 🇶🇦 Iced V60🪶','iced','explicit_source_title'),
  ('5090d843-b209-4a23-b675-e376551a3ff4'::uuid,'AB Rung''eto Kiangoi #028 (Iced Filter)','iced','explicit_source_title'),
  ('28a303a3-07bb-4e77-b007-ca1c9201e9e0'::uuid,'AB Rung''eto Kiangoi #028 (Iced Filter)','iced','explicit_source_title'),
  ('656bde14-d926-49ad-900e-071c46a4409d'::uuid,'All Over Ice','iced','explicit_source_title'),
  ('62b9f168-bb7e-4a7f-9c40-0f808ddb178c'::uuid,'All Over Ice','iced','explicit_source_title'),
  ('7095d196-1eb0-4d15-bfe9-45817af698b7'::uuid,'Angel Wings Brew Over Ice','iced','explicit_source_title'),
  ('669d9086-cb00-4d45-87d4-1c79dd6b3f0b'::uuid,'Angel Wings Brew Over Ice','iced','explicit_source_title'),
  ('61ffa1a3-355d-4ff8-88e1-dffbe8483470'::uuid,'Bayu''s hot filter 4 pours','hot','explicit_source_title'),
  ('fe7317cc-613c-4f23-88a7-192199831368'::uuid,'Benti Iced','iced','explicit_source_title'),
  ('4be75676-aa24-4249-a5ce-3a6e1ca3ce8e'::uuid,'Benti Iced','iced','explicit_source_title'),
  ('9835673e-dd46-4c44-afdc-3bc92fe1c6b0'::uuid,'Brazilian hot','hot','explicit_source_title'),
  ('9d4d3b81-58e4-4f46-a0e2-b54fb4a9236a'::uuid,'Brew over ice','iced','explicit_source_title'),
  ('7234d50f-590b-44a5-b1e3-c83b53159a4c'::uuid,'Brew Over Ice','iced','explicit_source_title'),
  ('494b7354-5243-42a9-9a37-62edb27cc74f'::uuid,'Brew Over Ice','iced','explicit_source_title'),
  ('d8d401cb-9b0b-480e-b922-04fadfd8b610'::uuid,'Brew(Hot)','hot','explicit_source_title'),
  ('99985242-04c5-47f4-b0b8-a60ac6488e9a'::uuid,'Choco HOT','hot','explicit_source_title'),
  ('a1859491-7532-44e9-a10e-6940ca62ac12'::uuid,'Choco ICE','iced','explicit_source_title'),
  ('43279145-6679-45ab-add9-cdb60fa5cd8b'::uuid,'Colombia Campo Hermoso Caturra Honey Passion Fruit Mossto CO Fermented / HOT','hot','explicit_source_title'),
  ('0202b133-71fa-422c-9d6d-ad7f2b422379'::uuid,'Colombia Campo Hermoso Caturra Honey Passion Fruit Mossto CO Fermented / HOT','hot','explicit_source_title'),
  ('097ed092-23a5-4212-96c5-93cabd915681'::uuid,'Colombia Campo Hermoso Caturra Honey Passion Fruit Mossto CO Fermented / ICE','iced','explicit_source_title'),
  ('bbf5f04c-3fba-49d9-befb-962781de794a'::uuid,'Colombia Campo Hermoso Caturra Honey Passion Fruit Mossto CO Fermented / ICE','iced','explicit_source_title'),
  ('01224aaa-a50f-4952-9397-82958cc648ff'::uuid,'Colombia Castillo Santa Barbara Anaerobic Natural (Hot)','hot','explicit_source_title'),
  ('ac7115d5-02bb-4065-b72b-299c0dae2e42'::uuid,'Colombia Castillo Santa Barbara Anaerobic Natural (Hot)','hot','explicit_source_title'),
  ('f0d88328-e073-4074-9749-1da7dc73dc26'::uuid,'Colombia Castillo Santa Barbara Anaerobic Natural (Iced)','iced','explicit_source_title'),
  ('85c09efa-a534-4cfc-adc7-9e85bbcd32be'::uuid,'Colombia Castillo Santa Barbara Anaerobic Natural (Iced)','iced','explicit_source_title'),
  ('ea51932f-bf7e-472f-a915-3dab023dd698'::uuid,'Colombia Hacienda El Obraje Geisha Washed / HOT','hot','explicit_source_title'),
  ('a039e1b9-a94d-487a-a04b-24cd9fdd91ac'::uuid,'Colombia Hacienda El Obraje Geisha Washed / HOT','hot','explicit_source_title'),
  ('ad2e265d-007c-4921-b3cc-89c4c564533b'::uuid,'Colombia Hacienda El Obraje Geisha Washed / ICE','iced','explicit_source_title'),
  ('00e0f3b4-523c-4904-a943-f7e51e45de06'::uuid,'Colombia Hacienda El Obraje Geisha Washed / ICE','iced','explicit_source_title'),
  ('4e6de602-1b8b-4c73-9163-0a81c1b969a7'::uuid,'Colombia Hacienda El Obraje Geisha Washed / ICE','iced','explicit_source_title'),
  ('58a73776-9187-4492-8d06-23f371107441'::uuid,'Costa Rica  Los Angeles Don Cayito Catuai White Honey / HOT','hot','explicit_source_title'),
  ('a8e27205-9892-49ee-a6de-f4efb6a89c88'::uuid,'Costa Rica  Los Angeles Don Cayito Catuai White Honey / HOT','hot','explicit_source_title'),
  ('a1be17d5-1ed3-4d59-8b82-0465be97f191'::uuid,'Costa Rica  Los Angeles Don Cayito Catuai White Honey / ICE','iced','explicit_source_title'),
  ('fc6d96d4-008c-4685-b006-857f8d6d6ac5'::uuid,'Costa Rica  Los Angeles Don Cayito Catuai White Honey / ICE','iced','explicit_source_title'),
  ('1642a88a-8dcd-4a56-b5e2-b895af36383c'::uuid,'Ecuador Yambamine Sidra Passion Flowers / HOT','hot','explicit_source_title'),
  ('95f691f1-1725-4ebc-9412-eafad93a9395'::uuid,'Ecuador Yambamine Sidra Passion Flowers / HOT','hot','explicit_source_title'),
  ('d8c875ae-91a4-469a-9057-11dde05f1de4'::uuid,'Ecuador Yambamine Sidra Passion Flowers / ICE','iced','explicit_source_title'),
  ('c3db1681-ac62-4eb8-8f06-8dadf17d1087'::uuid,'Ecuador Yambamine Sidra Passion Flowers / ICE','iced','explicit_source_title'),
  ('a905dcce-8a7c-4e58-9b2d-3a8e2887ecd3'::uuid,'Ecuador Yambamine Sidra Passion Flowers / ICE','iced','explicit_source_title'),
  ('d7189c04-e65e-49b6-91a2-a92e2ddcd3a6'::uuid,'Ecuador Yambamine Sidra Passion Flowers / ICE','iced','explicit_source_title'),
  ('a2f392e6-95cd-4347-a92f-a7f6b0a85c8e'::uuid,'EL Salvador Hot','hot','explicit_source_title'),
  ('71c220c2-0e86-41ee-9225-374ff53efd41'::uuid,'EL Salvador Hot','hot','explicit_source_title'),
  ('b3731771-b6b8-477e-92cd-f8ae3dab9e10'::uuid,'Equator Coffees — Cold Brew Concentrate','cold','published_cold_brew_method'),
  ('ee35deb1-ee5a-4a73-8b14-4f6521ba30f9'::uuid,'Ethiopia Dasaya Guji (Hot)','hot','explicit_source_title'),
  ('d66c96b6-2546-49bc-94b8-f21eef7a04a4'::uuid,'Ethiopia Dasaya Guji (Hot)','hot','explicit_source_title'),
  ('fe29b737-6e4d-4000-8e84-3982d80271e8'::uuid,'Ethiopia Dasaya Guji (Iced)','iced','explicit_source_title'),
  ('0301d2b2-59a7-4f9f-b372-1c2c42266a52'::uuid,'Ethiopia Dasaya Guji (Iced)','iced','explicit_source_title'),
  ('b4db909e-dfd3-4abb-bef5-85ce91ab39f0'::uuid,'Ethiopia Yirgacheffe Botabaa Selection #2 Washed G1 / HOT','hot','explicit_source_title'),
  ('522f7a28-a7c8-4dae-b251-7ebf190028e0'::uuid,'Ethiopia Yirgacheffe Botabaa Selection #2 Washed G1 / HOT','hot','explicit_source_title'),
  ('49e93a58-a138-44c1-8e32-c647a355b944'::uuid,'Ethiopia Yirgacheffe Botabaa Selection #2 Washed G1 / ICE','iced','explicit_source_title'),
  ('02e443d1-b463-4ad1-a0b5-8282be874141'::uuid,'Ethiopia Yirgacheffe Botabaa Selection #2 Washed G1 / ICE','iced','explicit_source_title'),
  ('647f8086-3680-492a-b747-525a50250f9f'::uuid,'ETHW011 Hot Brew','hot','explicit_source_title'),
  ('ac103331-6085-4e5c-ba06-ffe6d4ab5e19'::uuid,'ETHW011 Hot Brew','hot','explicit_source_title'),
  ('bdb8307e-ce9f-49f1-a1b7-406990ad3756'::uuid,'ETHW011 Iced Coffee','iced','explicit_source_title'),
  ('4f5a8305-4507-438e-839c-40a5663bc6ee'::uuid,'FDC Iced','iced','explicit_source_title'),
  ('39c163bc-0a97-4854-8131-a6f417e8e11d'::uuid,'FDC Iced','iced','explicit_source_title'),
  ('129f6f76-c6a3-4d16-a413-3d61c510df38'::uuid,'Fluid - Kenya PB Ice Filter','iced','explicit_source_title'),
  ('9afb5971-edd9-443f-9a43-bfb31efef0a8'::uuid,'Fluid - Kenya PB Ice Filter','iced','explicit_source_title'),
  ('796e5d15-e1fd-4da5-8538-24164c3dbf56'::uuid,'Gaharo Iced','iced','explicit_source_title'),
  ('fa95fd52-d261-4984-b9d8-77d67769fb4b'::uuid,'Gaharo Iced','iced','explicit_source_title'),
  ('cdedbde3-9c2b-47ee-a545-81d5b23ae117'::uuid,'Gitwe Iced','iced','explicit_source_title'),
  ('27b4308d-dcb5-4e35-beed-b8cb2f228ecd'::uuid,'Gitwe Iced','iced','explicit_source_title'),
  ('fe3159d2-be07-4de4-9b59-f68c6538b61a'::uuid,'Guatemala El Socorro Red Bourbon Fully Washed / HOT','hot','explicit_source_title'),
  ('629a35af-0eb2-46fe-932a-2f2ff19c1427'::uuid,'Guatemala El Socorro Red Bourbon Fully Washed / HOT','hot','explicit_source_title'),
  ('13e1d4cd-48f7-4dda-8f9a-4f985300102b'::uuid,'Guatemala El Socorro Red Bourbon Fully Washed / ICE','iced','explicit_source_title'),
  ('f26bba89-9aed-40bb-89ae-234833379d7f'::uuid,'Honduras Hot','hot','explicit_source_title'),
  ('4de8a5d5-056b-45ca-9b29-aa0c582b64b9'::uuid,'Honduras Hot','hot','explicit_source_title'),
  ('03b12a21-cabb-4dba-9e93-ec2fef75042d'::uuid,'HOT BLACK FOREST','hot','explicit_source_title'),
  ('ba91c798-5488-4e55-a317-e7263b5579e6'::uuid,'Hot Brew','hot','explicit_source_title'),
  ('9a5c8a34-be17-41d3-bfca-d07e002cba75'::uuid,'HOT COFFEE','hot','explicit_source_title'),
  ('7619c8b7-5b7e-4f13-abfe-f1f9b6df4f2e'::uuid,'Hot drip by Ucup','hot','explicit_source_title'),
  ('adc1c20c-8d09-47c1-99e7-3f3d1e61df86'::uuid,'HOT ETHIOPIA HAMBELLA 2.0','hot','explicit_source_title'),
  ('1d9e834c-ad61-4824-904c-59a467ba6d3e'::uuid,'Hunky Dory Iced','iced','explicit_source_title'),
  ('cde0a1ff-a97d-4645-a18e-ec7a5874d2ea'::uuid,'Hunky Dory Iced','iced','explicit_source_title'),
  ('5f6eb449-1a6b-4659-a064-72c02e3a9aca'::uuid,'ICE','iced','explicit_source_title'),
  ('9777d930-ab78-4158-a9a9-43bbee369b61'::uuid,'ice Aquiares Natural  Jeed','iced','explicit_source_title'),
  ('b6abb8cc-557e-4a6a-8d7f-05ddefaf0983'::uuid,'ice Benti Nenca Washed  Jeed','iced','explicit_source_title'),
  ('d197fe96-6489-4f1f-a381-c146cbd3d84a'::uuid,'ICE BLACK FOREST','iced','explicit_source_title'),
  ('2dc63516-25f5-4115-b4af-5e7d6d5ab9bf'::uuid,'ice BOMBE Natural  Jeed','iced','explicit_source_title'),
  ('bd9a9fc6-dd3c-476a-9535-8f27c199dfdb'::uuid,'Iced','iced','explicit_source_title'),
  ('21f6e67f-de97-4ea2-90b7-18422beb6f00'::uuid,'Iced','iced','explicit_source_title'),
  ('97f15d4b-6655-48f1-8e3f-06f682ba5299'::uuid,'Iced','iced','explicit_source_title'),
  ('73dc5caa-d7a8-48f7-a766-f4bab8b67266'::uuid,'Iced','iced','explicit_source_title'),
  ('a72b6c5e-0e6c-44aa-9f84-bd3dfe1112fd'::uuid,'Iced','iced','explicit_source_title'),
  ('03ddd0ee-e476-4396-b5e5-7ea7039c97b7'::uuid,'Iced','iced','explicit_source_title'),
  ('f8114235-bb07-48b5-b896-7aa74434cdbf'::uuid,'Iced 120g Hydro Natural','iced','explicit_source_title'),
  ('1cc36ff4-28a2-47e9-9e6c-870482e9b439'::uuid,'Iced Brew','iced','explicit_source_title'),
  ('ed735ab8-9d4c-48dc-b23b-889013c47b74'::uuid,'Iced Coffee','iced','explicit_source_title'),
  ('fbe607b9-e4ea-4bd9-91f7-ab9ed7eecd98'::uuid,'Iced Coffee','iced','explicit_source_title'),
  ('2e18c23a-c3e5-4e18-8c7a-21f15b2f1086'::uuid,'ICED COFFEE','iced','explicit_source_title'),
  ('dd6838dc-dadb-44d2-80f0-538715fd7b0a'::uuid,'Iced Coffee Recipe','iced','explicit_source_title'),
  ('d6375aef-5204-4645-ad7d-e7a41f394de8'::uuid,'Iced Supernatural Gotiti','iced','explicit_source_title'),
  ('bf7ed13a-9554-464e-881f-654ec5a2713a'::uuid,'iced yirga halo bariti 100ice','iced','explicit_source_title'),
  ('8b189b8d-34b1-4971-99f0-cfc9700bb83e'::uuid,'Illumination Blend Iced','iced','explicit_source_title'),
  ('745ea4b4-81c3-41d9-940a-e0f4ca6b104a'::uuid,'Illumination Blend Iced','iced','explicit_source_title'),
  ('53cd906a-83c9-4479-a288-193a0e5a8183'::uuid,'Inthanin Caramello HOT','hot','explicit_source_title'),
  ('8715f7d6-20aa-4a78-814a-41c54a70bae9'::uuid,'Inthanin Caramello ICE','iced','explicit_source_title'),
  ('62640dff-55b9-4e84-9060-371aecaa071b'::uuid,'Inthanin Ethiopia Konga HOT','hot','explicit_source_title'),
  ('8b95df8c-e498-4f5d-a76c-fa2df4321b6c'::uuid,'Inthanin Ethiopia Konga ICE','iced','explicit_source_title'),
  ('d8ff8458-1319-4988-8241-e1140c9192fb'::uuid,'Inthanin Mae Salong HOT','hot','explicit_source_title'),
  ('27ec765a-051d-4271-9009-bc23d31ea15c'::uuid,'Inthanin Mae Salong ICE','iced','explicit_source_title'),
  ('b7e2a82e-5ac5-494b-952d-0c78e3a2b290'::uuid,'Inthanin Pitsachio HOT','hot','explicit_source_title'),
  ('72b71c70-241c-41e7-a3eb-65e943763516'::uuid,'Inthanin Pitsachio ICE','iced','explicit_source_title'),
  ('bbb319f8-2d40-4e87-816b-dd44a5680f51'::uuid,'Inthanin Winery HOT','hot','explicit_source_title'),
  ('04121a7e-46cd-4dbb-8788-43b7d2576d39'::uuid,'Inthanin Winery ICE','iced','explicit_source_title'),
  ('00a8aabc-8bf5-42f5-8684-87fed5953bc3'::uuid,'Japanese iced','iced','explicit_source_title'),
  ('e2e63a69-7e31-428d-baa4-b474b5e84934'::uuid,'Japanese iced','iced','explicit_source_title'),
  ('35d520ca-b3cb-4423-aa31-14cfe39a4678'::uuid,'Kenya Iced','iced','explicit_source_title'),
  ('b93ed846-57c6-4dc6-a00c-eed6e0cdf6c8'::uuid,'Kenya Iced','iced','explicit_source_title'),
  ('5aae0c24-74e3-4de4-8eda-e292879f40ff'::uuid,'Kurasu — Cold Brew (2026 recipe)','cold','published_cold_brew_method'),
  ('a487468d-9291-440f-8b67-016c3d7840c4'::uuid,'Las Margaritas Washed Hot','hot','explicit_source_title'),
  ('16be7cf5-84f0-451c-a2a6-1fa2b4e40341'::uuid,'Las Margaritas Washed Hot','hot','explicit_source_title'),
  ('fc1d95a6-7bf9-45b5-a96a-395dc1077fe0'::uuid,'Lerida Iced','iced','explicit_source_title'),
  ('456c1437-136a-48ea-a3c8-df87b3c81a17'::uuid,'Lerida Iced','iced','explicit_source_title'),
  ('db999c5e-0472-4214-9a72-98341626fe78'::uuid,'New School Brew Over Ice','iced','explicit_source_title'),
  ('0d7af750-1728-479a-88e9-78bc9ef8571d'::uuid,'New School Brew Over Ice','iced','explicit_source_title'),
  ('577f4060-7d8c-4cee-818a-f4b389f6681e'::uuid,'New School Brew Over Ice','iced','explicit_source_title'),
  ('c6cc6a94-1b3d-475a-88f2-ad9f5a3ac052'::uuid,'New School Brew Over Ice','iced','explicit_source_title'),
  ('f24dbdc6-ece8-4f3d-9725-695822cce1af'::uuid,'No,11 Ice:Crystal Clear','iced','explicit_source_title'),
  ('510c30c4-a903-4325-a519-1f70a7b64af2'::uuid,'No.8 Ice:Deep Bitter','iced','explicit_source_title'),
  ('7e44e229-7bcd-4f76-8405-49f7ea2252e8'::uuid,'Onyx Southern Weather Iced','iced','explicit_source_title'),
  ('1a1fea93-f963-490c-8b0a-c4c08d74f3a6'::uuid,'Onyx Southern Weather Iced','iced','explicit_source_title'),
  ('84abf04e-8c9a-4855-914a-8afa07c259fe'::uuid,'Opus Iced','iced','explicit_source_title'),
  ('64c20879-f139-43af-b2bf-bafedec8b9e3'::uuid,'Opus Iced','iced','explicit_source_title'),
  ('ab7b7c84-f665-4038-b230-d1fd8b68a5c2'::uuid,'ORDR Brew over Ice','iced','explicit_source_title'),
  ('72a09c21-1b24-453d-92ae-4891e9d2ea59'::uuid,'ORDR Brew over Ice','iced','explicit_source_title'),
  ('8d49879d-daee-4203-834b-851c395fb5b2'::uuid,'ORDR Brew over Ice 2','iced','explicit_source_title'),
  ('f4654826-d259-4cb8-9bae-c6bdd41365b0'::uuid,'Panama Finca Los Cenizos Geisha Cold Fermention Natural / HOT','hot','explicit_source_title'),
  ('28f813a0-f0ac-4297-99f5-8be040001fd9'::uuid,'Panama Finca Los Cenizos Geisha Cold Fermention Natural / HOT','hot','explicit_source_title'),
  ('2a88915b-bc52-4839-8c75-1cc8c54849c4'::uuid,'Panama Finca Los Cenizos Geisha Cold Fermention Natural / ICE','iced','explicit_source_title'),
  ('8cc58f44-d7cf-4fa2-82f2-22459f1c6753'::uuid,'Panama Finca Los Cenizos Geisha Cold Fermention Natural / ICE','iced','explicit_source_title'),
  ('790b1fd9-9e40-4b29-9a58-241d73764863'::uuid,'Peach Co-Ferment Brew Over Ice','iced','explicit_source_title'),
  ('6ce7f841-cce2-4fb5-8a87-3ce5df922a82'::uuid,'Peach Co-Ferment Brew Over Ice','iced','explicit_source_title'),
  ('df732267-d0ac-4a09-b34c-d7c091f07b91'::uuid,'Peru La Palma Geisha Washed / HOT','hot','explicit_source_title'),
  ('bcc9fbde-aa3b-401f-bb84-b1b4cb95a26f'::uuid,'Peru La Palma Geisha Washed / HOT','hot','explicit_source_title'),
  ('d94cb7c2-fc85-4bab-b25d-951fa500bf99'::uuid,'RAINBOW DASH HOT','hot','explicit_source_title'),
  ('d74e41c5-3102-461f-b1a6-01c83843d0ca'::uuid,'RAINBOW DASH HOT','hot','explicit_source_title'),
  ('49ea5522-4fed-4f46-9495-00970d78f0e1'::uuid,'RAINBOW DASH ICE','iced','explicit_source_title'),
  ('7e537af4-9be8-44f2-bfe8-cd2b504e6ddf'::uuid,'RAINBOW DASH ICE','iced','explicit_source_title'),
  ('239828a7-d70f-404b-a820-75027793d430'::uuid,'Special HOT','hot','explicit_source_title'),
  ('2ed87fb0-7430-4a38-96a1-511533971392'::uuid,'Special ICE','iced','explicit_source_title'),
  ('bbbc4725-b729-4169-894d-b0a31644670f'::uuid,'The Daily Iced','iced','explicit_source_title'),
  ('31bb5e12-634a-494a-8656-2e6821ebda88'::uuid,'The Future Iced','iced','explicit_source_title'),
  ('9752f7ce-9f56-4d01-8716-dc6bc3bfb58e'::uuid,'The Future Iced','iced','explicit_source_title'),
  ('2ba0fa69-08f4-4223-afc0-c09116ccea29'::uuid,'Traditional Iced','iced','explicit_source_title'),
  ('85b5358d-92d6-4685-82ec-9cb6f99456e4'::uuid,'Traditional Iced','iced','explicit_source_title'),
  ('8029b888-fb43-4ded-a393-5cf593207549'::uuid,'Tropical Weather Iced','iced','explicit_source_title'),
  ('a4b0eb6a-3472-43ff-995b-76138eb1682f'::uuid,'Tropical Weather Iced','iced','explicit_source_title'),
  ('9e7fad3e-7858-4233-9ba8-3c378f999f6e'::uuid,'Very BERRY / HOT','hot','explicit_source_title'),
  ('060d6a3e-5a23-4199-bf93-5100b798de92'::uuid,'Very BERRY / HOT','hot','explicit_source_title'),
  ('db4d50eb-47b1-4323-80a2-e523d2ece516'::uuid,'Very BERRY / ICE','iced','explicit_source_title'),
  ('317441a1-1920-4142-a90d-12f0f70033cb'::uuid,'Very BERRY / ICE','iced','explicit_source_title'),
  ('3fff20ad-0f49-4760-820a-489573aa5728'::uuid,'Yacuri Iced','iced','explicit_source_title'),
  ('5a1bee04-8a64-4fe8-ab8b-4f697d30f3cf'::uuid,'Yacuri Iced','iced','explicit_source_title')
)
update public.recipes r set
  serving_style = reviewed.style,
  source_brew_parameters = coalesce(r.source_brew_parameters, '{}'::jsonb) || jsonb_build_object('discovery',
    (case when jsonb_typeof(r.source_brew_parameters->'discovery') = 'object' then r.source_brew_parameters->'discovery' else '{}'::jsonb end)
    || jsonb_build_object('serving_style', reviewed.style,
      'serving_style_evidence', jsonb_build_object('kind',reviewed.evidence,'source_title',reviewed.source_title)))
from reviewed
where r.id = reviewed.id and r.title = reviewed.source_title and r.visibility = 'public'
  and (r.serving_style is null or r.serving_style = 'unknown')
  and coalesce(r.source_brew_parameters->'discovery'->>'serving_style','') not in ('hot','iced','cold');

CREATE OR REPLACE FUNCTION public.search_public_recipes(p_query text DEFAULT NULL::text, p_method text DEFAULT NULL::text, p_source text DEFAULT NULL::text, p_model text DEFAULT NULL::text, p_flavor_note text DEFAULT NULL::text, p_flavor_family text DEFAULT NULL::text, p_creator_name text DEFAULT NULL::text, p_creator_country text DEFAULT NULL::text, p_recipe_country text DEFAULT NULL::text, p_recipe_name text DEFAULT NULL::text, p_serving_style text DEFAULT NULL::text, p_coffee_type text DEFAULT NULL::text, p_coffee_name text DEFAULT NULL::text, p_coffee_origin text DEFAULT NULL::text, p_roaster_name text DEFAULT NULL::text, p_source_name text DEFAULT NULL::text)
 RETURNS SETOF recipes
 LANGUAGE plpgsql
 STABLE
 SECURITY INVOKER
 SET search_path TO ''
AS $function$
BEGIN
  -- Browsing and serving/method/source/model choices need no joins or normalized text.
  -- The rich search branch below retains every existing literal/AND search condition.
  IF concat_ws('', btrim(p_query), btrim(p_flavor_note), btrim(p_flavor_family),
    btrim(p_creator_name), btrim(p_creator_country), btrim(p_recipe_country), btrim(p_recipe_name),
    btrim(p_coffee_type), btrim(p_coffee_name), btrim(p_coffee_origin), btrim(p_roaster_name), btrim(p_source_name)) = '' THEN
    RETURN QUERY
      SELECT r.* FROM public.recipes r
      WHERE r.visibility = 'public'
        AND (nullif(btrim(p_method),'') IS NULL OR r.brew_method = p_method)
        AND (nullif(btrim(p_source),'') IS NULL OR p_source = 'all'
          OR (p_source = 'official' AND r.recipe_type IN ('official_manufacturer','official_roaster','verified_barista'))
          OR (p_source = 'community' AND r.recipe_type = 'community'))
        AND (p_method IS DISTINCT FROM 'xbloom' OR nullif(btrim(p_model),'') IS NULL OR p_model = 'all'
          OR r.source_brew_parameters->>'model' = p_model)
        AND (nullif(btrim(p_serving_style),'') IS NULL OR
          CASE WHEN r.serving_style IN ('hot','iced','cold') THEN r.serving_style
            WHEN r.source_brew_parameters->'discovery'->>'serving_style' IN ('hot','iced','cold')
              THEN r.source_brew_parameters->'discovery'->>'serving_style' ELSE NULL END = p_serving_style);
    RETURN;
  END IF;
  RETURN QUERY
select r.*
  from public.recipes r
  left join public.roasted_products product on product.id = r.roasted_product_id and product.requires_review = false
  left join public.beans bean on bean.id = coalesce(r.bean_id, product.legacy_bean_id)
    and bean.is_published = true and bean.requires_review = false
  left join public.coffee_lots lot on lot.id = product.coffee_lot_id and lot.requires_review = false
  left join public.roasters product_roaster on product_roaster.id = product.roaster_id and product_roaster.requires_review = false
  left join public.roasters bean_roaster on bean_roaster.id = bean.roaster_id and bean_roaster.requires_review = false
  left join public.profiles creator on creator.id = r.user_id and r.recipe_type in ('community', 'personal')
  cross join lateral (
    select case when jsonb_typeof(r.source_brew_parameters->'discovery') = 'object'
      then r.source_brew_parameters->'discovery' else '{}'::jsonb end as metadata
  ) raw_discovery
  cross join lateral (
    -- Malformed JSON values are not country/name facts. For list fields retain
    -- string entries only, matching the mobile discovery reader.
    select coalesce(jsonb_object_agg(entry.key,
      case when jsonb_typeof(entry.value) = 'array' then (
        select coalesce(jsonb_agg(atom.value), '[]'::jsonb)
        from jsonb_array_elements(entry.value) atom(value)
        where jsonb_typeof(atom.value) = 'string'
      ) else entry.value end), '{}'::jsonb) as metadata
    from jsonb_each(raw_discovery.metadata) entry(key, value)
    where (entry.key in ('flavor_notes', 'flavor_notes_ar', 'flavor_families', 'source_urls', 'applicable_coffee_names', 'applicable_coffee_names_ar') and jsonb_typeof(entry.value) = 'array')
      or (entry.key not in ('flavor_notes', 'flavor_notes_ar', 'flavor_families', 'source_urls', 'applicable_coffee_names', 'applicable_coffee_names_ar') and jsonb_typeof(entry.value) = 'string')
  ) discovery
  cross join lateral (
    -- These names were verified against the same roaster by the source importer.
    -- Read strings as text so quotes and punctuation remain literal search terms.
    select string_agg(coffee.name, ' ') as names
    from jsonb_array_elements_text(
      coalesce(discovery.metadata->'applicable_coffee_names', '[]'::jsonb)
      || coalesce(discovery.metadata->'applicable_coffee_names_ar', '[]'::jsonb)
    ) coffee(name)
  ) applicable_coffees
  cross join lateral (
    select string_agg(concat_ws(' ', s.source_name, s.source_url), ' ') as source_text
    from public.recipe_sources s where s.recipe_id = r.id
  ) source
  cross join lateral (
    select string_agg(f.flavor, ' ') as flavor_text
    from public.bean_flavor_notes f where f.bean_id = bean.id
  ) bean_flavor
  cross join lateral (
    select
      public.recipe_discovery_normalize(concat_ws(' ', r.title, r.title_ar)) as recipe_name,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_author_name, creator.name, creator.username,
        discovery.metadata->>'creator_name', discovery.metadata->>'creator_name_ar')) as creator_name,
      -- Creator's sourced operating/base country is independent of nationality,
      -- the roaster's address, the recipe's provenance and the coffee's origin.
      public.recipe_discovery_normalize(concat_ws(' ', discovery.metadata->>'creator_country', discovery.metadata->>'creator_country_ar')) as creator_country,
      public.recipe_discovery_normalize(concat_ws(' ', discovery.metadata->>'recipe_country', discovery.metadata->>'recipe_country_ar')) as recipe_country,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_coffee_name, bean.name_en, bean.name_ar, product.name_en, product.name_ar,
        discovery.metadata->>'coffee_name', discovery.metadata->>'coffee_name_ar', applicable_coffees.names)) as coffee_name,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_varietal, bean.varietal, lot.varietal, product.origin_type,
        discovery.metadata->>'coffee_type', discovery.metadata->>'coffee_type_ar')) as coffee_type,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_origin_country, bean.origin_country, lot.origin_country,
        discovery.metadata->>'coffee_origin', discovery.metadata->>'coffee_origin_ar')) as coffee_origin,
      public.recipe_discovery_normalize(concat_ws(' ', r.source_roaster_name, product_roaster.name_en, product_roaster.name_ar,
        bean_roaster.name_en, bean_roaster.name_ar, discovery.metadata->>'roaster_name', discovery.metadata->>'roaster_name_ar')) as roaster_name,
      public.recipe_discovery_normalize(concat_ws(' ', source.source_text, discovery.metadata->>'source_urls')) as source_name,
      public.recipe_discovery_normalize(concat_ws(' ', array_to_string(r.flavor_notes, ' '), r.source_tasting_notes,
        bean_flavor.flavor_text, array_to_string(product.flavor_notes_on_bag, ' '), discovery.metadata->>'flavor_notes',
        discovery.metadata->>'flavor_notes_ar', discovery.metadata->>'flavor_families')) as flavor_note,
      case when r.serving_style in ('hot', 'iced', 'cold') then r.serving_style
        when discovery.metadata->>'serving_style' in ('hot', 'iced', 'cold') then discovery.metadata->>'serving_style'
        else null end as serving_style
  ) terms
  where r.visibility = 'public'
    and (nullif(btrim(p_method), '') is null or r.brew_method = p_method)
    and (nullif(btrim(p_source), '') is null or p_source = 'all'
      or (p_source = 'official' and r.recipe_type in ('official_manufacturer', 'official_roaster', 'verified_barista'))
      or (p_source = 'community' and r.recipe_type = 'community'))
    and (p_method is distinct from 'xbloom' or nullif(btrim(p_model), '') is null or p_model = 'all'
      or r.source_brew_parameters->>'model' = p_model)
    and (nullif(btrim(p_serving_style), '') is null or terms.serving_style = p_serving_style)
    and strpos(terms.recipe_name, public.recipe_discovery_normalize(left(p_recipe_name, 160))) > 0
    and strpos(terms.creator_name, public.recipe_discovery_normalize(left(p_creator_name, 160))) > 0
    and strpos(terms.creator_country, public.recipe_discovery_normalize(left(p_creator_country, 160))) > 0
    and strpos(terms.recipe_country, public.recipe_discovery_normalize(left(p_recipe_country, 160))) > 0
    and strpos(terms.coffee_name, public.recipe_discovery_normalize(left(p_coffee_name, 160))) > 0
    and strpos(terms.coffee_type, public.recipe_discovery_normalize(left(p_coffee_type, 160))) > 0
    and strpos(terms.coffee_origin, public.recipe_discovery_normalize(left(p_coffee_origin, 160))) > 0
    and strpos(terms.roaster_name, public.recipe_discovery_normalize(left(p_roaster_name, 160))) > 0
    and strpos(terms.source_name, public.recipe_discovery_normalize(left(p_source_name, 160))) > 0
    and strpos(terms.flavor_note, public.recipe_discovery_normalize(left(p_flavor_note, 160))) > 0
    and (nullif(btrim(p_flavor_family), '') is null or exists (
      -- Categorize explicit tasting notes using the same vocabulary as the
      -- existing recommendation engine; never manufacture a tasting note.
      select 1 from (values
        ('chocolate', array['chocolate','cocoa','cacao','شوكولاتة','شوكولاته','كاكاو']::text[]),
        ('nutty', array['nutty','nuts','hazelnut','almond','مكسرات','بندق','لوز']::text[]),
        ('fruity', array['fruity','fruit','berry','berries','strawberry','blueberry','فواكه','فراولة','توت']::text[]),
        ('citrus', array['citrus','lemon','orange','grapefruit','حمضيات','ليمون','برتقال']::text[]),
        ('floral', array['floral','jasmine','rose','زهور','ياسمين','ورد']::text[]),
        ('caramel', array['caramel','toffee','كراميل','توفي']::text[]),
        ('spice', array['spice','spicy','cinnamon','cardamom','توابل','قرفة','هيل']::text[])
      ) family(name, aliases)
      cross join lateral unnest(family.aliases) as alias(value)
      where family.name = p_flavor_family
        and public.recipe_discovery_normalize(alias.value) = any(regexp_split_to_array(terms.flavor_note, '[^[:alnum:]]+'))
    ))
    and not exists (
      select 1 from regexp_split_to_table(public.recipe_discovery_normalize(left(p_query, 160)), '[[:space:]]+') as query(term)
      where query.term <> '' and strpos(concat_ws(' ', terms.recipe_name, terms.creator_name, terms.creator_country,
        terms.recipe_country, terms.coffee_name, terms.coffee_type, terms.coffee_origin, terms.roaster_name, terms.source_name,
        terms.flavor_note, terms.serving_style, case terms.serving_style when 'hot' then 'ساخن حار' when 'iced' then 'مثلج' when 'cold' then 'بارد' end), query.term) = 0
    );
END;
$function$;
