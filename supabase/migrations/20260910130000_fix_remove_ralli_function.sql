create or replace function public.remove_my_ralli(ralli_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  contribution_count integer;
begin
  if not exists (
    select 1 from public.rallis r
    where r.id = remove_my_ralli.ralli_id and r.creator_id = auth.uid()
  ) then
    raise exception 'NOT_RALLI_CREATOR';
  end if;

  select count(*) into contribution_count
  from public.pool_contributions pc
  where pc.ralli_id = remove_my_ralli.ralli_id and pc.status = 'confirmed';

  if contribution_count > 0 then
    update public.rallis r set status = 'cancelled' where r.id = remove_my_ralli.ralli_id;
    return 'cancelled';
  end if;

  delete from public.rallis r where r.id = remove_my_ralli.ralli_id;
  return 'deleted';
end; $$;
