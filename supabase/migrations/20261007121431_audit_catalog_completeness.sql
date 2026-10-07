set local lock_timeout='3s';
set local statement_timeout='30s';
-- The catalog has 3,448 recipes; its large JSON payload skipped the generic
-- small-table FK pass. The UUID index is bounded by the migration timeout.
create index if not exists recipes_forked_from_recipe_id_idx on public.recipes(forked_from_recipe_id);

-- Concise AR/EN paraphrases checked against the linked publishers on 2026-10-07.
-- No source durations are invented or converted from ranges into exact timers.
with steps(slug,n,title,title_ar,description,description_ar) as (values
 ('crema-coffee-espresso',1,'Grind','الطحن','Prepare 18 g at espresso fineness.','اطحن 18 g بدرجة مناسبة للإسبريسو.'),
 ('crema-coffee-espresso',2,'Distribute','التوزيع','Spread the grounds evenly and tamp level.','وزّع البن بالتساوي ثم اكبس بشكل مستوٍ.'),
 ('crema-coffee-espresso',3,'Extract','الاستخلاص','Flush the group, then brew immediately. Aim for 40–42 g in 21–28 seconds at 198–201°F.','اشطف رأس المجموعة وابدأ الاستخلاص مباشرة. استهدف 40–42 g خلال 21–28 ثانية، بحرارة 198–201°F.'),
 ('proud-mary-v60',1,'Prepare','التجهيز','Rinse the paper, discard rinse water and add 15 g of medium-ground coffee.','اشطف الفلتر وتخلّص من ماء الشطف، ثم أضف 15 g بطحن متوسط.'),
 ('proud-mary-v60',2,'Bloom','التزهير','Start the timer with 50 ml near-boiling water. Stir gently and wait until 30 seconds.','ابدأ المؤقت وأضف 50 ml قرب الغليان. حرّك بلطف وانتظر حتى 30 ثانية.'),
 ('proud-mary-v60',3,'Pour','الصب','From 0:30, pour another 200 ml steadily in circles, finishing the pour near 0:50.','من 0:30 أضف 200 ml بصب دائري ثابت، وأنهِ الصب قرب 0:50.'),
 ('proud-mary-v60',4,'Drain','التصفية','Swirl gently. Expected drawdown finishes at 2:30–3:00; allow the cup to cool slightly.','دوّر القمع بلطف. التصفية المتوقعة عند 2:30–3:00؛ اترك الكوب يبرد قليلًا.'),
 ('flair-58-starter-espresso',1,'Preheat','التسخين','Preheat the chamber and portafilter for five minutes. Select heat for the roast.','سخّن الحجرة وحامل الفلتر خمس دقائق، واختر الحرارة المناسبة للتحميص.'),
 ('flair-58-starter-espresso',2,'Dose','الجرعة','Use 18 g for the starter recipe and prepare an even espresso puck.','استخدم 18 g للوصفة الأساسية وجهّز قرص بن متجانسًا.'),
 ('flair-58-starter-espresso',3,'Extract','الاستخلاص','Begin at 3 bar for 5–10 seconds, then 6–7 bar. Starter targets: 40 g output and about 30 seconds.','ابدأ عند 3 bar مدة 5–10 ثوانٍ، ثم 6–7 bar. الأهداف الأساسية: ناتج 40 g وزمن يقارب 30 ثانية.'),
 ('equator-espresso',1,'Clean','التنظيف','Flush the group for 2–3 seconds and dry the basket.','اشطف رأس المجموعة 2–3 ثوانٍ وجفّف السلة.'),
 ('equator-espresso',2,'Prepare puck','تجهيز القرص','Distribute 18 g evenly in a suitable basket and tamp level.','وزّع 18 g بالتساوي في سلة مناسبة ثم اكبس بشكل مستوٍ.'),
 ('equator-espresso',3,'Brew','التحضير','Lock the portafilter and start immediately. Aim for a 1:2 ratio; the guide gives 30–40 g output in 25–30 seconds for 18 g.','ثبّت حامل الفلتر وابدأ مباشرة. استهدف نسبة 1:2؛ يذكر الدليل ناتج 30–40 g خلال 25–30 ثانية لجرعة 18 g.')
)
insert into public.recipe_steps(recipe_id,step_number,title,title_ar,description,description_ar)
select r.id,s.n,s.title,s.title_ar,s.description,s.description_ar
from steps s join public.recipes r on r.slug=s.slug
where not exists(select 1 from public.recipe_steps existing where existing.recipe_id=r.id);

-- Restore the two absent source associations using verified primary guides.
insert into public.recipe_sources(recipe_id,source_type,source_url,source_name,data_confidence,last_verified_at)
select r.id,'official_website',s.url,s.publisher,'official',now()
from (values
 ('market-lane-aeropress','https://marketlane.com.au/pages/how-to-make-coffee-with-an-aeropress','Market Lane Coffee'),
 ('coffee-collective-kalita-wave','https://coffeecollective.dk/pages/brew-guide/kalita-wave','Coffee Collective')
) s(slug,url,publisher) join public.recipes r on r.slug=s.slug
where not exists(select 1 from public.recipe_sources existing where existing.recipe_id=r.id);

-- The source uses 30 g bloom for the 16 g recipe; 60 g belongs to the 32 g variant.
update public.recipe_steps s set
 description='Wet the 16 g dose with 30 g of water and wait until 0:30.',
 description_ar='بلّل جرعة 16 g بماء 30 g وانتظر حتى 0:30.'
from public.recipes r where r.id=s.recipe_id and r.slug='coffee-collective-kalita-wave'
 and r.dose_grams=16 and s.step_number=1 and s.title='Bloom';
