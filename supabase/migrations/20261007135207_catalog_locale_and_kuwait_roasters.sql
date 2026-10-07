-- Only fill missing translations of exact known public source text.
with translations(title,title_ar,description,description_ar) as (values
('Add coffee','إضافة البن','Add 15 g of medium-ground coffee (a little finer than pour over) and tare the scale.','أضف 15 غ من البن بطحنة متوسطة أنعم قليلًا من طحنة الترشيح، ثم صفّر الميزان.'),
('Add coffee','إضافة البن','Add 30 g of medium-ground coffee (15 g per serve).','أضف 30 غ من البن بطحنة متوسطة، أي 15 غ لكل حصة.'),
('Bloom','التزهير','Pour 60-80 g of water (about twice the coffee weight) and let it bloom for about 30 seconds.','صب 60–80 غ من الماء، نحو ضعف وزن البن، واتركه يتزهّر قرابة 30 ثانية.'),
('Bloom','التزهير','Wet the 16 g dose with 30 g of water and wait until 0:30.','بلّل جرعة البن البالغة 16 غ باستخدام 30 غ من الماء، وانتظر حتى 0:30.'),
('Finish and serve','إنهاء التحضير والتقديم','Let the brew finish by about 3 minutes, stir and serve.','اترك التحضير يكتمل عند نحو 3 دقائق، ثم حرّك القهوة وقدّمها.'),
('Insert plunger','تركيب المكبس','Insert the plunger to create suction and stop dripping.','ركّب المكبس لتكوين ضغط سالب يوقف التنقيط.'),
('Main pour','الصبة الرئيسية','Pour the remaining water slowly in circular motions, centre outward and back, aiming to reach 250 g by 1:45.','صب الماء المتبقي ببطء بحركة دائرية من الوسط للخارج ثم للوسط، مستهدفًا مجموع 250 غ عند 1:45.'),
('Pour and start timer','الصب وتشغيل المؤقت','Pour 200 g of boiling water and start the timer.','صب 200 غ من الماء المغلي وشغّل المؤقت.'),
('Pour remaining water','صب الماء المتبقي','Pour the remaining water slowly in circles, finishing 500 g total just after 2 minutes.','صب الماء المتبقي ببطء بحركة دائرية حتى يصل المجموع إلى 500 غ بعد دقيقتين بقليل.'),
('Press and serve','الضغط والتقديم','Press slowly until all the coffee has passed through the filter, stir and serve.','اضغط ببطء حتى تعبر القهوة الفلتر، ثم حرّكها وقدّمها.'),
('Rinse and prepare','الشطف والتجهيز','Attach the paper filter to the chamber and rinse with hot water.','ثبّت الفلتر الورقي في الحجرة واشطفه بالماء الساخن.'),
('Rinse and warm','الشطف والتسخين','Rinse the paper filter and warm the equipment.','اشطف الفلتر الورقي وسخّن أدوات التحضير.'),
('Stir and serve','التحريك والتقديم','Stir gently before serving and let cool slightly. Total brew time depends on grind and bean (1:45-2:45).','حرّك برفق قبل التقديم واترك القهوة تبرد قليلًا. يعتمد الوقت الكلي على الطحن والبن، من 1:45 إلى 2:45.'),
('Stir at 1 minute','التحريك بعد دقيقة','At 1:00 remove the plunger and stir, then replace it and brew another minute.','عند 1:00، انزع المكبس وحرّك، ثم أعد المكبس واترك التحضير دقيقة أخرى.'))
update public.recipe_steps s set title_ar=coalesce(nullif(s.title_ar,''),t.title_ar),description_ar=coalesce(nullif(s.description_ar,''),t.description_ar)
from translations t,public.recipes r where r.id=s.recipe_id and r.visibility='public' and s.title=t.title and s.description=t.description;
update public.recipe_steps s set title_ar='الصبة '||substring(s.title from '[0-9]+')
from public.recipes r where r.id=s.recipe_id and r.visibility='public' and nullif(s.title_ar,'') is null and s.title ~ '^Pour [0-9]+$';
with translations as (
select s.id,regexp_match(s.description,'^Water: ([0-9.]+) ml; source temperature: ([0-9.]+); flow: ([0-9.]+|unspecified) ml/s; pause: ([0-9.]+) s[.] Check the original link for pouring pattern[.]$') parts
from public.recipe_steps s join public.recipes r on r.id=s.recipe_id where r.visibility='public' and nullif(s.description_ar,'') is null)
update public.recipe_steps s set description_ar='الماء: '||t.parts[1]||' مل · حرارة المصدر: '||t.parts[2]||' · التدفق: '||case when t.parts[3]='unspecified' then 'غير منشور' else t.parts[3]||' مل/ث' end||' · التوقف: '||t.parts[4]||' ث. راجع نمط الصب في رابط المصدر.'
from translations t where s.id=t.id and t.parts is not null;

-- Official Kuwait store listings checked 2026-10-07. Business account
-- verification is deliberately separate from source fact review.
insert into public.roasters(slug,name_ar,name_en,country,website_url,source_url,description_ar,description_en,requires_review,data_confidence,last_verified_at)
values ('rawi-coffee','محمصة راوي','Rawi Coffee Roastery','Kuwait','https://rawicoffee.com/','https://rawicoffee.com/shop/','محمصة قهوة ومتجر لأكياس البن وأدوات التحضير في الكويت.','Kuwait coffee roastery and store for coffee bags and brewing equipment.',false,'official','2026-10-07'),
('jebla-coffee','محمصة جبلة','Jebla Coffee Roasters','Kuwait','https://jeblacoffeeroasters.com/','https://jeblacoffee.com/','محمصة قهوة مختصة في الكويت تقدم أكياس البن وفلاتر التحضير السريع.','Kuwait specialty roastery offering coffee beans and drip coffee bags.',false,'official','2026-10-07')
on conflict(slug) do nothing;

insert into public.beans(slug,roaster_id,name_ar,name_en,bag_weight_grams,description_ar,description_en,source_type,source_name,source_url,roaster_website_url,is_published,requires_review,data_confidence,last_verified_at,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom)
select 'rawi-alba-250g',r.id,'ألبا — 250 غ','Alba — 250 g',250,'ألبا بوزن 250 غ حسب اسم المنتج في متجر راوي. تفاصيل المنشأ والمعالجة والتحضير غير منشورة في النص المتاح.','Alba 250 g, as listed in the Rawi product title. Origin, process and brew settings are not supplied in the available page text.','official_product_page','Rawi Coffee Roastery','https://rawicoffee.com/shop/القهوة/حبوب-القهوة/ألبا-250-جرام/','https://rawicoffee.com/',true,false,'official','2026-10-07',false,false,false
from public.roasters r where r.slug='rawi-coffee' on conflict(slug) do nothing;
insert into public.beans(slug,roaster_id,name_ar,name_en,origin_country,process,varietal,bag_weight_grams,description_ar,description_en,source_type,source_name,source_url,roaster_website_url,is_published,requires_review,data_confidence,last_verified_at,suitable_for_v60,suitable_for_espresso,suitable_for_xbloom)
select 'jebla-romario-250g',r.id,'روماريو — البرازيل','Romario — Brazil','Brazil','natural','Yellow & Red Caturra, Mundo Novo, Arara',250,'بن برازيلي بمعالجة مجففة وإيحاءات كراميل وشوكولاتة ومكسرات. تذكر المحمصة ملاءمته للإسبريسو واللاتيه والترشيح.','Naturally processed Brazilian coffee with caramel, chocolate and nut notes. The roaster recommends espresso, latte and filter brewing.','official_product_page','Jebla Coffee Roasters','https://jeblacoffeeroasters.com/ar/products/روماريو-برازيل','https://jeblacoffeeroasters.com/',true,false,'official','2026-10-07',true,true,false
from public.roasters r where r.slug='jebla-coffee' on conflict(slug) do nothing;
insert into public.bean_flavor_notes(bean_id,flavor)
select b.id,f from public.beans b cross join unnest(array['caramel','chocolate','nutty']) f where b.slug='jebla-romario-250g' on conflict do nothing;

-- Search related coffee by bilingual roaster, origin and flavor as well as name.
create or replace function public.search_public_beans(p_query text default '')
returns setof public.beans language sql stable security invoker set search_path='' as $$
 select b.* from public.beans b left join public.roasters r on r.id=b.roaster_id and not r.requires_review
 where b.is_published and not b.requires_review and not exists (
 select 1 from regexp_split_to_table(public.recipe_discovery_normalize(left(coalesce(p_query,''),160)),'[[:space:]]+') q(term)
 where q.term<>'' and strpos(public.recipe_discovery_search_text(concat_ws(' ',b.name_ar,b.name_en,b.origin_country,b.description_ar,b.description_en,b.source_name,r.name_ar,r.name_en,(select string_agg(f.flavor,' ') from public.bean_flavor_notes f where f.bean_id=b.id))),q.term)=0);
$$;
revoke all on function public.search_public_beans(text) from public;
grant execute on function public.search_public_beans(text) to anon,authenticated;

create or replace function public.recipe_discovery_search_text(p_value text)
returns text language plpgsql immutable security invoker set search_path='' as $aliases$
declare original text := public.recipe_discovery_normalize(p_value);
  words text[] := regexp_split_to_array(original,'[^[:alnum:]]+');
  result text := original;
begin
  if words && array['strawberry','strawberries','فراوله','fraise','fraises','fresa','fresas','草莓','イチコ']::text[] or strpos(original,'🍓')>0 then result:=result || ' strawberry strawberries فراوله fraise fraises fresa fresas 草莓 イチコ 🍓'; end if;
  if words && array['blueberry','blueberries','بلوبيري']::text[] or strpos(original,'توت ازرق')>0 then result:=result || ' blueberry blueberries توت ازرق بلوبيري'; end if;
  if words && array['raspberry','raspberries','رازبيري']::text[] or strpos(original,'توت العليق')>0 then result:=result || ' raspberry raspberries توت العليق رازبيري'; end if;
  if words && array['peach','peaches','خوخ']::text[] then result:=result || ' peach peaches خوخ'; end if;
  if words && array['chocolate','شوكولاته']::text[] then result:=result || ' chocolate شوكولاته'; end if;
  if words && array['cocoa','cacao','كاكاو']::text[] then result:=result || ' cocoa cacao كاكاو'; end if;
  if words && array['jasmine','ياسمين']::text[] then result:=result || ' jasmine ياسمين'; end if;
  if words && array['caramel','كراميل']::text[] then result:=result || ' caramel كراميل'; end if;
  if words && array['vanilla','فانيلا','فانيليا']::text[] then result:=result || ' vanilla فانيلا فانيليا'; end if;
  if words && array['cherry','cherries','كرز']::text[] then result:=result || ' cherry cherries كرز'; end if;
  if words && array['orange','برتقال']::text[] then result:=result || ' orange برتقال'; end if;
  if words && array['lemon','ليمون']::text[] then result:=result || ' lemon ليمون'; end if;
  if words && array['mango','مانجو','منجا']::text[] then result:=result || ' mango مانجو منجا'; end if;
  if words && array['pineapple','اناناس']::text[] then result:=result || ' pineapple اناناس'; end if;
  if words && array[]::text[] or strpos(original,'passion fruit')>0 or strpos(original,'باشن فروت')>0 or strpos(original,'فاكهه العاطفه')>0 then result:=result || ' passion fruit باشن فروت فاكهه العاطفه'; end if;
  if words && array['hazelnut','بندق']::text[] then result:=result || ' hazelnut بندق'; end if;
  if words && array['almond','لوز']::text[] then result:=result || ' almond لوز'; end if;
  if words && array['honey','عسل']::text[] then result:=result || ' honey عسل'; end if;
  if words && array['floral','زهور','زهري']::text[] then result:=result || ' floral زهور زهري'; end if;
  if words && array['ethiopia','ethiopian','اثيوبيا']::text[] then result:=result || ' ethiopia ethiopian اثيوبيا'; end if;
  if words && array['colombia','colombian','كولومبيا']::text[] then result:=result || ' colombia colombian كولومبيا'; end if;
  if words && array['cold','iced','ice','بارد','مثلج']::text[] then result:=result || ' cold iced ice بارد مثلج'; end if;
  if words && array['rawi','rawee','راوي','راوى']::text[] then result:=result||' rawi rawee راوي راوى'; end if;
  if words && array['jebla','jabla','جبله']::text[] then result:=result||' jebla jabla جبله'; end if;
  return result;
end $aliases$;
revoke all on function public.recipe_discovery_search_text(text) from public;
grant execute on function public.recipe_discovery_search_text(text) to anon,authenticated;

select private.refresh_recipe_search_documents();
