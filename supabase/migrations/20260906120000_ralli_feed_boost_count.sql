-- Surface how many distinct people boosted a Ralli's pool, so the feed can
-- show crowdfunding momentum ("N people boosted this") alongside the summed
-- NIM amount, without changing any existing ralli_feed column positions.
create or replace view public.ralli_feed
with (security_invoker = true)
as
select
  r.id,
  r.creator_id,
  p.handle,
  p.display_name,
  p.avatar_path,
  r.prompt,
  r.description,
  r.category,
  r.cover_path,
  r.status,
  r.reward_total_luna,
  coalesce((select sum(pc.amount_luna) from public.pool_contributions pc where pc.ralli_id = r.id and pc.kind = 'creator_reward' and pc.status = 'confirmed'), 0)::bigint as creator_reward_luna,
  coalesce((select sum(pc.amount_luna) from public.pool_contributions pc where pc.ralli_id = r.id and pc.kind = 'boost' and pc.status = 'confirmed'), 0)::bigint as boost_total_luna,
  r.ends_at,
  r.created_at,
  count(distinct rs.id)::integer as response_count,
  count(distinct rx.id)::integer as reaction_count,
  count(distinct rp.id)::integer as pass_count,
  coalesce((select count(distinct pc.contributor_id) from public.pool_contributions pc where pc.ralli_id = r.id and pc.kind = 'boost' and pc.status = 'confirmed'), 0)::integer as boost_count
from public.rallis r
join public.profiles p on p.id = r.creator_id
left join public.responses rs on rs.ralli_id = r.id and rs.status <> 'hidden'
left join public.reactions rx on rx.response_id = rs.id
left join public.ralli_passes rp on rp.ralli_id = r.id
where r.status <> 'draft'
group by r.id, p.id;

grant select on public.ralli_feed to anon, authenticated;
