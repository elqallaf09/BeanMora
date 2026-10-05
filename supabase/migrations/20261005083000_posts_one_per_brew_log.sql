create unique index if not exists posts_one_per_brew_log
on public.posts (brew_log_id)
where brew_log_id is not null;
