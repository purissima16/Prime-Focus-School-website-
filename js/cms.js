/**
 * Prime Focus Schools - CMS Admin Panel Controller
 * Supabase authentication and article management.
 */

(function () {
  "use strict";

  if (typeof BlogStore === "undefined") {
    console.error("BlogStore is required for CMS operation.");
    return;
  }

  const supabaseClient = BlogStore.getClient();

  if (!supabaseClient) {
    console.error("Supabase client is unavailable. Check the script order in cms.html.");
    return;
  }

  const CMS_ADMIN_EMAIL = "chimamandafavour99@gmail.com";

  const $ = id => document.getElementById(id);

  const ICON_PATHS = {
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>',
    view: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    pause: '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    starFilled: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="#F59E0B" stroke="#F59E0B"/>',
    starOutline: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    homeActive: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="currentColor" fill-opacity="0.16" stroke="var(--cms-blue)"/><polyline points="9 22 9 12 15 12 15 22" stroke="var(--cms-blue)"/>',
    homeOutline: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    check: '<polyline points="20 6 9 17 4 12"/>',
    alert: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'
  };

  /**
   * Render a crisp monochrome inline SVG icon for CMS controls.
   */
  function svgIcon(name, size = 15) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ""}</svg>`;
  }

  window.PfsCmsIcons = { svgIcon };

  function escapeHtml(value) {
    if (!value) return "";
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
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
    setTimeout(() => toast.classList.remove("show"), 3500);
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

  async function checkAdmin(userId) {
    const { data, error } = await supabaseClient
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Admin access check failed:", error);
      throw new Error("Could not verify CMS access. Please try again.");
    }

    return Boolean(data);
  }

  const authOverlay = $("cms-auth-overlay");
  const authForm = $("cms-auth-form");
  const authPassInput = $("cms-auth-pass");
  const authErrorMsg = $("cms-auth-error");
  const logoutBtn = $("cms-logout-btn");

  const statTotalPosts = $("stat-total-posts");
  const statPublishedPosts = $("stat-published-posts");
  const statDraftPosts = $("stat-draft-posts");
  const statCategories = $("stat-categories");

  const postsTableBody = $("cms-posts-tbody");
  const cmsSearchInput = $("cms-search-input");
  const cmsCategoryFilter = $("cms-category-filter");
  const cmsStatusFilter = $("cms-status-filter");
  const newPostBtn = $("cms-new-post-btn");

  const editorModal = $("cms-editor-modal");
  const editorCloseBtn = $("cms-editor-close");
  const editorCancelBtn = $("cms-editor-cancel");
  const editorForm = $("cms-editor-form");
  const editorTitle = $("editor-title-text");

  const fieldId = $("field-post-id");
  const fieldTitle = $("field-title");
  const fieldSlug = $("field-slug");
  const fieldCategory = $("field-category");
  const fieldCategoryCustom = $("field-category-custom");
  const fieldStatus = $("field-status");
  const fieldFeatured = $("field-featured");
  const fieldAuthor = $("field-author");
  const fieldAuthorRole = $("field-author-role");
  const fieldDate = $("field-date");
  const fieldCover = $("field-cover");
  const fieldCoverCaption = $("field-cover-caption");
  const fieldCoverFile = $("field-cover-file");
  const coverPreviewImg = $("editor-cover-preview");
  const fieldExcerpt = $("field-excerpt");
  const fieldContent = $("field-content");
  const fieldTags = $("field-tags");
  const wordCountDisplay = $("editor-word-count");

  const tabWrite = $("tab-mode-write");
  const tabPreview = $("tab-mode-preview");
  const previewPane = $("editor-preview-pane");

  const btnExportJson = $("btn-export-json");
  const btnImportJson = $("btn-import-json");
  const fileImportInput = $("file-import-input");
  const btnDownloadJs = $("btn-download-js");
  const btnResetDefaults = $("btn-reset-defaults");
  const btnChangePassword = $("btn-change-password");

  function displayAuthError(message) {
    if (!authErrorMsg) return;
    authErrorMsg.textContent = message;
    authErrorMsg.style.display = "block";
  }

  async function showDashboardForSession(session) {
    if (!session) {
      if (authOverlay) authOverlay.classList.remove("hidden");
      return false;
    }

    const allowed = await checkAdmin(session.user.id);

    if (!allowed) {
      await supabaseClient.auth.signOut();
      if (authOverlay) authOverlay.classList.remove("hidden");
      displayAuthError("This account is not authorized to use the CMS.");
      return false;
    }

    await BlogStore.refresh();

    if (authOverlay) authOverlay.classList.add("hidden");
    if (authErrorMsg) authErrorMsg.style.display = "none";
    loadDashboard();
    window.__pfsCmsAuthReady = true;
    window.dispatchEvent(
      new CustomEvent("pfs:cms-auth-ready", { detail: { session } })
    );
    return true;
  }

  async function checkAuth() {
    if (authOverlay) authOverlay.classList.remove("hidden");

    try {
      const { data, error } = await supabaseClient.auth.getSession();
      if (error) throw error;
      await showDashboardForSession(data.session);
    } catch (error) {
      console.error("CMS session check failed:", error);
      displayAuthError(error.message || "Could not verify your sign-in.");
    }
  }

  if (authForm) {
    authForm.addEventListener("submit", async event => {
      event.preventDefault();

      const password = authPassInput ? authPassInput.value : "";
      if (authErrorMsg) authErrorMsg.style.display = "none";

      if (!password) {
        displayAuthError("Enter your password.");
        return;
      }

      const submitButton = authForm.querySelector('button[type="submit"]');
      if (submitButton) submitButton.disabled = true;

      try {
        const { data, error } =
          await supabaseClient.auth.signInWithPassword({
            email: CMS_ADMIN_EMAIL,
            password
          });

        if (error) {
          throw new Error(
            error.message === "Invalid login credentials"
              ? "Incorrect password. Please try again."
              : error.message
          );
        }

        const allowed = await showDashboardForSession(data.session);

        if (allowed) {
          if (authPassInput) authPassInput.value = "";
          showToast("Signed in successfully to PFS Blog CMS.");
        }
      } catch (error) {
        console.error("CMS sign-in failed:", error);
        displayAuthError(error.message || "Sign-in failed. Please try again.");

        if (authPassInput) {
          authPassInput.focus();
          authPassInput.select();
        }
      } finally {
        if (submitButton) submitButton.disabled = false;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      const { error } = await supabaseClient.auth.signOut();

      if (error) {
        showToast("Could not sign out. Please try again.", "error");
        return;
      }

      showToast("Signed out.");
      setTimeout(() => window.location.reload(), 500);
    });
  }

  function loadDashboard() {
    updateStats();
    populateCategoryDropdowns();
    renderPostsTable();
  }

  function updateStats() {
    const posts = BlogStore.getPosts({ includeDrafts: true });
    const published = posts.filter(post => post.status === "published");
    const drafts = posts.filter(post => post.status === "draft");
    const categories = BlogStore.getAllCategories();

    if (statTotalPosts) statTotalPosts.textContent = posts.length;
    if (statPublishedPosts) statPublishedPosts.textContent = published.length;
    if (statDraftPosts) statDraftPosts.textContent = drafts.length;
    if (statCategories) statCategories.textContent = categories.length;

    const tabBadgeBlog = $("tab-badge-blog");
    if (tabBadgeBlog) tabBadgeBlog.textContent = posts.length;
  }

  function populateCategoryDropdowns() {
    const categories = BlogStore.getAllCategories();

    if (cmsCategoryFilter) {
      const previous = cmsCategoryFilter.value;
      cmsCategoryFilter.innerHTML =
        '<option value="all">All Categories</option>';

      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        cmsCategoryFilter.appendChild(option);
      });

      cmsCategoryFilter.value = previous || "all";
    }

    if (fieldCategory) {
      const previous = fieldCategory.value;
      fieldCategory.innerHTML =
        '<option value="">-- Choose Category or Add New --</option>';

      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        fieldCategory.appendChild(option);
      });

      fieldCategory.insertAdjacentHTML(
        "beforeend",
        '<option value="__new__">+ Enter New Category...</option>'
      );
      fieldCategory.value = previous;
    }
  }

  function renderPostsTable() {
    if (!postsTableBody) return;

    const query = cmsSearchInput ? cmsSearchInput.value.trim() : "";
    const category = cmsCategoryFilter
      ? cmsCategoryFilter.value
      : "all";
    const status = cmsStatusFilter ? cmsStatusFilter.value : "all";

    let posts = BlogStore.getPosts({
      includeDrafts: true,
      category: category === "all" ? null : category,
      search: query,
      sort: "newest"
    });

    if (status !== "all") {
      posts = posts.filter(post => post.status === status);
    }

    if (!posts.length) {
      postsTableBody.innerHTML = `
        <tr>
          <td colspan="7"
            style="text-align:center;padding:40px;color:var(--cms-muted)">
            No articles found matching the current search or filters.
          </td>
        </tr>`;
      return;
    }

    const onerrorAttr = getMediaOnerrorAttr();
    postsTableBody.innerHTML = posts.map(post => {
      const published = post.status === "published";
      const featured = Boolean(post.featured);
      const fullCover = post.cover || "images/school-1.webp";
      const thumbCover = toThumbUrl(fullCover);
      const safeTitle = escapeHtml(post.title || "article");
      const url =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;

      return `
        <tr>
          <td>
            <img src="${escapeHtml(thumbCover)}" alt=""
              data-full-src="${escapeHtml(fullCover)}"
              class="post-thumb-preview"
              width="58" height="42"
              loading="lazy" decoding="async"
              onerror="${onerrorAttr}">
          </td>
          <td class="post-title-cell">
            <span class="post-title-link">${escapeHtml(post.title)}</span>
            <span class="post-excerpt-snippet">
              ${escapeHtml(post.excerpt || "")}
            </span>
          </td>
          <td>
            <span class="article-category-badge" style="font-size:10px">
              ${escapeHtml(post.category || "General")}
            </span>
          </td>
          <td>
            <span class="status-badge ${published ? "published" : "draft"}">
              ${published ? "● Published" : "○ Draft"}
            </span>
          </td>
          <td style="text-align:center">
            <button type="button" class="table-action-btn"
              data-action="feature" data-id="${escapeHtml(post.id)}"
              aria-label="${featured ? `Unfeature ${safeTitle}` : `Feature ${safeTitle}`}"
              title="${featured ? "Unfeature article" : "Feature article"}">
              ${svgIcon(featured ? "starFilled" : "starOutline")}
            </button>
          </td>
          <td>
            <div style="font-size:12px;font-weight:600">
              ${escapeHtml(post.date || "")}
            </div>
            <div style="font-size:11px;color:var(--cms-muted)">
              ${escapeHtml(post.author || "PFS")}
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button type="button" class="table-action-btn"
                data-action="edit" data-id="${escapeHtml(post.id)}"
                aria-label="Edit ${safeTitle}"
                title="Edit Article">${svgIcon("edit")}</button>
              <a href="${url}" target="_blank" rel="noopener"
                class="table-action-btn"
                aria-label="View public article ${safeTitle}"
                title="View Public Article">${svgIcon("view")}</a>
              <button type="button" class="table-action-btn"
                data-action="status" data-id="${escapeHtml(post.id)}"
                aria-label="${published ? `Switch ${safeTitle} to draft` : `Publish ${safeTitle}`}"
                title="${published ? "Switch to Draft" : "Publish Article"}">
                ${svgIcon(published ? "pause" : "play")}
              </button>
              <button type="button" class="table-action-btn btn-delete"
                data-action="delete" data-id="${escapeHtml(post.id)}"
                aria-label="Delete ${safeTitle}"
                title="Delete Article">${svgIcon("trash")}</button>
            </div>
          </td>
        </tr>`;
    }).join("");
  }

  if (postsTableBody) {
    postsTableBody.addEventListener("click", async event => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;

      const id = button.dataset.id;
      const action = button.dataset.action;

      try {
        if (action === "edit") {
          openEditor(id);
        } else if (action === "status") {
          const post = await BlogStore.toggleStatus(id);
          if (post) {
            showToast(`Article status updated to ${post.status}.`);
            loadDashboard();
          }
        } else if (action === "feature") {
          const post = await BlogStore.toggleFeatured(id);
          if (post) {
            showToast(
              post.featured
                ? "Article marked as Featured."
                : "Article un-featured."
            );
            loadDashboard();
          }
        } else if (action === "delete") {
          const post = BlogStore.getPostByIdOrSlug(id);
          const title = post ? post.title : "this article";

          if (confirm(`Permanently delete "${title}"?`)) {
            await BlogStore.deletePost(id);
            showToast("Article deleted successfully.");
            loadDashboard();
          }
        }
      } catch (error) {
        console.error("Article action failed:", error);
        showToast(error.message || "The article action failed.", "error");
      }
    });
  }

  if (cmsSearchInput) {
    cmsSearchInput.addEventListener("input", renderPostsTable);
  }
  if (cmsCategoryFilter) {
    cmsCategoryFilter.addEventListener("change", renderPostsTable);
  }
  if (cmsStatusFilter) {
    cmsStatusFilter.addEventListener("change", renderPostsTable);
  }

  function getDefaultEditorCover() {
    return (
      (coverPreviewImg && coverPreviewImg.dataset && coverPreviewImg.dataset.defaultSrc) ||
      "images/school-1.webp"
    );
  }

  function resetEditorForm() {
    if (editorForm) editorForm.reset();
    if (fieldId) fieldId.value = "";
    if (fieldCategoryCustom) fieldCategoryCustom.style.display = "none";
    if (coverPreviewImg) coverPreviewImg.src = getDefaultEditorCover();
  }

  function openEditor(postId = null) {
    if (!editorModal) return;

    const defaultCover = getDefaultEditorCover();
    populateCategoryDropdowns();
    resetEditorForm();

    if (postId) {
      const post = BlogStore.getPostByIdOrSlug(postId);

      if (!post) {
        showToast("Article not found.", "error");
        return;
      }

      if (editorTitle) editorTitle.textContent = "Edit Article";
      if (fieldId) fieldId.value = post.id;
      if (fieldTitle) fieldTitle.value = post.title || "";
      if (fieldSlug) fieldSlug.value = post.slug || "";

      if (fieldCategory) {
        const exists = Array.from(fieldCategory.options)
          .some(option => option.value === post.category);

        if (exists) {
          fieldCategory.value = post.category;
        } else {
          fieldCategory.value = "__new__";
          if (fieldCategoryCustom) {
            fieldCategoryCustom.value = post.category || "";
            fieldCategoryCustom.style.display = "block";
          }
        }
      }

      if (fieldStatus) fieldStatus.value = post.status || "published";
      if (fieldFeatured) fieldFeatured.checked = Boolean(post.featured);
      if (fieldAuthor) fieldAuthor.value = post.author || "";
      if (fieldAuthorRole) fieldAuthorRole.value = post.authorRole || "";
      if (fieldDate) fieldDate.value = post.date || "";
      if (fieldCover) fieldCover.value = post.cover || "";
      if (fieldCoverCaption) {
        fieldCoverCaption.value = post.coverCaption || "";
      }
      if (coverPreviewImg) {
        coverPreviewImg.removeAttribute("loading");
        coverPreviewImg.removeAttribute("fetchpriority");
        coverPreviewImg.src = post.cover || defaultCover;
      }
      if (fieldExcerpt) fieldExcerpt.value = post.excerpt || "";
      if (fieldContent) fieldContent.value = post.content || "";
      if (fieldTags) {
        fieldTags.value = Array.isArray(post.tags)
          ? post.tags.join(", ")
          : "";
      }
    } else {
      if (editorTitle) editorTitle.textContent = "Create New Article";
      if (fieldAuthor) fieldAuthor.value = "Prime Focus Schools";
      if (fieldAuthorRole) fieldAuthorRole.value = "Editorial Board";
      if (fieldDate) fieldDate.value = BlogStore.formatDate(new Date());
      if (fieldCover) fieldCover.value = defaultCover;
      if (coverPreviewImg) {
        coverPreviewImg.removeAttribute("loading");
        coverPreviewImg.removeAttribute("fetchpriority");
        coverPreviewImg.src = defaultCover;
      }
      if (fieldStatus) fieldStatus.value = "published";
    }

    updateWordCount();
    setEditorTab("write");
    editorModal.classList.add("open");
    if (fieldTitle) fieldTitle.focus();
  }

  function closeEditor() {
    if (editorModal) editorModal.classList.remove("open");
  }

  if (newPostBtn) newPostBtn.addEventListener("click", () => openEditor());
  if (editorCloseBtn) editorCloseBtn.addEventListener("click", closeEditor);
  if (editorCancelBtn) editorCancelBtn.addEventListener("click", closeEditor);

  if (fieldTitle) {
    fieldTitle.addEventListener("input", event => {
      if ((!fieldId || !fieldId.value) && fieldSlug) {
        fieldSlug.value = BlogStore.slugify(event.target.value);
      }
    });
  }

  if (fieldCategory) {
    fieldCategory.addEventListener("change", event => {
      if (!fieldCategoryCustom) return;

      const custom = event.target.value === "__new__";
      fieldCategoryCustom.style.display = custom ? "block" : "none";
      if (custom) fieldCategoryCustom.focus();
    });
  }

  if (fieldCover) {
    fieldCover.addEventListener("input", event => {
      if (coverPreviewImg) {
        coverPreviewImg.src =
          event.target.value || getDefaultEditorCover();
      }
    });
  }

  document.querySelectorAll(".quick-img-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      if (fieldCover) fieldCover.value = chip.dataset.src;
      if (coverPreviewImg) coverPreviewImg.src = chip.dataset.src;
    });
  });

  if (fieldCoverFile) {
    fieldCoverFile.addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      if (
        window.MediaStore &&
        typeof window.MediaStore.uploadImageWithInfo === "function"
      ) {
        try {
          showToast("Uploading cover photo...");
          const uploaded = await window.MediaStore.uploadImageWithInfo(file, "blog");
          if (fieldCover) fieldCover.value = uploaded.url;
          if (coverPreviewImg) coverPreviewImg.src = uploaded.url;
          showToast(
            uploaded.usedFallback
              ? "Image optimized locally. Save the article to keep the change."
              : "Cover photo uploaded to Supabase Storage! Save the article to keep it."
          );
          fieldCoverFile.value = "";
          return;
        } catch (err) {
          console.warn("Falling back to Data URL for blog cover:", err);
        }
      }

      const reader = new FileReader();
      reader.onload = loadEvent => {
        const dataUrl = loadEvent.target.result;
        if (fieldCover) fieldCover.value = dataUrl;
        if (coverPreviewImg) coverPreviewImg.src = dataUrl;
        showToast("Image loaded. Save the article to keep the change.");
      };
      reader.readAsDataURL(file);
    });
  }

  function updateWordCount() {
    if (!fieldContent || !wordCountDisplay) return;

    const text = fieldContent.value.replace(/<[^>]*>/g, " ").trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    const minutes = Math.max(1, Math.round(words / 200));

    wordCountDisplay.textContent = `${words} words · ~${minutes} min read`;
  }

  if (fieldContent) {
    fieldContent.addEventListener("input", updateWordCount);
  }

  function setEditorTab(mode) {
    const preview = mode === "preview";

    if (tabWrite) tabWrite.classList.toggle("active", !preview);
    if (tabPreview) tabPreview.classList.toggle("active", preview);
    if (fieldContent) {
      fieldContent.style.display = preview ? "none" : "block";
    }

    if (previewPane) {
      if (preview) {
        previewPane.innerHTML =
          (fieldContent && fieldContent.value) ||
          "<p><em>No content to preview.</em></p>";
        previewPane.classList.add("active");
      } else {
        previewPane.classList.remove("active");
      }
    }
  }

  if (tabWrite) {
    tabWrite.addEventListener("click", () => setEditorTab("write"));
  }
  if (tabPreview) {
    tabPreview.addEventListener("click", () => setEditorTab("preview"));
  }

  function insertFormat(prefix, suffix = "", defaultText = "Text") {
    if (!fieldContent) return;

    const start = fieldContent.selectionStart;
    const end = fieldContent.selectionEnd;
    const selected =
      fieldContent.value.substring(start, end) || defaultText;

    fieldContent.setRangeText(
      `${prefix}${selected}${suffix}`,
      start,
      end,
      "select"
    );
    fieldContent.focus();
    updateWordCount();
  }

  document.querySelectorAll(".toolbar-btn[data-action]").forEach(button => {
    button.addEventListener("click", () => {
      switch (button.dataset.action) {
        case "bold":
          insertFormat("<strong>", "</strong>", "bold text");
          break;
        case "italic":
          insertFormat("<em>", "</em>", "italic text");
          break;
        case "h2":
          insertFormat("<h2>", "</h2>", "Section Heading");
          break;
        case "h3":
          insertFormat("<h3>", "</h3>", "Subheading");
          break;
        case "quote":
          insertFormat(
            "<blockquote>\n  ",
            "\n</blockquote>",
            "Inspiring quotation goes here..."
          );
          break;
        case "ul":
          insertFormat(
            "<ul>\n  <li>",
            "</li>\n  <li>Second item</li>\n</ul>",
            "First item"
          );
          break;
        case "ol":
          insertFormat(
            "<ol>\n  <li>",
            "</li>\n  <li>Second item</li>\n</ol>",
            "First step"
          );
          break;
        case "callout":
          insertFormat(
            '<div class="blog-callout">\n  <h4>Important Notice</h4>\n  <p>',
            "</p>\n</div>",
            "Callout text details here."
          );
          break;
        case "link": {
          const url = prompt("Enter URL:", "https://");
          if (url) {
            insertFormat(
              `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">`,
              "</a>",
              "link text"
            );
          }
          break;
        }
        case "hr":
          insertFormat("<hr>\n", "", "");
          break;
      }
    });
  });

  if (editorForm) {
    editorForm.addEventListener("submit", async event => {
      event.preventDefault();

      const title = fieldTitle ? fieldTitle.value.trim() : "";
      if (!title) {
        showToast("Article title is required.", "error");
        return;
      }

      let category = fieldCategory ? fieldCategory.value : "General";
      if (category === "__new__") {
        category =
          (fieldCategoryCustom && fieldCategoryCustom.value.trim()) ||
          "General";
      }

      const saveButton = document.querySelector(
        'button[form="cms-editor-form"][type="submit"]'
      );
      if (saveButton) saveButton.disabled = true;

      try {
        const saved = await BlogStore.savePost({
          id: fieldId && fieldId.value ? fieldId.value : null,
          title,
          slug: fieldSlug ? fieldSlug.value : "",
          category,
          status: fieldStatus ? fieldStatus.value : "published",
          featured: fieldFeatured ? fieldFeatured.checked : false,
          author:
            (fieldAuthor && fieldAuthor.value.trim()) ||
            "Prime Focus Schools",
          authorRole:
            (fieldAuthorRole && fieldAuthorRole.value.trim()) ||
            "Editorial Board",
          date: fieldDate ? fieldDate.value : "",
          cover: fieldCover
            ? fieldCover.value
            : "images/school-1.webp",
          coverCaption: fieldCoverCaption
            ? fieldCoverCaption.value.trim()
            : "",
          excerpt: fieldExcerpt ? fieldExcerpt.value.trim() : "",
          content: fieldContent ? fieldContent.value : "",
          tags: fieldTags ? fieldTags.value : ""
        });

        showToast(`Article "${saved.title}" saved in Supabase.`);
        closeEditor();
        loadDashboard();
      } catch (error) {
        console.error("Could not save article:", error);
        showToast(error.message || "Could not save the article.", "error");
      } finally {
        if (saveButton) saveButton.disabled = false;
      }
    });
  }

  if (btnExportJson) {
    btnExportJson.addEventListener("click", () => {
      downloadFile(
        BlogStore.exportJSON(),
        `pfs-blog-posts-backup-${new Date().toISOString().slice(0, 10)}.json`,
        "application/json"
      );
      showToast("Article backup exported.");
    });
  }

  if (btnImportJson && fileImportInput) {
    btnImportJson.addEventListener("click", () => fileImportInput.click());

    fileImportInput.addEventListener("change", async event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

      try {
        const contents = await file.text();
        await BlogStore.importJSON(contents);
        showToast("Articles imported into Supabase.");
        loadDashboard();
      } catch (error) {
        console.error("Import failed:", error);
        showToast(error.message || "Could not import articles.", "error");
      } finally {
        fileImportInput.value = "";
      }
    });
  }

  if (btnDownloadJs) {
    btnDownloadJs.addEventListener("click", () => {
      downloadFile(
        BlogStore.generateBlogDataFileCode(),
        "blog-data.js",
        "application/javascript"
      );
      showToast("Blog data file downloaded.");
    });
  }

  if (btnResetDefaults) {
    btnResetDefaults.addEventListener("click", async () => {
      if (!confirm(
        "Replace all current articles with the original sample articles?"
      )) return;

      try {
        await BlogStore.resetToDefaults();
        showToast("Sample articles restored.");
        loadDashboard();
      } catch (error) {
        console.error("Could not reset articles:", error);
        showToast(error.message || "Could not restore sample articles.", "error");
      }
    });
  }

  function openPasswordChangeDialog() {
    const dialog = document.createElement("dialog");

    dialog.style.cssText = `
      width: min(420px, calc(100% - 32px));
      border: 0;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
    `;

    dialog.innerHTML = `
      <form id="cms-password-change-form">
        <h2 style="margin:0 0 8px">Change Admin Password</h2>
        <p style="margin:0 0 18px;color:#64748b">
          Confirm your current password, then choose a new one.
        </p>

        <label for="cms-current-password">Current password</label>
        <input id="cms-current-password" type="password"
          autocomplete="current-password" required
          style="display:block;width:100%;box-sizing:border-box;margin:6px 0 14px;padding:10px">

        <label for="cms-new-password">New password</label>
        <input id="cms-new-password" type="password"
          autocomplete="new-password" minlength="8" required
          style="display:block;width:100%;box-sizing:border-box;margin:6px 0 14px;padding:10px">

        <label for="cms-confirm-password">Confirm new password</label>
        <input id="cms-confirm-password" type="password"
          autocomplete="new-password" minlength="8" required
          style="display:block;width:100%;box-sizing:border-box;margin:6px 0 10px;padding:10px">

        <p id="cms-password-change-error" role="alert"
          style="display:none;color:#b91c1c;margin:0 0 12px"></p>

        <div style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" id="cms-password-cancel">Cancel</button>
          <button type="submit" id="cms-password-submit">
            Change Password
          </button>
        </div>
      </form>
    `;

    document.body.appendChild(dialog);

    const form = dialog.querySelector("#cms-password-change-form");
    const currentInput = dialog.querySelector("#cms-current-password");
    const newInput = dialog.querySelector("#cms-new-password");
    const confirmInput = dialog.querySelector("#cms-confirm-password");
    const errorElement = dialog.querySelector("#cms-password-change-error");
    const submitButton = dialog.querySelector("#cms-password-submit");

    function closeDialog() {
      if (dialog.open) dialog.close();
      dialog.remove();
    }

    dialog.querySelector("#cms-password-cancel")
      .addEventListener("click", closeDialog);

    dialog.addEventListener("click", event => {
      if (event.target === dialog) closeDialog();
    });

    dialog.addEventListener("close", () => dialog.remove());

    form.addEventListener("submit", async event => {
      event.preventDefault();
      errorElement.style.display = "none";

      if (newInput.value.length < 8) {
        errorElement.textContent =
          "The new password must be at least 8 characters.";
        errorElement.style.display = "block";
        return;
      }

      if (newInput.value !== confirmInput.value) {
        errorElement.textContent = "The new passwords do not match.";
        errorElement.style.display = "block";
        confirmInput.focus();
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Updating…";

      try {
        const { error: verifyError } =
          await supabaseClient.auth.signInWithPassword({
            email: CMS_ADMIN_EMAIL,
            password: currentInput.value
          });

        if (verifyError) {
          throw new Error("The current password is incorrect.");
        }

        const { error: updateError } =
          await supabaseClient.auth.updateUser({
            password: newInput.value
          });

        if (updateError) throw updateError;

        closeDialog();
        showToast("Admin password changed successfully.");
      } catch (error) {
        console.error("Password change failed:", error);
        errorElement.textContent =
          error.message || "Could not change the password.";
        errorElement.style.display = "block";
        submitButton.disabled = false;
        submitButton.textContent = "Change Password";
        currentInput.value = "";
        currentInput.focus();
      }
    });

    dialog.showModal();
    currentInput.focus();
  }

  if (btnChangePassword) {
    btnChangePassword.addEventListener(
      "click",
      openPasswordChangeDialog
    );
  }

  document.addEventListener("DOMContentLoaded", checkAuth);
})();