/**
 * Prime Focus Schools - Supabase Blog Storage
 * Reads and writes blog articles in Supabase.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.BlogStore = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  const SUPABASE_URL = "https://hztinvahixhvkfhpccrq.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_Jx9KPHzuBIbJtG9rBr3MZA_iax1izan";
  const LEGACY_STORAGE_KEY = "pfs_blog_posts_v1";

  let client = null;
  let postsCache = [];
  let readyPromise = null;
  let refreshInFlight = null;

  const isCmsPage =
    typeof document !== "undefined" &&
    Boolean(document.getElementById("cms-auth-form"));

  // Remove any previously cached blog posts from browser storage.
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
  } catch (error) {
    // Ignore storage access errors.
  }

  if (typeof window !== "undefined") {
    if (window.__pfsSupabaseClient) {
      client = window.__pfsSupabaseClient;
    } else if (
      window.supabase &&
      typeof window.supabase.createClient === "function"
    ) {
      client = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
      );
      window.__pfsSupabaseClient = client;
    }

    if (client && isCmsPage) {
      client.auth.onAuthStateChange(event => {
        if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
          setTimeout(() => refresh().catch(console.error), 0);
        }
      });
    }
  }

  function dispatchPostsUpdated() {
    try {
      window.dispatchEvent(
        new CustomEvent("pfs:blog-updated", {
          detail: { posts: postsCache }
        })
      );
    } catch (error) {
      // The event is only used by browser pages.
    }
  }

  function setPosts(posts) {
    postsCache = Array.isArray(posts) ? posts : [];
    dispatchPostsUpdated();
  }

  function requireClient() {
    if (!client) {
      throw new Error(
        "Supabase is not loaded. Check the Supabase script order in the HTML."
      );
    }
    return client;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function calculateReadTime(content) {
    if (!content) return "1 min read";

    const plainText = String(content).replace(/<[^>]*>/g, " ");
    const words = plainText.trim().split(/\s+/).filter(Boolean).length;

    return `${Math.max(1, Math.round(words / 200))} min read`;
  }

  function formatDate(dateInput) {
    const date = dateInput ? new Date(dateInput) : new Date();

    if (isNaN(date.getTime())) return dateInput || "";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  }

  function fromDatabase(row) {
    return {
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category || "General",
      author: row.author || "Prime Focus Schools",
      authorRole: row.author_role || "Editorial Board",
      date: row.display_date || "",
      cover: row.cover || "images/school-1.webp",
      coverCaption: row.cover_caption || "",
      readTime: row.read_time || "1 min read",
      excerpt: row.excerpt || "",
      content: row.content || "",
      tags: Array.isArray(row.tags) ? row.tags : [],
      status: row.status || "draft",
      featured: Boolean(row.featured),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function toDatabase(post) {
    return {
      id: post.id,
      slug: post.slug,
      title: post.title,
      category: post.category || "General",
      author: post.author || "Prime Focus Schools",
      author_role: post.authorRole || "Editorial Board",
      display_date: post.date || "",
      cover: post.cover || "images/school-1.webp",
      cover_caption: post.coverCaption || "",
      read_time: post.readTime || calculateReadTime(post.content),
      excerpt: post.excerpt || "",
      content: post.content || "",
      tags: Array.isArray(post.tags) ? post.tags : [],
      status: post.status === "draft" ? "draft" : "published",
      featured: Boolean(post.featured),
      created_at: post.createdAt || new Date().toISOString(),
      updated_at: post.updatedAt || new Date().toISOString()
    };
  }

  async function clearOtherPublishedFeaturedPosts(postId, updatedAt) {
    const activeClient = requireClient();
    const { error } = await activeClient
      .from("posts")
      .update({
        featured: false,
        updated_at: updatedAt
      })
      .eq("status", "published")
      .eq("featured", true)
      .neq("id", postId);

    if (error) throw error;
  }

  async function refresh() {
    if (refreshInFlight) return refreshInFlight;

    refreshInFlight = (async () => {
      const activeClient = requireClient();

      const { data, error } = await activeClient
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setPosts((data || []).map(fromDatabase));
      return postsCache;
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
        console.warn("Could not load blog articles from Supabase:", error);
        throw error;
      });
    }

    return readyPromise;
  }

  function getPosts(options = {}) {
    const {
      includeDrafts = false,
      category,
      tag,
      search,
      sort = "newest",
      limit
    } = options;

    let posts = [...postsCache];

    if (!includeDrafts) {
      posts = posts.filter(post => post.status === "published");
    }

    if (category && category !== "all" && category !== "All") {
      posts = posts.filter(
        post => (post.category || "").toLowerCase() === category.toLowerCase()
      );
    }

    if (tag) {
      posts = posts.filter(
        post =>
          Array.isArray(post.tags) &&
          post.tags.some(item => item.toLowerCase() === tag.toLowerCase())
      );
    }

    if (search && search.trim()) {
      const query = search.toLowerCase().trim();

      posts = posts.filter(post => {
        const searchable = [
          post.title,
          post.excerpt,
          post.content,
          post.category,
          post.author,
          ...(Array.isArray(post.tags) ? post.tags : [])
        ];

        return searchable.some(value =>
          String(value || "").toLowerCase().includes(query)
        );
      });
    }

    posts.sort((a, b) => {
      if (sort === "title") {
        return (a.title || "").localeCompare(b.title || "");
      }

      const dateA = new Date(a.createdAt || a.date || 0).getTime();
      const dateB = new Date(b.createdAt || b.date || 0).getTime();

      return sort === "oldest" ? dateA - dateB : dateB - dateA;
    });

    return typeof limit === "number" && limit > 0
      ? posts.slice(0, limit)
      : posts;
  }

  function getPostByIdOrSlug(idOrSlug) {
    if (!idOrSlug) return null;

    const query = String(idOrSlug).trim();

    return postsCache.find(
      post => post.id === query || post.slug === query
    ) || null;
  }

  function getRelatedPosts(currentIdOrSlug, limit = 3) {
    const current = getPostByIdOrSlug(currentIdOrSlug);
    const published = getPosts({ sort: "newest" }).filter(
      post => post.id !== (current ? current.id : currentIdOrSlug)
    );

    if (!current) return published.slice(0, limit);

    return published
      .map(post => {
        let score = 0;

        if (
          post.category &&
          current.category &&
          post.category.toLowerCase() === current.category.toLowerCase()
        ) {
          score += 5;
        }

        const currentTags =
          (current.tags || []).map(item => item.toLowerCase());

        (post.tags || []).forEach(item => {
          if (currentTags.includes(item.toLowerCase())) score += 2;
        });

        return { post, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.post);
  }

  function getCategories(includeDrafts = false) {
    const posts = getPosts({ includeDrafts });

    return [...new Set(
      posts.map(post => (post.category || "").trim()).filter(Boolean)
    )];
  }

  function normalizePostInput(postData, existing, now) {
    const preservedSlug =
      existing && existing.slug
        ? existing.slug
        : postData.slug
          ? slugify(postData.slug)
          : slugify(postData.title) || `post-${Date.now().toString(36)}`;

    return {
      ...(existing || {}),
      ...postData,
      id: existing
        ? existing.id
        : postData.id ||
          `pfs-${slugify(postData.title) || "post"}-${Date.now().toString(36)}`,
      slug: preservedSlug,
      category: (postData.category || "General").trim(),
      author: (postData.author || "Prime Focus Schools").trim(),
      authorRole: (postData.authorRole || "Editorial Board").trim(),
      date: postData.date ? formatDate(postData.date) : formatDate(now),
      cover: postData.cover || "images/school-1.webp",
      coverCaption: (postData.coverCaption || "").trim(),
      excerpt: (postData.excerpt || "").trim(),
      content: (postData.content || "").trim(),
      readTime: postData.readTime || calculateReadTime(postData.content),
      tags: Array.isArray(postData.tags)
        ? postData.tags
            .map(String)
            .map(item => item.trim())
            .filter(Boolean)
        : String(postData.tags || "")
            .split(",")
            .map(item => item.trim())
            .filter(Boolean),
      status: postData.status === "draft" ? "draft" : "published",
      featured: Boolean(postData.featured),
      createdAt: existing ? existing.createdAt : postData.createdAt || now,
      updatedAt: now
    };
  }

  async function savePost(postData) {
    const activeClient = requireClient();
    if (!postData || !postData.title) {
      throw new Error("Article title is required.");
    }

    const now = new Date().toISOString();
    const existing = postData.id
      ? getPostByIdOrSlug(postData.id)
      : null;

    const post = normalizePostInput(postData, existing, now);

    if (post.featured && post.status === "published") {
      await clearOtherPublishedFeaturedPosts(post.id, now);
    }

    const { data, error } = await activeClient
      .from("posts")
      .upsert(toDatabase(post), { onConflict: "id" })
      .select("*")
      .single();

    if (error) throw error;

    const saved = fromDatabase(data);

    postsCache = postsCache.map(item => ({
      ...item,
      featured:
        saved.featured && saved.status === "published"
          ? item.id === saved.id
          : item.featured
    }));

    postsCache = [
      saved,
      ...postsCache.filter(item => item.id !== saved.id)
    ];

    setPosts(postsCache);
    return saved;
  }

  async function deletePost(id) {
    const activeClient = requireClient();
    const { error } = await activeClient
      .from("posts")
      .delete()
      .eq("id", id);

    if (error) throw error;

    setPosts(postsCache.filter(post => post.id !== id));
    return true;
  }

  async function toggleStatus(id) {
    const activeClient = requireClient();
    const post = getPostByIdOrSlug(id);
    if (!post) return null;

    const nextStatus =
      post.status === "draft" ? "published" : "draft";
    const now = new Date().toISOString();

    if (nextStatus === "published" && post.featured) {
      await clearOtherPublishedFeaturedPosts(id, now);
    }

    const { data, error } = await activeClient
      .from("posts")
      .update({
        status: nextStatus,
        updated_at: now
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    const updated = fromDatabase(data);

    setPosts(
      postsCache.map(item => item.id === id ? updated : item)
    );

    return updated;
  }

  async function toggleFeatured(id) {
    const activeClient = requireClient();
    const post = getPostByIdOrSlug(id);
    if (!post) return null;

    const willBeFeatured = !post.featured;
    const now = new Date().toISOString();

    if (willBeFeatured && post.status === "published") {
      await clearOtherPublishedFeaturedPosts(id, now);
    }

    const { data, error } = await activeClient
      .from("posts")
      .update({
        featured: willBeFeatured,
        updated_at: now
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    const updated = fromDatabase(data);

    setPosts(
      postsCache.map(item => ({
        ...item,
        featured: willBeFeatured
          ? item.id === updated.id
          : item.id === updated.id
            ? false
            : item.featured
      }))
    );

    return updated;
  }

  // Automatically load published articles from Supabase on public pages.
  if (!isCmsPage && client) {
    ready().catch(() => {});
  }

  const BlogStore = {
    ready,
    refresh,

    getClient() {
      return client;
    },

    getPosts,
    getPostByIdOrSlug,
    getRelatedPosts,

    getFeaturedPost() {
      const posts = getPosts({ sort: "newest" });
      return posts.find(post => post.featured) || posts[0] || null;
    },

    getCategories() {
      return getCategories(false);
    },

    getAllCategories() {
      return getCategories(true);
    },

    savePost,
    deletePost,
    toggleStatus,
    toggleFeatured,

    exportJSON() {
      return JSON.stringify(postsCache, null, 2);
    },

    async importJSON(data) {
      const activeClient = requireClient();
      const parsed =
        typeof data === "string" ? JSON.parse(data) : data;

      if (!Array.isArray(parsed)) {
        throw new Error("Invalid backup: expected a JSON array of posts.");
      }

      const validPosts = parsed.filter(post => post && post.title);

      if (!validPosts.length) {
        throw new Error("No valid blog posts found in the imported file.");
      }

      const now = new Date().toISOString();
      const rows = validPosts.map(item => {
        const existing = item.id ? getPostByIdOrSlug(item.id) : null;
        return toDatabase(normalizePostInput(item, existing, now));
      });

      const { error } = await activeClient
        .from("posts")
        .upsert(rows, { onConflict: "id" });

      if (error) throw error;

      await refresh();
      return postsCache;
    },

    slugify,
    calculateReadTime,
    formatDate
  };

  return BlogStore;
});