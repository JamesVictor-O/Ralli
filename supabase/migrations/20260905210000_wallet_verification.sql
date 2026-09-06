-- Store the exact signed message and complete verification atomically.
alter table public.wallet_verification_challenges add column message text not null;

create or replace function public.complete_wallet_verification(
  challenge_id uuid,
  profile_id uuid,
  verified_address text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  consumed_id uuid;
begin
  update public.wallet_verification_challenges
  set used_at = now()
  where id = challenge_id
    and user_id = profile_id
    and used_at is null
    and expires_at > now()
  returning id into consumed_id;

  if consumed_id is null then
    raise exception 'Challenge is invalid, expired, or already used';
  end if;

  update public.profiles
  set nimiq_address = verified_address,
      nimiq_address_verified_at = now()
  where id = profile_id;

  if not found then raise exception 'Profile does not exist'; end if;
end;
$$;

revoke all on function public.complete_wallet_verification(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.complete_wallet_verification(uuid, uuid, text) to service_role;
