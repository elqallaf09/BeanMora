-- Reference data only (not sample/demo content). Safe to run in any
-- environment, including production, since brew_methods is a fixed lookup
-- table the whole product depends on.
insert into public.brew_methods (code, name_ar, name_en) values
  ('v60', 'V60', 'V60'),
  ('espresso', 'إسبريسو', 'Espresso'),
  ('xbloom', 'xBloom', 'xBloom'),
  ('aeropress', 'AeroPress', 'AeroPress'),
  ('chemex', 'Chemex', 'Chemex'),
  ('french_press', 'فرنش برس', 'French Press'),
  ('cold_brew', 'كولد برو', 'Cold Brew'),
  ('moka_pot', 'موكا بوت', 'Moka Pot')
on conflict (code) do nothing;
