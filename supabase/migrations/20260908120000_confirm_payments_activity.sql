-- Extends the existing activity trigger (see 20260905223000_social_activity.sql) to also
-- fire when a tip or boost actually gets confirmed on-chain (see the confirm-payment edge
-- function). Activity.tsx already has presentation config for 'tip' and 'boost' kinds —
-- this is the piece that was missing to ever produce one.
create or replace function public.create_social_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_user uuid;
  target_ralli uuid;
begin
  if tg_table_name = 'responses' then
    select creator_id into target_user from public.rallis where id = new.ralli_id;
    if target_user <> new.author_id then
      insert into public.activity_events (user_id, actor_id, ralli_id, response_id, kind)
      values (target_user, new.author_id, new.ralli_id, new.id, 'response');
    end if;
  elsif tg_table_name = 'reactions' then
    select author_id, ralli_id into target_user, target_ralli from public.responses where id = new.response_id;
    if target_user <> new.user_id then
      insert into public.activity_events (user_id, actor_id, ralli_id, response_id, kind, payload)
      values (target_user, new.user_id, target_ralli, new.response_id, 'reaction', jsonb_build_object('reaction', new.kind));
    end if;
  elsif tg_table_name = 'ralli_passes' then
    select creator_id into target_user from public.rallis where id = new.ralli_id;
    if target_user <> new.passed_by then
      insert into public.activity_events (user_id, actor_id, ralli_id, response_id, kind)
      values (target_user, new.passed_by, new.ralli_id, new.response_id, 'pass');
    end if;
  elsif tg_table_name = 'response_tips' then
    select ralli_id into target_ralli from public.responses where id = new.response_id;
    if new.recipient_id <> new.sender_id then
      insert into public.activity_events (user_id, actor_id, ralli_id, response_id, kind, payload)
      values (new.recipient_id, new.sender_id, target_ralli, new.response_id, 'tip', jsonb_build_object('amount_luna', new.amount_luna));
    end if;
  elsif tg_table_name = 'pool_contributions' then
    if new.kind = 'boost' then
      select creator_id into target_user from public.rallis where id = new.ralli_id;
      if target_user <> new.contributor_id then
        insert into public.activity_events (user_id, actor_id, ralli_id, kind, payload)
        values (target_user, new.contributor_id, new.ralli_id, 'boost', jsonb_build_object('amount_luna', new.amount_luna));
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tip_confirmed_activity on public.response_tips;
drop trigger if exists boost_confirmed_activity on public.pool_contributions;

create trigger tip_confirmed_activity after update on public.response_tips
  for each row when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
  execute function public.create_social_activity();

create trigger boost_confirmed_activity after update on public.pool_contributions
  for each row when (new.status = 'confirmed' and old.status is distinct from 'confirmed')
  execute function public.create_social_activity();
