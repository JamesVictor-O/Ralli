-- Nothing ever flips a Ralli's status when its clock runs out — ends_at is just a
-- timestamp — so app queries filtering on status alone kept surfacing (and letting people
-- join) Rallis that had already ended. Listing queries now also filter on ends_at, but
-- that only stops it from being *shown*; this trigger is the actual guarantee, since it
-- covers every path into responses (including ones the client-side checks miss).
create function public.reject_response_after_ralli_ends()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  ralli_ends_at timestamptz;
begin
  select ends_at into ralli_ends_at from public.rallis where id = new.ralli_id;
  if ralli_ends_at is not null and ralli_ends_at <= now() then
    raise exception 'ralli_expired' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger responses_reject_after_ralli_ends
  before insert on public.responses
  for each row execute function public.reject_response_after_ralli_ends();
