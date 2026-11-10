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

  function escapeHtml(value) {
    if (!value) return "";
    const element = document.createElement("div");
    element.textContent = value;
    return element.innerHTML;
  }

  function showToast(message, type = "success") {
    let toast = document.getElementById("cms-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.id = "cms-toast";
      toast.className = "pfs-toast";
      document.body.appendChild(toast);
    }

    const icon = type === "error" ? "⚠" : "✓";
    toast.innerHTML =
      `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
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

  const authOverlay = document.getElementById("cms-auth-overlay");
  const authForm = document.getElementById("cms-auth-form");
  const authPassInput = document.getElementById("cms-auth-pass");
  const authErrorMsg = document.getElementById("cms-auth-error");
  const logoutBtn = document.getElementById("cms-logout-btn");

  const statTotalPosts = document.getElementById("stat-total-posts");
  const statPublishedPosts = document.getElementById("stat-published-posts");
  const statDraftPosts = document.getElementById("stat-draft-posts");
  const statCategories = document.getElementById("stat-categories");

  const postsTableBody = document.getElementById("cms-posts-tbody");
  const cmsSearchInput = document.getElementById("cms-search-input");
  const cmsCategoryFilter = document.getElementById("cms-category-filter");
  const cmsStatusFilter = document.getElementById("cms-status-filter");
  const newPostBtn = document.getElementById("cms-new-post-btn");

  const editorModal = document.getElementById("cms-editor-modal");
  const editorCloseBtn = document.getElementById("cms-editor-close");
  const editorCancelBtn = document.getElementById("cms-editor-cancel");
  const editorForm = document.getElementById("cms-editor-form");
  const editorTitle = document.getElementById("editor-title-text");

  const fieldId = document.getElementById("field-post-id");
  const fieldTitle = document.getElementById("field-title");
  const fieldSlug = document.getElementById("field-slug");
  const fieldCategory = document.getElementById("field-category");
  const fieldCategoryCustom = document.getElementById("field-category-custom");
  const fieldStatus = document.getElementById("field-status");
  const fieldFeatured = document.getElementById("field-featured");
  const fieldAuthor = document.getElementById("field-author");
  const fieldAuthorRole = document.getElementById("field-author-role");
  const fieldDate = document.getElementById("field-date");
  const fieldCover = document.getElementById("field-cover");
  const fieldCoverCaption = document.getElementById("field-cover-caption");
  const fieldCoverFile = document.getElementById("field-cover-file");
  const coverPreviewImg = document.getElementById("editor-cover-preview");
  const fieldExcerpt = document.getElementById("field-excerpt");
  const fieldContent = document.getElementById("field-content");
  const fieldTags = document.getElementById("field-tags");
  const wordCountDisplay = document.getElementById("editor-word-count");

  const tabWrite = document.getElementById("tab-mode-write");
  const tabPreview = document.getElementById("tab-mode-preview");
  const previewPane = document.getElementById("editor-preview-pane");

  const btnExportJson = document.getElementById("btn-export-json");
  const btnImportJson = document.getElementById("btn-import-json");
  const fileImportInput = document.getElementById("file-import-input");
  const btnDownloadJs = document.getElementById("btn-download-js");
  const btnResetDefaults = document.getElementById("btn-reset-defaults");
  const btnChangePassword = document.getElementById("btn-change-password");

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

      const submitButton =
        authForm.querySelector('button[type="submit"]');

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

    postsTableBody.innerHTML = posts.map(post => {
      const published = post.status === "published";
      const featured = Boolean(post.featured);
      const cover = post.cover || "images/school-1.webp";
      const url =
        `blog-post.html?slug=${encodeURIComponent(post.slug || post.id)}`;

      return `
        <tr>
          <td>
            <img src="${escapeHtml(cover)}" alt=""
              class="post-thumb-preview"
              onerror="this.src='images/school-1.webp'">
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
            <button type="button"
              class="table-action-btn"
              data-action="feature"
              data-id="${escapeHtml(post.id)}"
              title="${featured ? "Unfeature article" : "Feature article"}">
              ${featured ? "⭐" : "☆"}
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
                title="Edit Article">✏</button>
              <a href="${url}" target="_blank" rel="noopener"
                class="table-action-btn" title="View Public Article">👁</a>
              <button type="button" class="table-action-btn"
                data-action="status" data-id="${escapeHtml(post.id)}"
                title="${published ? "Switch to Draft" : "Publish Article"}">
                ${published ? "⏸" : "▶"}
              </button>
              <button type="button"
                class="table-action-btn btn-delete"
                data-action="delete" data-id="${escapeHtml(post.id)}"
                title="Delete Article">🗑</button>
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

  function resetEditorForm() {
    if (editorForm) editorForm.reset();
    if (fieldId) fieldId.value = "";
    if (fieldCategoryCustom) fieldCategoryCustom.style.display = "none";
    if (coverPreviewImg) coverPreviewImg.src = "images/school-1.webp";
  }

  function openEditor(postId = null) {
    if (!editorModal) return;

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
        coverPreviewImg.src = post.cover || "images/school-1.webp";
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
      if (fieldCover) fieldCover.value = "images/school-1.webp";
      if (coverPreviewImg) coverPreviewImg.src = "images/school-1.webp";
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

  if (newPostBtn) {
    newPostBtn.addEventListener("click", () => openEditor());
  }

  if (editorCloseBtn) {
    editorCloseBtn.addEventListener("click", closeEditor);
  }

  if (editorCancelBtn) {
    editorCancelBtn.addEventListener("click", closeEditor);
  }

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
          event.target.value || "images/school-1.webp";
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
    fieldCoverFile.addEventListener("change", event => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;

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

      let category = fieldCategory
        ? fieldCategory.value
        : "General";

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
        showToast(
          error.message || "Could not save the article.",
          "error"
        );
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
        showToast(
          error.message || "Could not import articles.",
          "error"
        );
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
      const confirmed = confirm(
        "Replace all current articles with the original sample articles?"
      );

      if (!confirmed) return;

      try {
        await BlogStore.resetToDefaults();
        showToast("Sample articles restored.");
        loadDashboard();
      } catch (error) {
        console.error("Could not reset articles:", error);
        showToast(
          error.message || "Could not restore sample articles.",
          "error"
        );
      }
    });
  }

  if (btnChangePassword) {
    btnChangePassword.addEventListener("click", async () => {
      const newPassword = prompt(
        "Enter a new admin password (at least 8 characters):"
      );

      if (!newPassword) return;

      if (newPassword.trim().length < 8) {
        showToast("Use a password with at least 8 characters.", "error");
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({
        password: newPassword
      });

      if (error) {
        showToast(
          error.message || "Could not update the password.",
          "error"
        );
      } else {
        showToast("Admin password updated.");
      }
    });
  }

  document.addEventListener("DOMContentLoaded", checkAuth);
})();