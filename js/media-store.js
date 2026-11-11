/**
 * Prime Focus Schools - Supabase Media & Gallery Store
 * Manages Explore Facilities, Past Events, Event Photo Albums,
 * Campus Gallery Photos, and Site Highlight Banners in Supabase.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.MediaStore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SUPABASE_URL = "https://hztinvahixhvkfhpccrq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Jx9KPHzuBIbJtG9rBr3MZA_iax1izan";
  const STORAGE_BUCKET = "pfs-media";
  const LOCAL_CACHE_KEY = "pfs_site_media_v1";

  let sharedClient = null;
  let readyPromise = null;
  let refreshInFlight = null;

  const schemaStatus = {
    checked: false,
    ready: false,
    missingTables: [],
    storageReady: true,
    lastError: null
  };

  let mediaCache = readLocalCache();

  function cloneDefaults() {
    if (
      typeof defaultSiteMedia !== "undefined" &&
      defaultSiteMedia &&
      typeof defaultSiteMedia === "object"
    ) {
      return JSON.parse(JSON.stringify(defaultSiteMedia));
    }

    return {
      facilities: [],
      events: [],
      galleryPhotos: [],
      settings: {},
      quickPickPhotos: []
    };
  }

  function normalizeState(raw) {
    const defaults = cloneDefaults();
    const source = raw && typeof raw === "object" ? raw : {};

    const facilities = Array.isArray(source.facilities)
      ? source.facilities.map((item, idx) => ({
          id: item.id || `facility-${idx}`,
          name: item.name || "",
          description: item.description || "",
          image: item.image || item.image_url || "images/school-1.webp",
          sortOrder:
            typeof item.sortOrder === "number"
              ? item.sortOrder
              : typeof item.sort_order === "number"
                ? item.sort_order
                : idx,
          showOnHome:
            typeof item.showOnHome === "boolean"
              ? item.showOnHome
              : typeof item.show_on_home === "boolean"
                ? item.show_on_home
                : idx < 3,
          createdAt: item.createdAt || item.created_at || null,
          updatedAt: item.updatedAt || item.updated_at || null
        }))
      : defaults.facilities;

    const events = Array.isArray(source.events)
      ? source.events.map((ev, idx) => {
          const rawPhotos = Array.isArray(ev.photoItems)
            ? ev.photoItems
            : Array.isArray(ev.photos)
              ? ev.photos
              : [];

          const photoItems = rawPhotos
            .map((p, pIdx) => {
              if (typeof p === "string") {
                return {
                  id: `${ev.id || "event"}-photo-${pIdx}`,
                  eventId: ev.id || `event-${idx}`,
                  image: p,
                  caption: "",
                  sortOrder: pIdx
                };
              }
              if (p && (p.image || p.image_url)) {
                return {
                  id: p.id || `${ev.id || "event"}-photo-${pIdx}`,
                  eventId: p.eventId || p.event_id || ev.id || `event-${idx}`,
                  image: p.image || p.image_url,
                  caption: p.caption || "",
                  sortOrder:
                    typeof p.sortOrder === "number"
                      ? p.sortOrder
                      : typeof p.sort_order === "number"
                        ? p.sort_order
                        : pIdx
                };
              }
              return null;
            })
            .filter(Boolean)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          return {
            id: ev.id || `event-${idx}`,
            title: ev.title || "School Event",
            category: ev.category || "School Event",
            description: ev.description || "",
            cover:
              ev.cover ||
              ev.cover_url ||
              (photoItems[0] ? photoItems[0].image : "images/school-1.webp"),
            sortOrder:
              typeof ev.sortOrder === "number"
                ? ev.sortOrder
                : typeof ev.sort_order === "number"
                  ? ev.sort_order
                  : idx,
            photoItems,
            photos: photoItems.map(item => item.image),
            createdAt: ev.createdAt || ev.created_at || null,
            updatedAt: ev.updatedAt || ev.updated_at || null
          };
        })
      : defaults.events;

    const galleryPhotos = Array.isArray(source.galleryPhotos)
      ? source.galleryPhotos.map((item, idx) => ({
          id: item.id || `gallery-${idx}`,
          title: item.title || "",
          category: item.category || "Campus Life",
          caption: item.caption || "",
          image: item.image || item.image_url || "images/school-1.webp",
          sortOrder:
            typeof item.sortOrder === "number"
              ? item.sortOrder
              : typeof item.sort_order === "number"
                ? item.sort_order
                : idx,
          createdAt: item.createdAt || item.created_at || null
        }))
      : defaults.galleryPhotos;

    const settings = {
      ...(defaults.settings || {}),
      ...(source.settings && typeof source.settings === "object"
        ? source.settings
        : {})
    };

    return {
      facilities: facilities.sort((a, b) => a.sortOrder - b.sortOrder),
      events: events.sort((a, b) => a.sortOrder - b.sortOrder),
      galleryPhotos: galleryPhotos.sort((a, b) => a.sortOrder - b.sortOrder),
      settings,
      initialized: Boolean(source.initialized)
    };
  }

  function readLocalCache() {
    try {
      const raw = localStorage.getItem(LOCAL_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          return normalizeState(parsed);
        }
      }
    } catch (error) {
      console.warn("Could not read cached site media:", error);
    }

    return normalizeState(cloneDefaults());
  }

  function saveLocalCache(nextState) {
    mediaCache = normalizeState(nextState);

    try {
      localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(mediaCache));
    } catch (error) {
      console.warn("Could not cache site media in localStorage:", error);
    }

    dispatchMediaUpdated();
  }

  function dispatchMediaUpdated() {
    try {
      window.dispatchEvent(
        new CustomEvent("pfs:media-updated", {
          detail: { media: mediaCache, schemaStatus: { ...schemaStatus } }
        })
      );
    } catch (error) {
      // Browser-only event.
    }
  }

  function getClient() {
    if (sharedClient) return sharedClient;

    if (
      typeof window !== "undefined" &&
      window.BlogStore &&
      typeof window.BlogStore.getClient === "function"
    ) {
      const blogClient = window.BlogStore.getClient();
      if (blogClient) {
        sharedClient = blogClient;
        return sharedClient;
      }
    }

    if (
      typeof window !== "undefined" &&
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {
      sharedClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
      return sharedClient;
    }

    return null;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function makeId(prefix, label = "") {
    const clean = slugify(label).slice(0, 32) || "item";
    const stamp = Date.now().toString(36);
    const rand = Math.random().toString(36).slice(2, 6);
    return `${prefix}-${clean}-${stamp}${rand}`;
  }

  function isMissingTableError(error) {
    if (!error) return false;
    const code = String(error.code || "");
    const message = String(error.message || "").toLowerCase();
    return (
      code === "PGRST205" ||
      code === "42P01" ||
      error.status === 404 ||
      message.includes("could not find the table") ||
      message.includes("does not exist")
    );
  }

  async function isAdmin() {
    const client = getClient();
    if (!client) return false;

    try {
      const { data: sessionData, error: sessionError } =
        await client.auth.getSession();
      if (sessionError || !sessionData.session) return false;

      const { data, error } = await client
        .from("admins")
        .select("user_id")
        .eq("user_id", sessionData.session.user.id)
        .maybeSingle();

      if (error) return false;
      return Boolean(data);
    } catch (error) {
      return false;
    }
  }

  function mapFacilityFromDb(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description || "",
      image: row.image_url || "images/school-1.webp",
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
      showOnHome: Boolean(row.show_on_home),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapEventFromDb(row, photoRows) {
    const items = (photoRows || [])
      .filter(p => p.event_id === row.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map(p => ({
        id: p.id,
        eventId: p.event_id,
        image: p.image_url,
        caption: p.caption || "",
        sortOrder: typeof p.sort_order === "number" ? p.sort_order : 0,
        createdAt: p.created_at
      }));

    return {
      id: row.id,
      title: row.title,
      category: row.category || "School Event",
      description: row.description || "",
      cover:
        row.cover_url ||
        (items[0] ? items[0].image : "images/school-1.webp"),
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
      photoItems: items,
      photos: items.map(item => item.image),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function mapGalleryFromDb(row) {
    return {
      id: row.id,
      title: row.title || "",
      category: row.category || "Campus Life",
      caption: row.caption || "",
      image: row.image_url,
      sortOrder: typeof row.sort_order === "number" ? row.sort_order : 0,
      createdAt: row.created_at
    };
  }

  async function seedDefaultsToSupabase(forceOverwrite = false) {
    const client = getClient();
    if (!client) throw new Error("Supabase client is not available.");

    const defaults = normalizeState(cloneDefaults());
    const now = new Date().toISOString();

    if (forceOverwrite) {
      await client.from("site_event_photos").delete().neq("id", "");
      await client.from("site_events").delete().neq("id", "");
      await client.from("site_facilities").delete().neq("id", "");
      await client.from("site_gallery_photos").delete().neq("id", "");
    }

    if (defaults.facilities.length) {
      const { error } = await client.from("site_facilities").upsert(
        defaults.facilities.map((f, idx) => ({
          id: f.id,
          name: f.name,
          description: f.description || "",
          image_url: f.image,
          sort_order: idx,
          show_on_home: Boolean(f.showOnHome),
          updated_at: now
        })),
        { onConflict: "id" }
      );
      if (error) throw error;
    }

    if (defaults.events.length) {
      const { error: eventsError } = await client.from("site_events").upsert(
        defaults.events.map((ev, idx) => ({
          id: ev.id,
          title: ev.title,
          category: ev.category || "School Event",
          description: ev.description || "",
          cover_url: ev.cover || "images/school-1.webp",
          sort_order: idx,
          updated_at: now
        })),
        { onConflict: "id" }
      );
      if (eventsError) throw eventsError;

      const photoRows = [];
      defaults.events.forEach(ev => {
        (ev.photoItems || []).forEach((photo, pIdx) => {
          photoRows.push({
            id: photo.id || `${ev.id}-photo-${pIdx}`,
            event_id: ev.id,
            image_url: photo.image,
            caption: photo.caption || "",
            sort_order: pIdx
          });
        });
      });

      if (photoRows.length) {
        const { error: photosError } = await client
          .from("site_event_photos")
          .upsert(photoRows, { onConflict: "id" });
        if (photosError) throw photosError;
      }
    }

    if (defaults.galleryPhotos.length) {
      const { error: galleryError } = await client
        .from("site_gallery_photos")
        .upsert(
          defaults.galleryPhotos.map((g, idx) => ({
            id: g.id,
            title: g.title || "",
            category: g.category || "Campus Life",
            caption: g.caption || "",
            image_url: g.image,
            sort_order: idx
          })),
          { onConflict: "id" }
        );
      if (galleryError) throw galleryError;
    }

    const settingRows = Object.values(defaults.settings || {}).map(s => ({
      key: s.key,
      label: s.label || "",
      value: s.value || "",
      caption: s.caption || "",
      updated_at: now
    }));

    settingRows.push({
      key: "media_initialized",
      label: "Media Initialized Flag",
      value: "true",
      caption: "Tracks initial seeding of default school photos.",
      updated_at: now
    });

    const { error: settingsError } = await client
      .from("site_media_settings")
      .upsert(settingRows, { onConflict: "key" });
    if (settingsError) throw settingsError;

    return refresh();
  }

  async function refresh() {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const client = getClient();
      if (!client) {
        schemaStatus.checked = true;
        schemaStatus.ready = false;
        schemaStatus.lastError = "Supabase client is not loaded.";
        return mediaCache;
      }

      const requiredTables = [
        "site_facilities",
        "site_events",
        "site_event_photos",
        "site_gallery_photos",
        "site_media_settings"
      ];

      const [facRes, evtRes, evtPhotoRes, galRes, setRes] = await Promise.all([
        client
          .from("site_facilities")
          .select("*")
          .order("sort_order", { ascending: true }),
        client
          .from("site_events")
          .select("*")
          .order("sort_order", { ascending: true }),
        client
          .from("site_event_photos")
          .select("*")
          .order("sort_order", { ascending: true }),
        client
          .from("site_gallery_photos")
          .select("*")
          .order("sort_order", { ascending: true }),
        client.from("site_media_settings").select("*")
      ]);

      const responses = [
        { table: "site_facilities", res: facRes },
        { table: "site_events", res: evtRes },
        { table: "site_event_photos", res: evtPhotoRes },
        { table: "site_gallery_photos", res: galRes },
        { table: "site_media_settings", res: setRes }
      ];

      const missingTables = responses
        .filter(item => item.res.error && isMissingTableError(item.res.error))
        .map(item => item.table);

      schemaStatus.checked = true;

      if (missingTables.length > 0) {
        schemaStatus.ready = false;
        schemaStatus.missingTables = missingTables;
        schemaStatus.lastError =
          `Missing Supabase table(s): ${missingTables.join(", ")}`;
        dispatchMediaUpdated();
        return mediaCache;
      }

      const firstUnexpectedError = responses.find(item => item.res.error);
      if (firstUnexpectedError) {
        schemaStatus.ready = false;
        schemaStatus.lastError =
          firstUnexpectedError.res.error.message ||
          "Could not load media from Supabase.";
        throw firstUnexpectedError.res.error;
      }

      schemaStatus.ready = true;
      schemaStatus.missingTables = [];
      schemaStatus.lastError = null;

      const facRows = facRes.data || [];
      const evtRows = evtRes.data || [];
      const evtPhotoRows = evtPhotoRes.data || [];
      const galRows = galRes.data || [];
      const setRows = setRes.data || [];

      const settingsMap = {};
      setRows.forEach(row => {
        settingsMap[row.key] = {
          key: row.key,
          label: row.label || "",
          value: row.value || "",
          caption: row.caption || "",
          updatedAt: row.updated_at
        };
      });

      const initializedFlag =
        settingsMap.media_initialized &&
        settingsMap.media_initialized.value === "true";

      const allEmpty =
        facRows.length === 0 &&
        evtRows.length === 0 &&
        galRows.length === 0;

      // Auto-seed once when an admin opens CMS on fresh tables.
      if (!initializedFlag && allEmpty) {
        if (await isAdmin()) {
          refreshInFlight = null;
          return seedDefaultsToSupabase(false);
        }

        // Before an admin initializes Supabase, keep displaying default photos
        // on the public site rather than showing empty sections.
        const defaults = cloneDefaults();
        saveLocalCache({
          ...defaults,
          initialized: false
        });
        return mediaCache;
      }

      const mappedEvents = evtRows.map(row =>
        mapEventFromDb(row, evtPhotoRows)
      );

      saveLocalCache({
        facilities: facRows.map(mapFacilityFromDb),
        events: mappedEvents,
        galleryPhotos: galRows.map(mapGalleryFromDb),
        settings: {
          ...(cloneDefaults().settings || {}),
          ...settingsMap
        },
        initialized: true
      });

      return mediaCache;
    })();

    try {
      return await refreshInFlight;
    } finally {
      refreshInFlight = null;
    }
  }

  function ready() {
    if (!readyPromise) {
      readyPromise = refresh().catch(error => {
        readyPromise = null;
        console.warn("Using fallback site media:", error);
        return mediaCache;
      });
    }
    return readyPromise;
  }

  // Image optimization & Supabase Storage helpers
  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = err => {
        URL.revokeObjectURL(url);
        reject(err || new Error("Could not decode selected image."));
      };
      img.src = url;
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () =>
        reject(new Error("Could not read compressed image."));
      reader.readAsDataURL(blob);
    });
  }

  async function optimizeImageFile(file, options = {}) {
    const maxWidth = options.maxWidth || 1600;
    const maxHeight = options.maxHeight || 1600;
    const quality = options.quality || 0.84;

    if (!file || !String(file.type || "").startsWith("image/")) {
      throw new Error("Please select a valid image file.");
    }

    // Keep small SVGs or already small WebPs untouched
    if (
      file.type === "image/svg+xml" ||
      (file.type === "image/webp" && file.size <= 220 * 1024)
    ) {
      return { blob: file, mimeType: file.type, ext: file.type === "image/svg+xml" ? "svg" : "webp" };
    }

    const img = await loadImageElement(file);
    let width = img.naturalWidth || img.width;
    let height = img.naturalHeight || img.height;

    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise(resolve => {
      canvas.toBlob(
        result => {
          if (result) {
            resolve(result);
          } else {
            canvas.toBlob(jpegResult => resolve(jpegResult), "image/jpeg", quality);
          }
        },
        "image/webp",
        quality
      );
    });

    if (!blob) {
      return { blob: file, mimeType: file.type || "image/jpeg", ext: "jpg" };
    }

    const mimeType = blob.type || "image/webp";
    const ext = mimeType.includes("webp") ? "webp" : "jpg";
    return { blob, mimeType, ext };
  }

  async function uploadImageWithInfo(file, folder = "general") {
    const client = getClient();
    if (!client) throw new Error("Supabase client is unavailable.");

    const optimized = await optimizeImageFile(file);
    const baseName = slugify(String(file.name || "photo").replace(/\.[^.]+$/, "")).slice(0, 32) || "photo";
    const objectPath = `${slugify(folder) || "general"}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${baseName}.${optimized.ext}`;

    const { error: uploadError } = await client.storage
      .from(STORAGE_BUCKET)
      .upload(objectPath, optimized.blob, {
        contentType: optimized.mimeType,
        cacheControl: "31536000",
        upsert: false
      });

    if (!uploadError) {
      const { data } = client.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(objectPath);
      schemaStatus.storageReady = true;
      return {
        url: data.publicUrl,
        usedFallback: false,
        warning: null
      };
    }

    // Fallback to compact data URL if Storage bucket/policy isn't configured yet
    schemaStatus.storageReady = false;
    const compact = await optimizeImageFile(file, {
      maxWidth: 1100,
      maxHeight: 1100,
      quality: 0.76
    });

    if (compact.blob.size > 450 * 1024) {
      throw new Error(
        `Storage bucket "${STORAGE_BUCKET}" upload failed (${uploadError.message}). Please run supabase-media-setup.sql in Supabase SQL Editor.`
      );
    }

    const dataUrl = await blobToDataUrl(compact.blob);
    return {
      url: dataUrl,
      usedFallback: true,
      warning: `Storage bucket not ready (${uploadError.message}); saved compact inline image.`
    };
  }

  async function uploadImage(file, folder = "general") {
    const res = await uploadImageWithInfo(file, folder);
    return res.url;
  }

  function extractStorageObjectPath(url) {
    if (!url || typeof url !== "string") return null;
    const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.slice(idx + marker.length).split("?")[0]);
  }

  function isUrlReferencedElsewhere(url, ignoreId = null) {
    if (!url) return false;
    const inFacilities = mediaCache.facilities.some(
      f => f.id !== ignoreId && f.image === url
    );
    const inEvents = mediaCache.events.some(
      e =>
        (e.id !== ignoreId && e.cover === url) ||
        (e.photoItems || []).some(p => p.id !== ignoreId && p.image === url)
    );
    const inGallery = mediaCache.galleryPhotos.some(
      g => g.id !== ignoreId && g.image === url
    );
    const inSettings = Object.values(mediaCache.settings || {}).some(
      s => s && s.key !== ignoreId && s.value === url
    );
    return inFacilities || inEvents || inGallery || inSettings;
  }

  async function cleanupStorageUrlIfUnused(url, ignoreId = null) {
    const objectPath = extractStorageObjectPath(url);
    if (!objectPath) return;
    if (isUrlReferencedElsewhere(url, ignoreId)) return;

    const client = getClient();
    if (!client) return;

    try {
      await client.storage.from(STORAGE_BUCKET).remove([objectPath]);
    } catch (error) {
      console.warn("Storage cleanup warning:", error);
    }
  }

  // Ensure tables exist before attempting writes
  function assertSchemaReady() {
    if (!schemaStatus.ready) {
      throw new Error(
        "Supabase media tables are not set up yet. Run supabase-media-setup.sql in your Supabase SQL Editor first."
      );
    }
  }

  // ---------------- Facilities CRUD ----------------

  function getFacilities(options = {}) {
    let list = [...mediaCache.facilities].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    if (options.homeOnly) {
      const homeList = list.filter(f => f.showOnHome);
      list = homeList.length ? homeList : list;
    }

    if (typeof options.limit === "number" && options.limit > 0) {
      list = list.slice(0, options.limit);
    }

    return list;
  }

  async function saveFacility(data) {
    assertSchemaReady();
    if (!data || !String(data.name || "").trim()) {
      throw new Error("Facility name is required.");
    }

    const client = getClient();
    const now = new Date().toISOString();
    const existing = data.id
      ? mediaCache.facilities.find(f => f.id === data.id)
      : null;

    const id = existing
      ? existing.id
      : makeId("facility", data.name);

    const payload = {
      id,
      name: String(data.name).trim(),
      description: String(data.description || "").trim(),
      image_url: String(data.image || "images/school-1.webp").trim(),
      sort_order:
        typeof data.sortOrder === "number" && !Number.isNaN(data.sortOrder)
          ? data.sortOrder
          : existing
            ? existing.sortOrder
            : mediaCache.facilities.length,
      show_on_home:
        typeof data.showOnHome === "boolean"
          ? data.showOnHome
          : existing
            ? existing.showOnHome
            : true,
      updated_at: now
    };

    const { data: savedRow, error } = await client
      .from("site_facilities")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;

    if (existing && existing.image !== payload.image_url) {
      await cleanupStorageUrlIfUnused(existing.image, id);
    }

    const mapped = mapFacilityFromDb(savedRow);
    const updatedList = [
      ...mediaCache.facilities.filter(f => f.id !== id),
      mapped
    ].sort((a, b) => a.sortOrder - b.sortOrder);

    saveLocalCache({ ...mediaCache, facilities: updatedList, initialized: true });
    return mapped;
  }

  async function deleteFacility(id) {
    assertSchemaReady();
    const client = getClient();
    const existing = mediaCache.facilities.find(f => f.id === id);

    const { error } = await client
      .from("site_facilities")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (existing) {
      await cleanupStorageUrlIfUnused(existing.image, id);
    }

    saveLocalCache({
      ...mediaCache,
      facilities: mediaCache.facilities.filter(f => f.id !== id)
    });
    return true;
  }

  async function reorderFacility(id, delta) {
    assertSchemaReady();
    const list = getFacilities();
    const idx = list.findIndex(f => f.id === id);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return false;

    const current = list[idx];
    const swap = list[targetIdx];
    const client = getClient();
    const now = new Date().toISOString();

    const { error: e1 } = await client
      .from("site_facilities")
      .update({ sort_order: targetIdx, updated_at: now })
      .eq("id", current.id);
    if (e1) throw e1;

    const { error: e2 } = await client
      .from("site_facilities")
      .update({ sort_order: idx, updated_at: now })
      .eq("id", swap.id);
    if (e2) throw e2;

    await refresh();
    return true;
  }

  // ---------------- Past Events & Album Photos CRUD ----------------

  function getEvents(options = {}) {
    let list = [...mediaCache.events].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    if (typeof options.limit === "number" && options.limit > 0) {
      list = list.slice(0, options.limit);
    }

    return list;
  }

  function getEventByIdOrIndex(idOrIndex) {
    const list = getEvents();
    if (!list.length) return null;

    if (idOrIndex === null || idOrIndex === undefined || idOrIndex === "") {
      return list[0];
    }

    const query = String(idOrIndex).trim();
    const byId = list.find(e => e.id === query);
    if (byId) return byId;

    if (/^\d+$/.test(query)) {
      const idx = parseInt(query, 10);
      if (idx >= 0 && idx < list.length) return list[idx];
    }

    return null;
  }

  async function saveEvent(data) {
    assertSchemaReady();
    if (!data || !String(data.title || "").trim()) {
      throw new Error("Event title is required.");
    }

    const client = getClient();
    const now = new Date().toISOString();
    const existing = data.id
      ? mediaCache.events.find(e => e.id === data.id)
      : null;

    const id = existing
      ? existing.id
      : slugify(data.id || data.title) || makeId("event", data.title);

    const uniqueId =
      !existing && mediaCache.events.some(e => e.id === id)
        ? `${id}-${Date.now().toString(36).slice(-4)}`
        : id;

    const payload = {
      id: uniqueId,
      title: String(data.title).trim(),
      category: String(data.category || "School Event").trim(),
      description: String(data.description || "").trim(),
      cover_url: String(
        data.cover ||
          (existing && existing.cover) ||
          "images/school-1.webp"
      ).trim(),
      sort_order:
        typeof data.sortOrder === "number" && !Number.isNaN(data.sortOrder)
          ? data.sortOrder
          : existing
            ? existing.sortOrder
            : mediaCache.events.length,
      updated_at: now
    };

    const { data: savedRow, error } = await client
      .from("site_events")
      .upsert(payload, { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;

    if (existing && existing.cover !== payload.cover_url) {
      await cleanupStorageUrlIfUnused(existing.cover, uniqueId);
    }

    await refresh();
    return getEventByIdOrIndex(savedRow.id);
  }

  async function deleteEvent(id) {
    assertSchemaReady();
    const client = getClient();
    const existing = mediaCache.events.find(e => e.id === id);

    const { error } = await client
      .from("site_events")
      .delete()
      .eq("id", id);

    if (error) throw error;

    if (existing) {
      const urlsToCheck = [
        existing.cover,
        ...(existing.photoItems || []).map(p => p.image)
      ];
      saveLocalCache({
        ...mediaCache,
        events: mediaCache.events.filter(e => e.id !== id)
      });
      for (const u of urlsToCheck) {
        await cleanupStorageUrlIfUnused(u, id);
      }
    } else {
      await refresh();
    }

    return true;
  }

  async function reorderEvent(id, delta) {
    assertSchemaReady();
    const list = getEvents();
    const idx = list.findIndex(e => e.id === id);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return false;

    const client = getClient();
    const now = new Date().toISOString();

    const { error: e1 } = await client
      .from("site_events")
      .update({ sort_order: targetIdx, updated_at: now })
      .eq("id", list[idx].id);
    if (e1) throw e1;

    const { error: e2 } = await client
      .from("site_events")
      .update({ sort_order: idx, updated_at: now })
      .eq("id", list[targetIdx].id);
    if (e2) throw e2;

    await refresh();
    return true;
  }

  async function addEventPhotos(eventId, items) {
    assertSchemaReady();
    const eventObj = mediaCache.events.find(e => e.id === eventId);
    if (!eventObj) throw new Error("Selected event could not be found.");

    const normalizedItems = (Array.isArray(items) ? items : [items])
      .map(item =>
        typeof item === "string"
          ? { image: item, caption: "" }
          : item && item.image
            ? { image: item.image, caption: item.caption || "" }
            : null
      )
      .filter(Boolean);

    if (!normalizedItems.length) {
      throw new Error("Please select or enter at least one photo.");
    }

    const baseOrder = (eventObj.photoItems || []).length;
    const rows = normalizedItems.map((item, idx) => ({
      id: makeId("evp", eventId),
      event_id: eventId,
      image_url: String(item.image).trim(),
      caption: String(item.caption || "").trim(),
      sort_order: baseOrder + idx
    }));

    const client = getClient();
    const { error } = await client
      .from("site_event_photos")
      .insert(rows);

    if (error) throw error;

    // If event currently uses the generic placeholder cover, upgrade to first new photo
    if (
      rows.length &&
      (!eventObj.cover || eventObj.cover === "images/school-1.webp") &&
      (eventObj.photoItems || []).length === 0
    ) {
      await client
        .from("site_events")
        .update({ cover_url: rows[0].image_url, updated_at: new Date().toISOString() })
        .eq("id", eventId);
    }

    await refresh();
    return getEventByIdOrIndex(eventId);
  }

  async function updateEventPhoto(photoId, patch) {
    assertSchemaReady();
    const client = getClient();
    const updates = {};

    if (typeof patch.caption === "string") updates.caption = patch.caption.trim();
    if (typeof patch.sortOrder === "number") updates.sort_order = patch.sortOrder;

    const { error } = await client
      .from("site_event_photos")
      .update(updates)
      .eq("id", photoId);

    if (error) throw error;
    await refresh();
    return true;
  }

  async function deleteEventPhoto(photoId) {
    assertSchemaReady();
    const client = getClient();
    let targetPhoto = null;
    let parentEvent = null;

    mediaCache.events.forEach(ev => {
      const found = (ev.photoItems || []).find(p => p.id === photoId);
      if (found) {
        targetPhoto = found;
        parentEvent = ev;
      }
    });

    const { error } = await client
      .from("site_event_photos")
      .delete()
      .eq("id", photoId);

    if (error) throw error;

    if (parentEvent && targetPhoto && parentEvent.cover === targetPhoto.image) {
      const remaining = (parentEvent.photoItems || []).filter(
        p => p.id !== photoId
      );
      const nextCover = remaining[0]
        ? remaining[0].image
        : "images/school-1.webp";
      await client
        .from("site_events")
        .update({ cover_url: nextCover, updated_at: new Date().toISOString() })
        .eq("id", parentEvent.id);
    }

    await refresh();

    if (targetPhoto) {
      await cleanupStorageUrlIfUnused(targetPhoto.image, photoId);
    }

    return true;
  }

  async function reorderEventPhoto(eventId, photoId, delta) {
    assertSchemaReady();
    const ev = mediaCache.events.find(e => e.id === eventId);
    if (!ev) return false;

    const items = [...(ev.photoItems || [])];
    const idx = items.findIndex(p => p.id === photoId);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= items.length) return false;

    const client = getClient();
    const { error: e1 } = await client
      .from("site_event_photos")
      .update({ sort_order: targetIdx })
      .eq("id", items[idx].id);
    if (e1) throw e1;

    const { error: e2 } = await client
      .from("site_event_photos")
      .update({ sort_order: idx })
      .eq("id", items[targetIdx].id);
    if (e2) throw e2;

    await refresh();
    return true;
  }

  async function setEventCover(eventId, imageUrl) {
    assertSchemaReady();
    const client = getClient();
    const { error } = await client
      .from("site_events")
      .update({
        cover_url: String(imageUrl || "images/school-1.webp").trim(),
        updated_at: new Date().toISOString()
      })
      .eq("id", eventId);

    if (error) throw error;
    await refresh();
    return getEventByIdOrIndex(eventId);
  }

  // ---------------- Campus Gallery Photos CRUD ----------------

  function getGalleryPhotos(options = {}) {
    let list = [...mediaCache.galleryPhotos].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    if (
      options.category &&
      options.category !== "all" &&
      options.category !== "All"
    ) {
      list = list.filter(
        g => (g.category || "").toLowerCase() === options.category.toLowerCase()
      );
    }

    if (typeof options.limit === "number" && options.limit > 0) {
      list = list.slice(0, options.limit);
    }

    return list;
  }

  function getGalleryCategories() {
    return [
      ...new Set(
        mediaCache.galleryPhotos
          .map(item => (item.category || "").trim())
          .filter(Boolean)
      )
    ];
  }

  async function addGalleryPhotos(items) {
    assertSchemaReady();
    const normalized = (Array.isArray(items) ? items : [items])
      .map(item =>
        typeof item === "string"
          ? { image: item, title: "", category: "Campus Life", caption: "" }
          : item && item.image
            ? {
                image: item.image,
                title: item.title || "",
                category: item.category || "Campus Life",
                caption: item.caption || ""
              }
            : null
      )
      .filter(Boolean);

    if (!normalized.length) {
      throw new Error("Please select or enter at least one gallery photo.");
    }

    const baseOrder = mediaCache.galleryPhotos.length;
    const rows = normalized.map((item, idx) => ({
      id: makeId("gal", item.title || item.category),
      title: String(item.title || "").trim(),
      category: String(item.category || "Campus Life").trim(),
      caption: String(item.caption || "").trim(),
      image_url: String(item.image).trim(),
      sort_order: baseOrder + idx
    }));

    const client = getClient();
    const { error } = await client
      .from("site_gallery_photos")
      .insert(rows);

    if (error) throw error;
    await refresh();
    return getGalleryPhotos();
  }

  async function updateGalleryPhoto(id, patch) {
    assertSchemaReady();
    const client = getClient();
    const existing = mediaCache.galleryPhotos.find(g => g.id === id);
    const updates = {};

    if (typeof patch.title === "string") updates.title = patch.title.trim();
    if (typeof patch.category === "string") {
      updates.category = patch.category.trim() || "Campus Life";
    }
    if (typeof patch.caption === "string") updates.caption = patch.caption.trim();
    if (typeof patch.image === "string" && patch.image.trim()) {
      updates.image_url = patch.image.trim();
    }
    if (typeof patch.sortOrder === "number") updates.sort_order = patch.sortOrder;

    const { error } = await client
      .from("site_gallery_photos")
      .update(updates)
      .eq("id", id);

    if (error) throw error;

    if (existing && updates.image_url && existing.image !== updates.image_url) {
      await cleanupStorageUrlIfUnused(existing.image, id);
    }

    await refresh();
    return true;
  }

  async function deleteGalleryPhoto(id) {
    assertSchemaReady();
    const client = getClient();
    const existing = mediaCache.galleryPhotos.find(g => g.id === id);

    const { error } = await client
      .from("site_gallery_photos")
      .delete()
      .eq("id", id);

    if (error) throw error;

    await refresh();
    if (existing) {
      await cleanupStorageUrlIfUnused(existing.image, id);
    }

    return true;
  }

  async function reorderGalleryPhoto(id, delta) {
    assertSchemaReady();
    const list = getGalleryPhotos();
    const idx = list.findIndex(g => g.id === id);
    const targetIdx = idx + delta;
    if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return false;

    const client = getClient();
    const { error: e1 } = await client
      .from("site_gallery_photos")
      .update({ sort_order: targetIdx })
      .eq("id", list[idx].id);
    if (e1) throw e1;

    const { error: e2 } = await client
      .from("site_gallery_photos")
      .update({ sort_order: idx })
      .eq("id", list[targetIdx].id);
    if (e2) throw e2;

    await refresh();
    return true;
  }

  // ---------------- Site Banners & Highlight Settings ----------------

  function getSetting(key) {
    return (mediaCache.settings && mediaCache.settings[key]) || null;
  }

  function getAllSitePhotoSettings() {
    const keys = ["hero_banner", "page_hero_banner", "principal_portrait"];
    const defaults = cloneDefaults().settings || {};
    return keys.map(key => {
      const current = getSetting(key);
      const fallback = defaults[key] || { key, label: key, value: "", caption: "" };
      return {
        key,
        label: (current && current.label) || fallback.label,
        value: (current && current.value) || fallback.value,
        caption:
          current && typeof current.caption === "string"
            ? current.caption
            : fallback.caption,
        defaultValue: fallback.value
      };
    });
  }

  async function saveSetting(key, value, caption = null, label = null) {
    assertSchemaReady();
    const client = getClient();
    const defaults = cloneDefaults().settings || {};
    const current = getSetting(key) || defaults[key] || {};
    const prevValue = current.value;

    const row = {
      key,
      label: label || current.label || key,
      value: String(value || "").trim(),
      caption:
        caption !== null
          ? String(caption).trim()
          : current.caption || "",
      updated_at: new Date().toISOString()
    };

    const { error } = await client
      .from("site_media_settings")
      .upsert(row, { onConflict: "key" });

    if (error) throw error;

    await refresh();
    if (prevValue && prevValue !== row.value) {
      await cleanupStorageUrlIfUnused(prevValue, key);
    }

    return getSetting(key);
  }

  async function resetSetting(key) {
    const defaults = cloneDefaults().settings || {};
    const fallback = defaults[key];
    if (!fallback) throw new Error("Unknown site setting key.");
    return saveSetting(key, fallback.value, fallback.caption, fallback.label);
  }

  function getQuickPickPhotos() {
    const defaults = cloneDefaults();
    return defaults.quickPickPhotos || [];
  }

  const NO_THUMB_IMAGES = new Set([
    "ict-lab.webp",
    "principal-pfs.webp",
    "td-lab.webp",
    "school-1-original.webp",
    "school-2-original.webp",
    "events/girlsday.webp",
    "events/hausa1.webp",
    "pfs undone logo.webp",
    "pfs-logo-128.webp"
  ]);

  function toThumbSrc(url) {
    const raw = String(url || "").trim();
    if (!raw) return raw;

    const match = raw.match(/^((?:\.\.?\/|\/)?)images\/(.+)$/i);
    if (!match) return raw;

    const prefix = match[1] || "";
    const rest = match[2];
    if (/^thumbs\//i.test(rest)) return raw;

    const cleanPath = rest.split(/[?#]/)[0];
    let decoded = cleanPath;
    try {
      decoded = decodeURIComponent(cleanPath);
    } catch (e) {
      decoded = cleanPath;
    }

    if (NO_THUMB_IMAGES.has(decoded.toLowerCase())) {
      return raw;
    }

    return `${prefix}images/thumbs/${rest}`;
  }

  function toFullSrc(url) {
    const raw = String(url || "").trim();
    if (!raw) return raw;

    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        if (
          typeof window !== "undefined" &&
          window.location &&
          parsed.origin === window.location.origin
        ) {
          return raw.replace(/(^|\/)images\/thumbs\//i, "$1images/");
        }
        return raw;
      } catch (e) {
        return raw;
      }
    }

    return raw.replace(/(^|\/)images\/thumbs\//i, "$1images/");
  }

  function handleImgError(img) {
    if (!img) return;
    const currentSrc = img.getAttribute("src") || "";
    const fullSrc = img.dataset ? img.dataset.fullSrc : "";
    const defaultSrc = img.dataset ? img.dataset.defaultSrc : "";
    const finalFallback = "images/school-1.webp";

    if (fullSrc && currentSrc !== fullSrc) {
      img.src = fullSrc;
      return;
    }
    if (defaultSrc && currentSrc !== defaultSrc) {
      img.src = defaultSrc;
      return;
    }
    if (currentSrc !== finalFallback) {
      img.onerror = null;
      img.src = finalFallback;
      return;
    }
    img.onerror = null;
  }

  const PfsMediaThumb = {
    NO_THUMB_IMAGES,
    toThumbSrc,
    toFullSrc,
    handleError: handleImgError,
    onerrorAttr:
      "if(window.PfsMediaThumb){window.PfsMediaThumb.handleError(this);}else{this.onerror=null;this.src='images/school-1.webp';}"
  };

  if (typeof window !== "undefined") {
    window.PfsMediaThumb = PfsMediaThumb;
  }
  if (typeof globalThis !== "undefined") {
    globalThis.PfsMediaThumb = PfsMediaThumb;
  }

  return {
    STORAGE_BUCKET,
    ready,
    refresh,
    getClient,
    getSchemaStatus: () => ({ ...schemaStatus }),
    seedDefaultsToSupabase,

    uploadImage,
    uploadImageWithInfo,
    optimizeImageFile,

    getFacilities,
    saveFacility,
    deleteFacility,
    reorderFacility,

    getEvents,
    getEventByIdOrIndex,
    saveEvent,
    deleteEvent,
    reorderEvent,
    addEventPhotos,
    updateEventPhoto,
    deleteEventPhoto,
    reorderEventPhoto,
    setEventCover,

    getGalleryPhotos,
    getGalleryCategories,
    addGalleryPhotos,
    updateGalleryPhoto,
    deleteGalleryPhoto,
    reorderGalleryPhoto,

    getSetting,
    getAllSitePhotoSettings,
    saveSetting,
    resetSetting,
    getQuickPickPhotos,
    slugify
  };
});
