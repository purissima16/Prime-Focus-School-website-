/**
 * Prime Focus Schools - Main JavaScript
 * Includes Universal Lightbox Engine for viewing photos widely on hover or tap.
 */

const facilities = [
  {
    name: "Main Academic Campus",
    description: "Multi-storey purpose-built school building designed for safety, focus, and academic excellence.",
    image: "images/school-2.webp"
  },
  {
    name: "Courtyard & Basketball Court",
    description: "Modern sports court and central courtyard facilitating physical education, recreation, and school assemblies.",
    image: "images/school-1.webp"
  },
  {
    name: "ICT Laboratory",
    description: "A space for technology, digital learning and computer skills.",
    image: "images/ict-lab.webp"
  },
  {
    name: "Physics Laboratory",
    description: "Supporting practical exploration of scientific principles.",
    image: "images/physics-lab.webp"
  },
  {
    name: "Chemistry Laboratory",
    description: "A learning environment for chemistry experiments and discovery.",
    image: "images/chemistry-lab.webp"
  },
  {
    name: "Biology Laboratory",
    description: "Encouraging students to explore life and the natural world.",
    image: "images/biology-lab.webp"
  },
  {
    name: "Technical Drawing",
    description: "A space for technical drawing, design and visual problem-solving.",
    image: "images/td-lab.webp"
  }
];

const events = [
  {
    id: "cultural-day",
    title: "Annual Cultural Day",
    category: "Culture & Heritage",
    description: "A vibrant celebration of rich cultural heritage, diversity, creativity, and school community spirit.",
    cover: "images/events/hausa2.webp",
    photos: [
      "images/events/edo.webp",
      "images/events/efik.webp",
      "images/events/yoruba.webp",
      "images/events/igbo 2.webp",
      "images/events/tiv2.webp",
      "images/events/hausa2.webp",
      "images/events/hausa.webp",
      "images/events/efik1.webp",
      "images/events/hausa1.webp",
      "images/events/igbo1.webp",
      "images/events/tiv1.webp",
    ]
  },
  {
    id: "graduation-day",
    title: "Graduation/Prize-Giving Day",
    category: "Academic & Valedictory",
    description: "Honouring academic excellence, outstanding achievements, dedication, and student personal growth.",
    cover: "images/events/anjola-award.webp",
    photos: [
      "images/events/meeee-award.webp",
      "images/events/adeleye-award.webp",
      "images/events/afoo-award.webp",
      "images/events/anjola-award.webp",
      "images/events/eniayo-award.webp",
       "images/events/david.webp",
      

     
    
      "images/events/divine.webp",
      "images/events/fahamat.webp",
      "images/events/feranmi.webp",
      "images/events/ire.webp",
      "images/events/joseph.webp",
      "images/events/josy.webp",
      "images/events/rebecca.webp",
      "images/events/timiboy.webp",
      "images/events/timigirl.webp",
      "images/events/daniel.webp",
"images/events/myset-award.webp",
      "images/events/angel.webp",
      "images/events/amanda.webp",
      "images/events/betty.webp",
      "images/events/bolu.webp",
      "images/events/fikayo.webp",
      "images/events/ore.webp",
      "images/events/chidera.webp",
      "images/events/dara.webp",
      "images/events/dave.webp",
      "images/events/destiny.webp",
      "images/events/esther.webp",
      "images/events/fola.webp",
      "images/events/halimah.webp",
      "images/events/mariam.webp",
      "images/events/oyin.webp",
      "images/events/taofeek.webp",
      "images/events/temi.webp",
      "images/events/timi.webp",
      "images/events/idk.webp",
      "images/events/idk2.webp",
      "images/events/idk3.webp",
      "images/events/josephine.webp",
  
      "images/events/jss3.webp",
    ]
  },
  {
    id: "activities-competitions",
    title: "Other Activities/Competitions",
    category: "Sports & Competitions",
    description: "Exciting moments of teamwork, healthy sportsmanship, peer collaboration, and school spirit.",
    cover: "images/events/ball.webp",
    photos: [
      "images/events/girlsball.webp",
      "images/events/boysball.webp",
      "images/events/boysteam.webp",
      "images/events/girlsday.webp",
      "images/events/ball.webp",
      "images/events/donald.webp",
      "images/events/rejoice.webp",
    ]
  }
];

/* ==========================================================================
   Universal Lightbox Engine
   Allows images across the entire website to be viewed widely on tap/click.
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

  if (imgEl) {
    imgEl.style.opacity = "0.3";
    const temp = new Image();
    temp.src = item.src;
    temp.onload = () => {
      imgEl.src = item.src;
      imgEl.alt = item.title || "School photograph";
      imgEl.style.opacity = "1";
    };
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
  return `
    <article class="facility-card" data-idx="${index}">
      <div class="card-media-wrap zoomable-img-trigger" data-title="${facility.name}" data-caption="${facility.description}" role="button" tabindex="0" aria-label="View ${facility.name} photograph widely">
        <img src="${facility.image}" alt="${facility.name}" loading="lazy">
        <span class="zoom-cue-badge">🔍 View Widely</span>
      </div>
      <div class="facility-copy">
        <h3>${facility.name}</h3>
        <p>${facility.description}</p>
      </div>
    </article>
  `;
}

function createEventCard(event, index) {
  return `
    <article class="event-card" id="event-${index}">
      <div class="card-media-wrap zoomable-img-trigger" data-title="${event.title}" data-caption="${event.description}" role="button" tabindex="0" aria-label="View ${event.title} photograph widely">
        <img src="${event.cover}" alt="${event.title}" loading="lazy">
        <span class="zoom-cue-badge">🔍 View Widely</span>
      </div>
      <div class="event-copy">
        ${event.category ? `<p class="event-date">${event.category}</p>` : ""}
        <h3><a href="event-photos.html?id=${index}">${event.title}</a></h3>
        <p>${event.description}</p>
        <div style="display: flex; gap: 8px; align-items: center; margin-top: 14px; flex-wrap: wrap;">
          <a class="button button-blue" href="event-photos.html?id=${index}">
            Show Photos (${event.photos.length}) ↗
          </a>
          <button type="button" class="btn-quick-zoom" data-event-idx="${index}">
            🔍 Full Photo
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderFacilities(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const items = typeof limit === "number" ? facilities.slice(0, limit) : facilities;
  target.innerHTML = items.map((f, i) => createFacilityCard(f, i)).join("");
  bindAllZoomableImages();
}

function renderEvents(targetId, limit) {
  const target = document.getElementById(targetId);
  if (!target) return;

  const items = typeof limit === "number" ? events.slice(0, limit) : events;
  target.innerHTML = items.map((event, index) => createEventCard(event, index)).join("");
  bindAllZoomableImages();
}

function renderEventAlbums() {
  const target = document.getElementById("all-events");
  if (!target) return;

  target.innerHTML = events.map((event, index) => createEventCard(event, index)).join("");
  bindAllZoomableImages();
}

/**
 * Dedicated Event Photos Page Renderer
 */
function renderSingleEventPage() {
  const target = document.getElementById("single-event-photos");
  if (!target) return;

  const urlParams = new URLSearchParams(window.location.search);
  let eventParam = urlParams.get("id");
  if (eventParam === null) {
    eventParam = urlParams.get("event");
  }

  let eventIndex = 0;
  if (eventParam !== null) {
    const parsed = parseInt(eventParam, 10);
    if (!isNaN(parsed) && parsed >= 0 && parsed < events.length) {
      eventIndex = parsed;
    } else {
      const foundIdx = events.findIndex(e => e.id === eventParam);
      if (foundIdx !== -1) eventIndex = foundIdx;
    }
  } else if (window.location.hash) {
    const hashIndex = parseInt(window.location.hash.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(hashIndex) && hashIndex >= 0 && hashIndex < events.length) {
      eventIndex = hashIndex;
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

  if (titleEl) titleEl.textContent = currentEvent.title;
  if (descEl) descEl.textContent = currentEvent.description;
  if (countEl) countEl.textContent = currentEvent.photos.length;
  if (eyebrowEl && currentEvent.category) eyebrowEl.textContent = currentEvent.category.toUpperCase();

  // Render photo cards for ONLY this event
  target.innerHTML = currentEvent.photos.map((photo, pIdx) => `
    <div class="photo-card" data-index="${pIdx}" role="button" tabindex="0" aria-label="View photograph ${pIdx + 1} of ${currentEvent.photos.length} widely">
      <img src="${photo}" alt="${currentEvent.title} photo ${pIdx + 1}" loading="lazy">
      <span class="zoom-cue-badge">🔍 View Widely</span>
      <div class="photo-overlay">
        <span class="photo-badge">🔍 View Full Photo</span>
      </div>
    </div>
  `).join("");

  // Render "Other Events" section
  const otherTarget = document.getElementById("other-events");
  if (otherTarget) {
    const otherEvents = events
      .map((ev, idx) => ({ ...ev, originalIndex: idx }))
      .filter((_, idx) => idx !== eventIndex);

    otherTarget.innerHTML = otherEvents.map((event) => createEventCard(event, event.originalIndex)).join("");
  }

  bindAllZoomableImages();
}

/**
 * Universal Image Zoom Binder
 * Binds click & touch listeners to all zoomable images across every page.
 */
function bindAllZoomableImages() {
  const lightbox = ensureLightboxModal();

  const closeBtn = document.getElementById("lightbox-close");
  const backdrop = document.getElementById("lightbox-backdrop");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");

  if (closeBtn) closeBtn.onclick = closeUniversalLightbox;
  if (backdrop) backdrop.onclick = closeUniversalLightbox;
  if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); stepUniversalLightbox(-1); };
  if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); stepUniversalLightbox(1); };

  if (!window._pfsLightboxKeyBound) {
    window.addEventListener("keydown", (e) => {
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
      trigger.addEventListener("click", () => {
        const list = Array.from(all).map(c => {
          const img = c.querySelector("img");
          const title = c.querySelector("h3") ? c.querySelector("h3").textContent : "";
          const desc = c.querySelector("p") ? c.querySelector("p").textContent : "";
          return { src: img ? img.src : "", title: `PFS Facility: ${title}`, caption: desc };
        });
        openUniversalLightbox(list, idx);
      });
    }
  });

  // 2. Event Cards & Quick Zoom
  document.querySelectorAll(".event-card").forEach((card, idx, all) => {
    const trigger = card.querySelector(".card-media-wrap") || card.querySelector("img");
    const zoomBtn = card.querySelector(".btn-quick-zoom");

    const handleZoom = (e) => {
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
    }
    if (zoomBtn && !zoomBtn._bound) {
      zoomBtn._bound = true;
      zoomBtn.addEventListener("click", handleZoom);
    }
  });

  // 3. Principal Photo on Home and About pages
  document.querySelectorAll(".principal-photo").forEach(photoWrap => {
    if (!photoWrap._bound) {
      photoWrap._bound = true;
      photoWrap.style.cursor = "zoom-in";
      photoWrap.addEventListener("click", () => {
        const img = photoWrap.querySelector("img");
        if (img) {
          openUniversalLightbox([{
            src: img.src,
            title: "Principal - Prime Focus Schools",
            caption: "Every child deserves a future full of possibility. Glorify God Always."
          }], 0);
        }
      });
    }
  });

  // 4. Single Event Photo Album Gallery (event-photos.html)
  document.querySelectorAll(".photo-card").forEach((card, idx, all) => {
    if (!card._bound) {
      card._bound = true;
      card.style.cursor = "zoom-in";
      card.addEventListener("click", () => {
        const eventTitle = document.getElementById("event-title") ? document.getElementById("event-title").textContent : "School Event";
        const list = Array.from(all).map((c, i) => {
          const img = c.querySelector("img");
          return {
            src: img ? img.src : "",
            title: eventTitle,
            caption: `Photo ${i + 1} of ${all.length}`
          };
        });
        openUniversalLightbox(list, idx);
      });
    }
  });

  // 5. Blog Featured Image, Cards & Article Covers
  document.querySelectorAll(".featured-card-media, .blog-card-media, .post-hero-image-wrap").forEach(wrap => {
    if (!wrap._bound) {
      wrap._bound = true;
      wrap.style.cursor = "zoom-in";
      wrap.addEventListener("click", () => {
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
      });
    }
  });

  // 6. Inline images inside blog post body
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
  renderFacilities("home-facilities", 3);
  renderFacilities("all-facilities");

  renderEvents("home-events", 3);
  renderEvents("gallery-events");
  renderEventAlbums();
  renderSingleEventPage();

  bindAllZoomableImages();

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

    mainNav.querySelectorAll("a").forEach((link) => {
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
  document.querySelectorAll(".current-year").forEach((element) => {
    element.textContent = new Date().getFullYear();
  });

  // Contact Form Handler
  const contactForm = document.querySelector("#contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const message = document.querySelector("#form-message");
      if (message) {
        message.textContent =
          "Thank you! Your enquiry has been recorded. For immediate assistance, please call 08077280802 or email primefocusschools@gmail.com.";
      }
      contactForm.reset();
    });
  }
});