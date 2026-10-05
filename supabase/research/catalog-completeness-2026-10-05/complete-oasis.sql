-- Reviewed historical description, not a claim about a current lot or stock.
-- The archived specialty blend has Uganda/Brazil/Colombia; the four-country
-- conventional blend is a different product and must not be substituted.
begin;
update public.roasters
set name_ar = 'كروس بريدج كوفي'
where slug = 'crossbridge-coffee'
  and name_en = 'Crossbridge Coffee'
  and name_ar = 'كروس بريدج كوفي (بحث تقريبي غير موثق)';

with changed as (
  update public.beans
  set name_ar = 'أوايسس بليند',
      description_ar = 'خلطة قهوة مختصة تجمع بنًا من أوغندا والبرازيل وكولومبيا. يصفها الكتالوغ الرسمي المؤرشف بأنها متوازنة، بقوام ممتلئ وإيحاءات حمضيات حلوة وكاكاو. تفاصيل هذه الخلطة موثقة في الكتالوغ التاريخي؛ قد تختلف الدفعات الحالية.',
      description_en = 'A specialty blend of coffees from Uganda, Brazil and Colombia. The archived official catalog describes a balanced cup with a full body, sweet citrus and cocoa. This describes the historical blend; current batches may differ.',
      origin_country = coalesce(origin_country, 'Uganda, Brazil, Colombia'),
      sensory_profile = sensory_profile || jsonb_build_object(
        'source_url', 'https://web.archive.org/web/20190705142405/https://crossbridgecoffee.com/coffees/',
        'body_description', 'Full-bodied', 'body_description_ar', 'ممتلئ',
        'sweetness_description', 'Sweet citrus', 'sweetness_description_ar', 'حمضيات حلوة'),
      source_url = 'https://web.archive.org/web/20190705142405/https://crossbridgecoffee.com/coffees/'
  where slug = 'crossbridge-oasis-blend'
    and name_en = 'Oasis Blend'
    and source_url = 'https://crossbridgecoffee.com/'
    and description_en = 'Signature house blend, stated as featuring beans from Uganda, Brazil and Colombia. No process/varietal/roast/bag size published.'
    and is_published and not requires_review
  returning id
)
insert into public.bean_flavor_notes(bean_id, flavor)
select changed.id, note.flavor
from changed cross join (values ('Sweet citrus'), ('Cocoa')) as note(flavor)
where not exists (select 1 from public.bean_flavor_notes f where f.bean_id = changed.id and f.flavor = note.flavor);
commit;
