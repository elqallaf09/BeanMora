-- BeanMora — 31: optional structured tasting/dial-in outcome tag on brew_logs.
--
-- Forward-only. Does not modify migrations 01-30.
--
-- Espresso Dial-In (and any other brew method logging through the shared
-- brew_logs table) wants a quick, comparable outcome tag between attempts
-- ("this one was too sour, that one was balanced") in addition to the
-- freeform `notes` column that already exists (migration 07). A CHECK
-- constraint keeps the five presets consistent app-wide; 'custom' means
-- "none of the presets fit, see notes" — it does not duplicate free text
-- into a second column.
--
-- No RLS changes: brew_logs already has full owner-scoped SELECT/INSERT/
-- UPDATE/DELETE policies (migration 07, auth.uid() = user_id) that cover
-- this new column automatically.

alter table public.brew_logs
  add column if not exists tasting_note text check (tasting_note is null or tasting_note in
    ('too_sour', 'too_bitter', 'too_fast', 'too_slow', 'balanced', 'custom'));

comment on column public.brew_logs.tasting_note is
  'Optional structured dial-in outcome tag the user picks after tasting a shot/brew, for comparing attempts over time. ''custom'' signals the freeform `notes` column carries the actual description rather than duplicating text here.';
