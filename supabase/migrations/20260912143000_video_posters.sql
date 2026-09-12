alter table public.responses
  add column if not exists media_poster_path text;

grant update (media_poster_path) on public.responses to authenticated;
