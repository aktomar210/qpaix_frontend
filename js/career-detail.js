// Shared-template renderer for /careers/:slug — one physical file (template-career.html)
// serves every job posting; this script resolves the slug from the URL and fills the page.
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function applyCareerToDom(career) {
    if (!career) return;
    const pageTitle = document.getElementById('qpaix-page-title');
    if (pageTitle) pageTitle.textContent = `${career.title} — QPAIX Infitech Private Limited`;
    const typeEl = document.getElementById('qpaix-career-type');
    if (typeEl) typeEl.textContent = (career.employment_type || 'Full-time').toUpperCase();
    const titleEl = document.getElementById('qpaix-career-title');
    if (titleEl) titleEl.textContent = career.title;
    const locEl = document.getElementById('qpaix-career-location');
    if (locEl) locEl.textContent = career.location || 'Ahmedabad, Gujarat';
    const bodyEl = document.getElementById('qpaix-career-body');
    if (bodyEl) bodyEl.innerHTML = career.description || '';
    const applyBtn = document.getElementById('qpaix-career-apply-btn');
    if (applyBtn) applyBtn.setAttribute('data-apply-position', career.title || 'General Application');
    const applyFormContainer = document.getElementById('qpaix-career-apply-form');
    if (career.is_open === false) {
      const closedNotice = document.getElementById('qpaix-career-closed-notice');
      if (closedNotice) closedNotice.style.display = '';
      if (applyBtn) {
        applyBtn.disabled = true;
        applyBtn.style.opacity = '0.5';
        applyBtn.style.cursor = 'not-allowed';
        applyBtn.removeAttribute('data-apply-position');
      }
      if (applyFormContainer) applyFormContainer.style.display = 'none';
    } else if (applyFormContainer && typeof window.qpaixMountInlineApplyForm === 'function') {
      window.qpaixMountInlineApplyForm(applyFormContainer, career.title || 'General Application');
    }
  }

  async function init() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    const slug = parts[1] || '';
    if (!slug) return;

    const cacheKey = `qpaix_career_${slug}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) applyCareerToDom(JSON.parse(cached));
    } catch (e) {}

    try {
      const res = await fetch(`/api/v2/careers/${encodeURIComponent(slug)}`, { credentials: 'include' });
      if (!res.ok) {
        if (!localStorage.getItem(cacheKey)) {
          const titleEl = document.getElementById('qpaix-career-title');
          if (titleEl) titleEl.textContent = 'Position Not Found';
        }
        return;
      }
      const career = await res.json();
      try { localStorage.setItem(cacheKey, JSON.stringify(career)); } catch (e) {}
      applyCareerToDom(career);
    } catch (e) {
      console.error('[career-detail] Failed to load career', e);
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
