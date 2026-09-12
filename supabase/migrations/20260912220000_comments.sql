create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  ralli_id uuid not null references public.rallis(id) on delete cascade,
  response_id uuid references public.responses(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);

create index if not exists comments_ralli_created_idx on public.comments(ralli_id, created_at);
create index if not exists comments_response_created_idx on public.comments(response_id, created_at) where response_id is not null;

alter table public.comments enable row level security;
create policy "Comments are publicly readable" on public.comments for select using (true);
create policy "Signed-in users create comments" on public.comments for insert to authenticated
with check (author_id = (select auth.uid()));
create policy "Authors delete comments" on public.comments for delete to authenticated
using (author_id = (select auth.uid()));

grant select on public.comments to anon;
grant select, insert, delete on public.comments to authenticated;

create or replace function public.create_comment_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare recipient uuid;
begin
  if new.response_id is not null then
    select author_id into recipient from public.responses where id = new.response_id;
  else
    select creator_id into recipient from public.rallis where id = new.ralli_id;
  end if;
  if recipient is not null and recipient <> new.author_id then
    insert into public.activity_events(user_id, actor_id, ralli_id, response_id, kind)
    values (recipient, new.author_id, new.ralli_id, new.response_id, 'comment');
  end if;
  return new;
end;
$$;

create trigger comment_activity after insert on public.comments
for each row execute function public.create_comment_activity();
