-- Text and coffee stickers a member places on a story. They are stored as data
-- and drawn by the viewer, so they work on videos too and a sticker can open
-- the recipe, coffee or roastery it points to. Builds before this one ignore
-- the column and show the media alone.
alter table public.coffee_stories
  add column if not exists overlays jsonb
  check (overlays is null or (jsonb_typeof(overlays) = 'object' and pg_column_size(overlays) <= 8192));
