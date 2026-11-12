-- ============================================================================
-- Prime Focus Schools (PFS) - Supabase Media & Photo Management Setup
-- Run this once in your Supabase Dashboard -> SQL Editor -> New Query.
-- Safe to re-run (idempotent).
-- ============================================================================

-- 1. Explore Facilities Table
create table if not exists public.site_facilities (
  id text primary key,
  name text not null,
  description text not null default '',
  image_url text not null,
  sort_order integer not null default 0,
  show_on_home boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_facilities_sort
  on public.site_facilities (sort_order asc, created_at asc);

-- 2. Past Events & Event Galleries Table
create table if not exists public.site_events (
  id text primary key,
  title text not null,
  category text not null default 'School Event',
  description text not null default '',
  cover_url text not null default 'images/school-1.webp',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_site_events_sort
  on public.site_events (sort_order asc, created_at desc);

-- 3. Individual Event Album Photos Table
create table if not exists public.site_event_photos (
  id text primary key,
  event_id text not null references public.site_events(id) on delete cascade,
  image_url text not null,
  caption text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_event_photos_event_sort
  on public.site_event_photos (event_id, sort_order asc, created_at asc);

-- 4. Campus & School Life Gallery Photos Table
create table if not exists public.site_gallery_photos (
  id text primary key,
  title text not null default '',
  category text not null default 'Campus Life',
  caption text not null default '',
  image_url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_site_gallery_photos_sort
  on public.site_gallery_photos (sort_order asc, created_at desc);

-- 5. Site Highlights, Banners & Initialization Flags Table
create table if not exists public.site_media_settings (
  key text primary key,
  label text not null default '',
  value text not null default '',
  caption text not null default '',
  updated_at timestamptz not null default now()
);

-- 6. Grants
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

-- 7. Enable Row Level Security (RLS)
alter table public.site_facilities enable row level security;
alter table public.site_events enable row level security;
alter table public.site_event_photos enable row level security;
alter table public.site_gallery_photos enable row level security;
alter table public.site_media_settings enable row level security;

-- 8. RLS Policies: Public Read, CMS Admin Write
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

-- 9. Public Storage Bucket for Uploaded Photos
insert into storage.buckets (id, name, public)
values ('pfs-media', 'pfs-media', true)
on conflict (id) do update set public = true;

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
