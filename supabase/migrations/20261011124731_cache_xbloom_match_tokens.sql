-- Normalize each document once, and use already normalized literal aliases.
-- The maintained flavor index already contains retrieval aliases.
-- Avoid expanding the full search vocabulary again for every candidate.
create or replace function public.coffee_similarity_terms(p_text text)
returns table(note text, family text)
language sql immutable parallel safe security invoker set search_path = ''
as $terms$
  with input as materialized (
    select ' ' || regexp_replace(public.recipe_discovery_normalize(p_text),
      '[^[:alnum:]]+', ' ', 'g') || ' ' as words
  )
  select v.note, v.family from input cross join (values
    ('strawberry','fruity',array['strawberry','strawberries','فراوله']),
    ('blueberry','fruity',array['blueberry','blueberries','توت ازرق']),
    ('raspberry','fruity',array['raspberry','raspberries','توت العليق']),
    ('blackberry','fruity',array['blackberry','blackberries','توت اسود']),
    ('berry','fruity',array['berry','berries','توت']),
    ('peach','fruity',array['peach','peaches','خوخ']),
    ('apricot','fruity',array['apricot','apricots','مشمش']),
    ('plum','fruity',array['plum','plums','برقوق']),
    ('apple','fruity',array['apple','apples','تفاح']),
    ('pear','fruity',array['pear','pears','اجاص','كمثرى']),
    ('mango','fruity',array['mango','مانجو','منجا']),
    ('pineapple','fruity',array['pineapple','اناناس']),
    ('passion fruit','fruity',array['passion fruit','passionfruit','باشن فروت']),
    ('cherry','fruity',array['cherry','cherries','كرز']),
    ('grape','fruity',array['grape','grapes','عنب']),
    ('raisin','fruity',array['raisin','raisins','زبيب']),
    ('lychee','fruity',array['lychee','ليتشي']),
    ('melon','fruity',array['melon','شمام']),
    ('fig','fruity',array['fig','figs','تين']),
    ('fruity','fruity',array['fruit','fruits','fruity','فواكه']),
    ('citrus','citrus',array['citrus','حمضيات']),
    ('lemon','citrus',array['lemon','ليمون']),
    ('lime','citrus',array['lime','لايم']),
    ('orange','citrus',array['orange','برتقال']),
    ('grapefruit','citrus',array['grapefruit','جريب فروت']),
    ('bergamot','citrus',array['bergamot','برغموت']),
    ('mandarin','citrus',array['mandarin','mandarine','tangerine','يوسفي']),
    ('jasmine','floral',array['jasmine','ياسمين']),
    ('rose','floral',array['rose','ورد']),
    ('floral','floral',array['floral','florals','flower','flowers','زهور']),
    ('chocolate','chocolate',array['chocolate','شوكولاته']),
    ('cocoa','chocolate',array['cocoa','cacao','كاكاو']),
    ('cashew','nutty',array['cashew','cashews','كاجو']),
    ('almond','nutty',array['almond','almonds','لوز']),
    ('hazelnut','nutty',array['hazelnut','hazelnuts','بندق']),
    ('walnut','nutty',array['walnut','walnuts','جوز']),
    ('nutty','nutty',array['nutty','nuts','مكسرات']),
    ('caramel','sweet',array['caramel','كراميل']),
    ('honey','sweet',array['honey','عسل']),
    ('toffee','sweet',array['toffee','توفي']),
    ('vanilla','sweet',array['vanilla','فانيلا']),
    ('sugar','sweet',array['sugar','سكر']),
    ('tea','tea',array['tea','شاي']),
    ('cinnamon','spice',array['cinnamon','قرفه']),
    ('cardamom','spice',array['cardamom','هيل']),
    ('spice','spice',array['spice','spices','spicy','توابل']),
    ('cola','other',array['cola','كولا'])
  ) v(note,family,aliases)
  where exists(select 1 from unnest(v.aliases) a(value)
    where strpos(input.words, ' ' || a.value || ' ') > 0);
$terms$;
