-- A creator should be able to find a newly published Ralli from Activity. Social
-- activity previously only recorded actions performed by other people, which made
-- a quiet new account look as if publishing had not worked.

create or replace function public.create_ralli_published_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'draft' then
    insert into public.activity_events (user_id, actor_id, ralli_id, kind, payload)
    values (new.creator_id, new.creator_id, new.id, 'ralli_created', jsonb_build_object('prompt', new.prompt));
  end if;
  return new;
end;
$$;

drop trigger if exists ralli_published_activity on public.rallis;
create trigger ralli_published_activity
after insert on public.rallis
for each row execute function public.create_ralli_published_activity();

-- Make existing Rallis discoverable too, including the tester's report that led
-- to this migration. The NOT EXISTS guard keeps this safe to re-run.
insert into public.activity_events (user_id, actor_id, ralli_id, kind, payload, created_at)
select r.creator_id, r.creator_id, r.id, 'ralli_created', jsonb_build_object('prompt', r.prompt), r.created_at
from public.rallis r
where r.status <> 'draft'
  and not exists (
    select 1 from public.activity_events ae
    where ae.user_id = r.creator_id
      and ae.ralli_id = r.id
      and ae.kind = 'ralli_created'
  );
