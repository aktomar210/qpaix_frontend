// Shared-template renderer for /blog/:slug — one physical file (template-post.html) serves
// every post; this script resolves the slug from the URL and fills the page client-side.
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
      return '';
    }
  }

  function applyPostToDom(post) {
    if (!post) return;
    const pageTitle = document.getElementById('qpaix-page-title');
    if (pageTitle) pageTitle.textContent = `${post.title} — QPAIX Infitech Private Limited`;
    const catEl = document.getElementById('qpaix-post-category');
    if (catEl) catEl.textContent = (post.category || 'BLOG').toUpperCase();
    const titleEl = document.getElementById('qpaix-post-title');
    if (titleEl) titleEl.textContent = post.title;
    const dateEl = document.getElementById('qpaix-post-date');
    if (dateEl) dateEl.textContent = formatDate(post.published_at);
    const bodyEl = document.getElementById('qpaix-post-body');
    if (bodyEl) bodyEl.innerHTML = post.body || (post.excerpt ? `<p>${escapeHtml(post.excerpt)}</p>` : '');
    if (post.featured_image_url) {
      const imgWrap = document.getElementById('qpaix-post-image-wrap');
      const img = document.getElementById('qpaix-post-image');
      if (img && imgWrap) {
        img.src = post.featured_image_url;
        img.alt = post.title;
        imgWrap.style.display = '';
      }
    }
  }

  async function init() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const slug = parts[1] || '';
    if (!slug) return;

    const cacheKey = `qpaix_post_${slug}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) applyPostToDom(JSON.parse(cached));
    } catch (e) {}

    try {
      const res = await fetch(`/api/v2/blog-posts/${encodeURIComponent(slug)}`, { credentials: 'include' });
      if (!res.ok) {
        if (!localStorage.getItem(cacheKey)) {
          const titleEl = document.getElementById('qpaix-post-title');
          if (titleEl) titleEl.textContent = 'Post Not Found';
        }
        return;
      }
      const post = await res.json();
      try { localStorage.setItem(cacheKey, JSON.stringify(post)); } catch (e) {}
      applyPostToDom(post);
    } catch (e) {
      console.error('[blog-post-detail] Failed to load post', e);
    } finally {
      if (typeof window.notifyQpaixDataReady === 'function') {
        window.notifyQpaixDataReady();
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
