/**
 * Prime Focus Schools - Main JavaScript
 * Powers dynamic facilities, past events, campus gallery, site highlights,
 * contact form, navigation, and the Universal Lightbox Engine.
 */

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  const div = document.createElement("div");
  div.textContent = String(value);
  return div.innerHTML;
}

function sanitizeImageUrl(url, fallback = "images/school-1.webp") {
  const raw = String(url || "").trim();
  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  if (
    lower.startsWith("https://") ||
    lower.startsWith("blob:") ||
    /^data:image\/(png|jpeg|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw)
  ) {
    return raw;
  }

  if (lower.startsWith("http://")) {
    try {
      const parsed = new URL(raw);
      const isLocalHost =
        parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
      const isSameOrigin =
        typeof window !== "undefined" &&
        window.location &&
        parsed.origin === window.location.origin;
      if (isLocalHost && isSameOrigin) {
        return raw;
      }
    } catch (e) {
      return fallback;
    }
    return fallback;
  }

  if (
    !raw.startsWith("//") &&
    !raw.startsWith("\\") &&
    !/^[a-z][a-z0-9+.-]*:/i.test(raw)
  ) {
    return raw;
  }

  return fallback;
}

const LIGHTBOX_PLACEHOLDER_SRC =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

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

function getFullZoomSrc(el, img) {
  const raw =
    (el && el.dataset && el.dataset.fullSrc) ||
    (img && img.dataset && img.dataset.fullSrc) ||
    (img ? img.getAttribute("src") || img.src : "");
  const full =
    window.PfsMediaThumb && typeof window.PfsMediaThumb.toFullSrc === "function"
      ? window.PfsMediaThumb.toFullSrc(raw)
      : String(raw || "").replace(/(^|\/)images\/thumbs\//i, "$1images/");
  return sanitizeImageUrl(full);
}

let mediaStoreSettled = false;
let mediaLoadError = null;

function getMediaFacilities(options = {}) {
  if (window.MediaStore && typeof window.MediaStore.getFacilities === "function") {
    return window.MediaStore.getFacilities(options);
  }
  return [];
}

function getMediaEvents(options = {}) {
  if (window.MediaStore && typeof window.MediaStore.getEvents === "function") {
    return window.MediaStore.getEvents(options);
  }
  return [];
}

function getMediaGalleryPhotos(options = {}) {
  if (window.MediaStore && typeof window.MediaStore.getGalleryPhotos === "function") {
    return window.MediaStore.getGalleryPhotos(options);
  }
  return [];
}

function getMediaSetting(key) {
  if (window.MediaStore && typeof window.MediaStore.getSetting === "function") {
    return window.MediaStore.getSetting(key);
  }
  return null;
}

function renderMediaPlaceholder(target, { loadingText, errorText, emptyText, padding = "30px 12px" }) {
  const isLoading = !mediaStoreSettled;
  const text = isLoading ? loadingText : mediaLoadError ? errorText : emptyText;
  target.classList.toggle("is-empty", !isLoading);
  target.innerHTML = `
    <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: ${padding};">
      ${escapeHtml(text)}
    </p>`;
}

/* ==========================================================================
   Universal Lightbox Engine
   Allows images across the entire website to be viewed widely on hover or tap.
   ========================================================================== */

let universalLightboxState = {
  activeList: [],
  currentIndex: 0,
  isOpen: false,
  lastFocusedTrigger: null,
  loadToken: 0
};

function getLightboxFocusableElements(lightbox) {
  const dialog = lightbox ? lightbox.querySelector(".lightbox-dialog") : null;
  if (!dialog) return [];
  return Array.from(
    dialog.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter(el => {
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden";
  });
}

function ensureLightboxModal() {
  let lightbox = document.getElementById("lightbox");
  if (!lightbox) {
    lightbox = document.createElement("div");
    lightbox.id = "lightbox";
    lightbox.className = "lightbox";
    lightbox.hidden = true;
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("aria-label", "Photo Viewer");
    lightbox.innerHTML = `
      <div class="lightbox-overlay" id="lightbox-backdrop"></div>
      <div class="lightbox-dialog">
        <button class="lightbox-close" id="lightbox-close" aria-label="Close photo viewer">✕</button>
        <button class="lightbox-nav lightbox-prev" id="lightbox-prev" aria-label="Previous photo">❮</button>
        <div class="lightbox-body">
          <img id="lightbox-img" src="${LIGHTBOX_PLACEHOLDER_SRC}" alt="Enlarged school photograph" decoding="async" fetchpriority="low">
          <div class="lightbox-caption">
            <p id="lightbox-title"></p>
            <span id="lightbox-counter"></span>
          </div>
        </div>
        <button class="lightbox-nav lightbox-next" id="lightbox-next" aria-label="Next photo">❯</button>
      </div>
    `;
    document.body.appendChild(lightbox);
  }
  return lightbox;
}

function openUniversalLightbox(items, startIndex = 0) {
  if (!items || !items.length) return;
  const lightbox = ensureLightboxModal();
  if (!universalLightboxState.isOpen) {
    universalLightboxState.lastFocusedTrigger =
      document.activeElement && document.activeElement !== document.body
        ? document.activeElement
        : null;
  }
  universalLightboxState.activeList = items;
  universalLightboxState.currentIndex = Math.max(0, Math.min(startIndex, items.length - 1));
  universalLightboxState.isOpen = true;

  updateUniversalLightboxPhoto();

  lightbox.hidden = false;
  requestAnimationFrame(() => {
    lightbox.classList.add("active");
  });
  document.body.style.overflow = "hidden";

  const closeBtn = document.getElementById("lightbox-close");
  if (closeBtn) {
    closeBtn.focus({ preventScroll: true });
  }
}

function closeUniversalLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.classList.remove("active");
  universalLightboxState.isOpen = false;
  const triggerToRestore = universalLightboxState.lastFocusedTrigger;
  universalLightboxState.lastFocusedTrigger = null;
  if (
    triggerToRestore &&
    typeof triggerToRestore.focus === "function" &&
    document.contains(triggerToRestore)
  ) {
    triggerToRestore.focus({ preventScroll: true });
  }
  setTimeout(() => {
    if (!universalLightboxState.isOpen) {
      lightbox.hidden = true;
      const lightboxImg = document.getElementById("lightbox-img");
      if (lightboxImg) {
        lightboxImg.onload = null;
        lightboxImg.onerror = null;
        lightboxImg.fetchPriority = "low";
        lightboxImg.src = LIGHTBOX_PLACEHOLDER_SRC;
      }
      document.body.style.overflow = "";
    }
  }, 250);
}

function updateUniversalLightboxPhoto() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  const imgEl = document.getElementById("lightbox-img");
  const titleEl = document.getElementById("lightbox-title");
  const counterEl = document.getElementById("lightbox-counter");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");

  const list = universalLightboxState.activeList;
  const idx = universalLightboxState.currentIndex;
  const item = list[idx];
  if (!item) return;

  const safeSrc = sanitizeImageUrl(item.src);

  if (imgEl) {
    imgEl.decoding = "async";
    imgEl.fetchPriority = "high";
    imgEl.alt = item.title || "School photograph";
    imgEl.style.opacity = "0.3";
    const loadToken = ++universalLightboxState.loadToken;
    const currentAttr = imgEl.getAttribute("src") || "";
    const isInitialOpen = !currentAttr || currentAttr === LIGHTBOX_PLACEHOLDER_SRC;

    if (isInitialOpen) {
      imgEl.onload = () => {
        if (
          !universalLightboxState.isOpen ||
          universalLightboxState.loadToken !== loadToken
        ) {
          return;
        }
        imgEl.style.opacity = "1";
      };
      imgEl.onerror = () => {
        if (
          !universalLightboxState.isOpen ||
          universalLightboxState.loadToken !== loadToken
        ) {
          return;
        }
        imgEl.onerror = null;
        if (safeSrc !== "images/school-1.webp") {
          imgEl.src = "images/school-1.webp";
        }
        imgEl.style.opacity = "1";
      };
      imgEl.src = safeSrc;
    } else {
      const temp = new Image();
      temp.onload = () => {
        if (
          !universalLightboxState.isOpen ||
          universalLightboxState.loadToken !== loadToken
        ) {
          return;
        }
        imgEl.src = safeSrc;
        imgEl.style.opacity = "1";
      };
      temp.onerror = () => {
        if (
          !universalLightboxState.isOpen ||
          universalLightboxState.loadToken !== loadToken
        ) {
          return;
        }
        imgEl.src =
          safeSrc !== "images/school-1.webp" ? "images/school-1.webp" : safeSrc;
        imgEl.style.opacity = "1";
      };
      temp.src = safeSrc;
    }
  }

  if (titleEl) titleEl.textContent = item.title || "";
  if (counterEl) {
    if (list.length > 1) {
      counterEl.textContent = `${item.caption ? item.caption + " · " : ""}Photo ${idx + 1} of ${list.length}`;
      if (prevBtn) prevBtn.style.display = "flex";
      if (nextBtn) nextBtn.style.display = "flex";
    } else {
      counterEl.textContent = item.caption || "Click or tap backdrop to close";
      if (prevBtn) prevBtn.style.display = "none";
      if (nextBtn) nextBtn.style.display = "none";
    }
  }
}

function stepUniversalLightbox(delta) {
  const list = universalLightboxState.activeList;
  if (list.length <= 1) return;
  universalLightboxState.currentIndex = (universalLightboxState.currentIndex + delta + list.length) % list.length;
  updateUniversalLightboxPhoto();
}

window.UniversalLightbox = {
  open: openUniversalLightbox,
  close: closeUniversalLightbox
};

/* ==========================================================================
   Card Generators with Hover Zoom and Wide Click Triggers
   ========================================================================== */

function createFacilityCard(facility, index) {
  const safeName = escapeHtml(facility.name || "School Facility");
  const safeDesc = escapeHtml(facility.description || "");
  const fullImg = sanitizeImageUrl(facility.image);
  const safeFullImg = escapeHtml(fullImg);
  const safeThumbImg = escapeHtml(toThumbUrl(fullImg));
  const onerrorAttr = getMediaOnerrorAttr();

  return `
    <article class="facility-card" data-idx="${index}">
      <div class="card-media-wrap zoomable-img-trigger" data-title="${safeName}" data-caption="${safeDesc}" data-full-src="${safeFullImg}" role="button" tabindex="0" aria-label="View ${safeName} photograph widely">
        <img src="${safeThumbImg}" data-full-src="${safeFullImg}" alt="${safeName}" width="1200" height="800" loading="lazy" decoding="async" onerror="${onerrorAttr}">
        <span class="zoom-cue-badge">View Widely</span>
      </div>
      <div class="facility-copy">
        <h3>${safeName}</h3>
        <p>${safeDesc}</p>
      </div>
    </article>
  `;
}

function createEventCard(event, index) {
  const safeTitle = escapeHtml(event.title || "School Event");
  const safeDesc = escapeHtml(event.description || "");
  const safeCategory = escapeHtml(event.category || "");
  const fullCover = sanitizeImageUrl(event.cover);
  const safeFullCover = escapeHtml(fullCover);
  const safeThumbCover = escapeHtml(toThumbUrl(fullCover));
  const onerrorAttr = getMediaOnerrorAttr();
  const eventLink = `event-photos.html?id=${encodeURIComponent(event.id || String(index))}`;
  const photoCount = Array.isArray(event.photos) ? event.photos.length : 0;

  return `
    <article class="event-card" id="event-${escapeHtml(event.id || String(index))}">
      <div class="card-media-wrap zoomable-img-trigger" data-title="${safeTitle}" data-caption="${safeDesc}" data-full-src="${safeFullCover}" role="button" tabindex="0" aria-label="View ${safeTitle} photograph widely">
        <img src="${safeThumbCover}" data-full-src="${safeFullCover}" alt="${safeTitle}" width="1200" height="800" loading="lazy" decoding="async" onerror="${onerrorAttr}">
        <span class="zoom-cue-badge">View Widely</span>
      </div>
      <div class="event-copy">
        ${safeCategory ? `<p class="event-date">${safeCategory}</p>` : ""}
        <h3><a href="${eventLink}">${safeTitle}</a></h3>
        <p>${safeDesc}</p>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
          <a class="button button-blue" href="${eventLink}">
            Show Photos (${photoCount}) ↗
          </a>
          <button type="button" class="btn-quick-zoom" data-event-idx="${index}" aria-label="View full photo of ${safeTitle}">
            Full Photo
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFacilities(targetId, limit, homeOnly = false) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const items = getMediaFacilities({ limit, homeOnly });
  if (!items.length) {
    renderMediaPlaceholder(target, {
      loadingText: "Loading facilities...",
      errorText: "Unable to load facilities right now.",
      emptyText: "No facilities have been published yet."
    });
    return;
  }

  target.classList.remove("is-empty");
  target.innerHTML = items.map((f, i) => createFacilityCard(f, i)).join("");
  bindAllZoomableImages();
}

function renderEvents(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const items = getMediaEvents({ limit });
  if (!items.length) {
    renderMediaPlaceholder(target, {
      loadingText: "Loading events...",
      errorText: "Unable to load events right now.",
      emptyText: "No past events have been published yet."
    });
    return;
  }

  target.classList.remove("is-empty");
  target.innerHTML = items.map((event, index) => createEventCard(event, index)).join("");
  bindAllZoomableImages();
}

function renderEventAlbums() {
  const target = document.getElementById("all-events");
  if (!target) return;

  const events = getMediaEvents();
  if (!events.length) {
    renderMediaPlaceholder(target, {
      loadingText: "Loading past events...",
      errorText: "Unable to load past events right now.",
      emptyText: "No past events have been added yet."
    });
    return;
  }

  target.classList.remove("is-empty");
  target.innerHTML = events.map((event, index) => createEventCard(event, index)).join("");
  bindAllZoomableImages();
}

let activeCampusGalleryCategory = "all";

function renderCampusGallery() {
  const section = document.getElementById("campus-gallery-section");
  const grid = document.getElementById("campus-gallery-photos");
  const filterWrap = document.getElementById("campus-gallery-filters");
  if (!grid) return;

  const allPhotos = getMediaGalleryPhotos();

  if (!allPhotos.length) {
    if (!mediaStoreSettled) {
      if (section) section.style.display = "";
      renderMediaPlaceholder(grid, {
        loadingText: "Loading gallery photos...",
        errorText: "Unable to load gallery photos right now.",
        emptyText: ""
      });
      return;
    }
    if (section) section.style.display = "none";
    grid.classList.add("is-empty");
    grid.innerHTML = "";
    return;
  }

  if (section) section.style.display = "";

  const categories = [
    ...new Set(allPhotos.map(item => (item.category || "").trim()).filter(Boolean))
  ];

  if (
    activeCampusGalleryCategory !== "all" &&
    !categories.some(c => c.toLowerCase() === activeCampusGalleryCategory.toLowerCase())
  ) {
    activeCampusGalleryCategory = "all";
  }

  if (filterWrap) {
    if (categories.length > 1) {
      filterWrap.style.display = "flex";
      filterWrap.innerHTML = `
        <button type="button" class="gallery-filter-pill ${activeCampusGalleryCategory === "all" ? "active" : ""}" data-gallery-cat="all">
          All Photos (${allPhotos.length})
        </button>
        ${categories
          .map(cat => {
            const active =
              activeCampusGalleryCategory.toLowerCase() === cat.toLowerCase();
            return `
              <button type="button" class="gallery-filter-pill ${active ? "active" : ""}" data-gallery-cat="${escapeHtml(cat)}">
                ${escapeHtml(cat)}
              </button>`;
          })
          .join("")}
      `;

      filterWrap.querySelectorAll(".gallery-filter-pill").forEach(btn => {
        btn.addEventListener("click", () => {
          activeCampusGalleryCategory = btn.dataset.galleryCat || "all";
          renderCampusGallery();
        });
      });
    } else {
      filterWrap.style.display = "none";
      filterWrap.innerHTML = "";
    }
  }

  const visiblePhotos =
    activeCampusGalleryCategory === "all"
      ? allPhotos
      : allPhotos.filter(
          item =>
            (item.category || "").toLowerCase() ===
            activeCampusGalleryCategory.toLowerCase()
        );

  grid.classList.toggle("is-empty", !visiblePhotos.length);
  const onerrorAttr = getMediaOnerrorAttr();
  grid.innerHTML = visiblePhotos
    .map((photo, idx) => {
      const safeTitle = escapeHtml(photo.title || photo.category || "Campus Photo");
      const safeCategory = escapeHtml(photo.category || "Campus Life");
      const safeCaption = escapeHtml(photo.caption || "");
      const fullImg = sanitizeImageUrl(photo.image);
      const safeFullImg = escapeHtml(fullImg);
      const safeThumbImg = escapeHtml(toThumbUrl(fullImg));

      return `
        <article class="campus-gallery-card" data-idx="${idx}" data-title="${safeTitle}" data-caption="${safeCaption || safeCategory}">
          <div class="card-media-wrap zoomable-img-trigger" data-full-src="${safeFullImg}" role="button" tabindex="0" aria-label="View ${safeTitle} widely">
            <img src="${safeThumbImg}" data-full-src="${safeFullImg}" alt="${safeTitle}" width="1200" height="800" loading="lazy" decoding="async" onerror="${onerrorAttr}">
            <span class="zoom-cue-badge">View Widely</span>
          </div>
          ${(photo.title || photo.caption || photo.category) ? `
            <div class="campus-gallery-copy">
              <span class="campus-gallery-cat">${safeCategory}</span>
              ${photo.title ? `<h3>${safeTitle}</h3>` : ""}
              ${photo.caption ? `<p>${safeCaption}</p>` : ""}
            </div>` : ""}
        </article>`;
    })
    .join("");

  bindAllZoomableImages();
}

/**
 * Dedicated Event Photos Page Renderer
 */
function renderSingleEventPage() {
  const target = document.getElementById("single-event-photos");
  if (!target) return;

  const events = getMediaEvents();
  if (!events.length) {
    renderMediaPlaceholder(target, {
      loadingText: "Loading event photographs...",
      errorText: "Unable to load event photographs right now.",
      emptyText: "No event photographs found.",
      padding: "40px 12px"
    });
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  let eventParam = urlParams.get("id");
  if (eventParam === null) {
    eventParam = urlParams.get("event");
  }

  let eventIndex = 0;
  if (eventParam !== null) {
    const foundById = events.findIndex(e => e.id === eventParam);
    if (foundById !== -1) {
      eventIndex = foundById;
    } else {
      const parsed = parseInt(eventParam, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed < events.length) {
        eventIndex = parsed;
      }
    }
  } else if (window.location.hash) {
    const hashVal = window.location.hash.replace(/^#/, "");
    const foundById = events.findIndex(e => e.id === hashVal);
    if (foundById !== -1) {
      eventIndex = foundById;
    } else {
      const hashIndex = parseInt(hashVal.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(hashIndex) && hashIndex >= 0 && hashIndex < events.length) {
        eventIndex = hashIndex;
      }
    }
  }

  const currentEvent = events[eventIndex];
  if (!currentEvent) return;

  // Update hero elements
  document.title = `${currentEvent.title} Photos | Prime Focus Schools`;
  const titleEl = document.getElementById("event-title");
  const descEl = document.getElementById("event-description");
  const countEl = document.getElementById("event-photo-count");
  const eyebrowEl = document.getElementById("event-eyebrow");

  const photoItems = Array.isArray(currentEvent.photoItems) && currentEvent.photoItems.length
    ? currentEvent.photoItems
    : (currentEvent.photos || []).map(src => ({ image: src, caption: "" }));

  if (titleEl) titleEl.textContent = currentEvent.title;
  if (descEl) descEl.textContent = currentEvent.description;
  if (countEl) countEl.textContent = photoItems.length;
  if (eyebrowEl && currentEvent.category) eyebrowEl.textContent = currentEvent.category.toUpperCase();

  // Render photo cards for ONLY this event
  target.classList.toggle("is-empty", !photoItems.length);
  const onerrorAttr = getMediaOnerrorAttr();
  if (!photoItems.length) {
    target.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 40px 12px;">
        Photos for this event will be uploaded soon.
      </p>`;
  } else {
    target.innerHTML = photoItems.map((photo, pIdx) => {
      const fullSrc = sanitizeImageUrl(photo.image);
      const safeFullSrc = escapeHtml(fullSrc);
      const safeThumbSrc = escapeHtml(toThumbUrl(fullSrc));
      const safeCaption = escapeHtml(photo.caption || "");
      const safeAlt = escapeHtml(
        photo.caption || `${currentEvent.title} photo ${pIdx + 1}`
      );
      const priorityAttrs =
        pIdx < 3
          ? 'decoding="async"'
          : 'loading="lazy" decoding="async"';

      return `
        <div class="photo-card" data-index="${pIdx}" data-caption="${safeCaption}" data-full-src="${safeFullSrc}" role="button" tabindex="0" aria-label="View photograph ${pIdx + 1} of ${photoItems.length} widely">
          <img src="${safeThumbSrc}" data-full-src="${safeFullSrc}" alt="${safeAlt}" width="1200" height="800" ${priorityAttrs} onerror="${onerrorAttr}">
          <span class="zoom-cue-badge">View Widely</span>
          <div class="photo-overlay">
            <span class="photo-badge">${safeCaption ? safeCaption : "View Full Photo"}</span>
          </div>
        </div>
      `;
    }).join("");
  }

  // Render "Other Events" section
  const otherTarget = document.getElementById("other-events");
  if (otherTarget) {
    const otherEvents = events
      .map((ev, idx) => ({ ...ev, originalIndex: idx }))
      .filter((_, idx) => idx !== eventIndex);

    otherTarget.classList.toggle("is-empty", !otherEvents.length);
    otherTarget.innerHTML = otherEvents.map(event => createEventCard(event, event.originalIndex)).join("");
  }

  bindAllZoomableImages();
}

function applySiteMediaSettings() {
  const defaultHeroImage = "images/school-hero.webp";

  const heroSetting = getMediaSetting("hero_banner");
  const heroEl = document.querySelector(".hero");
  if (heroEl && heroSetting && heroSetting.value) {
    const safeHero = sanitizeImageUrl(heroSetting.value, defaultHeroImage);
    if (safeHero === defaultHeroImage || safeHero === `./${defaultHeroImage}`) {
      if (heroEl.style.backgroundImage) {
        heroEl.style.removeProperty("background-image");
      }
    } else {
      const nextBg = `url("${safeHero.replace(/"/g, '\\"')}")`;
      if (heroEl.style.backgroundImage !== nextBg) {
        heroEl.style.backgroundImage = nextBg;
      }
    }
  }

  const pageHeroSetting = getMediaSetting("page_hero_banner");
  const pageHeroEl = document.querySelector(".page-hero");
  if (pageHeroEl && pageHeroSetting && pageHeroSetting.value) {
    const safePageHero = sanitizeImageUrl(pageHeroSetting.value, defaultHeroImage);
    if (
      safePageHero === defaultHeroImage ||
      safePageHero === `./${defaultHeroImage}`
    ) {
      if (pageHeroEl.style.backgroundImage) {
        pageHeroEl.style.removeProperty("background-image");
      }
    } else {
      const nextBg = `url("${safePageHero.replace(/"/g, '\\"')}")`;
      if (pageHeroEl.style.backgroundImage !== nextBg) {
        pageHeroEl.style.backgroundImage = nextBg;
      }
    }
  }

  const principalSetting = getMediaSetting("principal_portrait");
  const principalImg = document.querySelector(".principal-photo img");
  if (principalImg && principalSetting && principalSetting.value) {
    const safePrincipal = sanitizeImageUrl(
      principalSetting.value,
      "images/principal-pfs.webp"
    );
    if (principalImg.getAttribute("src") !== safePrincipal) {
      principalImg.src = safePrincipal;
    }
    if (principalSetting.caption) {
      principalImg.dataset.caption = principalSetting.caption;
    }
  }
}

function renderAllMediaSections() {
  applySiteMediaSettings();
  renderFacilities("home-facilities", 3, true);
  renderFacilities("all-facilities");

  renderEvents("home-events", 3);
  renderEvents("gallery-events");
  renderEventAlbums();
  renderCampusGallery();
  renderSingleEventPage();
}

function bindKeyboardTrigger(el, handler) {
  if (!el || el._keyBound) return;
  el._keyBound = true;
  el.addEventListener("keydown", e => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handler(e);
    }
  });
}

/**
 * Universal Image Zoom Binder
 * Binds click & touch listeners to all zoomable images across every page.
 */
function bindAllZoomableImages() {
  ensureLightboxModal();

  const closeBtn = document.getElementById("lightbox-close");
  const backdrop = document.getElementById("lightbox-backdrop");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");

  if (closeBtn) closeBtn.onclick = closeUniversalLightbox;
  if (backdrop) backdrop.onclick = closeUniversalLightbox;
  if (prevBtn) prevBtn.onclick = e => { e.stopPropagation(); stepUniversalLightbox(-1); };
  if (nextBtn) nextBtn.onclick = e => { e.stopPropagation(); stepUniversalLightbox(1); };

  if (!window._pfsLightboxKeyBound) {
    window.addEventListener("keydown", e => {
      if (!universalLightboxState.isOpen) return;
      if (e.key === "Escape") {
        closeUniversalLightbox();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        stepUniversalLightbox(-1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        stepUniversalLightbox(1);
        return;
      }
      if (e.key === "Tab") {
        const lightbox = document.getElementById("lightbox");
        const focusables = getLightboxFocusableElements(lightbox);
        if (!focusables.length) {
          e.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey) {
          if (
            document.activeElement === first ||
            !lightbox.contains(document.activeElement)
          ) {
            e.preventDefault();
            last.focus();
          }
        } else if (
          document.activeElement === last ||
          !lightbox.contains(document.activeElement)
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    });
    window._pfsLightboxKeyBound = true;
  }

  // 1. Facility Cards
  document.querySelectorAll(".facility-card").forEach((card, idx, all) => {
    const trigger = card.querySelector(".zoomable-img-trigger") || card.querySelector("img");
    if (trigger && !trigger._bound) {
      trigger._bound = true;
      trigger.style.cursor = "zoom-in";
      const openFacility = () => {
        const list = Array.from(all).map(c => {
          const trg = c.querySelector(".zoomable-img-trigger");
          const img = c.querySelector("img");
          const title = c.querySelector("h3") ? c.querySelector("h3").textContent : "";
          const desc = c.querySelector("p") ? c.querySelector("p").textContent : "";
          return {
            src: getFullZoomSrc(trg, img),
            title: `PFS Facility: ${title}`,
            caption: desc
          };
        });
        openUniversalLightbox(list, idx);
      };
      trigger.addEventListener("click", openFacility);
      bindKeyboardTrigger(trigger, openFacility);
    }
  });

  // 2. Event Cards & Quick Zoom
  document.querySelectorAll(".event-card").forEach((card, idx, all) => {
    const trigger = card.querySelector(".card-media-wrap") || card.querySelector("img");
    const zoomBtn = card.querySelector(".btn-quick-zoom");

    const handleZoom = e => {
      if (e) e.preventDefault();
      const list = Array.from(all).map(c => {
        const trg = c.querySelector(".card-media-wrap");
        const img = c.querySelector("img");
        const title = c.querySelector("h3") ? c.querySelector("h3").textContent : "";
        const desc = c.querySelector("p") ? c.querySelector("p").textContent : "";
        return {
          src: getFullZoomSrc(trg, img),
          title: `PFS Event: ${title}`,
          caption: desc
        };
      });
      openUniversalLightbox(list, idx);
    };

    if (trigger && !trigger._bound) {
      trigger._bound = true;
      trigger.style.cursor = "zoom-in";
      trigger.addEventListener("click", handleZoom);
      bindKeyboardTrigger(trigger, handleZoom);
    }
    if (zoomBtn && !zoomBtn._bound) {
      zoomBtn._bound = true;
      zoomBtn.addEventListener("click", handleZoom);
    }
  });

  // 3. Campus Gallery Cards
  document.querySelectorAll(".campus-gallery-card").forEach((card, idx, all) => {
    const trigger = card.querySelector(".zoomable-img-trigger") || card.querySelector("img");
    if (trigger && !trigger._bound) {
      trigger._bound = true;
      trigger.style.cursor = "zoom-in";
      const openCampusPhoto = () => {
        const list = Array.from(all).map(c => {
          const trg = c.querySelector(".zoomable-img-trigger");
          const img = c.querySelector("img");
          const title = c.dataset.title || "Prime Focus Schools Gallery";
          const caption = c.dataset.caption || "";
          return { src: getFullZoomSrc(trg, img), title, caption };
        });
        openUniversalLightbox(list, idx);
      };
      trigger.addEventListener("click", openCampusPhoto);
      bindKeyboardTrigger(trigger, openCampusPhoto);
    }
  });

  // 4. Principal Photo on Home and About pages
  document.querySelectorAll(".principal-photo").forEach(photoWrap => {
    if (!photoWrap._bound) {
      photoWrap._bound = true;
      photoWrap.style.cursor = "zoom-in";
      const openPrincipal = () => {
        const img = photoWrap.querySelector("img");
        if (img) {
          openUniversalLightbox([{
            src: getFullZoomSrc(photoWrap, img),
            title: "Principal - Prime Focus Schools",
            caption: img.dataset.caption || "Every child deserves a future full of possibility. Glorify God Always."
          }], 0);
        }
      };
      photoWrap.addEventListener("click", openPrincipal);
      bindKeyboardTrigger(photoWrap, openPrincipal);
    }
  });

  // 5. Single Event Photo Album Gallery (event-photos.html)
  document.querySelectorAll(".photo-card").forEach((card, idx, all) => {
    if (!card._bound) {
      card._bound = true;
      card.style.cursor = "zoom-in";
      const openEventPhoto = () => {
        const eventTitle = document.getElementById("event-title") ? document.getElementById("event-title").textContent : "School Event";
        const list = Array.from(all).map((c, i) => {
          const img = c.querySelector("img");
          const customCaption = c.dataset.caption;
          return {
            src: getFullZoomSrc(c, img),
            title: eventTitle,
            caption: customCaption || `Photo ${i + 1} of ${all.length}`
          };
        });
        openUniversalLightbox(list, idx);
      };
      card.addEventListener("click", openEventPhoto);
      bindKeyboardTrigger(card, openEventPhoto);
    }
  });

  // 6. Blog Featured Image, Cards & Article Covers
  document.querySelectorAll(".featured-card-media, .blog-card-media, .post-hero-image-wrap").forEach(wrap => {
    if (!wrap._bound) {
      wrap._bound = true;
      wrap.style.cursor = "zoom-in";
      const openBlogMedia = () => {
        const img = wrap.querySelector("img");
        if (img) {
          const article = wrap.closest("article");
          const heading = article ? article.querySelector("h2, h3") : null;
          const title = heading ? heading.textContent : document.title;
          openUniversalLightbox([{
            src: getFullZoomSrc(wrap, img),
            title: title || "Prime Focus Schools Story",
            caption: img.alt || "Article image"
          }], 0);
        }
      };
      wrap.addEventListener("click", openBlogMedia);
      bindKeyboardTrigger(wrap, openBlogMedia);
    }
  });

  // 7. Inline images inside blog post body
  document.querySelectorAll("#post-body-content img").forEach((img, idx, all) => {
    if (!img._bound) {
      img._bound = true;
      img.style.cursor = "zoom-in";
      img.setAttribute("role", "button");
      img.setAttribute("tabindex", "0");
      if (!img.getAttribute("aria-label")) {
        img.setAttribute(
          "aria-label",
          img.alt ? `View ${img.alt} widely` : `View article photo ${idx + 1} widely`
        );
      }
      const openBodyImage = () => {
        const list = Array.from(all).map(im => ({
          src: getFullZoomSrc(im, im),
          title: im.alt || "Article Photo",
          caption: "Prime Focus Schools Blog"
        }));
        openUniversalLightbox(list, idx);
      };
      img.addEventListener("click", openBodyImage);
      bindKeyboardTrigger(img, openBodyImage);
    }
  });
}

window.bindAllZoomableImages = bindAllZoomableImages;

/* ==========================================================================
   Page Initialization & Mobile Navigation
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderAllMediaSections();
  bindAllZoomableImages();

  window.addEventListener("pfs:media-updated", () => {
    mediaStoreSettled = true;
    mediaLoadError = null;
    renderAllMediaSections();
    bindAllZoomableImages();
  });

  if (window.MediaStore && typeof window.MediaStore.ready === "function") {
    window.MediaStore.ready()
      .then(() => {
        mediaStoreSettled = true;
        mediaLoadError = null;
        renderAllMediaSections();
        bindAllZoomableImages();
      })
      .catch(error => {
        mediaStoreSettled = true;
        mediaLoadError = error;
        console.warn("Could not load media from Supabase:", error);
        renderAllMediaSections();
        bindAllZoomableImages();
      });
  } else {
    mediaStoreSettled = true;
    renderAllMediaSections();
  }

  // Mobile Navigation
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.querySelector(".main-nav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = mainNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
      menuToggle.textContent = isOpen ? "✕" : "☰";
    });

    mainNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 720) {
          mainNav.classList.remove("open");
          menuToggle.setAttribute("aria-expanded", "false");
          menuToggle.setAttribute("aria-label", "Open navigation");
          menuToggle.textContent = "☰";
        }
      });
    });
  }

  // Footer Current Year
  document.querySelectorAll(".current-year").forEach(element => {
    element.textContent = new Date().getFullYear();
  });

  // Contact Form Handler: submit enquiries to Supabase
  const contactForm = document.querySelector("#contact-form");
  const formMessage = document.querySelector("#form-message");

  if (contactForm) {
    const contactSupabase =
      (window.MediaStore && typeof window.MediaStore.getClient === "function" && window.MediaStore.getClient()) ||
      (window.BlogStore && typeof window.BlogStore.getClient === "function" && window.BlogStore.getClient()) ||
      window.__pfsSupabaseClient ||
      (window.supabase && typeof window.supabase.createClient === "function"
        ? (window.__pfsSupabaseClient = window.supabase.createClient(
            "https://hztinvahixhvkfhpccrq.supabase.co",
            "sb_publishable_Jx9KPHzuBIbJtG9rBr3MZA_iax1izan"
          ))
        : null);

    contactForm.addEventListener("submit", async event => {
      event.preventDefault();

      const submitButton = contactForm.querySelector(
        'button[type="submit"]'
      );

      const formData = new FormData(contactForm);
      const enquiry = {
        name: String(formData.get("name") || "").trim(),
        email: String(formData.get("email") || "").trim(),
        phone: String(formData.get("tel") || "").trim(),
        message: String(formData.get("message") || "").trim(),
        status: "new"
      };

      if (formMessage) {
        formMessage.textContent = "Sending your enquiry…";
      }
      if (submitButton) submitButton.disabled = true;

      try {
        const { error } = await contactSupabase
          .from("contact_messages")
          .insert(enquiry);

        if (error) throw error;

        contactForm.reset();

        if (formMessage) {
          formMessage.textContent =
            "Thank you. Your enquiry has been sent to Prime Focus Schools.";
        }
      } catch (error) {
        console.error("Contact enquiry submission failed:", error);

        if (formMessage) {
          formMessage.textContent =
            "We couldn’t send your enquiry right now. Please call 08077280802 or email primefocusschools@gmail.com.";
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }
});
