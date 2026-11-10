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

    const urlParams = new URLSearchParams(window.location.search);
    let selectedCategory = urlParams.get("category") || "all";
    let selectedTag = urlParams.get("tag") || null;
    let searchQuery = urlParams.get("search") || "";
    let sortOrder = "newest";

    if (searchInput && searchQuery) {
      searchInput.value = searchQuery;
      if (searchClearBtn) searchClearBtn.classList.add("visible");
    }

    function renderCategoryPills() {
      if (!categoryContainer) return;

      const categories = BlogStore.getCategories();
      let html = `
        <button type="button"
          class="category-pill ${selectedCategory === "all" ? "active" : ""}"
          data-category="all">All Stories</button>`;

      categories.forEach(category => {
        const active =
          selectedCategory.toLowerCase() === category.toLowerCase();

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
          selectedCategory = pill.dataset.category;
          selectedTag = null;

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
      const coverImg = post.cover || "images/school-1.webp";

      return `
        <article class="blog-post-card">
          <div class="blog-card-media zoomable-img-trigger"
            role="button" tabindex="0"
            aria-label="View ${escapeHtml(post.title)} photo widely">
            <img src="${escapeHtml(coverImg)}"
              alt="${escapeHtml(post.title)}" loading="lazy">
            <span class="zoom-cue-badge">🔍 View Widely</span>
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
        return;
      }

      const readUrl =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const coverImg = post.cover || "images/school-1.webp";

      featuredContainer.innerHTML = `
        <div class="featured-article-card">
          <div class="featured-card-media zoomable-img-trigger"
            role="button" tabindex="0"
            aria-label="View featured story: ${escapeHtml(post.title)} widely">
            <img src="${escapeHtml(coverImg)}"
              alt="${escapeHtml(post.title)}" loading="lazy">
            <span class="featured-badge">⭐ FEATURED STORY</span>
            <span class="zoom-cue-badge">🔍 View Widely</span>
          </div>
          <div class="featured-card-body">
            <span class="article-category-badge">
              ${escapeHtml(post.category || "Highlight")}
            </span>
            <h2><a href="${readUrl}">${escapeHtml(post.title)}</a></h2>
            <p class="excerpt">${escapeHtml(post.excerpt || "")}</p>
            <div class="post-meta-row">
              <span class="meta-author">
                ✍ ${escapeHtml(post.author || "Prime Focus Schools")}
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
        category: selectedCategory === "all" ? null : selectedCategory,
        tag: selectedTag,
        search: searchQuery,
        sort: sortOrder
      });

      let gridPosts = posts;

      if (
        selectedCategory === "all" &&
        !searchQuery &&
        !selectedTag &&
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

    if (searchInput) {
      searchInput.addEventListener("input", event => {
        searchQuery = event.target.value.trim();
        if (searchClearBtn) {
          searchClearBtn.classList.toggle("visible", Boolean(searchQuery));
        }
        updateBlogView();
      });
    }

    if (searchClearBtn) {
      searchClearBtn.addEventListener("click", () => {
        if (searchInput) searchInput.value = "";
        searchQuery = "";
        searchClearBtn.classList.remove("visible");
        updateBlogView();
      });
    }

    if (sortSelect) {
      sortSelect.addEventListener("change", event => {
        sortOrder = event.target.value;
        updateBlogView();
      });
    }

    renderCategoryPills();
    updateBlogView();

    window.addEventListener("pfs:blog-updated", () => {
      renderCategoryPills();
      updateBlogView();
    });
  }

  /* ========================================================================
     Individual Article Page
     ======================================================================== */

  function initSinglePostPage() {
    const postWrapper = document.getElementById("single-post-content");
    if (!postWrapper) return;

    const params = new URLSearchParams(window.location.search);
    const postParam = params.get("slug") || params.get("id");

    if (!postParam) {
      renderNotFound();
      return;
    }

    const post = BlogStore.getPostByIdOrSlug(postParam);
    if (!post) {
      renderNotFound();
      return;
    }

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
      coverImage.src = post.cover || "images/school-1.webp";
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
      if (Array.isArray(post.tags) && post.tags.length) {
        tagsEl.innerHTML = post.tags.map(tag =>
          `<a class="tag-badge"
            href="blog.html?tag=${encodeURIComponent(tag)}">
            #${escapeHtml(tag)}
          </a>`
        ).join("");
      } else {
        const container = tagsEl.closest(".post-tags-container");
        if (container) container.style.display = "none";
      }
    }

    setupSocialShare(post);
    setupPostNavigation(post);
    renderRelatedPosts(post);
  }

  function renderNotFound() {
    const wrapper = document.getElementById("single-post-content");
    if (!wrapper) return;

    wrapper.innerHTML = `
      <div class="blog-empty-state" style="padding:100px 20px">
        <div class="blog-empty-icon" style="font-size:50px">📰</div>
        <h3>Article Not Found</h3>
        <p>The article may not exist or may have been updated.</p>
        <a class="button button-blue" href="blog.html">
          ← Back to All Articles
        </a>
      </div>`;
  }

  function setupSocialShare(post) {
    const url = window.location.href;
    const title = post.title;

    const copyButton = document.getElementById("share-btn-copy");
    const whatsapp = document.getElementById("share-btn-whatsapp");
    const xButton = document.getElementById("share-btn-x");
    const facebook = document.getElementById("share-btn-facebook");

    if (copyButton) {
      copyButton.addEventListener("click", () => {
        navigator.clipboard.writeText(url).then(
          () => showToast("Article link copied to clipboard!"),
          () => {
            const input = document.createElement("input");
            input.value = url;
            document.body.appendChild(input);
            input.select();
            document.execCommand("copy");
            input.remove();
            showToast("Article link copied!");
          }
        );
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

    const related = BlogStore.getRelatedPosts(currentPost.id, 3);
    if (!related.length) {
      const section = document.getElementById("related-posts-section");
      if (section) section.style.display = "none";
      return;
    }

    grid.innerHTML = related.map(post => {
      const url =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;

      return `
        <article class="blog-post-card">
          <div class="blog-card-media">
            <a href="${url}">
              <img src="${escapeHtml(post.cover || "images/school-1.webp")}"
                alt="${escapeHtml(post.title)}" loading="lazy">
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

    if (!posts.length) {
      container.innerHTML = "<p>New stories coming soon!</p>";
      return;
    }

    container.innerHTML = posts.map(post => {
      const url =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;
      const cover = post.cover || "images/school-1.webp";

      return `
        <article class="event-card blog-home-card">
          <div class="card-media-wrap zoomable-img-trigger"
            data-title="${escapeHtml(post.title)}"
            data-caption="${escapeHtml(post.excerpt || "")}"
            role="button" tabindex="0">
            <img src="${escapeHtml(cover)}"
              alt="${escapeHtml(post.title)}" loading="lazy">
            <span class="zoom-cue-badge">🔍 View Widely</span>
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

  document.addEventListener("DOMContentLoaded", async () => {
    try {
      await BlogStore.ready();
    } catch (error) {
      console.error("Using cached blog articles because Supabase could not load:", error);
    }

    initBlogPage();
    initSinglePostPage();
    initHomeBlogPreview();
  });

  window.addEventListener("pfs:blog-updated", () => {
    initBlogPage();
    initSinglePostPage();
    initHomeBlogPreview();
  });
})();