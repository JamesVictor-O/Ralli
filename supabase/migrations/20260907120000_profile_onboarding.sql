-- Track whether a profile has been through the onboarding sheet (set a display
-- name/handle/avatar), independent of display_name still being the 'New Ralli'
-- default — a user could legitimately keep that name, so we need an explicit signal.
alter table public.profiles add column if not exists onboarded_at timestamptz;

revoke update on public.profiles from authenticated;
grant update (handle, display_name, bio, avatar_path, onboarded_at) on public.profiles to authenticated;

-- Avatars are cosmetic profile data, not financially-gated content, so uploading
-- one should not require a verified Nimiq address the way ralli-media does.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Avatars are publicly readable" on storage.objects for select
using (bucket_id = 'avatars');
create policy "Users upload their own avatar" on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Users update their own avatar" on storage.objects for update to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
create policy "Users delete their own avatar" on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and owner_id = (select auth.uid())::text);
