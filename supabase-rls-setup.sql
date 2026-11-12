-- ============================================================================
-- Prime Focus Schools (PFS) - Complete Row Level Security (RLS) Setup
-- Run this in Supabase Dashboard -> SQL Editor -> New Query to ensure RLS is
-- ENABLED on every public table and admin checks are enforced server-side.
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. Enable Row Level Security (RLS) on all application tables
alter table if exists public.admins enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.contact_messages enable row level security;
alter table if exists public.site_facilities enable row level security;
alter table if exists public.site_events enable row level security;
alter table if exists public.site_event_photos enable row level security;
alter table if exists public.site_gallery_photos enable row level security;
alter table if exists public.site_media_settings enable row level security;

-- 2. public.admins: authenticated users may only read their own admin row
revoke all on public.admins from anon;
grant select on public.admins to authenticated;

drop policy if exists "Authenticated users can check own admin status" on public.admins;
create policy "Authenticated users can check own admin status"
  on public.admins for select
  to authenticated
  using (user_id = auth.uid());

-- 3. public.posts: public reads published only; admins manage all posts
grant select on public.posts to anon, authenticated;
grant insert, update, delete on public.posts to authenticated;

drop policy if exists "Public can read published posts" on public.posts;
drop policy if exists "Anon can read published posts" on public.posts;
create policy "Anon can read published posts"
  on public.posts for select
  to anon
  using (status = 'published');

drop policy if exists "Authenticated can read published or admin posts" on public.posts;
create policy "Authenticated can read published or admin posts"
  on public.posts for select
  to authenticated
  using (
    status = 'published'
    or auth.uid() in (select user_id from public.admins)
  );

drop policy if exists "Admins can insert posts" on public.posts;
create policy "Admins can insert posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update posts" on public.posts;
create policy "Admins can update posts"
  on public.posts for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete posts" on public.posts;
create policy "Admins can delete posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- 4. public.contact_messages: public can submit enquiries; admins read & update
revoke select, update, delete on public.contact_messages from anon;
grant insert on public.contact_messages to anon, authenticated;
grant select, update, delete on public.contact_messages to authenticated;

drop policy if exists "Public can submit contact messages" on public.contact_messages;
create policy "Public can submit contact messages"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Admins can read contact messages" on public.contact_messages;
create policy "Admins can read contact messages"
  on public.contact_messages for select
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update contact messages" on public.contact_messages;
create policy "Admins can update contact messages"
  on public.contact_messages for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete contact messages" on public.contact_messages;
create policy "Admins can delete contact messages"
  on public.contact_messages for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- 5. Media & Gallery tables: public read; admins insert/update/delete
grant select on
  public.site_facilities,
  public.site_events,
  public.site_event_photos,
  public.site_gallery_photos,
  public.site_media_settings
to anon, authenticated;

grant insert, update, delete on
  public.site_facilities,
  public.site_events,
  public.site_event_photos,
  public.site_gallery_photos,
  public.site_media_settings
to authenticated;

-- site_facilities
drop policy if exists "Public can read facilities" on public.site_facilities;
create policy "Public can read facilities"
  on public.site_facilities for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert facilities" on public.site_facilities;
create policy "Admins can insert facilities"
  on public.site_facilities for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update facilities" on public.site_facilities;
create policy "Admins can update facilities"
  on public.site_facilities for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete facilities" on public.site_facilities;
create policy "Admins can delete facilities"
  on public.site_facilities for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- site_events
drop policy if exists "Public can read events" on public.site_events;
create policy "Public can read events"
  on public.site_events for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert events" on public.site_events;
create policy "Admins can insert events"
  on public.site_events for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update events" on public.site_events;
create policy "Admins can update events"
  on public.site_events for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete events" on public.site_events;
create policy "Admins can delete events"
  on public.site_events for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- site_event_photos
drop policy if exists "Public can read event photos" on public.site_event_photos;
create policy "Public can read event photos"
  on public.site_event_photos for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert event photos" on public.site_event_photos;
create policy "Admins can insert event photos"
  on public.site_event_photos for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update event photos" on public.site_event_photos;
create policy "Admins can update event photos"
  on public.site_event_photos for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete event photos" on public.site_event_photos;
create policy "Admins can delete event photos"
  on public.site_event_photos for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- site_gallery_photos
drop policy if exists "Public can read gallery photos" on public.site_gallery_photos;
create policy "Public can read gallery photos"
  on public.site_gallery_photos for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert gallery photos" on public.site_gallery_photos;
create policy "Admins can insert gallery photos"
  on public.site_gallery_photos for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update gallery photos" on public.site_gallery_photos;
create policy "Admins can update gallery photos"
  on public.site_gallery_photos for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete gallery photos" on public.site_gallery_photos;
create policy "Admins can delete gallery photos"
  on public.site_gallery_photos for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- site_media_settings
drop policy if exists "Public can read site media settings" on public.site_media_settings;
create policy "Public can read site media settings"
  on public.site_media_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can insert site media settings" on public.site_media_settings;
create policy "Admins can insert site media settings"
  on public.site_media_settings for insert
  to authenticated
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can update site media settings" on public.site_media_settings;
create policy "Admins can update site media settings"
  on public.site_media_settings for update
  to authenticated
  using (auth.uid() in (select user_id from public.admins))
  with check (auth.uid() in (select user_id from public.admins));

drop policy if exists "Admins can delete site media settings" on public.site_media_settings;
create policy "Admins can delete site media settings"
  on public.site_media_settings for delete
  to authenticated
  using (auth.uid() in (select user_id from public.admins));

-- 6. Storage Bucket & Policies (pfs-media)
drop policy if exists "Public can view pfs-media files" on storage.objects;
create policy "Public can view pfs-media files"
  on storage.objects for select
  to public
  using (bucket_id = 'pfs-media');

drop policy if exists "Admins can upload pfs-media files" on storage.objects;
create policy "Admins can upload pfs-media files"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'pfs-media'
    and auth.uid() in (select user_id from public.admins)
  );

drop policy if exists "Admins can update pfs-media files" on storage.objects;
create policy "Admins can update pfs-media files"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'pfs-media'
    and auth.uid() in (select user_id from public.admins)
  )
  with check (
    bucket_id = 'pfs-media'
    and auth.uid() in (select user_id from public.admins)
  );

drop policy if exists "Admins can delete pfs-media files" on storage.objects;
create policy "Admins can delete pfs-media files"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'pfs-media'
    and auth.uid() in (select user_id from public.admins)
  );

-- 7. Verification query: confirms rowsecurity = true on every public table
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
order by tablename;
