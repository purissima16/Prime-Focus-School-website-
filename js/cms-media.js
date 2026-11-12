/**
 * Prime Focus Schools - CMS Media Manager Controller
 * Manages Past Events, Event Photo Albums, Explore Facilities,
 * Campus Gallery Photos, and Website Banners/Principal Portrait in CMS.
 */

(function () {
  "use strict";

  if (typeof MediaStore === "undefined") {
    console.error("MediaStore is required for CMS media management.");
    return;
  }

  const $ = id => document.getElementById(id);

  let activeTab = "blog";
  let selectedEventId = null;
  let galleryCategoryFilter = "all";

  const SQL_SETUP_SCRIPT = `-- Prime Focus Schools - Supabase Media & Photo Management Setup
-- Run this once in Supabase Dashboard -> SQL Editor -> New Query.

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

create table if not exists public.site_media_settings (
  key text primary key,
  label text not null default '',
  value text not null default '',
  caption text not null default '',
  updated_at timestamptz not null default now()
);

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

alter table public.site_facilities enable row level security;
alter table public.site_events enable row level security;
alter table public.site_event_photos enable row level security;
alter table public.site_gallery_photos enable row level security;
alter table public.site_media_settings enable row level security;

drop policy if exists "Public can read facilities" on public.site_facilities;
create policy "Public can read facilities" on public.site_facilities for select to anon, authenticated using (true);
drop policy if exists "Admins can insert facilities" on public.site_facilities;
create policy "Admins can insert facilities" on public.site_facilities for insert to authenticated with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can update facilities" on public.site_facilities;
create policy "Admins can update facilities" on public.site_facilities for update to authenticated using (auth.uid() in (select user_id from public.admins)) with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can delete facilities" on public.site_facilities;
create policy "Admins can delete facilities" on public.site_facilities for delete to authenticated using (auth.uid() in (select user_id from public.admins));

drop policy if exists "Public can read events" on public.site_events;
create policy "Public can read events" on public.site_events for select to anon, authenticated using (true);
drop policy if exists "Admins can insert events" on public.site_events;
create policy "Admins can insert events" on public.site_events for insert to authenticated with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can update events" on public.site_events;
create policy "Admins can update events" on public.site_events for update to authenticated using (auth.uid() in (select user_id from public.admins)) with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can delete events" on public.site_events;
create policy "Admins can delete events" on public.site_events for delete to authenticated using (auth.uid() in (select user_id from public.admins));

drop policy if exists "Public can read event photos" on public.site_event_photos;
create policy "Public can read event photos" on public.site_event_photos for select to anon, authenticated using (true);
drop policy if exists "Admins can insert event photos" on public.site_event_photos;
create policy "Admins can insert event photos" on public.site_event_photos for insert to authenticated with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can update event photos" on public.site_event_photos;
create policy "Admins can update event photos" on public.site_event_photos for update to authenticated using (auth.uid() in (select user_id from public.admins)) with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can delete event photos" on public.site_event_photos;
create policy "Admins can delete event photos" on public.site_event_photos for delete to authenticated using (auth.uid() in (select user_id from public.admins));

drop policy if exists "Public can read gallery photos" on public.site_gallery_photos;
create policy "Public can read gallery photos" on public.site_gallery_photos for select to anon, authenticated using (true);
drop policy if exists "Admins can insert gallery photos" on public.site_gallery_photos;
create policy "Admins can insert gallery photos" on public.site_gallery_photos for insert to authenticated with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can update gallery photos" on public.site_gallery_photos;
create policy "Admins can update gallery photos" on public.site_gallery_photos for update to authenticated using (auth.uid() in (select user_id from public.admins)) with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can delete gallery photos" on public.site_gallery_photos;
create policy "Admins can delete gallery photos" on public.site_gallery_photos for delete to authenticated using (auth.uid() in (select user_id from public.admins));

drop policy if exists "Public can read site media settings" on public.site_media_settings;
create policy "Public can read site media settings" on public.site_media_settings for select to anon, authenticated using (true);
drop policy if exists "Admins can insert site media settings" on public.site_media_settings;
create policy "Admins can insert site media settings" on public.site_media_settings for insert to authenticated with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can update site media settings" on public.site_media_settings;
create policy "Admins can update site media settings" on public.site_media_settings for update to authenticated using (auth.uid() in (select user_id from public.admins)) with check (auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can delete site media settings" on public.site_media_settings;
create policy "Admins can delete site media settings" on public.site_media_settings for delete to authenticated using (auth.uid() in (select user_id from public.admins));

insert into storage.buckets (id, name, public)
values ('pfs-media', 'pfs-media', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view pfs-media files" on storage.objects;
create policy "Public can view pfs-media files" on storage.objects for select to public using (bucket_id = 'pfs-media');
drop policy if exists "Admins can upload pfs-media files" on storage.objects;
create policy "Admins can upload pfs-media files" on storage.objects for insert to authenticated with check (bucket_id = 'pfs-media' and auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can update pfs-media files" on storage.objects;
create policy "Admins can update pfs-media files" on storage.objects for update to authenticated using (bucket_id = 'pfs-media' and auth.uid() in (select user_id from public.admins)) with check (bucket_id = 'pfs-media' and auth.uid() in (select user_id from public.admins));
drop policy if exists "Admins can delete pfs-media files" on storage.objects;
create policy "Admins can delete pfs-media files" on storage.objects for delete to authenticated using (bucket_id = 'pfs-media' and auth.uid() in (select user_id from public.admins));`;

  function svgIcon(name, size = 15) {
    if (window.PfsCmsIcons && typeof window.PfsCmsIcons.svgIcon === "function") {
      return window.PfsCmsIcons.svgIcon(name, size);
    }
    return "";
  }

  function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    const div = document.createElement("div");
    div.textContent = String(value);
    return div.innerHTML;
  }

  function toThumbUrl(url) {
    if (
      window.PfsMediaThumb &&
      typeof window.PfsMediaThumb.toThumbSrc === "function"
    ) {
      return window.PfsMediaThumb.toThumbSrc(url);
    }
    return url;
  }

  function getMediaOnerrorAttr() {
    if (window.PfsMediaThumb && window.PfsMediaThumb.onerrorAttr) {
      return window.PfsMediaThumb.onerrorAttr;
    }
    return "if(this.dataset.fullSrc&&this.getAttribute('src')!==this.dataset.fullSrc){this.src=this.dataset.fullSrc;}else{this.onerror=null;this.src='images/school-1.webp';}";
  }

  function showToast(message, type = "success") {
    let toast = $("cms-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cms-toast";
      toast.className = "pfs-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML =
      `<span style="display:inline-flex;align-items:center">${svgIcon(type === "error" ? "alert" : "check", 16)}</span> ` +
      `<span>${escapeHtml(message)}</span>`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3800);
  }

  function downloadFile(content, fileName, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // ---------------- Tab Navigation ----------------

  function switchTab(tabName, updateHash = true) {
    const validTabs = ["blog", "events", "facilities", "gallery", "enquiries"];
    const nextTab = validTabs.includes(tabName) ? tabName : "blog";
    activeTab = nextTab;

    document.querySelectorAll(".cms-nav-tab[data-tab]").forEach(btn => {
      const isMatch = btn.dataset.tab === nextTab;
      btn.classList.toggle("active", isMatch);
      btn.setAttribute("aria-selected", String(isMatch));
    });

    validTabs.forEach(name => {
      const panel = $(`cms-panel-${name}`);
      if (panel) {
        const isActive = name === nextTab;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
      }
    });

    updateSetupBannerVisibility();

    if (updateHash && window.location.hash !== `#${nextTab}`) {
      try {
        history.replaceState(null, "", `#${nextTab}`);
      } catch (e) {
        // Ignore hash errors.
      }
    }
  }

  function updateSetupBannerVisibility() {
    const banner = $("cms-media-setup-banner");
    if (!banner) return;

    const status = MediaStore.getSchemaStatus();
    const isMediaTab = ["events", "facilities", "gallery"].includes(activeTab);

    if (status.checked && !status.ready && isMediaTab) {
      banner.style.display = "block";
    } else {
      banner.style.display = "none";
    }
  }

  function updateTabBadges() {
    const events = MediaStore.getEvents();
    const facilities = MediaStore.getFacilities();
    const galleryPhotos = MediaStore.getGalleryPhotos();
    const totalEventPhotos = events.reduce(
      (sum, ev) => sum + (ev.photos ? ev.photos.length : 0),
      0
    );

    const eventsBadge = $("tab-badge-events");
    if (eventsBadge) {
      eventsBadge.textContent = `${events.length} · ${totalEventPhotos}`;
    }

    const facBadge = $("tab-badge-facilities");
    if (facBadge) facBadge.textContent = facilities.length;

    const galBadge = $("tab-badge-gallery");
    if (galBadge) galBadge.textContent = galleryPhotos.length;
  }

  // ---------------- Quick Picker Chips Helper ----------------

  function renderQuickPickChips(containerId, targetInputId, previewImgId) {
    const container = $(containerId);
    if (!container) return;

    const picks = MediaStore.getQuickPickPhotos();
    container.innerHTML =
      `<span style="font-size:11px;font-weight:700;color:var(--cms-muted)">Quick Pick School Photos:</span>` +
      picks
        .map(
          item =>
            `<button type="button" class="quick-img-chip" data-src="${escapeHtml(item.src)}">${escapeHtml(item.label)}</button>`
        )
        .join("");

    container.querySelectorAll(".quick-img-chip").forEach(chip => {
      chip.addEventListener("click", () => {
        const input = $(targetInputId);
        const preview = $(previewImgId);
        if (input) input.value = chip.dataset.src;
        if (preview) preview.src = chip.dataset.src;
      });
    });
  }

  // ---------------- Past Events & Album Photos ----------------

  function renderEventsPanel() {
    const events = MediaStore.getEvents();
    const grid = $("cms-events-grid");
    const select = $("cms-album-event-select");

    if (grid) {
      if (!events.length) {
        grid.innerHTML = `
          <div class="cms-empty-box">
            <strong>No past events created yet</strong>
            <p style="margin-top:6px">Click "+ Add New Past Event" to create your first event album.</p>
          </div>`;
      } else {
        if (!selectedEventId || !events.some(e => e.id === selectedEventId)) {
          selectedEventId = events[0].id;
        }

        const onerrorAttr = getMediaOnerrorAttr();
        grid.innerHTML = events
          .map((ev, idx) => {
            const isSelected = ev.id === selectedEventId;
            const photoCount = ev.photoItems ? ev.photoItems.length : 0;
            const publicUrl = `event-photos.html?id=${encodeURIComponent(ev.id)}`;
            const fullCover = ev.cover || "images/school-1.webp";
            const thumbCover = toThumbUrl(fullCover);
            const safeTitle = escapeHtml(ev.title || "event");

            return `
              <article class="cms-media-card ${isSelected ? "is-selected" : ""}">
                <div class="cms-media-thumb-wrap">
                  <img src="${escapeHtml(thumbCover)}"
                    data-full-src="${escapeHtml(fullCover)}"
                    alt="${safeTitle}"
                    width="1200" height="800"
                    loading="lazy" decoding="async" fetchpriority="low"
                    onerror="${onerrorAttr}">
                  <span class="cms-media-pill">${escapeHtml(ev.category || "Event")}</span>
                  <span class="cms-media-pill right">${photoCount} ${photoCount === 1 ? "photo" : "photos"}</span>
                </div>
                <div class="cms-media-card-body">
                  <h3>${safeTitle}</h3>
                  <p>${escapeHtml(ev.description || "No description provided.")}</p>
                  <div class="cms-media-card-actions">
                    <button type="button" class="cms-btn cms-btn-primary cms-btn-sm"
                      data-event-action="photos" data-id="${escapeHtml(ev.id)}">
                      Manage Photos (${photoCount})
                    </button>
                    <button type="button" class="table-action-btn"
                      data-event-action="edit" data-id="${escapeHtml(ev.id)}"
                      aria-label="Edit ${safeTitle}" title="Edit Event">${svgIcon("edit")}</button>
                    <a href="${publicUrl}" target="_blank" rel="noopener"
                      class="table-action-btn"
                      aria-label="View public event album for ${safeTitle}" title="View Public Event Album">${svgIcon("view")}</a>
                    ${idx > 0 ? `<button type="button" class="table-action-btn" data-event-action="up" data-id="${escapeHtml(ev.id)}" aria-label="Move ${safeTitle} earlier" title="Move Earlier">↑</button>` : ""}
                    ${idx < events.length - 1 ? `<button type="button" class="table-action-btn" data-event-action="down" data-id="${escapeHtml(ev.id)}" aria-label="Move ${safeTitle} later" title="Move Later">↓</button>` : ""}
                    <button type="button" class="table-action-btn btn-delete"
                      data-event-action="delete" data-id="${escapeHtml(ev.id)}"
                      aria-label="Delete ${safeTitle}" title="Delete Event">${svgIcon("trash")}</button>
                  </div>
                </div>
              </article>`;
          })
          .join("");
      }
    }

    if (select) {
      select.innerHTML = events.length
        ? events
            .map(
              ev =>
                `<option value="${escapeHtml(ev.id)}">${escapeHtml(ev.title)} (${(ev.photoItems || []).length} photos)</option>`
            )
            .join("")
        : `<option value="">No events available</option>`;

      if (selectedEventId && events.some(e => e.id === selectedEventId)) {
        select.value = selectedEventId;
      }
    }

    renderSelectedEventPhotos();
  }

  function renderSelectedEventPhotos() {
    const photosGrid = $("cms-event-photos-grid");
    const countEl = $("cms-album-photo-count");
    const titleEl = $("cms-album-active-title");
    const viewLinkEl = $("cms-album-view-live");
    if (!photosGrid) return;

    const ev = selectedEventId
      ? MediaStore.getEventByIdOrIndex(selectedEventId)
      : null;

    if (!ev) {
      if (titleEl) titleEl.textContent = "Select or create a Past Event";
      if (countEl) countEl.textContent = "0 photos";
      if (viewLinkEl) viewLinkEl.style.display = "none";
      photosGrid.innerHTML = `
        <div class="cms-empty-box">
          <strong>No event selected</strong>
          <p style="margin-top:6px">Create a past event above to start uploading photographs.</p>
        </div>`;
      return;
    }

    const photos = ev.photoItems || [];
    if (titleEl) titleEl.textContent = ev.title;
    if (countEl) {
      countEl.textContent = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
    }
    if (viewLinkEl) {
      viewLinkEl.style.display = "inline-flex";
      viewLinkEl.href = `event-photos.html?id=${encodeURIComponent(ev.id)}`;
    }

    if (!photos.length) {
      photosGrid.innerHTML = `
        <div class="cms-empty-box">
          <strong>This event album has no photos yet</strong>
          <p style="margin-top:6px">Use "Upload Photos" or paste an image URL above to add pictures to ${escapeHtml(ev.title)}.</p>
        </div>`;
      return;
    }

    const onerrorAttr = getMediaOnerrorAttr();
    photosGrid.innerHTML = photos
      .map((photo, idx) => {
        const isCover = ev.cover === photo.image;
        const fullSrc = photo.image || "images/school-1.webp";
        const thumbSrc = toThumbUrl(fullSrc);
        const photoNum = idx + 1;
        return `
          <div class="cms-photo-tile">
            <div class="cms-photo-tile-media">
              <img src="${escapeHtml(thumbSrc)}"
                data-full-src="${escapeHtml(fullSrc)}"
                alt="${escapeHtml(photo.caption || `${ev.title} photo ${photoNum}`)}"
                width="1200" height="800"
                loading="lazy" decoding="async" fetchpriority="low"
                onerror="${onerrorAttr}">
              ${isCover ? `<span class="cms-media-pill cover-pill">Event Cover</span>` : `<span class="cms-media-pill">#${photoNum}</span>`}
            </div>
            <div class="cms-photo-tile-body">
              <div style="display:flex;gap:6px">
                <input type="text" class="cms-photo-caption-input"
                  value="${escapeHtml(photo.caption || "")}"
                  placeholder="Optional photo caption..."
                  aria-label="Photo caption for ${escapeHtml(ev.title)} photo ${photoNum}"
                  data-photo-caption-input="${escapeHtml(photo.id)}">
                <button type="button" class="table-action-btn"
                  data-photo-action="save-caption" data-photo-id="${escapeHtml(photo.id)}"
                  aria-label="Save caption for photo ${photoNum}"
                  title="Save caption">${svgIcon("check")}</button>
              </div>
              <div class="cms-photo-tile-actions">
                <div style="display:flex;gap:4px">
                  <button type="button" class="table-action-btn"
                    data-photo-action="set-cover" data-photo-id="${escapeHtml(photo.id)}"
                    data-photo-url="${escapeHtml(photo.image)}"
                    aria-label="${isCover ? `Photo ${photoNum} is current event cover` : `Set photo ${photoNum} as event cover`}"
                    title="${isCover ? "Current Event Cover" : "Set as Event Cover"}"
                    ${isCover ? "disabled" : ""}>${svgIcon(isCover ? "starFilled" : "starOutline")}</button>
                  ${idx > 0 ? `<button type="button" class="table-action-btn" data-photo-action="prev" data-photo-id="${escapeHtml(photo.id)}" aria-label="Move photo ${photoNum} left" title="Move Left">←</button>` : ""}
                  ${idx < photos.length - 1 ? `<button type="button" class="table-action-btn" data-photo-action="next" data-photo-id="${escapeHtml(photo.id)}" aria-label="Move photo ${photoNum} right" title="Move Right">→</button>` : ""}
                </div>
                <button type="button" class="table-action-btn btn-delete"
                  data-photo-action="delete" data-photo-id="${escapeHtml(photo.id)}"
                  aria-label="Remove photo ${photoNum} from event"
                  title="Remove photo from event">${svgIcon("trash")}</button>
              </div>
            </div>
          </div>`;
      })
      .join("");
  }

  async function handleEventFilesUpload(fileList) {
    const files = Array.from(fileList || []).filter(f =>
      String(f.type || "").startsWith("image/")
    );
    if (!files.length) {
      showToast("Please select one or more valid image files.", "error");
      return;
    }

    if (!selectedEventId) {
      showToast("Please select or create an event first.", "error");
      return;
    }

    if (!MediaStore.getSchemaStatus().ready) {
      showToast("Run supabase-media-setup.sql in Supabase first.", "error");
      return;
    }

    const progress = $("cms-event-upload-progress");
    const captionInput = $("cms-event-photo-caption");
    const sharedCaption = captionInput ? captionInput.value.trim() : "";

    try {
      const uploadedItems = [];

      for (let i = 0; i < files.length; i++) {
        if (progress) {
          progress.classList.add("active");
          progress.textContent = `Optimizing & uploading photo ${i + 1} of ${files.length}...`;
        }
        const res = await MediaStore.uploadImageWithInfo(
          files[i],
          `events/${selectedEventId}`
        );
        uploadedItems.push({ image: res.url, caption: sharedCaption });
      }

      if (progress) {
        progress.textContent = "Saving photos to Supabase album...";
      }

      await MediaStore.addEventPhotos(selectedEventId, uploadedItems);
      if (captionInput) captionInput.value = "";
      renderAllMediaPanels();
      showToast(`Uploaded and saved ${uploadedItems.length} photo(s) to event album!`);
    } catch (error) {
      console.error("Event photo upload failed:", error);
      showToast(error.message || "Could not upload event photos.", "error");
    } finally {
      if (progress) {
        progress.classList.remove("active");
        progress.textContent = "";
      }
    }
  }

  // Event Modal
  function openEventModal(eventId = null) {
    const modal = $("cms-event-modal");
    const form = $("cms-event-form");
    if (!modal || !form) return;

    form.reset();
    renderQuickPickChips(
      "event-cover-quick-picks",
      "event-field-cover",
      "event-cover-preview"
    );

    const idField = $("event-field-id");
    const titleField = $("event-field-title");
    const categoryField = $("event-field-category");
    const descField = $("event-field-description");
    const coverField = $("event-field-cover");
    const coverPreview = $("event-cover-preview");
    const modalTitle = $("event-modal-title-text");
    const defaultCover =
      (coverPreview && coverPreview.dataset && coverPreview.dataset.defaultSrc) ||
      "images/school-1.webp";

    if (eventId) {
      const ev = MediaStore.getEventByIdOrIndex(eventId);
      if (!ev) {
        showToast("Event not found.", "error");
        return;
      }
      if (modalTitle) modalTitle.textContent = "Edit Past Event";
      if (idField) idField.value = ev.id;
      if (titleField) titleField.value = ev.title || "";
      if (categoryField) categoryField.value = ev.category || "";
      if (descField) descField.value = ev.description || "";
      if (coverField) coverField.value = ev.cover || defaultCover;
      if (coverPreview) {
        coverPreview.removeAttribute("loading");
        coverPreview.removeAttribute("fetchpriority");
        coverPreview.src = ev.cover || defaultCover;
      }
    } else {
      if (modalTitle) modalTitle.textContent = "Add New Past Event";
      if (idField) idField.value = "";
      if (categoryField) categoryField.value = "School Celebration";
      if (coverField) coverField.value = defaultCover;
      if (coverPreview) {
        coverPreview.removeAttribute("loading");
        coverPreview.removeAttribute("fetchpriority");
        coverPreview.src = defaultCover;
      }
    }

    modal.classList.add("open");
    if (titleField) titleField.focus();
  }

  function closeEventModal() {
    const modal = $("cms-event-modal");
    if (modal) modal.classList.remove("open");
  }

  // ---------------- Explore Facilities ----------------

  function renderFacilitiesPanel() {
    const grid = $("cms-facilities-grid");
    if (!grid) return;

    const facilities = MediaStore.getFacilities();
    if (!facilities.length) {
      grid.innerHTML = `
        <div class="cms-empty-box">
          <strong>No facilities added yet</strong>
          <p style="margin-top:6px">Click "+ Add New Facility" to add a school facility photo and description.</p>
        </div>`;
      return;
    }

    const onerrorAttr = getMediaOnerrorAttr();
    grid.innerHTML = facilities
      .map(
        (fac, idx) => {
          const fullImg = fac.image || "images/school-1.webp";
          const thumbImg = toThumbUrl(fullImg);
          const safeName = escapeHtml(fac.name || "facility");
          return `
          <article class="cms-media-card">
            <div class="cms-media-thumb-wrap">
              <img src="${escapeHtml(thumbImg)}"
                data-full-src="${escapeHtml(fullImg)}"
                alt="${safeName}"
                width="1200" height="800"
                loading="lazy" decoding="async" fetchpriority="low"
                onerror="${onerrorAttr}">
              <span class="cms-media-pill">#${idx + 1}</span>
              ${fac.showOnHome ? `<span class="cms-media-pill right">Homepage</span>` : ""}
            </div>
            <div class="cms-media-card-body">
              <h3>${safeName}</h3>
              <p>${escapeHtml(fac.description || "No description provided.")}</p>
              <div class="cms-media-card-actions">
                <button type="button" class="cms-btn cms-btn-secondary cms-btn-sm"
                  data-facility-action="edit" data-id="${escapeHtml(fac.id)}">
                  Edit / Photo
                </button>
                <button type="button" class="table-action-btn"
                  data-facility-action="toggle-home" data-id="${escapeHtml(fac.id)}"
                  aria-label="${fac.showOnHome ? `Remove ${safeName} from homepage preview` : `Feature ${safeName} on homepage`}"
                  title="${fac.showOnHome ? "Remove from Homepage preview" : "Feature on Homepage"}">
                  ${svgIcon(fac.showOnHome ? "homeActive" : "homeOutline")}
                </button>
                ${idx > 0 ? `<button type="button" class="table-action-btn" data-facility-action="up" data-id="${escapeHtml(fac.id)}" aria-label="Move ${safeName} earlier" title="Move Earlier">↑</button>` : ""}
                ${idx < facilities.length - 1 ? `<button type="button" class="table-action-btn" data-facility-action="down" data-id="${escapeHtml(fac.id)}" aria-label="Move ${safeName} later" title="Move Later">↓</button>` : ""}
                <button type="button" class="table-action-btn btn-delete"
                  data-facility-action="delete" data-id="${escapeHtml(fac.id)}"
                  aria-label="Delete ${safeName}" title="Delete Facility">${svgIcon("trash")}</button>
              </div>
            </div>
          </article>`;
        }
      )
      .join("");
  }

  function openFacilityModal(facilityId = null) {
    const modal = $("cms-facility-modal");
    const form = $("cms-facility-form");
    if (!modal || !form) return;

    form.reset();
    renderQuickPickChips(
      "facility-image-quick-picks",
      "facility-field-image",
      "facility-image-preview"
    );

    const idField = $("facility-field-id");
    const nameField = $("facility-field-name");
    const descField = $("facility-field-description");
    const imgField = $("facility-field-image");
    const imgPreview = $("facility-image-preview");
    const homeCheck = $("facility-field-show-home");
    const modalTitle = $("facility-modal-title-text");
    const defaultImg =
      (imgPreview && imgPreview.dataset && imgPreview.dataset.defaultSrc) ||
      "images/school-2.webp";

    if (facilityId) {
      const fac = MediaStore.getFacilities().find(f => f.id === facilityId);
      if (!fac) {
        showToast("Facility not found.", "error");
        return;
      }
      if (modalTitle) modalTitle.textContent = "Edit School Facility";
      if (idField) idField.value = fac.id;
      if (nameField) nameField.value = fac.name || "";
      if (descField) descField.value = fac.description || "";
      if (imgField) imgField.value = fac.image || defaultImg;
      if (imgPreview) {
        imgPreview.removeAttribute("loading");
        imgPreview.removeAttribute("fetchpriority");
        imgPreview.src = fac.image || defaultImg;
      }
      if (homeCheck) homeCheck.checked = Boolean(fac.showOnHome);
    } else {
      if (modalTitle) modalTitle.textContent = "Add New School Facility";
      if (idField) idField.value = "";
      if (imgField) imgField.value = defaultImg;
      if (imgPreview) {
        imgPreview.removeAttribute("loading");
        imgPreview.removeAttribute("fetchpriority");
        imgPreview.src = defaultImg;
      }
      if (homeCheck) homeCheck.checked = true;
    }

    modal.classList.add("open");
    if (nameField) nameField.focus();
  }

  function closeFacilityModal() {
    const modal = $("cms-facility-modal");
    if (modal) modal.classList.remove("open");
  }

  // ---------------- Campus Gallery & Site Highlights ----------------

  function renderGalleryPanel() {
    const catSelect = $("cms-gallery-category-filter");
    const grid = $("cms-campus-gallery-grid");
    const categories = MediaStore.getGalleryCategories();

    if (catSelect) {
      const prev = galleryCategoryFilter;
      catSelect.innerHTML =
        `<option value="all">All Categories</option>` +
        categories
          .map(
            cat =>
              `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`
          )
          .join("");
      if (
        prev !== "all" &&
        categories.some(c => c.toLowerCase() === prev.toLowerCase())
      ) {
        catSelect.value = prev;
      } else {
        galleryCategoryFilter = "all";
        catSelect.value = "all";
      }
    }

    if (grid) {
      const photos = MediaStore.getGalleryPhotos({
        category: galleryCategoryFilter
      });

      if (!photos.length) {
        grid.innerHTML = `
          <div class="cms-empty-box">
            <strong>No gallery photographs found</strong>
            <p style="margin-top:6px">Upload photos above to showcase campus life, student honours, and school scenes on the Gallery page.</p>
          </div>`;
      } else {
        const onerrorAttr = getMediaOnerrorAttr();
        grid.innerHTML = photos
          .map(
            (item, idx) => {
              const fullImg = item.image || "images/school-1.webp";
              const thumbImg = toThumbUrl(fullImg);
              const photoLabel = escapeHtml(
                item.title || item.category || `gallery photo ${idx + 1}`
              );
              return `
              <div class="cms-photo-tile">
                <div class="cms-photo-tile-media">
                  <img src="${escapeHtml(thumbImg)}"
                    data-full-src="${escapeHtml(fullImg)}"
                    alt="${photoLabel}"
                    width="1200" height="800"
                    loading="lazy" decoding="async" fetchpriority="low"
                    onerror="${onerrorAttr}">
                  <span class="cms-media-pill">${escapeHtml(item.category || "Campus Life")}</span>
                </div>
                <div class="cms-photo-tile-body">
                  <strong style="font-size:13px;color:var(--cms-navy)">
                    ${escapeHtml(item.title || "Untitled Photo")}
                  </strong>
                  <span style="font-size:11.5px;color:var(--cms-muted);min-height:16px">
                    ${escapeHtml(item.caption || "")}
                  </span>
                  <div class="cms-photo-tile-actions" style="margin-top:4px">
                    <div style="display:flex;gap:4px">
                      <button type="button" class="table-action-btn"
                        data-gallery-action="edit" data-id="${escapeHtml(item.id)}"
                        aria-label="Edit details for ${photoLabel}" title="Edit Photo Details">${svgIcon("edit")}</button>
                      ${galleryCategoryFilter === "all" && idx > 0 ? `<button type="button" class="table-action-btn" data-gallery-action="up" data-id="${escapeHtml(item.id)}" aria-label="Move ${photoLabel} left" title="Move Left">←</button>` : ""}
                      ${galleryCategoryFilter === "all" && idx < photos.length - 1 ? `<button type="button" class="table-action-btn" data-gallery-action="down" data-id="${escapeHtml(item.id)}" aria-label="Move ${photoLabel} right" title="Move Right">→</button>` : ""}
                    </div>
                    <button type="button" class="table-action-btn btn-delete"
                      data-gallery-action="delete" data-id="${escapeHtml(item.id)}"
                      aria-label="Remove ${photoLabel}" title="Remove Photo">${svgIcon("trash")}</button>
                  </div>
                </div>
              </div>`;
            }
          )
          .join("");
      }
    }

    renderSiteBannersGrid();
  }

  function renderSiteBannersGrid() {
    const grid = $("cms-site-banners-grid");
    if (!grid) return;

    const settings = MediaStore.getAllSitePhotoSettings();
    const onerrorAttr = getMediaOnerrorAttr();
    grid.innerHTML = settings
      .map(
        item => {
          const fullVal = item.value || item.defaultValue;
          const thumbVal = toThumbUrl(fullVal);
          const safeLabel = escapeHtml(item.label || item.key);
          return `
          <article class="cms-media-card" data-setting-key="${escapeHtml(item.key)}">
            <div class="cms-media-thumb-wrap">
              <img src="${escapeHtml(thumbVal)}"
                data-full-src="${escapeHtml(fullVal)}"
                data-default-src="${escapeHtml(item.defaultValue)}"
                alt="${safeLabel}"
                width="1200" height="800"
                loading="lazy" decoding="async" fetchpriority="low"
                onerror="${onerrorAttr}">
              <span class="cms-media-pill">${safeLabel}</span>
            </div>
            <div class="cms-media-card-body">
              <h3>${safeLabel}</h3>
              <p>${escapeHtml(item.caption || "")}</p>
              <div style="display:flex;flex-direction:column;gap:8px;margin-top:6px">
                <input type="text" class="cms-input" style="height:36px;font-size:12px"
                  data-setting-url-input="${escapeHtml(item.key)}"
                  value="${escapeHtml(item.value || "")}"
                  aria-label="Image URL for ${safeLabel}"
                  placeholder="Image URL or path">
                ${item.key === "principal_portrait" ? `
                  <input type="text" class="cms-input" style="height:36px;font-size:12px"
                    data-setting-caption-input="${escapeHtml(item.key)}"
                    value="${escapeHtml(item.caption || "")}"
                    aria-label="Principal portrait caption"
                    placeholder="Principal portrait caption">` : ""}
                <div class="cms-media-card-actions">
                  <label class="cms-btn cms-btn-primary cms-btn-sm" style="cursor:pointer">
                    Upload Photo
                    <input type="file" accept="image/*" style="display:none"
                      aria-label="Upload photo for ${safeLabel}"
                      data-setting-file-input="${escapeHtml(item.key)}">
                  </label>
                  <button type="button" class="cms-btn cms-btn-secondary cms-btn-sm"
                    data-setting-action="save" data-key="${escapeHtml(item.key)}">
                    Save URL
                  </button>
                  <button type="button" class="table-action-btn"
                    data-setting-action="reset" data-key="${escapeHtml(item.key)}"
                    aria-label="Reset ${safeLabel} to original photo"
                    title="Reset to Original Photo">↺</button>
                </div>
              </div>
            </div>
          </article>`;
        }
      )
      .join("");
  }

  async function handleGalleryFilesUpload(fileList) {
    const files = Array.from(fileList || []).filter(f =>
      String(f.type || "").startsWith("image/")
    );
    if (!files.length) {
      showToast("Please select one or more valid image files.", "error");
      return;
    }

    if (!MediaStore.getSchemaStatus().ready) {
      showToast("Run supabase-media-setup.sql in Supabase first.", "error");
      return;
    }

    const catSelect = $("cms-gallery-upload-category");
    const catCustom = $("cms-gallery-upload-category-custom");
    let category = catSelect ? catSelect.value : "Campus Life";
    if (category === "__new__") {
      category = (catCustom && catCustom.value.trim()) || "Campus Life";
    }

    const titleInput = $("cms-gallery-upload-title");
    const captionInput = $("cms-gallery-upload-caption");
    const title = titleInput ? titleInput.value.trim() : "";
    const caption = captionInput ? captionInput.value.trim() : "";
    const progress = $("cms-gallery-upload-progress");

    try {
      const items = [];

      for (let i = 0; i < files.length; i++) {
        if (progress) {
          progress.classList.add("active");
          progress.textContent = `Optimizing & uploading gallery photo ${i + 1} of ${files.length}...`;
        }
        const res = await MediaStore.uploadImageWithInfo(files[i], "gallery");

        const fileLabel = files[i].name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim();

        items.push({
          image: res.url,
          category,
          title:
            title ||
            (files.length === 1 ? fileLabel : `${category} Highlight`),
          caption
        });
      }

      if (progress) {
        progress.textContent = "Saving gallery photos to Supabase...";
      }

      await MediaStore.addGalleryPhotos(items);
      if (titleInput) titleInput.value = "";
      if (captionInput) captionInput.value = "";
      renderAllMediaPanels();
      showToast(`Uploaded ${items.length} photo(s) to Campus Gallery!`);
    } catch (error) {
      console.error("Gallery upload failed:", error);
      showToast(error.message || "Could not upload gallery photos.", "error");
    } finally {
      if (progress) {
        progress.classList.remove("active");
        progress.textContent = "";
      }
    }
  }

  function openGalleryEditModal(photoId) {
    const modal = $("cms-gallery-modal");
    const form = $("cms-gallery-form");
    if (!modal || !form) return;

    const item = MediaStore.getGalleryPhotos().find(g => g.id === photoId);
    if (!item) {
      showToast("Gallery photo not found.", "error");
      return;
    }

    form.reset();
    const imgPreview = $("gallery-image-preview");
    const defaultImg =
      (imgPreview && imgPreview.dataset && imgPreview.dataset.defaultSrc) ||
      "images/school-1.webp";
    $("gallery-field-id").value = item.id;
    $("gallery-field-title").value = item.title || "";
    $("gallery-field-category").value = item.category || "Campus Life";
    $("gallery-field-caption").value = item.caption || "";
    $("gallery-field-image").value = item.image || "";
    if (imgPreview) {
      imgPreview.removeAttribute("loading");
      imgPreview.removeAttribute("fetchpriority");
      imgPreview.src = item.image || defaultImg;
    }

    modal.classList.add("open");
    $("gallery-field-title").focus();
  }

  function closeGalleryEditModal() {
    const modal = $("cms-gallery-modal");
    if (modal) modal.classList.remove("open");
  }

  function renderAllMediaPanels() {
    updateSetupBannerVisibility();
    updateTabBadges();
    renderEventsPanel();
    renderFacilitiesPanel();
    renderGalleryPanel();
  }

  // ---------------- Bind All DOM Listeners ----------------

  function bindMediaUIEvents() {
    // 1. Tab buttons
    document.querySelectorAll(".cms-nav-tab[data-tab]").forEach(btn => {
      btn.addEventListener("click", () => switchTab(btn.dataset.tab));
    });

    const hashTab = window.location.hash.replace(/^#/, "");
    switchTab(
      ["blog", "events", "facilities", "gallery", "enquiries"].includes(hashTab)
        ? hashTab
        : "blog",
      false
    );

    // 2. Setup Banner Buttons
    const copySqlBtn = $("btn-copy-media-sql");
    if (copySqlBtn) {
      copySqlBtn.addEventListener("click", async () => {
        if (
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          try {
            await navigator.clipboard.writeText(SQL_SETUP_SCRIPT);
            showToast("Supabase SQL setup script copied to clipboard!");
            return;
          } catch (err) {
            // Fall through to non-deprecated manual copy prompt
          }
        }
        showToast(
          "Clipboard unavailable here. Please click Download supabase-media-setup.sql to copy the script manually.",
          "error"
        );
      });
    }

    const downloadSqlBtn = $("btn-download-media-sql");
    if (downloadSqlBtn) {
      downloadSqlBtn.addEventListener("click", () => {
        downloadFile(SQL_SETUP_SCRIPT, "supabase-media-setup.sql", "text/sql");
        showToast("Downloaded supabase-media-setup.sql");
      });
    }

    const recheckSqlBtn = $("btn-recheck-media-db");
    if (recheckSqlBtn) {
      recheckSqlBtn.addEventListener("click", async () => {
        recheckSqlBtn.disabled = true;
        recheckSqlBtn.textContent = "Checking Supabase...";
        try {
          await MediaStore.refresh();
          const status = MediaStore.getSchemaStatus();
          renderAllMediaPanels();
          if (status.ready) {
            showToast("Connected! All default school photos synced to Supabase.");
          } else {
            showToast(
              "Media tables not found yet. Run the SQL script in Supabase SQL Editor first.",
              "error"
            );
          }
        } catch (error) {
          showToast(error.message || "Could not verify media tables.", "error");
        } finally {
          recheckSqlBtn.disabled = false;
          recheckSqlBtn.textContent = "Check Connection & Sync Default Photos";
        }
      });
    }

    // 3. Events Grid Actions
    const eventsGrid = $("cms-events-grid");
    if (eventsGrid) {
      eventsGrid.addEventListener("click", async e => {
        const btn = e.target.closest("button[data-event-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.eventAction;

        try {
          if (action === "photos") {
            selectedEventId = id;
            renderEventsPanel();
            const albumPanel = $("cms-event-album-panel");
            if (albumPanel) {
              albumPanel.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          } else if (action === "edit") {
            openEventModal(id);
          } else if (action === "up") {
            await MediaStore.reorderEvent(id, -1);
            renderAllMediaPanels();
          } else if (action === "down") {
            await MediaStore.reorderEvent(id, 1);
            renderAllMediaPanels();
          } else if (action === "delete") {
            const ev = MediaStore.getEventByIdOrIndex(id);
            if (
              confirm(
                `Delete past event "${ev ? ev.title : id}" and all its photos from Supabase?`
              )
            ) {
              await MediaStore.deleteEvent(id);
              if (selectedEventId === id) selectedEventId = null;
              renderAllMediaPanels();
              showToast("Past event deleted.");
            }
          }
        } catch (error) {
          console.error("Event action failed:", error);
          showToast(error.message || "Could not complete event action.", "error");
        }
      });
    }

    const newEventBtn = $("cms-new-event-btn");
    if (newEventBtn) newEventBtn.addEventListener("click", () => openEventModal());

    const albumSelect = $("cms-album-event-select");
    if (albumSelect) {
      albumSelect.addEventListener("change", e => {
        selectedEventId = e.target.value;
        renderEventsPanel();
      });
    }

    // Event Photos Multi-upload & Drag-and-Drop
    const eventPhotosFileInput = $("cms-event-photos-file");
    if (eventPhotosFileInput) {
      eventPhotosFileInput.addEventListener("change", async e => {
        await handleEventFilesUpload(e.target.files);
        e.target.value = "";
      });
    }

    const eventUploadZone = $("cms-event-upload-zone");
    if (eventUploadZone) {
      eventUploadZone.addEventListener("dragover", e => {
        e.preventDefault();
        eventUploadZone.classList.add("drag-over");
      });
      eventUploadZone.addEventListener("dragleave", () => {
        eventUploadZone.classList.remove("drag-over");
      });
      eventUploadZone.addEventListener("drop", async e => {
        e.preventDefault();
        eventUploadZone.classList.remove("drag-over");
        if (e.dataTransfer && e.dataTransfer.files) {
          await handleEventFilesUpload(e.dataTransfer.files);
        }
      });
    }

    const addEventPhotoUrlBtn = $("cms-event-photo-url-btn");
    if (addEventPhotoUrlBtn) {
      addEventPhotoUrlBtn.addEventListener("click", async () => {
        const urlInput = $("cms-event-photo-url");
        const captionInput = $("cms-event-photo-caption");
        const url = urlInput ? urlInput.value.trim() : "";
        if (!url) {
          showToast("Enter an image URL or path first.", "error");
          return;
        }
        if (!selectedEventId) {
          showToast("Select an event first.", "error");
          return;
        }
        try {
          addEventPhotoUrlBtn.disabled = true;
          await MediaStore.addEventPhotos(selectedEventId, [
            { image: url, caption: captionInput ? captionInput.value.trim() : "" }
          ]);
          if (urlInput) urlInput.value = "";
          if (captionInput) captionInput.value = "";
          renderAllMediaPanels();
          showToast("Photo added to event album.");
        } catch (error) {
          showToast(error.message || "Could not add photo URL.", "error");
        } finally {
          addEventPhotoUrlBtn.disabled = false;
        }
      });
    }

    // Event Photo Grid Actions
    const eventPhotosGrid = $("cms-event-photos-grid");
    if (eventPhotosGrid) {
      eventPhotosGrid.addEventListener("click", async e => {
        const btn = e.target.closest("button[data-photo-action]");
        if (!btn) return;
        const action = btn.dataset.photoAction;
        const photoId = btn.dataset.photoId;

        try {
          if (action === "delete") {
            if (confirm("Remove this photo from the event album?")) {
              await MediaStore.deleteEventPhoto(photoId);
              renderAllMediaPanels();
              showToast("Photo removed from event.");
            }
          } else if (action === "set-cover") {
            await MediaStore.setEventCover(
              selectedEventId,
              btn.dataset.photoUrl
            );
            renderAllMediaPanels();
            showToast("Updated event cover photo.");
          } else if (action === "prev") {
            await MediaStore.reorderEventPhoto(selectedEventId, photoId, -1);
            renderAllMediaPanels();
          } else if (action === "next") {
            await MediaStore.reorderEventPhoto(selectedEventId, photoId, 1);
            renderAllMediaPanels();
          } else if (action === "save-caption") {
            const input = eventPhotosGrid.querySelector(
              `[data-photo-caption-input="${CSS.escape(photoId)}"]`
            );
            await MediaStore.updateEventPhoto(photoId, {
              caption: input ? input.value : ""
            });
            showToast("Photo caption updated.");
          }
        } catch (error) {
          console.error("Photo action failed:", error);
          showToast(error.message || "Could not update photo.", "error");
        }
      });
    }

    // Event Modal Submit & Upload
    const eventCloseBtn = $("cms-event-modal-close");
    const eventCancelBtn = $("cms-event-modal-cancel");
    if (eventCloseBtn) eventCloseBtn.addEventListener("click", closeEventModal);
    if (eventCancelBtn) eventCancelBtn.addEventListener("click", closeEventModal);

    const eventCoverInput = $("event-field-cover");
    const eventCoverPreview = $("event-cover-preview");
    if (eventCoverInput && eventCoverPreview) {
      eventCoverInput.addEventListener("input", e => {
        eventCoverPreview.src =
          e.target.value ||
          (eventCoverPreview.dataset && eventCoverPreview.dataset.defaultSrc) ||
          "images/school-1.webp";
      });
    }

    const eventCoverFile = $("event-field-cover-file");
    if (eventCoverFile) {
      eventCoverFile.addEventListener("change", async e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          showToast("Optimizing & uploading cover photo...");
          const res = await MediaStore.uploadImageWithInfo(file, "events/covers");
          if (eventCoverInput) eventCoverInput.value = res.url;
          if (eventCoverPreview) eventCoverPreview.src = res.url;
          showToast("Cover photo ready. Click Save Event to apply.");
        } catch (error) {
          showToast(error.message || "Could not upload cover photo.", "error");
        } finally {
          e.target.value = "";
        }
      });
    }

    const eventForm = $("cms-event-form");
    if (eventForm) {
      eventForm.addEventListener("submit", async e => {
        e.preventDefault();
        const saveBtn = document.querySelector(
          'button[form="cms-event-form"][type="submit"]'
        );
        if (saveBtn) saveBtn.disabled = true;

        try {
          const saved = await MediaStore.saveEvent({
            id: $("event-field-id").value || null,
            title: $("event-field-title").value.trim(),
            category: $("event-field-category").value.trim() || "School Event",
            description: $("event-field-description").value.trim(),
            cover: $("event-field-cover").value.trim() || "images/school-1.webp"
          });
          selectedEventId = saved.id;
          closeEventModal();
          renderAllMediaPanels();
          showToast(`Saved event "${saved.title}".`);
        } catch (error) {
          showToast(error.message || "Could not save event.", "error");
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    // 4. Facilities Grid & Modal
    const newFacilityBtn = $("cms-new-facility-btn");
    if (newFacilityBtn) {
      newFacilityBtn.addEventListener("click", () => openFacilityModal());
    }

    const facilitiesGrid = $("cms-facilities-grid");
    if (facilitiesGrid) {
      facilitiesGrid.addEventListener("click", async e => {
        const btn = e.target.closest("button[data-facility-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.facilityAction;

        try {
          if (action === "edit") {
            openFacilityModal(id);
          } else if (action === "toggle-home") {
            const fac = MediaStore.getFacilities().find(f => f.id === id);
            if (fac) {
              await MediaStore.saveFacility({
                ...fac,
                showOnHome: !fac.showOnHome
              });
              renderAllMediaPanels();
              showToast(
                !fac.showOnHome
                  ? `${fac.name} featured on Homepage.`
                  : `${fac.name} hidden from Homepage preview.`
              );
            }
          } else if (action === "up") {
            await MediaStore.reorderFacility(id, -1);
            renderAllMediaPanels();
          } else if (action === "down") {
            await MediaStore.reorderFacility(id, 1);
            renderAllMediaPanels();
          } else if (action === "delete") {
            const fac = MediaStore.getFacilities().find(f => f.id === id);
            if (
              confirm(
                `Remove facility "${fac ? fac.name : id}" from the website?`
              )
            ) {
              await MediaStore.deleteFacility(id);
              renderAllMediaPanels();
              showToast("Facility removed.");
            }
          }
        } catch (error) {
          console.error("Facility action failed:", error);
          showToast(error.message || "Could not update facility.", "error");
        }
      });
    }

    const facCloseBtn = $("cms-facility-modal-close");
    const facCancelBtn = $("cms-facility-modal-cancel");
    if (facCloseBtn) facCloseBtn.addEventListener("click", closeFacilityModal);
    if (facCancelBtn) facCancelBtn.addEventListener("click", closeFacilityModal);

    const facImgInput = $("facility-field-image");
    const facImgPreview = $("facility-image-preview");
    if (facImgInput && facImgPreview) {
      facImgInput.addEventListener("input", e => {
        facImgPreview.src =
          e.target.value ||
          (facImgPreview.dataset && facImgPreview.dataset.defaultSrc) ||
          "images/school-2.webp";
      });
    }

    const facImgFile = $("facility-field-image-file");
    if (facImgFile) {
      facImgFile.addEventListener("change", async e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          showToast("Optimizing & uploading facility photo...");
          const res = await MediaStore.uploadImageWithInfo(file, "facilities");
          if (facImgInput) facImgInput.value = res.url;
          if (facImgPreview) facImgPreview.src = res.url;
          showToast("Facility photo ready. Click Save Facility to apply.");
        } catch (error) {
          showToast(error.message || "Could not upload facility photo.", "error");
        } finally {
          e.target.value = "";
        }
      });
    }

    const facilityForm = $("cms-facility-form");
    if (facilityForm) {
      facilityForm.addEventListener("submit", async e => {
        e.preventDefault();
        const saveBtn = document.querySelector(
          'button[form="cms-facility-form"][type="submit"]'
        );
        if (saveBtn) saveBtn.disabled = true;

        try {
          const saved = await MediaStore.saveFacility({
            id: $("facility-field-id").value || null,
            name: $("facility-field-name").value.trim(),
            description: $("facility-field-description").value.trim(),
            image:
              $("facility-field-image").value.trim() || "images/school-1.webp",
            showOnHome: $("facility-field-show-home").checked
          });
          closeFacilityModal();
          renderAllMediaPanels();
          showToast(`Saved facility "${saved.name}".`);
        } catch (error) {
          showToast(error.message || "Could not save facility.", "error");
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    // 5. Campus Gallery & Site Banners
    const galCatFilter = $("cms-gallery-category-filter");
    if (galCatFilter) {
      galCatFilter.addEventListener("change", e => {
        galleryCategoryFilter = e.target.value || "all";
        renderGalleryPanel();
      });
    }

    const galUploadCategory = $("cms-gallery-upload-category");
    const galUploadCategoryCustom = $("cms-gallery-upload-category-custom");
    if (galUploadCategory && galUploadCategoryCustom) {
      galUploadCategory.addEventListener("change", e => {
        const custom = e.target.value === "__new__";
        galUploadCategoryCustom.style.display = custom ? "block" : "none";
        if (custom) galUploadCategoryCustom.focus();
      });
    }

    const galFilesInput = $("cms-gallery-photos-file");
    if (galFilesInput) {
      galFilesInput.addEventListener("change", async e => {
        await handleGalleryFilesUpload(e.target.files);
        e.target.value = "";
      });
    }

    const galUploadZone = $("cms-gallery-upload-zone");
    if (galUploadZone) {
      galUploadZone.addEventListener("dragover", e => {
        e.preventDefault();
        galUploadZone.classList.add("drag-over");
      });
      galUploadZone.addEventListener("dragleave", () => {
        galUploadZone.classList.remove("drag-over");
      });
      galUploadZone.addEventListener("drop", async e => {
        e.preventDefault();
        galUploadZone.classList.remove("drag-over");
        if (e.dataTransfer && e.dataTransfer.files) {
          await handleGalleryFilesUpload(e.dataTransfer.files);
        }
      });
    }

    const galUrlBtn = $("cms-gallery-photo-url-btn");
    if (galUrlBtn) {
      galUrlBtn.addEventListener("click", async () => {
        const urlInput = $("cms-gallery-photo-url");
        const titleInput = $("cms-gallery-upload-title");
        const captionInput = $("cms-gallery-upload-caption");
        const url = urlInput ? urlInput.value.trim() : "";

        if (!url) {
          showToast("Enter an image URL or path first.", "error");
          return;
        }

        let category = galUploadCategory ? galUploadCategory.value : "Campus Life";
        if (category === "__new__") {
          category =
            (galUploadCategoryCustom && galUploadCategoryCustom.value.trim()) ||
            "Campus Life";
        }

        try {
          galUrlBtn.disabled = true;
          await MediaStore.addGalleryPhotos([
            {
              image: url,
              category,
              title: titleInput ? titleInput.value.trim() : "",
              caption: captionInput ? captionInput.value.trim() : ""
            }
          ]);
          if (urlInput) urlInput.value = "";
          if (titleInput) titleInput.value = "";
          if (captionInput) captionInput.value = "";
          renderAllMediaPanels();
          showToast("Photo added to Campus Gallery.");
        } catch (error) {
          showToast(error.message || "Could not add gallery photo.", "error");
        } finally {
          galUrlBtn.disabled = false;
        }
      });
    }

    const campusGalleryGrid = $("cms-campus-gallery-grid");
    if (campusGalleryGrid) {
      campusGalleryGrid.addEventListener("click", async e => {
        const btn = e.target.closest("button[data-gallery-action]");
        if (!btn) return;
        const id = btn.dataset.id;
        const action = btn.dataset.galleryAction;

        try {
          if (action === "edit") {
            openGalleryEditModal(id);
          } else if (action === "up") {
            await MediaStore.reorderGalleryPhoto(id, -1);
            renderAllMediaPanels();
          } else if (action === "down") {
            await MediaStore.reorderGalleryPhoto(id, 1);
            renderAllMediaPanels();
          } else if (action === "delete") {
            if (confirm("Remove this photo from the Campus Gallery?")) {
              await MediaStore.deleteGalleryPhoto(id);
              renderAllMediaPanels();
              showToast("Gallery photo removed.");
            }
          }
        } catch (error) {
          showToast(error.message || "Could not update gallery photo.", "error");
        }
      });
    }

    // Gallery Edit Modal
    const galCloseBtn = $("cms-gallery-modal-close");
    const galCancelBtn = $("cms-gallery-modal-cancel");
    if (galCloseBtn) galCloseBtn.addEventListener("click", closeGalleryEditModal);
    if (galCancelBtn) galCancelBtn.addEventListener("click", closeGalleryEditModal);

    const galFieldImg = $("gallery-field-image");
    const galFieldPreview = $("gallery-image-preview");
    if (galFieldImg && galFieldPreview) {
      galFieldImg.addEventListener("input", e => {
        galFieldPreview.src =
          e.target.value ||
          (galFieldPreview.dataset && galFieldPreview.dataset.defaultSrc) ||
          "images/school-1.webp";
      });
    }

    const galFieldFile = $("gallery-field-image-file");
    if (galFieldFile) {
      galFieldFile.addEventListener("change", async e => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        try {
          showToast("Optimizing & uploading replacement photo...");
          const res = await MediaStore.uploadImageWithInfo(file, "gallery");
          if (galFieldImg) galFieldImg.value = res.url;
          if (galFieldPreview) galFieldPreview.src = res.url;
          showToast("Photo uploaded. Click Save Photo to apply.");
        } catch (error) {
          showToast(error.message || "Could not upload photo.", "error");
        } finally {
          e.target.value = "";
        }
      });
    }

    const galForm = $("cms-gallery-form");
    if (galForm) {
      galForm.addEventListener("submit", async e => {
        e.preventDefault();
        const saveBtn = document.querySelector(
          'button[form="cms-gallery-form"][type="submit"]'
        );
        if (saveBtn) saveBtn.disabled = true;

        try {
          await MediaStore.updateGalleryPhoto($("gallery-field-id").value, {
            title: $("gallery-field-title").value.trim(),
            category:
              $("gallery-field-category").value.trim() || "Campus Life",
            caption: $("gallery-field-caption").value.trim(),
            image: $("gallery-field-image").value.trim()
          });
          closeGalleryEditModal();
          renderAllMediaPanels();
          showToast("Gallery photo updated.");
        } catch (error) {
          showToast(error.message || "Could not save gallery photo.", "error");
        } finally {
          if (saveBtn) saveBtn.disabled = false;
        }
      });
    }

    // Site Banners & Principal Portrait
    const siteBannersGrid = $("cms-site-banners-grid");
    if (siteBannersGrid) {
      siteBannersGrid.addEventListener("change", async e => {
        const fileInput = e.target.closest("input[data-setting-file-input]");
        if (!fileInput || !fileInput.files || !fileInput.files[0]) return;
        const key = fileInput.dataset.settingFileInput;

        try {
          showToast("Optimizing & uploading site photo...");
          const res = await MediaStore.uploadImageWithInfo(fileInput.files[0], "site");
          const captionInput = siteBannersGrid.querySelector(
            `[data-setting-caption-input="${CSS.escape(key)}"]`
          );
          await MediaStore.saveSetting(
            key,
            res.url,
            captionInput ? captionInput.value : null
          );
          renderAllMediaPanels();
          showToast("Site photo updated live!");
        } catch (error) {
          showToast(error.message || "Could not update site photo.", "error");
        } finally {
          fileInput.value = "";
        }
      });

      siteBannersGrid.addEventListener("click", async e => {
        const btn = e.target.closest("button[data-setting-action]");
        if (!btn) return;
        const action = btn.dataset.settingAction;
        const key = btn.dataset.key;

        try {
          if (action === "save") {
            const urlInput = siteBannersGrid.querySelector(
              `[data-setting-url-input="${CSS.escape(key)}"]`
            );
            const captionInput = siteBannersGrid.querySelector(
              `[data-setting-caption-input="${CSS.escape(key)}"]`
            );
            const val = urlInput ? urlInput.value.trim() : "";
            if (!val) {
              showToast("Enter a valid image URL or path.", "error");
              return;
            }
            await MediaStore.saveSetting(
              key,
              val,
              captionInput ? captionInput.value : null
            );
            renderAllMediaPanels();
            showToast("Site photo saved.");
          } else if (action === "reset") {
            if (confirm("Restore this photo back to the original default image?")) {
              await MediaStore.resetSetting(key);
              renderAllMediaPanels();
              showToast("Restored original default photo.");
            }
          }
        } catch (error) {
          showToast(error.message || "Could not update site photo.", "error");
        }
      });
    }

    // Restore Default Media Button
    const restoreMediaBtn = $("btn-restore-media-defaults");
    if (restoreMediaBtn) {
      restoreMediaBtn.addEventListener("click", async () => {
        if (
          !confirm(
            "Restore default Facilities, Past Events, Event Photos, and Campus Gallery photos in Supabase? (Existing custom items will be kept.)"
          )
        ) {
          return;
        }
        try {
          restoreMediaBtn.disabled = true;
          await MediaStore.seedDefaultsToSupabase();
          renderAllMediaPanels();
          showToast("Default school photos restored in Supabase.");
        } catch (error) {
          showToast(error.message || "Could not restore default photos.", "error");
        } finally {
          restoreMediaBtn.disabled = false;
        }
      });
    }

    // Backdrop click & Escape key close for media modals
    [
      { id: "cms-event-modal", close: closeEventModal },
      { id: "cms-facility-modal", close: closeFacilityModal },
      { id: "cms-gallery-modal", close: closeGalleryEditModal }
    ].forEach(entry => {
      const modalEl = $(entry.id);
      if (modalEl) {
        modalEl.addEventListener("click", e => {
          if (e.target === modalEl) entry.close();
        });
      }
    });

    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      closeEventModal();
      closeFacilityModal();
      closeGalleryEditModal();
    });
  }

  async function initMediaCms() {
    try {
      await MediaStore.refresh();
    } catch (error) {
      console.warn("Media CMS initial refresh warning:", error);
    }
    renderAllMediaPanels();
  }

  document.addEventListener("DOMContentLoaded", () => {
    bindMediaUIEvents();
    renderAllMediaPanels();
    if (window.__pfsCmsAuthReady) {
      initMediaCms();
    }
  });

  window.addEventListener("pfs:cms-auth-ready", () => {
    initMediaCms();
  });

  window.addEventListener("pfs:media-updated", () => {
    renderAllMediaPanels();
  });
})();
