/**
 * Prime Focus Schools - Public Blog Script
 * Powers blog.html, blog-post.html, and homepage blog preview.
 */

(function () {
  "use strict";

  if (typeof BlogStore === "undefined") {
    console.error("BlogStore is required but not loaded.");
    return;
  }

  function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function sanitizeCoverUrl(url) {
    const raw = url || "images/school-1.webp";
    if (typeof sanitizeImageUrl === "function") {
      return sanitizeImageUrl(raw, "images/school-1.webp");
    }
    return raw;
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

  function getInitials(name) {
    if (!name) return "PFS";
    const parts = name
      .replace(/^(Dr\.|Mrs\.|Mr\.|Miss|Rev\.|Chief)\s+/i, "")
      .trim()
      .split(/\s+/);

    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function showToast(message) {
    let toast = document.getElementById("pfs-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "pfs-toast";
      toast.className = "pfs-toast";
      document.body.appendChild(toast);
    }

    toast.innerHTML =
      `<span>✓</span> <span>${escapeHtml(message)}</span>`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3200);
  }

  /* ========================================================================
     Blog Listing Page
     ======================================================================== */

  let blogPageInitialized = false;
  let blogSelectedCategory = "all";
  let blogSelectedTag = null;
  let blogSearchQuery = "";
  let blogSortOrder = "newest";
  let blogStoreSettled = false;
  let blogLoadError = null;
  let singlePostFound = false;
  let singlePostTemplate = null;

  function loadBlogFromSupabase() {
    if (typeof BlogStore.ready !== "function") {
      blogStoreSettled = true;
      return;
    }

    let updatedDuringReady = false;
    const markUpdated = () => {
      updatedDuringReady = true;
    };
    window.addEventListener("pfs:blog-updated", markUpdated, { once: true });

    BlogStore.ready()
      .then(() => {
        window.removeEventListener("pfs:blog-updated", markUpdated);
        blogStoreSettled = true;
        blogLoadError = null;
        const needsNotFoundCheck =
          Boolean(document.getElementById("single-post-content")) &&
          !singlePostFound;
        if (!updatedDuringReady || needsNotFoundCheck) {
          renderAllBlogViews();
        }
      })
      .catch(error => {
        window.removeEventListener("pfs:blog-updated", markUpdated);
        blogStoreSettled = true;
        blogLoadError = error;
        console.error("Could not load blog articles from Supabase:", error);
        renderAllBlogViews();
      });
  }

  function retryBlogLoad() {
    blogStoreSettled = false;
    blogLoadError = null;
    if (singlePostTemplate !== null) {
      const wrapper = document.getElementById("single-post-content");
      if (wrapper) wrapper.innerHTML = singlePostTemplate;
    }
    renderAllBlogViews();
    loadBlogFromSupabase();
  }

  function initBlogPage() {
    const blogGrid = document.getElementById("blog-posts-grid");
    if (!blogGrid) return;

    const featuredContainer =
      document.getElementById("featured-article-container");
    const categoryContainer =
      document.getElementById("category-filter-pills");
    const searchInput = document.getElementById("blog-search-input");
    const searchClearBtn = document.getElementById("search-clear-btn");
    const sortSelect = document.getElementById("blog-sort-select");
    const resultsCountEl = document.getElementById("results-count-text");
    const emptyStateEl = document.getElementById("blog-empty-state");

    function renderCategoryPills() {
      if (!categoryContainer) return;

      const categories = BlogStore.getCategories();
      let html = `
        <button type="button"
          class="category-pill ${blogSelectedCategory === "all" ? "active" : ""}"
          data-category="all">All Stories</button>`;

      categories.forEach(category => {
        const active =
          blogSelectedCategory.toLowerCase() === category.toLowerCase();

        html += `
          <button type="button"
            class="category-pill ${active ? "active" : ""}"
            data-category="${escapeHtml(category)}">
            ${escapeHtml(category)}
          </button>`;
      });

      categoryContainer.innerHTML = html;

      categoryContainer.querySelectorAll(".category-pill").forEach(pill => {
        pill.addEventListener("click", () => {
          blogSelectedCategory = pill.dataset.category;
          blogSelectedTag = null;

          categoryContainer.querySelectorAll(".category-pill")
            .forEach(item => item.classList.remove("active"));

          pill.classList.add("active");
          updateBlogView();
        });
      });
    }

    function createPostCard(post) {
      const readUrl =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const fullCover = sanitizeCoverUrl(post.cover);
      const thumbCover = toThumbUrl(fullCover);

      return `
        <article class="blog-post-card">
          <div class="blog-card-media zoomable-img-trigger"
            data-full-src="${escapeHtml(fullCover)}"
            role="button" tabindex="0"
            aria-label="View ${escapeHtml(post.title)} photo widely">
            <img src="${escapeHtml(thumbCover)}"
              data-full-src="${escapeHtml(fullCover)}"
              alt="${escapeHtml(post.title)}"
              width="1200" height="750"
              loading="lazy" decoding="async"
              onerror="${getMediaOnerrorAttr()}">
            <span class="zoom-cue-badge">View Widely</span>
          </div>
          <div class="blog-card-body">
            <div>
              <span class="article-category-badge">
                ${escapeHtml(post.category || "General")}
              </span>
            </div>
            <h3><a href="${readUrl}">${escapeHtml(post.title)}</a></h3>
            <p class="card-excerpt">${escapeHtml(post.excerpt || "")}</p>
            <div class="blog-card-footer">
              <span class="post-date">
                ${escapeHtml(post.date || "")} ·
                ${escapeHtml(post.readTime || "3 min read")}
              </span>
              <a class="read-more-link" href="${readUrl}">Read ↗</a>
            </div>
          </div>
        </article>`;
    }

    function renderFeaturedCard(post) {
      if (!featuredContainer) return;

      if (!post) {
        featuredContainer.innerHTML = "";
        featuredContainer.classList.add("is-empty");
        return;
      }

      featuredContainer.classList.remove("is-empty");
      const readUrl =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const fullCover = sanitizeCoverUrl(post.cover);
      const thumbCover = toThumbUrl(fullCover);

      featuredContainer.innerHTML = `
        <div class="featured-article-card">
          <div class="featured-card-media zoomable-img-trigger"
            data-full-src="${escapeHtml(fullCover)}"
            role="button" tabindex="0"
            aria-label="View featured story: ${escapeHtml(post.title)} widely">
            <img src="${escapeHtml(thumbCover)}"
              data-full-src="${escapeHtml(fullCover)}"
              alt="${escapeHtml(post.title)}"
              width="1200" height="750"
              loading="lazy" decoding="async"
              onerror="${getMediaOnerrorAttr()}">
            <span class="featured-badge">FEATURED STORY</span>
            <span class="zoom-cue-badge">View Widely</span>
          </div>
          <div class="featured-card-body">
            <span class="article-category-badge">
              ${escapeHtml(post.category || "Highlight")}
            </span>
            <h2><a href="${readUrl}">${escapeHtml(post.title)}</a></h2>
            <p class="excerpt">${escapeHtml(post.excerpt || "")}</p>
            <div class="post-meta-row">
              <span class="meta-author">
                By ${escapeHtml(post.author || "Prime Focus Schools")}
              </span>
              <span class="meta-dot"></span>
              <span>${escapeHtml(post.date || "")}</span>
              <span class="meta-dot"></span>
              <span>${escapeHtml(post.readTime || "4 min read")}</span>
            </div>
            <div>
              <a class="button button-blue" href="${readUrl}">
                Read Full Story ↗
              </a>
            </div>
          </div>
        </div>`;
    }

    function updateBlogView() {
      const posts = BlogStore.getPosts({
        includeDrafts: false,
        category: blogSelectedCategory === "all" ? null : blogSelectedCategory,
        tag: blogSelectedTag,
        search: blogSearchQuery,
        sort: blogSortOrder
      });

      if (!blogStoreSettled && !posts.length) {
        renderFeaturedCard(null);
        if (resultsCountEl) resultsCountEl.textContent = "Loading articles...";
        if (emptyStateEl) emptyStateEl.style.display = "none";
        blogGrid.innerHTML =
          '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 40px 12px;">Loading articles...</p>';
        return;
      }

      if (blogLoadError && !posts.length) {
        renderFeaturedCard(null);
        if (resultsCountEl) {
          resultsCountEl.textContent = "Unable to load articles";
        }
        if (emptyStateEl) emptyStateEl.style.display = "none";
        blogGrid.innerHTML = `
          <div class="blog-empty-state" style="grid-column: 1 / -1; display: block;">
            <h3>Unable to Load Articles</h3>
            <p>We couldn't connect to load articles right now. Please check your connection and try again.</p>
            <button type="button" id="blog-retry-btn" class="button button-blue">Try Again</button>
          </div>`;
        const retryBtn = document.getElementById("blog-retry-btn");
        if (retryBtn) retryBtn.addEventListener("click", retryBlogLoad);
        return;
      }

      let gridPosts = posts;

      if (
        blogSelectedCategory === "all" &&
        !blogSearchQuery &&
        !blogSelectedTag &&
        posts.length
      ) {
        const featured = posts.find(post => post.featured) || posts[0];
        renderFeaturedCard(featured);
        gridPosts = posts.filter(post => post.id !== featured.id);
      } else {
        renderFeaturedCard(null);
      }

      if (resultsCountEl) {
        resultsCountEl.textContent =
          `Showing ${posts.length} ${posts.length === 1 ? "article" : "articles"}`;
      }

      if (!posts.length) {
        blogGrid.innerHTML = "";
        if (emptyStateEl) emptyStateEl.style.display = "block";
      } else {
        if (emptyStateEl) emptyStateEl.style.display = "none";
        blogGrid.innerHTML = gridPosts.map(createPostCard).join("");
      }

      if (window.bindAllZoomableImages) {
        window.bindAllZoomableImages();
      }
    }

    if (!blogPageInitialized) {
      const urlParams = new URLSearchParams(window.location.search);
      blogSelectedCategory = urlParams.get("category") || "all";
      blogSelectedTag = urlParams.get("tag") || null;
      blogSearchQuery = urlParams.get("search") || "";
      blogSortOrder =
        sortSelect && sortSelect.value ? sortSelect.value : "newest";

      if (searchInput) {
        if (blogSearchQuery) {
          searchInput.value = blogSearchQuery;
          if (searchClearBtn) searchClearBtn.classList.add("visible");
        } else if (searchInput.value.trim()) {
          blogSearchQuery = searchInput.value.trim();
          if (searchClearBtn) searchClearBtn.classList.add("visible");
        }

        searchInput.addEventListener("input", event => {
          blogSearchQuery = event.target.value.trim();
          if (searchClearBtn) {
            searchClearBtn.classList.toggle("visible", Boolean(blogSearchQuery));
          }
          updateBlogView();
        });
      }

      if (searchClearBtn) {
        searchClearBtn.addEventListener("click", () => {
          if (searchInput) searchInput.value = "";
          blogSearchQuery = "";
          searchClearBtn.classList.remove("visible");
          updateBlogView();
        });
      }

      if (sortSelect) {
        sortSelect.addEventListener("change", event => {
          blogSortOrder = event.target.value;
          updateBlogView();
        });
      }

      blogPageInitialized = true;
    }

    renderCategoryPills();
    updateBlogView();
  }

  /* ========================================================================
     Individual Article Page
     ======================================================================== */

  function initSinglePostPage() {
    const postWrapper = document.getElementById("single-post-content");
    if (!postWrapper) return;

    if (singlePostTemplate === null) {
      singlePostTemplate = postWrapper.innerHTML;
    }

    singlePostFound = false;

    const params = new URLSearchParams(window.location.search);
    const postParam = params.get("slug") || params.get("id");

    if (!postParam) {
      renderNotFound();
      return;
    }

    const post = BlogStore.getPostByIdOrSlug(postParam);
    if (!post) {
      if (blogStoreSettled) {
        if (blogLoadError) {
          renderLoadError();
        } else {
          renderNotFound();
        }
      } else {
        const categoryBadge = document.getElementById("post-category-badge");
        const dateEl = document.getElementById("post-date-display");
        const readTimeEl = document.getElementById("post-readtime-display");
        const titleEl = document.getElementById("post-title-display");
        const authorName = document.getElementById("post-author-name");
        const authorRole = document.getElementById("post-author-role");
        const bodyEl = document.getElementById("post-body-content");

        if (categoryBadge) categoryBadge.textContent = "Loading";
        if (dateEl) dateEl.textContent = "";
        if (readTimeEl) readTimeEl.textContent = "";
        if (titleEl) titleEl.textContent = "Loading article...";
        if (authorName) authorName.textContent = "Prime Focus Schools";
        if (authorRole) authorRole.textContent = "";
        if (bodyEl) bodyEl.innerHTML = "<p>Loading article...</p>";
      }
      return;
    }

    if (!document.getElementById("post-title-display") && singlePostTemplate !== null) {
      postWrapper.innerHTML = singlePostTemplate;
    }

    singlePostFound = true;
    document.title = `${post.title} | Prime Focus Schools Blog`;

    const breadcrumbCategory =
      document.getElementById("post-breadcrumb-category");
    const breadcrumbTitle =
      document.getElementById("post-breadcrumb-title");
    const categoryBadge = document.getElementById("post-category-badge");
    const dateEl = document.getElementById("post-date-display");
    const readTimeEl = document.getElementById("post-readtime-display");
    const titleEl = document.getElementById("post-title-display");
    const authorAvatar = document.getElementById("post-author-avatar");
    const authorName = document.getElementById("post-author-name");
    const authorRole = document.getElementById("post-author-role");
    const coverImage = document.getElementById("post-cover-image");
    const coverCaption = document.getElementById("post-cover-caption");
    const bodyEl = document.getElementById("post-body-content");
    const tagsEl = document.getElementById("post-tags-list");
    const bioAvatar = document.getElementById("bio-author-avatar");
    const bioName = document.getElementById("bio-author-name");
    const bioRole = document.getElementById("bio-author-role");

    if (breadcrumbCategory) {
      breadcrumbCategory.textContent = post.category || "Articles";
      breadcrumbCategory.href =
        `blog.html?category=${encodeURIComponent(post.category || "")}`;
    }

    if (breadcrumbTitle) breadcrumbTitle.textContent = post.title;
    if (categoryBadge) categoryBadge.textContent = post.category || "General";
    if (dateEl) dateEl.textContent = post.date || "";
    if (readTimeEl) readTimeEl.textContent = post.readTime || "3 min read";
    if (titleEl) titleEl.textContent = post.title;

    const initials = getInitials(post.author);
    if (authorAvatar) authorAvatar.textContent = initials;
    if (authorName) authorName.textContent =
      post.author || "Prime Focus Schools";
    if (authorRole) authorRole.textContent =
      post.authorRole || "Editorial Board";

    if (coverImage) {
      const nextCover = sanitizeCoverUrl(post.cover);
      coverImage.removeAttribute("loading");
      coverImage.fetchPriority = "high";
      coverImage.decoding = "sync";
      coverImage.dataset.fullSrc = nextCover;
      if (coverImage.getAttribute("src") !== nextCover) {
        coverImage.src = nextCover;
      }
      coverImage.alt = post.title;
    }

    if (coverCaption) {
      if (post.coverCaption) {
        coverCaption.textContent = post.coverCaption;
        coverCaption.style.display = "block";
      } else {
        coverCaption.style.display = "none";
      }
    }

    if (bodyEl) {
      bodyEl.innerHTML = post.content || "<p>No content available.</p>";
    }

    if (bioAvatar) bioAvatar.textContent = initials;
    if (bioName) bioName.textContent =
      post.author || "Prime Focus Schools";
    if (bioRole) bioRole.textContent =
      post.authorRole || "Editorial Board";

    if (tagsEl) {
      const container = tagsEl.closest(".post-tags-container");
      if (Array.isArray(post.tags) && post.tags.length) {
        if (container) container.style.display = "";
        tagsEl.innerHTML = post.tags.map(tag =>
          `<a class="tag-badge"
            href="blog.html?tag=${encodeURIComponent(tag)}">
            #${escapeHtml(tag)}
          </a>`
        ).join("");
      } else {
        tagsEl.innerHTML = "";
        if (container) container.style.display = "none";
      }
    }

    setupSocialShare(post);
    setupPostNavigation(post);
    renderRelatedPosts(post);

    if (window.bindAllZoomableImages) {
      window.bindAllZoomableImages();
    }
  }

  function renderNotFound() {
    const wrapper = document.getElementById("single-post-content");
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="blog-empty-state" style="padding:100px 20px">
        <div class="blog-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="8" y1="12" x2="16" y2="12"></line>
          </svg>
        </div>
        <h3>Article Not Found</h3>
        <p>The article may not exist or may have been updated.</p>
        <a class="button button-blue" href="blog.html">
          ← Back to All Articles
        </a>
      </div>`;
  }

  function renderLoadError() {
    const wrapper = document.getElementById("single-post-content");
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="blog-empty-state" style="padding:100px 20px">
        <div class="blog-empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </div>
        <h3>Unable to Load Article</h3>
        <p>We couldn't connect to load this article right now. Please try again.</p>
        <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">
          <button type="button" id="single-post-retry-btn" class="button button-blue">Try Again</button>
          <a class="button button-outline" style="border-color: var(--blue); color: var(--blue); background: transparent;" href="blog.html">
            ← Back to All Articles
          </a>
        </div>
      </div>`;

    const retryBtn = document.getElementById("single-post-retry-btn");
    if (retryBtn) retryBtn.addEventListener("click", retryBlogLoad);
  }

  function setupSocialShare(post) {
    const url = window.location.href;
    const title = post.title;

    const copyButton = document.getElementById("share-btn-copy");
    const whatsapp = document.getElementById("share-btn-whatsapp");
    const xButton = document.getElementById("share-btn-x");
    const facebook = document.getElementById("share-btn-facebook");

    if (copyButton && !copyButton._pfsBound) {
      copyButton._pfsBound = true;
      copyButton.addEventListener("click", async () => {
        const currentUrl = window.location.href;
        if (
          navigator.clipboard &&
          typeof navigator.clipboard.writeText === "function"
        ) {
          try {
            await navigator.clipboard.writeText(currentUrl);
            showToast("Article link copied to clipboard!");
            return;
          } catch (err) {
            // Fall through to non-deprecated manual copy prompt
          }
        }
        showToast("Copy this link manually from your browser address bar.");
      });
    }

    if (whatsapp) {
      whatsapp.href =
        `https://api.whatsapp.com/send?text=${encodeURIComponent(title + " - " + url)}`;
    }

    if (xButton) {
      xButton.href =
        `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`;
    }

    if (facebook) {
      facebook.href =
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    }
  }

  function setupPostNavigation(currentPost) {
    const previous = document.getElementById("nav-prev-post");
    const next = document.getElementById("nav-next-post");
    const posts = BlogStore.getPosts({ sort: "newest" });
    const index = posts.findIndex(post => post.id === currentPost.id);

    function setCard(card, post) {
      if (!card || !post) return;
      card.href =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const title = card.querySelector(".nav-post-title");
      if (title) title.textContent = post.title;
      card.style.visibility = "visible";
    }

    if (index > 0) setCard(previous, posts[index - 1]);
    else if (previous) previous.style.visibility = "hidden";

    if (index >= 0 && index < posts.length - 1) {
      setCard(next, posts[index + 1]);
    } else if (next) {
      next.style.visibility = "hidden";
    }
  }

  function renderRelatedPosts(currentPost) {
    const grid = document.getElementById("related-posts-grid");
    if (!grid) return;

    const section = document.getElementById("related-posts-section");
    const related = BlogStore.getRelatedPosts(currentPost.id, 3);
    if (!related.length) {
      grid.innerHTML = "";
      if (section) section.style.display = "none";
      return;
    }

    if (section) section.style.display = "";

    grid.innerHTML = related.map(post => {
      const url =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const fullCover = sanitizeCoverUrl(post.cover);
      const thumbCover = toThumbUrl(fullCover);

      return `
        <article class="blog-post-card">
          <div class="blog-card-media">
            <a href="${url}">
              <img src="${escapeHtml(thumbCover)}"
                data-full-src="${escapeHtml(fullCover)}"
                alt="${escapeHtml(post.title)}"
                width="1200" height="750"
                loading="lazy" decoding="async"
                onerror="${getMediaOnerrorAttr()}">
            </a>
          </div>
          <div class="blog-card-body">
            <span class="article-category-badge">
              ${escapeHtml(post.category || "General")}
            </span>
            <h3><a href="${url}">${escapeHtml(post.title)}</a></h3>
            <p class="card-excerpt">${escapeHtml(post.excerpt || "")}</p>
            <div class="blog-card-footer">
              <span class="post-date">${escapeHtml(post.date || "")}</span>
              <a class="read-more-link" href="${url}">Read ↗</a>
            </div>
          </div>
        </article>`;
    }).join("");
  }

  /* ========================================================================
     Homepage Blog Preview
     ======================================================================== */

  function initHomeBlogPreview() {
    const container = document.getElementById("home-blog-posts");
    if (!container) return;

    const posts = BlogStore.getPosts({
      includeDrafts: false,
      limit: 3,
      sort: "newest"
    });

    if (!blogStoreSettled && !posts.length) {
      container.classList.remove("is-empty");
      container.innerHTML =
        '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 20px 12px;">Loading latest articles...</p>';
      return;
    }

    if (blogLoadError && !posts.length) {
      container.classList.add("is-empty");
      container.innerHTML =
        '<p style="grid-column: 1 / -1; text-align: center; color: var(--muted); padding: 20px 12px;">Unable to load blog articles right now.</p>';
      return;
    }

    container.classList.toggle("is-empty", !posts.length);
    if (!posts.length) {
      container.innerHTML = "<p>New stories coming soon!</p>";
      return;
    }

    container.innerHTML = posts.map(post => {
      const url =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const fullCover = sanitizeCoverUrl(post.cover);
      const thumbCover = toThumbUrl(fullCover);

      return `
        <article class="event-card blog-home-card">
          <div class="card-media-wrap zoomable-img-trigger"
            data-title="${escapeHtml(post.title)}"
            data-caption="${escapeHtml(post.excerpt || "")}"
            data-full-src="${escapeHtml(fullCover)}"
            role="button" tabindex="0"
            aria-label="View ${escapeHtml(post.title)} photo widely">
            <img src="${escapeHtml(thumbCover)}"
              data-full-src="${escapeHtml(fullCover)}"
              alt="${escapeHtml(post.title)}"
              width="1200" height="750"
              loading="lazy" decoding="async"
              onerror="${getMediaOnerrorAttr()}">
            <span class="zoom-cue-badge">View Widely</span>
          </div>
          <div class="event-copy">
            <p class="event-date">
              ${escapeHtml(post.category || "Article")} ·
              ${escapeHtml(post.date || "")}
            </p>
            <h3><a href="${url}">${escapeHtml(post.title)}</a></h3>
            <p>${escapeHtml(post.excerpt || "")}</p>
            <a class="button button-blue" href="${url}">Read Article ↗</a>
          </div>
        </article>`;
    }).join("");

    if (window.bindAllZoomableImages) {
      window.bindAllZoomableImages();
    }
  }

  /* ========================================================================
     Initialization
     ======================================================================== */

  function renderAllBlogViews() {
    initBlogPage();
    initSinglePostPage();
    initHomeBlogPreview();
  }

  function bootBlog() {
    renderAllBlogViews();
    loadBlogFromSupabase();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootBlog);
  } else {
    bootBlog();
  }

  window.addEventListener("pfs:blog-updated", event => {
    if (event && event.detail && Array.isArray(event.detail.posts)) {
      blogStoreSettled = true;
      blogLoadError = null;
    }
    renderAllBlogViews();
  });
})();