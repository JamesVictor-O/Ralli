-- Public-beta safety: authenticated members can flag harmful responses for review.
create type public.report_reason as enum ('spam', 'harassment', 'unsafe', 'copyright', 'other');

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  response_id uuid not null references public.responses(id) on delete cascade,
  reason public.report_reason not null,
  details text not null default '' check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (reporter_id, response_id)
);

create index content_reports_status_created_idx on public.content_reports(status, created_at desc);
alter table public.content_reports enable row level security;

create policy "Users create their own reports" on public.content_reports for insert to authenticated
with check (reporter_id = (select auth.uid()));
create policy "Users read their own reports" on public.content_reports for select to authenticated
using (reporter_id = (select auth.uid()));

grant insert, select on public.content_reports to authenticated;
