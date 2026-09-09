create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint cannot_block_self check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "Users read their blocks" on public.user_blocks for select to authenticated using (blocker_id = (select auth.uid()));
create policy "Users create their blocks" on public.user_blocks for insert to authenticated with check (blocker_id = (select auth.uid()));
create policy "Users remove their blocks" on public.user_blocks for delete to authenticated using (blocker_id = (select auth.uid()));
grant select, insert, delete on public.user_blocks to authenticated;

create or replace function public.remove_my_ralli(ralli_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare contribution_count integer;
begin
  if not exists (select 1 from public.rallis r where r.id = ralli_id and r.creator_id = auth.uid()) then raise exception 'NOT_RALLI_CREATOR'; end if;
  select count(*) into contribution_count from public.pool_contributions pc where pc.ralli_id = remove_my_ralli.ralli_id and pc.status = 'confirmed';
  if contribution_count > 0 then update public.rallis set status = 'cancelled' where id = ralli_id; return 'cancelled'; end if;
  delete from public.rallis where id = ralli_id;
  return 'deleted';
end; $$;
grant execute on function public.remove_my_ralli(uuid) to authenticated;
