alter type public.contribution_kind add value if not exists 'ralli_tip';

create or replace function public.create_ralli_tip_activity()
returns trigger language plpgsql security definer set search_path = public
as $$
declare owner_id uuid;
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' and new.kind = 'ralli_tip' then
    select creator_id into owner_id from public.rallis where id = new.ralli_id;
    if owner_id is not null and owner_id <> new.contributor_id then
      insert into public.activity_events (user_id, actor_id, ralli_id, kind, payload)
      values (owner_id, new.contributor_id, new.ralli_id, 'ralli_tip', jsonb_build_object('amount_luna', new.amount_luna));
    end if;
  end if;
  return new;
end;
$$;

create trigger ralli_tip_confirmed_activity after update on public.pool_contributions
for each row execute function public.create_ralli_tip_activity();
