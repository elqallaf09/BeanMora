-- Reference data only (not sample/demo content) — the six GCC countries
-- this phase starts with, plus enough neighbors for shipping-destination
-- fields to be meaningful. Safe to run in any environment.
insert into public.countries (code, name_ar, name_en, currency_code, is_gcc) values
  ('KW', 'الكويت', 'Kuwait', 'KWD', true),
  ('SA', 'المملكة العربية السعودية', 'Saudi Arabia', 'SAR', true),
  ('AE', 'الإمارات العربية المتحدة', 'United Arab Emirates', 'AED', true),
  ('QA', 'قطر', 'Qatar', 'QAR', true),
  ('BH', 'البحرين', 'Bahrain', 'BHD', true),
  ('OM', 'سلطنة عمان', 'Oman', 'OMR', true)
on conflict (code) do nothing;
