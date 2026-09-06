-- Generate user activity from persistent social actions.
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
  end if;
  return new;
end;
$$;

drop trigger if exists response_activity on public.responses;
drop trigger if exists reaction_activity on public.reactions;
drop trigger if exists pass_activity on public.ralli_passes;

create trigger response_activity after insert on public.responses for each row execute function public.create_social_activity();
create trigger reaction_activity after insert on public.reactions for each row execute function public.create_social_activity();
create trigger pass_activity after insert on public.ralli_passes for each row execute function public.create_social_activity();
