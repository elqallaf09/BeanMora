alter table public.brew_logs
  add column if not exists taste_signal text
  check (taste_signal is null or taste_signal in ('sharp_sour','bitter_dry','thin_weak','balanced','other'));
