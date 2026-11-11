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
    lower.startsWith("http://") ||
    lower.startsWith("images/") ||
    lower.startsWith("./images/") ||
    lower.startsWith("../images/") ||
    /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=]+$/i.test(raw)
  ) {
    return raw;
  }

  return fallback;
}

function getMediaFacilities(options = {}) {
  if (window.MediaStore && typeof window.MediaStore.getFacilities === "function") {
    return window.MediaStore.getFacilities(options);
  }
  const fallback =
    typeof defaultSiteMedia !== "undefined" && Array.isArray(defaultSiteMedia.facilities)
      ? [...defaultSiteMedia.facilities]
      : [];
  if (options.homeOnly) {
    const home = fallback.filter(f => f.showOnHome);
    return options.limit ? (home.length ? home : fallback).slice(0, options.limit) : home.length ? home : fallback;
  }
  return typeof options.limit === "number" ? fallback.slice(0, options.limit) : fallback;
}

function getMediaEvents(options = {}) {
  if (window.MediaStore && typeof window.MediaStore.getEvents === "function") {
    return window.MediaStore.getEvents(options);
  }
  const fallback =
    typeof defaultSiteMedia !== "undefined" && Array.isArray(defaultSiteMedia.events)
      ? [...defaultSiteMedia.events]
      : [];
  return typeof options.limit === "number" ? fallback.slice(0, options.limit) : fallback;
}

function getMediaGalleryPhotos(options = {}) {
  if (window.MediaStore && typeof window.MediaStore.getGalleryPhotos === "function") {
    return window.MediaStore.getGalleryPhotos(options);
  }
  const fallback =
    typeof defaultSiteMedia !== "undefined" && Array.isArray(defaultSiteMedia.galleryPhotos)
      ? [...defaultSiteMedia.galleryPhotos]
      : [];
  return typeof options.limit === "number" ? fallback.slice(0, options.limit) : fallback;
}

function getMediaSetting(key) {
  if (window.MediaStore && typeof window.MediaStore.getSetting === "function") {
    return window.MediaStore.getSetting(key);
  }
  if (
    typeof defaultSiteMedia !== "undefined" &&
    defaultSiteMedia.settings &&
    defaultSiteMedia.settings[key]
  ) {
    return defaultSiteMedia.settings[key];
  }
  return null;
}

/* ==========================================================================
   Universal Lightbox Engine
   Allows images across the entire website to be viewed widely on hover or tap.
   ========================================================================== */

let universalLightboxState = {
  activeList: [],
  currentIndex: 0,
  isOpen: false
};

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
          <img id="lightbox-img" src="" alt="Enlarged school photograph">
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
  universalLightboxState.activeList = items;
  universalLightboxState.currentIndex = Math.max(0, Math.min(startIndex, items.length - 1));
  universalLightboxState.isOpen = true;

  updateUniversalLightboxPhoto();

  lightbox.hidden = false;
  requestAnimationFrame(() => {
    lightbox.classList.add("active");
  });
  document.body.style.overflow = "hidden";
}

function closeUniversalLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.classList.remove("active");
  universalLightboxState.isOpen = false;
  setTimeout(() => {
    if (!universalLightboxState.isOpen) {
      lightbox.hidden = true;
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
    imgEl.style.opacity = "0.3";
    const temp = new Image();
    temp.onload = () => {
      imgEl.src = safeSrc;
      imgEl.alt = item.title || "School photograph";
      imgEl.style.opacity = "1";
    };
    temp.onerror = () => {
      imgEl.src = safeSrc;
      imgEl.style.opacity = "1";
    };
    temp.src = safeSrc;
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
  const safeImg = escapeHtml(sanitizeImageUrl(facility.image));

  return `
    <article class="facility-card" data-idx="${index}">
      <div class="card-media-wrap zoomable-img-trigger" data-title="${safeName}" data-caption="${safeDesc}" role="button" tabindex="0" aria-label="View ${safeName} photograph widely">
        <img src="${safeImg}" alt="${safeName}" loading="lazy" onerror="this.src='images/school-1.webp'">
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
  const safeCover = escapeHtml(sanitizeImageUrl(event.cover));
  const eventLink = `event-photos.html?id=${encodeURIComponent(event.id || String(index))}`;
  const photoCount = Array.isArray(event.photos) ? event.photos.length : 0;

  return `
    <article class="event-card" id="event-${escapeHtml(event.id || String(index))}">
      <div class="card-media-wrap zoomable-img-trigger" data-title="${safeTitle}" data-caption="${safeDesc}" role="button" tabindex="0" aria-label="View ${safeTitle} photograph widely">
        <img src="${safeCover}" alt="${safeTitle}" loading="lazy" onerror="this.src='images/school-1.webp'">
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
          <button type="button" class="btn-quick-zoom" data-event-idx="${index}">
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
    target.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 30px 12px;">
        No facilities have been published yet.
      </p>`;
    return;
  }

  target.innerHTML = items.map((f, i) => createFacilityCard(f, i)).join("");
  bindAllZoomableImages();
}

function renderEvents(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const items = getMediaEvents({ limit });
  if (!items.length) {
    target.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 30px 12px;">
        No past events have been published yet.
      </p>`;
    return;
  }

  target.innerHTML = items.map((event, index) => createEventCard(event, index)).join("");
  bindAllZoomableImages();
}

function renderEventAlbums() {
  const target = document.getElementById("all-events");
  if (!target) return;

  const events = getMediaEvents();
  if (!events.length) {
    target.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 30px 12px;">
        No past events have been added yet.
      </p>`;
    return;
  }

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
    if (section) section.style.display = "none";
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

  grid.innerHTML = visiblePhotos
    .map((photo, idx) => {
      const safeTitle = escapeHtml(photo.title || photo.category || "Campus Photo");
      const safeCategory = escapeHtml(photo.category || "Campus Life");
      const safeCaption = escapeHtml(photo.caption || "");
      const safeImg = escapeHtml(sanitizeImageUrl(photo.image));

      return `
        <article class="campus-gallery-card" data-idx="${idx}" data-title="${safeTitle}" data-caption="${safeCaption || safeCategory}">
          <div class="card-media-wrap zoomable-img-trigger" role="button" tabindex="0" aria-label="View ${safeTitle} widely">
            <img src="${safeImg}" alt="${safeTitle}" loading="lazy" onerror="this.src='images/school-1.webp'">
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
    target.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 40px 12px;">
        No event photographs found.
      </p>`;
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
  if (!photoItems.length) {
    target.innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 40px 12px;">
        Photos for this event will be uploaded soon.
      </p>`;
  } else {
    target.innerHTML = photoItems.map((photo, pIdx) => {
      const safeSrc = escapeHtml(sanitizeImageUrl(photo.image));
      const safeCaption = escapeHtml(photo.caption || "");
      const safeAlt = escapeHtml(
        photo.caption || `${currentEvent.title} photo ${pIdx + 1}`
      );

      return `
        <div class="photo-card" data-index="${pIdx}" data-caption="${safeCaption}" role="button" tabindex="0" aria-label="View photograph ${pIdx + 1} of ${photoItems.length} widely">
          <img src="${safeSrc}" alt="${safeAlt}" loading="lazy" onerror="this.src='images/school-1.webp'">
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

    otherTarget.innerHTML = otherEvents.map(event => createEventCard(event, event.originalIndex)).join("");
  }

  bindAllZoomableImages();
}

function applySiteMediaSettings() {
  const heroSetting = getMediaSetting("hero_banner");
  const heroEl = document.querySelector(".hero");
  if (heroEl && heroSetting && heroSetting.value) {
    const safeHero = sanitizeImageUrl(heroSetting.value, "images/school-hero.webp");
    heroEl.style.backgroundImage = `url("${safeHero.replace(/"/g, '\\"')}")`;
  }

  const pageHeroSetting = getMediaSetting("page_hero_banner");
  const pageHeroEl = document.querySelector(".page-hero");
  if (pageHeroEl && pageHeroSetting && pageHeroSetting.value) {
    const safePageHero = sanitizeImageUrl(pageHeroSetting.value, "images/school-hero.webp");
    pageHeroEl.style.backgroundImage = `url("${safePageHero.replace(/"/g, '\\"')}")`;
  }

  const principalSetting = getMediaSetting("principal_portrait");
  const principalImg = document.querySelector(".principal-photo img");
  if (principalImg && principalSetting && principalSetting.value) {
    principalImg.src = sanitizeImageUrl(principalSetting.value, "images/principal-pfs.webp");
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
      if (e.key === "Escape") closeUniversalLightbox();
      if (e.key === "ArrowLeft") stepUniversalLightbox(-1);
      if (e.key === "ArrowRight") stepUniversalLightbox(1);
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
          const img = c.querySelector("img");
          const title = c.querySelector("h3") ? c.querySelector("h3").textContent : "";
          const desc = c.querySelector("p") ? c.querySelector("p").textContent : "";
          return { src: img ? img.src : "", title: `PFS Facility: ${title}`, caption: desc };
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
        const img = c.querySelector("img");
        const title = c.querySelector("h3") ? c.querySelector("h3").textContent : "";
        const desc = c.querySelector("p") ? c.querySelector("p").textContent : "";
        return { src: img ? img.src : "", title: `PFS Event: ${title}`, caption: desc };
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
          const img = c.querySelector("img");
          const title = c.dataset.title || "Prime Focus Schools Gallery";
          const caption = c.dataset.caption || "";
          return { src: img ? img.src : "", title, caption };
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
            src: img.src,
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
            src: img ? img.src : "",
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
            src: img.src,
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
      img.addEventListener("click", () => {
        const list = Array.from(all).map(im => ({
          src: im.src,
          title: im.alt || "Article Photo",
          caption: "Prime Focus Schools Blog"
        }));
        openUniversalLightbox(list, idx);
      });
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
    renderAllMediaSections();
    bindAllZoomableImages();
  });

  if (window.MediaStore && typeof window.MediaStore.ready === "function") {
    window.MediaStore.ready()
      .then(() => {
        renderAllMediaSections();
        bindAllZoomableImages();
      })
      .catch(error => {
        console.warn("Could not refresh media from Supabase:", error);
      });
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
      window.MediaStore && typeof window.MediaStore.getClient === "function" && window.MediaStore.getClient()
        ? window.MediaStore.getClient()
        : window.supabase.createClient(
            "https://hztinvahixhvkfhpccrq.supabase.co",
            "sb_publishable_Jx9KPHzuBIbJtG9rBr3MZA_iax1izan",
            {
              auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
              }
            }
          );

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
