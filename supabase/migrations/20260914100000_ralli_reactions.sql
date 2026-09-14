create table public.ralli_reactions (
  id uuid primary key default gen_random_uuid(),
  ralli_id uuid not null references public.rallis(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('funny', 'nailed_it', 'wow', 'respect')),
  created_at timestamptz not null default now(),
  unique (ralli_id, user_id, kind)
);

create index ralli_reactions_ralli_idx on public.ralli_reactions(ralli_id);
alter table public.ralli_reactions enable row level security;

create policy "Ralli reactions are publicly readable" on public.ralli_reactions for select using (true);
create policy "Verified users react to Rallis" on public.ralli_reactions for insert to authenticated
with check (user_id = (select auth.uid()) and public.has_verified_nimiq_address((select auth.uid())));
create policy "Users remove their Ralli reactions" on public.ralli_reactions for delete to authenticated
using (user_id = (select auth.uid()));

grant select on public.ralli_reactions to anon, authenticated;
grant insert, delete on public.ralli_reactions to authenticated;

create or replace function public.create_ralli_reaction_activity()
returns trigger language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  select creator_id into owner_id from public.rallis where id = new.ralli_id;
  if owner_id is not null and owner_id <> new.user_id then
    insert into public.activity_events (user_id, actor_id, ralli_id, kind, payload)
    values (owner_id, new.user_id, new.ralli_id, 'ralli_reaction', jsonb_build_object('reaction', new.kind));
  end if;
  return new;
end;
$$;

create trigger ralli_reaction_activity after insert on public.ralli_reactions
for each row execute function public.create_ralli_reaction_activity();
