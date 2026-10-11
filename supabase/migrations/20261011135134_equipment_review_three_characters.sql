-- Short opinions use the same trimmed, Unicode-character limit in mobile and SQL.
alter table public.equipment_reviews
  drop constraint equipment_reviews_review_text_check,
  add constraint equipment_reviews_review_text_check
    check (char_length(btrim(review_text)) between 3 and 2000);
