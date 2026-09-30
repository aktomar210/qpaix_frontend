// QPAIX CMS — shared inline-editing + dynamic-content script, loaded on every page.
//
// Responsibilities:
//   1. Check login status and inject the admin bar / edit mode when logged in.
//   2. Fetch generic page-element overrides (data-cms) + this page's dynamic list data
//      (offerings, testimonials, stats, client logos, ...) in parallel, and render both.
//   3. In edit mode, make every [data-cms] element editable and collect pending changes.
//   4. Route each pending change to whichever backend endpoint owns it (save-routing table).
//
// This file intentionally stays focused on the core loop first (fetch/render/edit/save).
// The Dashboard modal (structured CRUD, Change History, Approvals, Team & Access) is a
// separate, larger piece layered on top once this loop is proven — see PROJECT_STATUS.md.

(function () {
  'use strict';

  const PAGE_SLUG = resolvePageSlug();
  const state = {
    loggedIn: false,
    role: null,
    editMode: false,
    pageElements: {},   // element_id -> { content_type, content_value }
    pendingChanges: {}, // element_id -> { page_slug, element_id, content_type, content_value }
    dynamicData: {},    // list name -> array of rows, for re-render after a structured edit
  };

  function resolvePageSlug() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    return path === '' ? 'index' : path.replace(/\//g, '-').toLowerCase();
  }

  // The header AND footer (MASTER_HEADER_HTML / MASTER_FOOTER_HTML, both injected identically on
  // every page — see below) are shared site-wide, so their data-cms fields must save/load under
  // one fixed page_slug instead of the current page's own slug. Without this, editing the logo/
  // phone/email/socials/CTA on one page only ever affected that page's own page_elements row, so
  // different pages silently drifted out of sync (e.g. Team page kept an old raw logo URL while
  // About Us had a newer upload — the exact bug this constant was introduced to fix; the footer's
  // own ids were missed in that original fix and had the identical bug until this follow-up).
  const SHARED_HEADER_SLUG = 'shared-header';
  const SHARED_HEADER_ELEMENT_IDS = new Set([
    'site-logo', 'site-logo-2',
    'header-phone-link', 'header-phone-text',
    'header-email-link', 'header-email-text',
    'header-social-facebook', 'header-social-instagram', 'header-social-linkedin', 'header-social-twitter',
    'header-cta-text',
    'footer-logo', 'footer-tagline', 'footer-cta-icon', 'footer-cta-heading', 'footer-decorative-image',
    'footer-office1-city', 'footer-office1-address', 'footer-office2-city', 'footer-office2-address',
    'footer-phone-1', 'footer-phone-2', 'footer-email-1', 'footer-email-2',
    'footer-agency-text', 'footer-copyright',
    'footer-social-facebook', 'footer-social-instagram', 'footer-social-linkedin', 'footer-social-twitter',
  ]);
  function pageSlugForElement(elementId) {
    return SHARED_HEADER_ELEMENT_IDS.has(elementId) ? SHARED_HEADER_SLUG : PAGE_SLUG;
  }

  // ────────────────────────────────────────────────────────────────────────
  // SAVE-ROUTING TABLE — the single most load-bearing piece of this file.
  // Maps a data-cms element id (or a prefix) to the backend call that owns it.
  // Extend this table, don't grow an if/else chain, whenever a new entity/field
  // needs its own save target instead of the generic page_elements fallback.
  // ────────────────────────────────────────────────────────────────────────
  // "entity-row:<endpoint>:<rowId>:<field>" is the id scheme used for images (and, in future,
  // any other field) that live inside a [data-dynamic-list]-rendered entity card — see
  // dynamicImageCmsId() below, used by every render* function. One generic route handles all
  // entities: the endpoint segment already tells it exactly which PATCH URL owns the row.
  const ENTITY_ROW_PREFIX = 'entity-row:';

  const SAVE_ROUTES = [
    {
      test: (id) => id.startsWith(ENTITY_ROW_PREFIX),
      save: (id, value) => {
        const [, endpoint, rowId, field] = id.split(':');
        return apiPatch(`/api/v2/${endpoint}/${rowId}`, { [field]: value });
      },
    },
  ];

  function resolveSaveRoute(elementId) {
    return SAVE_ROUTES.find((r) => r.test(elementId)) || null;
  }

  // Builds the stable data-cms id for an image field belonging to a dynamic-list entity row, and
  // applies it to the element. `endpoint` is the entity's REST path segment (e.g. "stats",
  // "client-logos", "offerings", "testimonials") — the same one used by DYNAMIC_RENDERERS' fetch
  // calls — so resolveSaveRoute can PATCH the exact right controller.
  function tagDynamicImage(el, endpoint, rowId, field) {
    if (!el) return;
    el.setAttribute('data-cms', `${ENTITY_ROW_PREFIX}${endpoint}:${rowId}:${field}`);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Fetch helpers
  // ────────────────────────────────────────────────────────────────────────
  async function apiGet(path) {
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  async function apiPost(path, body) {
    const res = await fetch(path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  }

  async function apiPatch(path, body) {
    const res = await fetch(path, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`);
    return res.json();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Auto-tagging fallback ids — stable across reloads.
  // Only elements that will actually end up tagged are counted, and only AFTER
  // filtering out dynamically-rendered list content — otherwise the same visual element gets a
  // different fallback id whenever a dynamic list's item count changes, silently orphaning
  // previously-saved content. Images inside [data-dynamic-list] containers are excluded from
  // auto-tagging on purpose: those are entity photos/icons (team members, service cards, ...)
  // already editable through their own Dashboard CRUD form — auto-tagging them too would let the
  // same image be edited from two different places inconsistently.
  // Text and images get independently-numbered id sequences so adding/removing one never shifts
  // the other's ids.
  // ────────────────────────────────────────────────────────────────────────
  function autoTagEditableElements() {
    const textCandidates = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, a.btn-default, button'))
      .filter((el) => !el.closest('header, footer, nav, [data-dynamic-list]'))
      .filter((el) => !el.hasAttribute('data-cms'))
      .filter((el) => el.textContent.trim().length > 0);

    textCandidates.forEach((el, index) => {
      el.setAttribute('data-cms', `dynamic-${PAGE_SLUG}-text-${index}`);
    });

    const imageCandidates = Array.from(document.querySelectorAll('img'))
      .filter((el) => !el.closest('[data-dynamic-list], .graphic-fade-image, .graphic-fade--image, .arrow-image, .btm-empowering-image, .small-image-animated, .small-image--animated'))
      .filter((el) => !el.hasAttribute('data-cms'));

    let imgIdx = 0;
    imageCandidates.forEach((el) => {
      while (document.querySelector(`[data-cms="dynamic-${PAGE_SLUG}-image-${imgIdx}"]`)) {
        imgIdx++;
      }
      el.setAttribute('data-cms', `dynamic-${PAGE_SLUG}-image-${imgIdx}`);
      imgIdx++;
    });
  }

  // Runs AFTER loadDynamicLists() so it knows which [data-dynamic-list] containers actually got
  // real entity rows (their images/text are already tagged with the entity-row:... scheme by
  // their render* function) vs. which stayed on the template's own placeholder markup (no backend
  // rows yet — e.g. cms_offerings/cms_client_logos/cms_testimonials/cms_team are empty right
  // now). Placeholder images AND text get the same generic auto-id any other untagged element
  // gets, so they're editable too instead of silently inert until real entity rows exist — this
  // mirrors autoTagEditableElements() but for the inside of [data-dynamic-list] containers, which
  // that function deliberately skips (see its own comment).
  function tagPlaceholderDynamicImages() {
    const images = Array.from(document.querySelectorAll('[data-dynamic-list] img'))
      .filter((el) => !el.hasAttribute('data-cms'));
    images.forEach((el, index) => {
      el.setAttribute('data-cms', `dynamic-${PAGE_SLUG}-placeholder-image-${index}`);
    });

    const textCandidates = Array.from(document.querySelectorAll('[data-dynamic-list] h1, [data-dynamic-list] h2, [data-dynamic-list] h3, [data-dynamic-list] h4, [data-dynamic-list] h5, [data-dynamic-list] h6, [data-dynamic-list] p'))
      .filter((el) => !el.hasAttribute('data-cms'))
      .filter((el) => el.textContent.trim().length > 0);
    textCandidates.forEach((el, index) => {
      el.setAttribute('data-cms', `dynamic-${PAGE_SLUG}-placeholder-text-${index}`);
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Page-elements: fetch + apply overrides + synchronous cache hydration
  // ────────────────────────────────────────────────────────────────────────
  function hydrateCachedPageElements() {
    [PAGE_SLUG, SHARED_HEADER_SLUG].forEach((slug) => {
      try {
        const cached = localStorage.getItem(`qpaix_page_elements_${slug}`);
        if (cached) {
          const rows = JSON.parse(cached);
          if (Array.isArray(rows) && rows.length > 0) {
            rows.forEach((row) => {
              state.pageElements[row.element_id] = row;
            });
          }
        }
      } catch (e) {
        console.warn('[cms] Error hydrating cached page elements', e);
      }
    });
    applyPageElements();
  }

  async function loadPageElements() {
    try {
      const [pageRows, headerRows] = await Promise.all([
        apiGet(`/api/v2/page-elements/${PAGE_SLUG}`),
        apiGet(`/api/v2/page-elements/${SHARED_HEADER_SLUG}`),
      ]);
      pageRows.forEach((row) => {
        state.pageElements[row.element_id] = row;
      });
      headerRows.forEach((row) => {
        state.pageElements[row.element_id] = row;
      });
      applyPageElements();
      try {
        localStorage.setItem(`qpaix_page_elements_${PAGE_SLUG}`, JSON.stringify(pageRows));
        localStorage.setItem(`qpaix_page_elements_${SHARED_HEADER_SLUG}`, JSON.stringify(headerRows));
      } catch (e) {}
    } catch (e) {
      console.warn('[cms] Failed to load page elements', e);
    }
  }

  function applyPageElements() {
    document.querySelectorAll('[data-cms]').forEach((el) => {
      const id = el.getAttribute('data-cms');
      const row = state.pageElements[id];
      if (!row || !row.content_value) return;

      if (row.content_type === 'image' && el.tagName === 'IMG') {
        el.src = row.content_value;
      } else if (row.content_type === 'link' && el.tagName === 'A') {
        el.href = row.content_value;
      } else if (row.content_type === 'html' || row.content_type === 'text') {
        el.innerHTML = row.content_value;
      }
      if (el.hasAttribute('data-qpaix-hide-until-set')) {
        el.classList.add('qpaix-revealed');
      }
    });
  }

  // Safety net for [data-qpaix-hide-until-set] elements (currently just the shared offering
  // template's banner image): reveal them even if no override ever arrived — e.g. a brand-new
  // page with no saved override yet, or backend genuinely unreachable with no cached data at all
  // — so they're never permanently invisible, just briefly hidden while a real answer is pending.
  setTimeout(() => {
    document.querySelectorAll('[data-qpaix-hide-until-set]:not(.qpaix-revealed)').forEach((el) => {
      el.classList.add('qpaix-revealed');
    });
  }, 2500);

  // ────────────────────────────────────────────────────────────────────────
  // Dynamic list rendering — offerings, testimonials, stats, client logos.
  // Each renderer reads its container via [data-dynamic-list="<name>"].
  // ────────────────────────────────────────────────────────────────────────
  const DYNAMIC_RENDERERS = {
    'stats': { fetch: () => apiGet('/api/v2/stats'), render: renderStats },
    'client-logos': { fetch: () => apiGet('/api/v2/client-logos'), render: renderClientLogos },
    'offerings-service': { fetch: () => apiGet('/api/v2/offerings?kind=service'), render: renderServiceCards },
    'offerings-product': { fetch: () => apiGet('/api/v2/offerings?kind=product'), render: renderProductCards },
    'offerings-service-grid': { fetch: () => apiGet('/api/v2/offerings?kind=service'), render: renderServiceNumberedList },
    'offerings-product-grid': { fetch: () => apiGet('/api/v2/offerings?kind=product'), render: renderOfferingGrid('/products') },
    'testimonials': { fetch: () => apiGet('/api/v2/testimonials'), render: renderTestimonials },
    'team': { fetch: () => apiGet('/api/v2/team'), render: renderTeam },
    'team-featured-left': { fetch: () => apiGet('/api/v2/team'), render: renderTeamFeaturedHalf(0) },
    'team-featured-right': { fetch: () => apiGet('/api/v2/team'), render: renderTeamFeaturedHalf(2) },
    'team-squad': { fetch: () => apiGet('/api/v2/team'), render: renderTeamSquad },
    'faqs': { fetch: () => apiGet('/api/v2/faqs'), render: renderFaqs },
    'careers': { fetch: () => apiGet('/api/v2/careers'), render: renderCareers },
    'blog-posts': { fetch: () => apiGet('/api/v2/blog-posts'), render: renderBlogPosts },
    'values': { fetch: () => apiGet('/api/v2/values'), render: renderValues },
  };

  function hydrateCachedDynamicLists() {
    const containers = document.querySelectorAll('[data-dynamic-list]');
    containers.forEach((container) => {
      const name = container.getAttribute('data-dynamic-list');
      const renderer = DYNAMIC_RENDERERS[name];
      if (!renderer) return;
      try {
        const cached = localStorage.getItem(`qpaix_dynamic_${name}`);
        if (cached) {
          const rows = JSON.parse(cached);
          if (Array.isArray(rows) && rows.length > 0) {
            state.dynamicData[name] = rows;
            renderer.render(container, rows);
            reinitSwiperIfNeeded(container);
          }
        }
      } catch (e) {
        console.warn(`[cms] Error hydrating dynamic list "${name}"`, e);
      }
    });
  }

  async function loadDynamicLists() {
    const containers = document.querySelectorAll('[data-dynamic-list]');
    await Promise.all(Array.from(containers).map(async (container) => {
      const name = container.getAttribute('data-dynamic-list');
      const renderer = DYNAMIC_RENDERERS[name];
      if (!renderer) return;
      try {
        const rows = await renderer.fetch();
        if (!Array.isArray(rows) || rows.length === 0) return;
        state.dynamicData[name] = rows;
        renderer.render(container, rows);
        reinitSwiperIfNeeded(container);
        try {
          localStorage.setItem(`qpaix_dynamic_${name}`, JSON.stringify(rows));
        } catch (e) {}
      } catch (e) {
        console.warn(`[cms] Failed to load dynamic list "${name}"`, e);
      }
    }));
    reinitWowIfNeeded();
  }

  // function.js runs `new WOW().init()` once at DOMContentLoaded, before any of this file's
  // dynamic-list rendering happens — so every `.wow <animation-name>` card/row produced by a
  // render* function (product/service cards, offering grids, etc.) is invisible to that scan and
  // never gets WOW.js's scroll-triggered entrance animation. A second `new WOW().init()` call
  // here picks up exactly those newly-added elements (WOW.js skips ones already marked
  // `.animated` from the first pass, so this doesn't replay animations that already ran).
  function reinitWowIfNeeded() {
    if (typeof window.WOW === 'undefined') return;
    try {
      if (window.wow && typeof window.wow.doSync === 'function') {
        window.wow.stopped = false;
        window.wow.doSync(document.body);
        if (typeof window.wow.scrollHandler === 'function') {
          window.wow.scrollHandler();
        }
      } else {
        window.wow = new window.WOW();
        window.wow.init();
      }
    } catch (e) {
      console.warn('[cms] WOW.js re-init failed', e);
    }
  }

  // function.js initializes every Swiper carousel on the template's own static placeholder
  // markup at DOMContentLoaded, BEFORE cms.js (a deferred module) ever runs. Replacing a
  // .swiper-wrapper's innerHTML with real entity rows afterwards leaves that already-constructed
  // Swiper instance holding stale slide references — so any carousel-based dynamic list (product/
  // service sliders, the team "Expert Squad" carousel, etc.) must destroy and rebuild its Swiper
  // instance right after rendering new rows, or the carousel silently stops working.
  function reinitSwiperIfNeeded(container) {
    if (typeof window.Swiper === 'undefined') return;
    const swiperRoot = container.classList.contains('swiper') ? container : container.closest('.swiper');
    if (!swiperRoot) return;

    const isPortfolio = swiperRoot.closest('.portfolio--list-section') || swiperRoot.closest('.sisf--sis-slider');
    if (isPortfolio) {
      if (swiperRoot.swiper) {
        swiperRoot.swiper.destroy(true, false);
      }
      new window.Swiper(swiperRoot, {
        slidesPerView: 3,
        spaceBetween: 26,
        loop: true,
        speed: 800,
        grabCursor: true,
        autoplay: {
          delay: 3200,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        },
        navigation: {
          nextEl: swiperRoot.parentElement.querySelector('.swiper-button-next'),
          prevEl: swiperRoot.parentElement.querySelector('.swiper-button-prev')
        },
        pagination: {
          el: swiperRoot.parentElement.querySelector('.swiper-pagination'),
          clickable: true
        },
        breakpoints: {
          0: { slidesPerView: 1, spaceBetween: 16 },
          640: { slidesPerView: 1.4, spaceBetween: 20 },
          768: { slidesPerView: 2, spaceBetween: 22 },
          1024: { slidesPerView: 2.5, spaceBetween: 24 },
          1200: { slidesPerView: 3, spaceBetween: 26 }
        }
      });
      return;
    }

    if (swiperRoot.swiper) {
      const prevParams = swiperRoot.swiper.params;
      swiperRoot.swiper.destroy(true, false);
      new window.Swiper(swiperRoot, prevParams);
    } else {
      new window.Swiper(swiperRoot, {
        slidesPerView: 4,
        spaceBetween: 24,
        loop: true,
        speed: 900,
        grabCursor: true,
        autoplay: {
          delay: 2400,
          disableOnInteraction: false,
          pauseOnMouseEnter: true
        },
        breakpoints: {
          0: { slidesPerView: 1, spaceBetween: 16 },
          576: { slidesPerView: 2, spaceBetween: 20 },
          992: { slidesPerView: 3, spaceBetween: 24 },
          1200: { slidesPerView: 4, spaceBetween: 24 }
        }
      });
    }
  }

  function renderStats(container, rows) {
    const items = rows.slice(0, 4);
    const colClass = items.length === 4 ? 'col-lg-3 col-md-6' : items.length === 3 ? 'col-lg-4 col-md-6' : 'col-md-6';
    container.innerHTML = `
      <div class="row">
        ${items.map((row, idx) => `
          <div class="${colClass}">
            <div class="counter-box wow rollIn ${idx === items.length - 1 ? 'border-0' : ''}">
              <div class="counter-item">
                <div class="counter-title">
                  <h2 class="d-flex align-items-center">
                    <span class="counter">${escapeHtml(numericPart(row.number_text))}</span>
                    <span class="sisf-digit-label">${escapeHtml(suffixPart(row.number_text))}</span>
                  </h2>
                </div>
                <div class="counter-content mt-3">
                  <h3>${escapeHtml(row.label)}</h3>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    // Stats have no image field today, so nothing to tag — kept for symmetry with other
    // renderers if an icon field is ever added to cms_stats.
  }

  function numericPart(text) {
    const m = String(text || '').match(/[\d.]+/);
    return m ? m[0] : text;
  }
  function suffixPart(text) {
    const m = String(text || '').match(/[\d.]+(.*)$/);
    return m ? m[1] : '';
  }

  function renderClientLogos(container, rows) {
    container.innerHTML = rows.map((row) => `
      <div class="client-logo swiper-slide">
        <div class="sisf-e-inner">
          <div class="logo-image">
            <figure><img src="${escapeAttr(row.logo_url)}" alt="${escapeAttr(row.name || 'Client logo')}" loading="lazy"></figure>
          </div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.client-logo').forEach((el, idx) => {
      tagDynamicImage(el.querySelector('img'), 'client-logos', rows[idx].id, 'logo_url');
    });
  }

  function renderServiceCards(container, rows) {
    container.innerHTML = rows.map((row) => `
      <div class="swiper-slide sisf-services-slider-item">
        <div class="sisf-e-inner">
          <div class="sisf-e-content">
            <div class="sisf-button-round">
              <a class="sisf-sis-button position-relative" href="/services/${escapeAttr(row.slug)}">
                <span class="sisf-m-text">Explore More</span>
              </a>
            </div>
            <div class="sisf-e-media">
              <div class="sisf-e-media-image">
                <a href="/services/${escapeAttr(row.slug)}">
                  <img src="${escapeAttr(row.card_image_url || row.icon_image_url || '/images/service-slider-img1.png')}" class="w-100" alt="${escapeAttr(row.title)}">
                </a>
              </div>
            </div>
            <div class="sisf-e-text">
              <h5 class="sisf-e-title entry-title">
                <a class="sisf-e-title-link" href="/services/${escapeAttr(row.slug)}">${escapeHtml(row.title)}</a>
              </h5>
              ${row.tagline ? `<p class="small mt-2 mb-0">${escapeHtml(row.tagline)}</p>` : ''}
            </div>
          </div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.sisf-services-slider-item').forEach((el, idx) => {
      tagDynamicImage(el.querySelector('.sisf-e-media-image img'), 'offerings', rows[idx].id, 'card_image_url');
    });
  }

  function getProductCategory(row) {
    if (row.parent_group && row.parent_group.trim()) return row.parent_group;
    const s = ((row.slug || '') + ' ' + (row.title || '')).toLowerCase();
    if (s.includes('gyan') || s.includes('saarthi') || s.includes('school')) return 'EdTech & ERP';
    if (s.includes('cmms') || s.includes('hrms') || s.includes('maintenance')) return 'Enterprise CMMS';
    if (s.includes('career') || s.includes('disha') || s.includes('counselling')) return 'AI Career Guidance';
    if (s.includes('rtk') || s.includes('gps') || s.includes('rail')) return 'Industrial IoT & GPS';
    if (s.includes('scada') || s.includes('sensor') || s.includes('water')) return 'Smart IoT & SCADA';
    if (s.includes('uav') || s.includes('drone') || s.includes('autopilot')) return 'Autonomous Drone & UAV';
    return 'Enterprise Solution';
  }

  function extractProductFeatures(row) {
    let features = [];
    if (Array.isArray(row.feature_list)) {
      features = row.feature_list;
    } else if (typeof row.feature_list === 'string') {
      try {
        const parsed = JSON.parse(row.feature_list);
        if (Array.isArray(parsed)) features = parsed;
      } catch (e) {
        features = row.feature_list.split(/[\r\n]+/).map((s) => s.replace(/^[•\-\*\s]+/, '').trim()).filter(Boolean);
      }
    }
    return features.filter((f) => typeof f === 'string' && f.trim().length > 0).slice(0, 2);
  }

  // A reusable grid card layout — used by the /products listing
  // pages (as opposed to renderProductCards, which render swiper-slide
  // markup for the homepage's carousels). basePath is '/products'.
  function renderOfferingGrid(basePath) {
    return function (container, rows) {
      container.innerHTML = rows.map((row, idx) => {
        const category = getProductCategory(row);
        const features = extractProductFeatures(row);
        const imgUrl = row.card_image_url || row.icon_image_url || '/images/portfolio_list_1.png';
        const delay = ((idx % 3) * 0.25 + 0.15).toFixed(2);
        return `
        <div class="col-lg-4 col-md-6 mb-4 d-flex wow fadeInUp" data-wow-delay="${delay}s" data-wow-duration="1.35s">
          <div class="qpaix-product-card w-100">
            <div class="product-card-topbar d-flex align-items-center justify-content-between mb-3">
              <span class="product-category-badge">
                <span class="pulse-indicator"></span>
                <span>${escapeHtml(category)}</span>
              </span>
              <span class="product-index-num">0${idx + 1}</span>
            </div>

            <div class="product-preview-frame mb-3 position-relative">
              <a href="${basePath}/${escapeAttr(row.slug)}" class="d-block h-100 w-100">
                <img src="${escapeAttr(imgUrl)}" alt="${escapeAttr(row.title)}" class="product-preview-img" loading="lazy">
                <div class="product-preview-overlay">
                  <span class="preview-overlay-btn">Explore System <i class="fa-solid fa-arrow-up-right-from-square ms-1"></i></span>
                </div>
              </a>
            </div>

            <div class="product-card-body d-flex flex-column flex-grow-1">
              <h3 class="product-card-title mb-2">
                <a class="product-card-title-link" href="${basePath}/${escapeAttr(row.slug)}">${escapeHtml(row.title)}</a>
              </h3>

              ${row.tagline ? `<div class="product-card-tagline mb-2">${escapeHtml(row.tagline)}</div>` : ''}

              ${row.short_description ? `<p class="product-card-desc mb-3">${escapeHtml(row.short_description)}</p>` : ''}

              ${features.length > 0 ? `
                <div class="product-card-features mb-4 mt-auto">
                  ${features.map((f) => `
                    <div class="product-mini-chip" title="${escapeAttr(f)}">
                      <i class="fa-solid fa-circle-check"></i>
                      <span>${escapeHtml(f)}</span>
                    </div>
                  `).join('')}
                </div>
              ` : '<div class="mt-auto"></div>'}

              <div class="product-card-footer pt-3 d-flex align-items-center justify-content-between">
                <a class="product-card-cta-btn" href="${basePath}/${escapeAttr(row.slug)}">
                  <span>Explore Product</span>
                  <span class="cta-arrow-circle">
                    <i class="fa-solid fa-arrow-right"></i>
                  </span>
                </a>
                <span class="product-card-hint">
                  <i class="fa-solid fa-sparkles text-warning me-1"></i>Live Ready
                </span>
              </div>
            </div>
          </div>
        </div>
      `;
      }).join('');

      container.querySelectorAll('.qpaix-product-card').forEach((el, idx) => {
        const img = el.querySelector('.product-preview-frame img');
        if (img && rows[idx]) {
          tagDynamicImage(img, 'offerings', rows[idx].id, 'card_image_url');
        }
      });
      reinitWowIfNeeded();
    };
  }

  // The /services page's "Discover Our Services" list uses a numbered-row layout
  // (.sisf-services-item as a horizontal row: number, title, arrow button), not the card grid
  // renderOfferingGrid produces — a different visual language for the same underlying offerings
  // data. Points/features for each service live on its own detail page (via feature_list), not
  // in this summary list, matching the template's original design intent.
  function renderServiceNumberedList(container, rows) {
    container.innerHTML = rows.map((row, idx) => `
      <div class="sisf-services-item wow bounceInLeft${idx === rows.length - 1 ? ' mb-0' : ''}">
        <div class="sisf-e-inner d-flex align-items-center justify-content-between">
          <div class="sisf-m-content">
            <div class="sisf-e-text">
              <h3 class="sisf-e-title entry-title">
                <a class="sisf-e-title-link" href="/services/${escapeAttr(row.slug)}">
                  <span class="sisf-services-count">${String(idx + 1).padStart(2, '0')}</span>
                  ${escapeHtml(row.title)}
                </a>
              </h3>
            </div>
          </div>
          <div class="sisf--button sisf-sis-clear">
            <a class="sisf-sis-button sisf-html--link sisf-layout--textual" href="/services/${escapeAttr(row.slug)}">
              <span class="sisf-m-icon">
                <span class="sisf-m-icon-inner">
                  <span class="icon1"><i class="fa-solid fa-arrow-right"></i></span>
                  <span class="icon2"><i class="fa-solid fa-arrow-right"></i></span>
                </span>
              </span>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderProductCards(container, rows) {
    if (!rows || rows.length === 0) return;
    container.innerHTML = rows.map((row, idx) => {
      const category = getProductCategory(row);
      const features = extractProductFeatures(row);
      const imgUrl = row.card_image_url || row.icon_image_url || `/images/portfolio_list-slider${(idx % 4) + 1}.png`;
      const subtitle = row.tagline || (features.length > 0 ? features.join(' • ') : 'Mission-Critical Enterprise System');

      return `
      <div class="swiper-slide sisf-portfolio-slider-item">
        <div class="qpaix-project-card">
          <!-- Card Top Device Bar -->
          <div class="project-card-header">
            <div class="project-card-dots">
              <span class="p-dot p-dot-red"></span>
              <span class="p-dot p-dot-yellow"></span>
              <span class="p-dot p-dot-green"></span>
            </div>
            <div class="project-card-status">
              <span class="p-pulse-dot"></span>
              <span>LIVE</span>
            </div>
          </div>

          <!-- Card Media / Mockup Screen Viewport -->
          <div class="project-card-media sisf-e-media-image">
            <a href="/products/${escapeAttr(row.slug)}" class="project-card-link">
              <img src="${escapeAttr(imgUrl)}" class="project-card-img w-100" alt="${escapeAttr(row.title)}">
              <div class="project-card-glow-overlay"></div>
              <div class="project-card-shimmer"></div>
            </a>
            <div class="project-card-cat-badge">
              <span class="cat-pill">${escapeHtml(category)}</span>
            </div>
          </div>

          <!-- Card Body & Info -->
          <div class="project-card-body">
            <div class="project-card-title-group">
              <h4 class="project-card-title">
                <a href="/products/${escapeAttr(row.slug)}">${escapeHtml(row.title)}</a>
              </h4>
              <p class="project-card-desc">${escapeHtml(subtitle)}</p>
            </div>

            <!-- Bottom CTA Action Row -->
            <div class="project-card-footer">
              <a class="project-card-cta" href="/products/${escapeAttr(row.slug)}">
                <span>View Solution</span>
                <span class="cta-arrow-box">
                  <i class="fa-solid fa-arrow-right"></i>
                </span>
              </a>
              <span class="project-card-flag">
                <i class="fa-solid fa-circle-check text-cyan me-1"></i>Enterprise
              </span>
            </div>
          </div>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.sisf-portfolio-slider-item').forEach((el, idx) => {
      const img = el.querySelector('.project-card-img') || el.querySelector('img');
      if (img && rows[idx]) {
        tagDynamicImage(img, 'offerings', rows[idx].id, 'card_image_url');
      }
    });
  }

  function renderTestimonials(container, rows) {
    container.innerHTML = rows.map((row) => `
      <div class="sisf-sis-our-testimonial wow slideInRight">
        <div class="sisf-e-inner">
          <div class="sisf-e-content">
            <p class="sisf-e-text">${escapeHtml(row.quote)}</p>
          </div>
          <div class="sisf-bottom-with-icon mt-3 d-flex align-items-center justify-content-between">
            <div class="sisf-e-bottom d-flex align-items-center">
              ${row.photo_url ? `<div class="sisf-e-media-image me-3"><span><img src="${escapeAttr(row.photo_url)}" alt="${escapeAttr(row.author_name)}"></span></div>` : ''}
              <div class="info">
                <div class="sisf-e-author">
                  <span class="sisf-e-client-name mb-1">${escapeHtml(row.author_name)}</span>
                  <span class="sisf-e-author-job">${escapeHtml(row.author_role || 'Client')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.sisf-sis-our-testimonial').forEach((el, idx) => {
      const img = el.querySelector('.sisf-e-media-image img');
      if (img) tagDynamicImage(img, 'testimonials', rows[idx].id, 'photo_url');
    });
  }

  function renderTeam(container, rows) {
    if (!rows || rows.length === 0) return;
    const isSwiper = container.classList.contains('swiper-wrapper');
    container.innerHTML = rows.map((row) => {
      const cardHtml = `
        <div class="sis-team-member sisf-item-layout--info-on-hover-inset wow bounceInUp">
          <div class="team-member-img">
            <figure>
              <img src="${escapeAttr(row.photo_url || '/images/team1.png')}" class="w-100" alt="${escapeAttr(row.name)}" onerror="this.onerror=null; this.src='/images/team1.png';">
            </figure>
          </div>
          <div class="team-member-content">
            <h4 class="sisf-m-title" data-cms="entity-row:team:${escapeAttr(row.id)}:name">${escapeHtml(row.name)}</h4>
            <p class="sisf-m-role" data-cms="entity-row:team:${escapeAttr(row.id)}:role">${escapeHtml(row.role || '')}</p>
            ${row.bio ? `<p class="small mt-2">${escapeHtml(row.bio)}</p>` : ''}
          </div>
        </div>
      `;
      if (isSwiper) {
        return `<div class="swiper-slide">${cardHtml}</div>`;
      }
      return `<div class="col-lg-3 col-md-6 col-sm-6 mb-4">${cardHtml}</div>`;
    }).join('');
    container.querySelectorAll('.sis-team-member').forEach((el, idx) => {
      tagDynamicImage(el.querySelector('.team-member-img img'), 'team', rows[idx].id, 'photo_url');
    });
  }

  // Team page "Talented Team Behind Innovation" section — a fixed 2x2 layout split across two
  // side-by-side containers (team-featured-left gets rows[0:2], team-featured-right gets
  // rows[2:4]), each using the same hover-reveal card design as renderTeam's grid, just fixed at
  // exactly 2 cards instead of a flexible grid. sliceStart lets both containers share one
  // implementation while each only rendering its own half of the top-4 featured members.
  function renderTeamFeaturedHalf(sliceStart) {
    return function (container, rows) {
      const slice = rows.slice(sliceStart, sliceStart + 2);
      if (slice.length === 0) return;
      container.innerHTML = slice.map((row) => `
        <div class="col-md-6">
          <div class="sis-team-member sisf-item-layout--info-on-hover-inset wow bounceInLeft">
            <div class="team-member-img">
              <figure>
                <img src="${escapeAttr(row.photo_url || '/images/team1.png')}" class="w-100" alt="${escapeAttr(row.name)}" onerror="this.onerror=null; this.src='/images/team1.png';">
              </figure>
            </div>
            <div class="team-member-content">
              <h4 class="sisf-m-title" data-cms="entity-row:team:${escapeAttr(row.id)}:name">${escapeHtml(row.name)}</h4>
              <p class="sisf-m-role" data-cms="entity-row:team:${escapeAttr(row.id)}:role">${escapeHtml(row.role || '')}</p>
              <div class="social-icons">
                ${row.linkedin_url ? `<a href="${escapeAttr(row.linkedin_url)}" target="_blank" rel="noopener"><i class="fa-brands fa-linkedin-in"></i></a>` : '<a href="#"><i class="fa-brands fa-linkedin-in"></i></a>'}
                ${row.twitter_url ? `<a href="${escapeAttr(row.twitter_url)}" target="_blank" rel="noopener"><i class="fa-brands fa-x-twitter"></i></a>` : '<a href="#"><i class="fa-brands fa-x-twitter"></i></a>'}
                ${row.facebook_url ? `<a href="${escapeAttr(row.facebook_url)}" target="_blank" rel="noopener"><i class="fa-brands fa-facebook"></i></a>` : ''}
                ${row.instagram_url ? `<a href="${escapeAttr(row.instagram_url)}" target="_blank" rel="noopener"><i class="fa-brands fa-instagram"></i></a>` : ''}
              </div>
            </div>
          </div>
        </div>
      `).join('');
      container.querySelectorAll('.sis-team-member').forEach((el, idx) => {
        tagDynamicImage(el.querySelector('.team-member-img img'), 'team', slice[idx].id, 'photo_url');
      });
    };
  }

  // Team page "Our Expert Squad" auto-sliding carousel — a visually distinct card design
  // (.expert-squad-card/.expert-squad-img/.expert-squad-badge) from the "Talented Team" cards
  // above, kept separate per explicit request to preserve both designs rather than unifying them.
  function renderTeamSquad(container, rows) {
    container.innerHTML = rows.map((row) => `
      <div class="swiper-slide">
        <div class="expert-squad-card">
          <div class="expert-squad-img">
            <img src="${escapeAttr(row.photo_url || '/images/team1.png')}" alt="${escapeAttr(row.name)}" onerror="this.onerror=null; this.src='/images/team1.png';">
          </div>
          <div class="expert-squad-badge">
            <h4 class="expert-squad-name" data-cms="entity-row:team:${escapeAttr(row.id)}:name">${escapeHtml(row.name)}</h4>
            <p class="expert-squad-role" data-cms="entity-row:team:${escapeAttr(row.id)}:role">${escapeHtml(row.role || '')}</p>
          </div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.expert-squad-card').forEach((el, idx) => {
      tagDynamicImage(el.querySelector('.expert-squad-img img'), 'team', rows[idx].id, 'photo_url');
    });
  }

  function renderFaqs(container, rows) {
    if (rows.length === 0) {
      container.innerHTML = '<p>No FAQs published yet.</p>';
      return;
    }
    container.innerHTML = rows.map((row, index) => `
      <div class="accordion-item wow fadeInUp">
        <h2 class="accordion-header">
          <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#qpaix-faq-${index}">
            ${escapeHtml(row.question)}
          </button>
        </h2>
        <div id="qpaix-faq-${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#qpaix-faq-accordion">
          <div class="accordion-body">${row.answer || ''}</div>
        </div>
      </div>
    `).join('');
  }

  function renderCareers(container, rows) {
    if (rows.length === 0) {
      container.innerHTML = '<div class="col-12"><p>No open positions right now — check back soon, or send us your resume via the <a href="/contact">contact page</a>.</p></div>';
      return;
    }
    container.innerHTML = rows.map((row) => `
      <div class="col-md-6 mb-4">
        <div class="sisf-services-item wow bounceInUp h-100" style="border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:32px;">
          <h4 class="sisf-e-title entry-title mb-2">
            <a class="sisf-e-title-link" href="/careers/${escapeAttr(row.slug)}">${escapeHtml(row.title)}</a>
          </h4>
          <p class="mb-1"><i class="fa-solid fa-location-dot me-2"></i>${escapeHtml(row.location || 'Ahmedabad, Gujarat')}</p>
          ${row.employment_type ? `<p class="mb-3"><i class="fa-solid fa-briefcase me-2"></i>${escapeHtml(row.employment_type)}</p>` : ''}
          <div class="d-flex gap-2 flex-wrap">
            <a class="btn-default btn-outline-white" href="/careers/${escapeAttr(row.slug)}">
              <span>View Details</span>
            </a>
            <button type="button" class="btn-default" data-apply-position="${escapeAttr(row.title)}">
              <span>Apply Now</span>
            </button>
          </div>
        </div>
      </div>
    `).join('');
  }

  function renderBlogPosts(container, rows) {
    if (rows.length === 0) {
      container.innerHTML = '<div class="col-12"><p>No posts published yet — check back soon.</p></div>';
      return;
    }
    container.innerHTML = rows.map((row) => `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="sisf-e-inner h-100" style="border:1px solid rgba(0,0,0,0.08);border-radius:16px;overflow:hidden;">
          ${row.featured_image_url ? `<img src="${escapeAttr(row.featured_image_url)}" class="w-100" alt="${escapeAttr(row.title)}">` : ''}
          <div class="p-4">
            ${row.category ? `<span class="small text-uppercase" style="letter-spacing:1px;">${escapeHtml(row.category)}</span>` : ''}
            <h5 class="sisf-e-title entry-title mt-2">
              <a class="sisf-e-title-link" href="/blog/${escapeAttr(row.slug)}">${escapeHtml(row.title)}</a>
            </h5>
            ${row.excerpt ? `<p class="small">${escapeHtml(row.excerpt)}</p>` : ''}
          </div>
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.sisf-e-inner').forEach((el, idx) => {
      const img = el.querySelector('img');
      if (img) tagDynamicImage(img, 'blog-posts', rows[idx].id, 'featured_image_url');
    });
  }

  function renderValues(container, rows) {
    container.innerHTML = rows.map((row) => `
      <div class="col-lg-4 col-md-6 mb-4">
        <div class="sisf-services-item wow bounceInUp h-100" style="border:1px solid rgba(0,0,0,0.08);border-radius:16px;padding:32px;">
          ${row.icon_url ? `<div class="sisf-icon-image mb-3"><img src="${escapeAttr(row.icon_url)}" alt="${escapeAttr(row.title)}" style="max-height:48px;"></div>` : ''}
          <h4 class="sisf-e-title entry-title mb-2">${escapeHtml(row.title)}</h4>
          ${row.description ? `<p>${escapeHtml(row.description)}</p>` : ''}
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.sisf-services-item').forEach((el, idx) => {
      const img = el.querySelector('.sisf-icon-image img');
      if (img) tagDynamicImage(img, 'values', rows[idx].id, 'icon_url');
    });
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  // ────────────────────────────────────────────────────────────────────────
  // Auth status + admin bar
  // ────────────────────────────────────────────────────────────────────────
  async function loadAuthStatus() {
    try {
      const status = await apiGet('/api/admin/status');
      state.loggedIn = !!status.loggedIn;
      state.role = status.role || null;
      state.username = status.username || '';
      if (state.loggedIn) {
        loadCmsAdminStylesheet();
        injectAdminBar();
      }
    } catch (e) {
      console.warn('[cms] Failed to check auth status', e);
    }
  }

  function loadCmsAdminStylesheet() {
    if (document.getElementById('qpaix-cms-admin-css')) return;
    const link = document.createElement('link');
    link.id = 'qpaix-cms-admin-css';
    link.rel = 'stylesheet';
    link.href = '/css/cms-admin.css';
    document.head.appendChild(link);
  }

  function injectAdminBar() {
    const bar = document.createElement('div');
    bar.id = 'qpaix-cms-admin-bar';
    bar.innerHTML = `
      <div class="qpaix-bar-brand">
        <span class="qpaix-bar-dot"></span>
        QPAIX CMS
        ${state.role ? `<span class="qpaix-bar-role">${escapeHtml(state.role)}</span>` : ''}
      </div>
      <div id="qpaix-format-toolbar-slot"></div>
      <button data-action="toggle-edit" title="Toggle inline editing on this page">
        <i class="fa-solid fa-pen"></i><span>Edit Page</span>
      </button>
      <button data-action="save" style="display:none;" title="Save all pending changes on this page">
        <i class="fa-solid fa-check"></i><span>Save</span>
      </button>
      <div class="qpaix-bar-divider"></div>
      <button data-action="dashboard" title="Open the CMS Dashboard">
        <i class="fa-solid fa-table-columns"></i><span>Dashboard</span>
        <span class="qpaix-pending-count" data-role="pending-badge">0</span>
      </button>
      <div class="qpaix-bar-divider"></div>
      <button data-action="logout" title="Log out">
        <i class="fa-solid fa-right-from-bracket"></i><span>Logout</span>
      </button>
    `;
    document.body.prepend(bar);
    formatToolbarEl = buildFormatToolbar();
    bar.querySelector('#qpaix-format-toolbar-slot').appendChild(formatToolbarEl);
    document.body.classList.add('qpaix-cms-active');

    bar.querySelector('[data-action="toggle-edit"]').addEventListener('click', (e) => {
      toggleEditMode();
      e.currentTarget.classList.toggle('qpaix-active', state.editMode);
    });
    bar.querySelector('[data-action="save"]').addEventListener('click', saveAllPendingChanges);
    bar.querySelector('[data-action="logout"]').addEventListener('click', logout);
    bar.querySelector('[data-action="dashboard"]').addEventListener('click', openDashboard);

    if (state.role === 'admin') refreshPendingBadge();
  }

  let dashboardLoadPromise = null;
  function openDashboard() {
    if (!dashboardLoadPromise) {
      dashboardLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = '/js/dashboard.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }
    dashboardLoadPromise
      .then(() => window.dispatchEvent(new CustomEvent('qpaix-cms:open-dashboard')))
      .catch((e) => console.error('[cms] Failed to load dashboard module', e));
  }

  async function refreshPendingBadge() {
    try {
      const rows = await apiGet('/api/v2/approvals');
      const badge = document.querySelector('#qpaix-cms-admin-bar .qpaix-pending-count');
      if (!badge) return;
      const count = Array.isArray(rows) ? rows.length : 0;
      badge.textContent = String(count);
      badge.classList.toggle('qpaix-show', count > 0);
    } catch (e) {
      // Non-fatal — the badge just stays hidden.
    }
  }

  // Cleanup callbacks registered by setupImageEdit() while turning edit mode ON — e.g.
  // restoring a muted sibling overlay's pointer-events — run once, in order, when edit mode
  // turns back OFF, then the array is cleared for the next time.
  let imageEditCleanups = [];

  function toggleEditMode() {
    state.editMode = !state.editMode;
    const saveBtn = document.querySelector('#qpaix-cms-admin-bar [data-action="save"]');
    if (saveBtn) saveBtn.style.display = state.editMode ? 'inline-block' : 'none';
    document.body.classList.toggle('qpaix-cms-edit-mode', state.editMode);

    if (!state.editMode) {
      imageEditCleanups.forEach((fn) => fn());
      imageEditCleanups = [];
    }

    document.querySelectorAll('[data-cms]').forEach((el) => {
      if (el.tagName === 'IMG') {
        setupImageEdit(el, state.editMode);
      } else if (el.tagName === 'A') {
        setupLinkEdit(el, state.editMode);
      } else {
        el.contentEditable = state.editMode ? 'true' : 'false';
        if (state.editMode) {
          el.addEventListener('input', onTextEdited);
          el.addEventListener('focus', onTextFocus);
          el.addEventListener('blur', onTextBlur);
        } else {
          el.removeEventListener('input', onTextEdited);
          el.removeEventListener('focus', onTextFocus);
          el.removeEventListener('blur', onTextBlur);
        }
      }
    });

    setFormatToolbarVisible(state.editMode);
    if (!state.editMode) setFormatToolbarTarget(null);

    setSlidersAutoplayPaused(state.editMode);
  }

  // Auto-advancing sliders (the homepage hero, and any other Swiper carousel on the page) make
  // editing painful: the slide changes out from under the admin mid-edit, and function.js's own
  // slideChangeTransitionStart handler re-splits and re-animates the heading's text on every
  // advance (the "WE CRA F T" broken-mid-animation look reported by a user editing while it
  // played). Paused for the duration of edit mode and resumed when it's turned back off — this
  // only touches each Swiper's own autoplay module, not its DOM/markup, so the page looks and
  // behaves identically once edit mode ends.
  function setSlidersAutoplayPaused(paused) {
    document.querySelectorAll('.swiper').forEach((el) => {
      const instance = el.swiper;
      if (!instance || !instance.autoplay) return;
      if (paused) {
        instance.autoplay.stop();
      } else {
        // A plain autoplay.start() right after stop() is unreliable across Swiper's autoplay
        // module (confirmed empirically — it can silently no-op depending on Swiper's own
        // internal timer/paused-state bookkeeping at the moment stop() was called). Re-enabling
        // via the params + a fresh explicit start on the next tick reliably restarts the timer.
        instance.params.autoplay = instance.params.autoplay || {};
        instance.params.autoplay.enabled = true;
        setTimeout(() => instance.autoplay.start(), 0);
      }
    });
  }

  function onTextEdited(e) {
    const el = e.currentTarget;
    const id = el.getAttribute('data-cms');
    queueChange(id, 'text', el.innerHTML);
  }

  function onTextFocus(e) {
    setFormatToolbarTarget(e.currentTarget);
  }

  function onTextBlur(e) {
    // A click on a toolbar button blurs the text element first — defer clearing the target so the
    // button's own click handler (which needs the still-current selection) gets to run first.
    // Cancelled if focus lands back on a text element or the toolbar itself.
    setTimeout(() => {
      const active = document.activeElement;
      const toolbar = document.getElementById('qpaix-format-toolbar');
      if (toolbar && toolbar.contains(active)) return;
      if (active && active.hasAttribute && active.hasAttribute('data-cms') && active.isContentEditable) return;
      setFormatToolbarTarget(null);
    }, 150);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Rich-text formatting toolbar — Bold/Italic/Align/Case/Font/Size/Color/Reset for text
  // [data-cms] elements. Deliberately NOT using document.execCommand (deprecated, inconsistent
  // across browsers) — every command manipulates the Selection/Range API and the element's own
  // DOM directly, then dispatches a synthetic 'input' event so the existing onTextEdited ->
  // queueChange() save path picks up the change with zero special-casing. Saved content_value is
  // just el.innerHTML with whatever tags/styles were applied (e.g. "<b>bold</b> <span
  // style=\"color:#2e5dea\">colored</span>"), which applyPageElements() already re-applies via
  // el.innerHTML on load and PageHtmlGeneratorService already splices into static HTML as plain
  // text — neither needed any change to support nested tags.
  // ────────────────────────────────────────────────────────────────────────

  // The site's own web-safe/system fonts first (no network fetch needed), then the ~20 most
  // commonly used Google Fonts across real-world sites — covers the large majority of what an
  // editor would actually reach for without needing a search box.
  const FORMAT_FONTS = [
    { label: 'Default', value: '' },
    { label: 'Poppins', value: "'Poppins', sans-serif" },
    { label: 'Oswald', value: "'Oswald', sans-serif" },
    { label: 'Sora', value: "'Sora', sans-serif" },
    { label: 'Arial', value: 'Arial, sans-serif' },
    { label: 'Helvetica', value: 'Helvetica, Arial, sans-serif' },
    { label: 'Georgia', value: 'Georgia, serif' },
    { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
    { label: 'Verdana', value: 'Verdana, sans-serif' },
    { label: 'Tahoma', value: 'Tahoma, sans-serif' },
    { label: 'Trebuchet MS', value: "'Trebuchet MS', sans-serif" },
    { label: 'Courier New', value: "'Courier New', monospace" },
    { label: 'Roboto', value: "'Roboto', sans-serif" },
    { label: 'Open Sans', value: "'Open Sans', sans-serif" },
    { label: 'Lato', value: "'Lato', sans-serif" },
    { label: 'Montserrat', value: "'Montserrat', sans-serif" },
    { label: 'Inter', value: "'Inter', sans-serif" },
    { label: 'Nunito', value: "'Nunito', sans-serif" },
    { label: 'Raleway', value: "'Raleway', sans-serif" },
    { label: 'Rubik', value: "'Rubik', sans-serif" },
    { label: 'Work Sans', value: "'Work Sans', sans-serif" },
    { label: 'Source Sans Pro', value: "'Source Sans Pro', sans-serif" },
    { label: 'PT Sans', value: "'PT Sans', sans-serif" },
    { label: 'Merriweather', value: "'Merriweather', serif" },
    { label: 'Playfair Display', value: "'Playfair Display', serif" },
    { label: 'Lora', value: "'Lora', serif" },
    { label: 'Ubuntu', value: "'Ubuntu', sans-serif" },
    { label: 'Quicksand', value: "'Quicksand', sans-serif" },
  ];
  // Google Fonts not already bundled with the site (see fonts.googleapis.com families below) are
  // lazy-loaded the first time they're actually picked — same "don't pay for a font nobody uses"
  // approach as ind-fab's own font picker.
  const FORMAT_FONTS_ALREADY_LOADED = new Set(['Poppins', 'Oswald', 'Sora']);
  const loadedGoogleFonts = new Set();
  function ensureGoogleFontLoaded(fontFamilyValue) {
    const match = /^'([^']+)'/.exec(fontFamilyValue);
    const name = match ? match[1] : null;
    if (!name || FORMAT_FONTS_ALREADY_LOADED.has(name) || loadedGoogleFonts.has(name)) return;
    loadedGoogleFonts.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name).replace(/%20/g, '+')}:wght@400;700&display=swap`;
    document.head.appendChild(link);
  }

  const FORMAT_SIZE_MIN = 8;
  const FORMAT_SIZE_MAX = 96;
  const FORMAT_SIZE_STEP = 2;

  let formatToolbarEl = null;
  let formatToolbarTarget = null;
  let savedSelectionRange = null;

  function saveSelectionIfInside(target) {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (target.contains(range.commonAncestorContainer)) {
      savedSelectionRange = range.cloneRange();
    }
  }

  function restoreSelection() {
    if (!savedSelectionRange) return false;
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedSelectionRange);
    return true;
  }

  const FORMAT_ALIGN_OPTIONS = [
    { value: 'left', label: 'Align left', icon: 'fa-align-left' },
    { value: 'center', label: 'Align center', icon: 'fa-align-center' },
    { value: 'right', label: 'Align right', icon: 'fa-align-right' },
    { value: 'justify', label: 'Justify', icon: 'fa-align-justify' },
  ];
  const FORMAT_CASE_OPTIONS = [
    { value: 'upper', label: 'UPPERCASE' },
    { value: 'lower', label: 'lowercase' },
    { value: 'capitalize', label: 'Capitalize Each Word' },
  ];

  // Docked permanently inside the admin bar (built once, right after it, in injectAdminBar()) —
  // always present in edit mode regardless of whether a text element currently has focus, rather
  // than floating over the page next to whichever element is focused. Buttons/fields are disabled
  // (not hidden) until a text element is focused, so the bar's layout never shifts.
  function buildFormatToolbar() {
    const bar = document.createElement('div');
    bar.id = 'qpaix-format-toolbar';

    const fontOptions = FORMAT_FONTS.map((f) => `<option value="${escapeAttr(f.value)}">${escapeHtml(f.label)}</option>`).join('');
    const alignItems = FORMAT_ALIGN_OPTIONS.map((a) =>
      `<div class="qpaix-fmt-dropdown-item" data-fmt="align-${a.value}"><i class="fa-solid ${a.icon}"></i> ${escapeHtml(a.label)}</div>`
    ).join('');
    const caseItems = FORMAT_CASE_OPTIONS.map((c) =>
      `<div class="qpaix-fmt-dropdown-item" data-fmt="case-${c.value}">${escapeHtml(c.label)}</div>`
    ).join('');

    bar.innerHTML = `
      <button type="button" data-fmt="bold" title="Bold"><i class="fa-solid fa-bold"></i></button>
      <button type="button" data-fmt="italic" title="Italic"><i class="fa-solid fa-italic"></i></button>
      <span class="qpaix-fmt-divider"></span>
      <div class="qpaix-fmt-dropdown-wrap" data-dropdown="align">
        <button type="button" class="qpaix-fmt-dropdown-toggle" title="Alignment">
          <i class="fa-solid fa-align-left" data-align-icon></i><i class="fa-solid fa-caret-down qpaix-fmt-caret"></i>
        </button>
        <div class="qpaix-fmt-dropdown-menu">${alignItems}</div>
      </div>
      <div class="qpaix-fmt-dropdown-wrap" data-dropdown="case">
        <button type="button" class="qpaix-fmt-dropdown-toggle" title="Change case">
          <i class="fa-solid fa-font"></i><i class="fa-solid fa-caret-down qpaix-fmt-caret"></i>
        </button>
        <div class="qpaix-fmt-dropdown-menu">${caseItems}</div>
      </div>
      <span class="qpaix-fmt-divider"></span>
      <select data-fmt="font-family" title="Font family">${fontOptions}</select>
      <div class="qpaix-fmt-size-wrap" title="Font size (px)">
        <button type="button" class="qpaix-fmt-size-btn" data-size-step="-1" tabindex="-1" aria-label="Decrease font size">−</button>
        <input type="number" data-fmt="font-size" placeholder="Size" min="${FORMAT_SIZE_MIN}" max="${FORMAT_SIZE_MAX}" step="${FORMAT_SIZE_STEP}">
        <button type="button" class="qpaix-fmt-size-btn" data-size-step="1" tabindex="-1" aria-label="Increase font size">+</button>
      </div>
      <input type="color" data-fmt="color" title="Text color" value="#000000">
      <span class="qpaix-fmt-divider"></span>
      <button type="button" data-fmt="reset" title="Clear formatting"><i class="fa-solid fa-eraser"></i></button>
    `;

    bar.addEventListener('mousedown', (e) => {
      // Prevent the toolbar itself from stealing focus away from the text element being edited —
      // without this, mousedown on a button blurs the contenteditable BEFORE the click fires,
      // collapsing the selection the command needs to act on.
      if (e.target.closest('button')) e.preventDefault();
    });

    bar.addEventListener('click', (e) => {
      const dropdownToggle = e.target.closest('.qpaix-fmt-dropdown-toggle');
      if (dropdownToggle) {
        const wrap = dropdownToggle.closest('.qpaix-fmt-dropdown-wrap');
        const isOpen = wrap.classList.contains('qpaix-open');
        closeAllFormatDropdowns();
        if (!isOpen) wrap.classList.add('qpaix-open');
        return;
      }

      const dropdownItem = e.target.closest('.qpaix-fmt-dropdown-item');
      if (dropdownItem) {
        closeAllFormatDropdowns();
        if (!formatToolbarTarget) return;
        const kind = dropdownItem.getAttribute('data-fmt');
        if (kind.startsWith('align-')) {
          const icon = bar.querySelector('[data-align-icon]');
          const opt = FORMAT_ALIGN_OPTIONS.find((a) => `align-${a.value}` === kind);
          if (icon && opt) icon.className = `fa-solid ${opt.icon}`;
        }
        applyFormat(kind, formatToolbarTarget);
        return;
      }

      const sizeStepBtn = e.target.closest('.qpaix-fmt-size-btn');
      if (sizeStepBtn) {
        if (!formatToolbarTarget || sizeStepBtn.disabled) return;
        const sizeInput = bar.querySelector('input[data-fmt="font-size"]');
        const current = parseInt(sizeInput.value, 10) || 16;
        const step = parseInt(sizeStepBtn.getAttribute('data-size-step'), 10) * FORMAT_SIZE_STEP;
        const next = Math.min(FORMAT_SIZE_MAX, Math.max(FORMAT_SIZE_MIN, current + step));
        sizeInput.value = String(next);
        applyFormat('font-size', formatToolbarTarget, `${next}px`);
        return;
      }

      const btn = e.target.closest('button[data-fmt]');
      if (!btn || !formatToolbarTarget || btn.disabled) return;
      applyFormat(btn.getAttribute('data-fmt'), formatToolbarTarget);
    });

    bar.addEventListener('change', (e) => {
      const field = e.target.closest('[data-fmt]');
      if (!field || !formatToolbarTarget || field.disabled) return;
      const kind = field.getAttribute('data-fmt');
      if (kind === 'font-family') {
        if (field.value) ensureGoogleFontLoaded(field.value);
        applyFormat('font-family', formatToolbarTarget, field.value);
      } else if (kind === 'font-size') {
        const px = parseInt(field.value, 10);
        if (!px) return;
        applyFormat('font-size', formatToolbarTarget, `${px}px`);
      } else if (kind === 'color') {
        applyFormat('color', formatToolbarTarget, field.value);
      }
    });

    // Selection/Range is lost the instant a <select>/<input type=color>/<input type=number>
    // opens its own native picker/focus UI, so the last real selection inside the target is
    // captured just before that happens, and restored right before the format command runs.
    bar.addEventListener('mousedown', (e) => {
      if (e.target.closest('select, input[type="color"], input[type="number"], .qpaix-fmt-size-btn') && formatToolbarTarget) {
        saveSelectionIfInside(formatToolbarTarget);
      }
    });

    document.addEventListener('mousedown', (e) => {
      if (!bar.contains(e.target)) closeAllFormatDropdowns();
    });

    setFormatToolbarEnabled(bar, false);
    return bar;
  }

  function closeAllFormatDropdowns() {
    if (!formatToolbarEl) return;
    formatToolbarEl.querySelectorAll('.qpaix-fmt-dropdown-wrap.qpaix-open').forEach((w) => w.classList.remove('qpaix-open'));
  }

  function setFormatToolbarEnabled(bar, enabled) {
    bar.querySelectorAll('button[data-fmt], select[data-fmt], input[data-fmt], .qpaix-fmt-dropdown-toggle, .qpaix-fmt-size-btn').forEach((el) => {
      el.disabled = !enabled;
      el.classList.toggle('qpaix-fmt-disabled', !enabled);
    });
  }

  // Shows/hides the whole docked bar (edit mode on/off) — separate from setFormatToolbarTarget()
  // below, which only enables/disables its controls depending on whether a text element has focus.
  function setFormatToolbarVisible(visible) {
    if (formatToolbarEl) formatToolbarEl.classList.toggle('qpaix-show', visible);
  }

  function setFormatToolbarTarget(target) {
    formatToolbarTarget = target;
    savedSelectionRange = null;
    if (formatToolbarEl) {
      setFormatToolbarEnabled(formatToolbarEl, !!target);
      if (!target) closeAllFormatDropdowns();
    }
  }

  function getActiveRangeWithin(target) {
    // A <select>/color-<input> change event fires after the browser has already moved focus/
    // selection to that control, so the real text selection must come from what was saved right
    // before the native picker took over — restoreSelection() puts it back into the DOM Selection
    // before this reads it, since the caller (applyFormat) always restores focus to `target` first.
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const range = sel.getRangeAt(0);
    if (!target.contains(range.commonAncestorContainer)) return null;
    return range;
  }

  function wrapRangeInSpan(range, styleFn) {
    const span = document.createElement('span');
    styleFn(span);
    try {
      range.surroundContents(span);
    } catch (e) {
      // surroundContents() throws if the range's boundaries split a non-Text node (e.g. the
      // selection partially overlaps an existing <b>) — extractContents()/appendChild() handles
      // that same case by moving the selected nodes (whatever mix of text/elements they are)
      // into the new wrapper instead of requiring a single clean text run.
      const fragment = range.extractContents();
      span.appendChild(fragment);
      range.insertNode(span);
    }
    return span;
  }

  function applyFormat(kind, target, value) {
    target.focus();
    restoreSelection();
    const range = getActiveRangeWithin(target);

    if (kind === 'align-left' || kind === 'align-center' || kind === 'align-right' || kind === 'align-justify') {
      // Alignment is a block-level property — applies to the whole element, not the selection,
      // same as every rich-text editor's "align" button behaves.
      target.style.textAlign = kind.replace('align-', '');
      dispatchTextInput(target);
      return;
    }

    if (kind === 'reset') {
      // Selection-scoped when there IS a real (non-collapsed) selection, otherwise the whole
      // element — matches how bold/italic/color etc. themselves scope to selection-or-whole-element.
      if (range && !range.collapsed) {
        const text = range.toString();
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
      } else {
        target.textContent = target.textContent; // drops all child element/style nodes, keeps text
        target.style.textAlign = '';
      }
      dispatchTextInput(target);
      return;
    }

    // font-family/font-size/color are the controls a user reaches for most often WITHOUT first
    // manually drag-selecting text — e.g. clicking into a heading and immediately picking a font,
    // the same way a real user's screenshot showed. Falls back to wrapping the element's entire
    // contents in one span, mirroring how align/reset already treat "no selection" as "whole
    // element". Bold/italic/case-transform stay selection-only since those are typically applied
    // to a highlighted run of text, not an entire heading.
    const wholeElementFallback = kind === 'font-family' || kind === 'font-size' || kind === 'color';
    if ((!range || range.collapsed) && wholeElementFallback) {
      const fullRange = document.createRange();
      fullRange.selectNodeContents(target);
      if (kind === 'font-family') wrapRangeInSpan(fullRange, (span) => { if (value) span.style.fontFamily = value; });
      else if (kind === 'font-size') wrapRangeInSpan(fullRange, (span) => { if (value) span.style.fontSize = value; });
      else wrapRangeInSpan(fullRange, (span) => { span.style.color = value; });
      dispatchTextInput(target);
      return;
    }

    if (!range || range.collapsed) {
      // Every remaining command is a run-of-text transform with nothing selected to transform.
      return;
    }

    if (kind === 'bold' || kind === 'italic') {
      const tag = kind === 'bold' ? 'b' : 'i';
      const wrapper = document.createElement(tag);
      try {
        range.surroundContents(wrapper);
      } catch (e) {
        const fragment = range.extractContents();
        wrapper.appendChild(fragment);
        range.insertNode(wrapper);
      }
    } else if (kind === 'case-upper' || kind === 'case-lower' || kind === 'case-capitalize') {
      const text = range.toString();
      const transformed = kind === 'case-upper' ? text.toUpperCase()
        : kind === 'case-lower' ? text.toLowerCase()
        : text.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
      range.deleteContents();
      range.insertNode(document.createTextNode(transformed));
    } else if (kind === 'font-family') {
      wrapRangeInSpan(range, (span) => { if (value) span.style.fontFamily = value; });
    } else if (kind === 'font-size') {
      wrapRangeInSpan(range, (span) => { if (value) span.style.fontSize = value; });
    } else if (kind === 'color') {
      wrapRangeInSpan(range, (span) => { span.style.color = value; });
    }

    dispatchTextInput(target);
  }

  function dispatchTextInput(target) {
    target.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Wrapping an <img> in a positioning div (needed for the hover overlay) changes the DOM one
  // level up from the element cms.js otherwise treats as "the" element — done only while edit
  // mode is on, and reversed (unwrapped) the moment it's switched off, so the page's own layout/
  // CSS (which targets the bare <img>) is completely undisturbed outside edit mode.
  //
  // The wrapper copies the <img>'s own computed display/width/height so it never changes how the
  // image occupies its parent's layout — critical for full-bleed/hero images (block, width:100%)
  // as well as ordinary inline template thumbnails; a fixed `display:inline-block` on the wrapper
  // would otherwise shrink-wrap a full-width image down to its intrinsic size.
  function setupImageEdit(el, enabled) {
    if (enabled) {
      if (el.parentElement && el.parentElement.classList.contains('qpaix-editable-image-wrap')) return;
      const computed = window.getComputedStyle(el);
      const wrap = document.createElement('div');
      wrap.className = 'qpaix-editable-image-wrap';
      wrap.style.display = computed.display === 'inline' ? 'inline-block' : computed.display;
      wrap.style.width = computed.width;
      wrap.style.height = computed.height;
      wrap.style.maxWidth = computed.maxWidth;
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      el.style.width = '100%';
      el.style.height = '100%';

      const overlay = document.createElement('div');
      overlay.className = 'qpaix-image-hover-overlay';
      overlay.innerHTML = '<button type="button"><i class="fa-solid fa-camera"></i> Change Image</button>';
      overlay.querySelector('button').addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openImageUploadModal(el);
      });
      wrap.appendChild(overlay);

      // Some template cards (e.g. team members) reveal a same-size, higher-stacked sibling
      // overlay of their own — either only on :hover (a bio panel sliding over the photo) or
      // UNCONDITIONALLY (a page-title/heading overlay that always sits on top of a hero banner
      // image, e.g. .sisf-page-title). Either way that sibling sits between the mouse and our
      // wrap: for the hover-only kind, entering it fires a mouseleave on our wrap and our
      // CSS-only :hover overlay instantly disappears ("works on the first card, not the next
      // one"); for the always-on kind, the mouse can never even reach the wrap to begin with, so
      // the overlay never appears at all no matter where you hover.
      //
      // Fix: mute pointer-events unconditionally, for the whole time edit mode is on, on any
      // absolutely-positioned sibling of the wrap's ancestors (searched a few levels up) that
      // would otherwise sit on top of the image — restoring them when edit mode turns back off.
      // A muted sibling's own [data-cms] descendants (e.g. an editable heading living inside a
      // page-title overlay) get pointer-events re-enabled individually, so they stay clickable/
      // editable even while their non-editable ancestor overlay is muted. Detected generically
      // (position:absolute, no fixed class name) so this isn't tied to one template.
      const mutedSiblings = [];
      let node = wrap;
      for (let depth = 0; depth < 3 && node.parentElement; depth++) {
        const parent = node.parentElement;
        Array.from(parent.children).forEach((sibling) => {
          if (sibling === node) return;
          if (sibling.querySelector('img[data-cms], .qpaix-editable-image-wrap') || sibling.classList.contains('offering-card')) return;
          if (window.getComputedStyle(sibling).position === 'absolute') {
            mutedSiblings.push([sibling, sibling.style.pointerEvents, sibling.style.zIndex]);
            sibling.style.pointerEvents = 'none';
            sibling.style.zIndex = '1000';
            sibling.querySelectorAll('[data-cms]').forEach((target) => {
              target.style.pointerEvents = 'auto';
              target.style.position = 'relative';
              target.style.zIndex = '2001';
            });
          }
        });
        node = parent;
      }
      imageEditCleanups.push(() => {
        mutedSiblings.forEach(([sibling, prevPE, prevZ]) => {
          sibling.style.pointerEvents = prevPE;
          sibling.style.zIndex = prevZ || '';
          sibling.querySelectorAll('[data-cms]').forEach((target) => {
            target.style.position = '';
            target.style.zIndex = '';
          });
        });
      });
    } else {
      const wrap = el.parentElement;
      if (wrap && wrap.classList.contains('qpaix-editable-image-wrap')) {
        el.style.width = '';
        el.style.height = '';
        wrap.parentNode.insertBefore(el, wrap);
        wrap.remove();
      }
    }
  }

  const imageModalState = {
    targetEl: null,
    uploadedUrl: null,
    selectedFile: null,
    loadedImg: null,
    currentRatio: 'original',
    cropBox: { x: 0, y: 0, w: 0, h: 0 },
    fitMode: 'default'
  };

  function loadCmsImageModal() {
    if (document.getElementById('qpaix-image-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'qpaix-image-modal-overlay';
    overlay.innerHTML = `
      <div id="qpaix-image-modal">
        <div class="qpaix-modal-header">
          <h4><i class="fa-solid fa-crop-simple" style="color:#2e5dea;margin-right:8px;"></i>Change &amp; Crop Image</h4>
          <span class="qpaix-modal-dim-badge" data-role="dim-badge" style="display:none;"></span>
        </div>

        <img class="qpaix-current-preview" data-role="preview" style="display:none;" alt="Current Image">

        <!-- File Pick / Drop Zone -->
        <div class="qpaix-drop-zone" data-role="drop-zone">
          <input type="file" accept="image/*" data-role="file-input" style="display:none;">
          <div data-role="drop-text">
            <i class="fa-solid fa-cloud-arrow-up" style="font-size:32px;color:#2e5dea;display:block;margin-bottom:10px;"></i>
            <strong>Click to choose an image</strong>, or drag &amp; drop here
          </div>
        </div>

        <!-- Interactive Crop Workspace -->
        <div class="qpaix-crop-workspace" data-role="crop-workspace" style="display:none;">
          <div class="qpaix-crop-toolbar">
            <div class="qpaix-ratio-group" data-role="ratio-group">
              <button type="button" class="qpaix-ratio-btn qpaix-active" data-ratio="original">
                <i class="fa-solid fa-image"></i> Original (No Crop)
              </button>
              <button type="button" class="qpaix-ratio-btn" data-ratio="free">
                <i class="fa-solid fa-crop-simple"></i> Free Crop
              </button>
              <button type="button" class="qpaix-ratio-btn" data-ratio="16:9">
                <i class="fa-solid fa-desktop"></i> 16:9 Screen
              </button>
              <button type="button" class="qpaix-ratio-btn" data-ratio="4:3">
                <i class="fa-solid fa-table-cells-large"></i> 4:3
              </button>
              <button type="button" class="qpaix-ratio-btn" data-ratio="1:1">
                <i class="fa-solid fa-square"></i> 1:1 Square
              </button>
              <button type="button" class="qpaix-ratio-btn" data-ratio="9:16">
                <i class="fa-solid fa-mobile-screen"></i> 9:16 Mobile
              </button>
            </div>
          </div>

          <div class="qpaix-crop-stage" data-role="crop-stage">
            <div class="qpaix-crop-viewport" data-role="crop-viewport">
              <img class="qpaix-crop-source-img" data-role="crop-img" draggable="false" alt="Crop Source">
              <div class="qpaix-crop-box" data-role="crop-box" style="display:none;">
                <div class="qpaix-crop-handle handle-nw" data-handle="nw"></div>
                <div class="qpaix-crop-handle handle-ne" data-handle="ne"></div>
                <div class="qpaix-crop-handle handle-sw" data-handle="sw"></div>
                <div class="qpaix-crop-handle handle-se" data-handle="se"></div>
                <div class="qpaix-crop-grid-h"></div>
                <div class="qpaix-crop-grid-v"></div>
              </div>
            </div>
          </div>

          <div class="qpaix-crop-controls">
            <label class="qpaix-fit-label">
              <span>Display Fit:</span>
              <select class="qpaix-fit-select" data-role="fit-select">
                <option value="default">Layout Default</option>
                <option value="contain">Fit Entire Image (No Zoom / Contain)</option>
                <option value="cover">Fill Container (Cover)</option>
              </select>
            </label>
            <button type="button" class="qpaix-crop-reset-btn" data-role="change-file-btn">
              <i class="fa-solid fa-rotate-left"></i> Change File
            </button>
          </div>
        </div>

        <div class="qpaix-upload-progress-wrap" data-role="progress-wrap" style="display:none;">
          <div class="qpaix-upload-progress-bar">
            <div class="qpaix-upload-progress-fill" data-role="progress-fill" style="width:0%;"></div>
          </div>
          <div class="qpaix-upload-progress-pct" data-role="progress-pct">0%</div>
        </div>

        <div class="qpaix-status-msg" data-role="status"></div>

        <div class="qpaix-form-actions">
          <button type="button" class="qpaix-btn-primary" data-role="save" disabled>
            <i class="fa-solid fa-check"></i> Upload &amp; Apply
          </button>
          <button type="button" class="qpaix-btn-secondary" data-role="cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeImageUploadModal();
    });
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', closeImageUploadModal);

    const dropZone = overlay.querySelector('[data-role="drop-zone"]');
    const fileInput = overlay.querySelector('[data-role="file-input"]');
    const changeFileBtn = overlay.querySelector('[data-role="change-file-btn"]');

    dropZone.addEventListener('click', () => fileInput.click());
    changeFileBtn.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('qpaix-dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('qpaix-dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('qpaix-dragover');
      if (e.dataTransfer.files[0]) onImageFileChosen(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) onImageFileChosen(fileInput.files[0]);
    });

    // Ratio buttons
    const ratioBtns = overlay.querySelectorAll('.qpaix-ratio-btn');
    ratioBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        ratioBtns.forEach(b => b.classList.remove('qpaix-active'));
        btn.classList.add('qpaix-active');
        setCropRatio(btn.getAttribute('data-ratio'));
      });
    });

    // Fit select
    const fitSelect = overlay.querySelector('[data-role="fit-select"]');
    fitSelect.addEventListener('change', () => {
      imageModalState.fitMode = fitSelect.value;
    });

    // Drag and resize handlers on crop-box
    setupCropBoxInteractions(overlay);

    // Save/Upload action
    overlay.querySelector('[data-role="save"]').addEventListener('click', () => {
      executeCropAndUpload();
    });
  }

  function openImageUploadModal(el) {
    loadCmsImageModal();
    imageModalState.targetEl = el;
    imageModalState.uploadedUrl = null;
    imageModalState.selectedFile = null;
    imageModalState.loadedImg = null;
    imageModalState.currentRatio = 'original';
    imageModalState.fitMode = 'default';

    const overlay = document.getElementById('qpaix-image-modal-overlay');
    const preview = overlay.querySelector('[data-role="preview"]');
    const dropZone = overlay.querySelector('[data-role="drop-zone"]');
    const workspace = overlay.querySelector('[data-role="crop-workspace"]');
    const dimBadge = overlay.querySelector('[data-role="dim-badge"]');
    const status = overlay.querySelector('[data-role="status"]');
    const saveBtn = overlay.querySelector('[data-role="save"]');
    const fileInput = overlay.querySelector('[data-role="file-input"]');
    const fitSelect = overlay.querySelector('[data-role="fit-select"]');

    preview.src = el.src || '';
    preview.style.display = el.src ? 'block' : 'none';
    dropZone.style.display = 'block';
    workspace.style.display = 'none';
    dimBadge.style.display = 'none';
    status.textContent = '';
    status.className = 'qpaix-status-msg';
    saveBtn.disabled = true;
    fileInput.value = '';
    fitSelect.value = 'default';

    overlay.querySelector('[data-role="progress-wrap"]').style.display = 'none';
    overlay.querySelector('[data-role="progress-fill"]').style.width = '0%';
    overlay.querySelector('[data-role="progress-pct"]').textContent = '0%';

    overlay.classList.add('qpaix-open');
  }

  function closeImageUploadModal() {
    const overlay = document.getElementById('qpaix-image-modal-overlay');
    if (overlay) overlay.classList.remove('qpaix-open');
    imageModalState.targetEl = null;
    imageModalState.uploadedUrl = null;
    imageModalState.selectedFile = null;
    imageModalState.loadedImg = null;
  }

  function onImageFileChosen(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      return;
    }
    imageModalState.selectedFile = file;

    const overlay = document.getElementById('qpaix-image-modal-overlay');
    const dropZone = overlay.querySelector('[data-role="drop-zone"]');
    const preview = overlay.querySelector('[data-role="preview"]');
    const workspace = overlay.querySelector('[data-role="crop-workspace"]');
    const dimBadge = overlay.querySelector('[data-role="dim-badge"]');
    const cropImg = overlay.querySelector('[data-role="crop-img"]');
    const saveBtn = overlay.querySelector('[data-role="save"]');
    const status = overlay.querySelector('[data-role="status"]');

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        imageModalState.loadedImg = img;
        dimBadge.textContent = `${img.naturalWidth} × ${img.naturalHeight}px`;
        dimBadge.style.display = 'inline-block';

        dropZone.style.display = 'none';
        preview.style.display = 'none';
        workspace.style.display = 'block';

        cropImg.src = img.src;

        // Reset to original mode
        const ratioBtns = overlay.querySelectorAll('.qpaix-ratio-btn');
        ratioBtns.forEach(b => b.classList.remove('qpaix-active'));
        overlay.querySelector('.qpaix-ratio-btn[data-ratio="original"]')?.classList.add('qpaix-active');

        setCropRatio('original');

        saveBtn.disabled = false;
        status.textContent = 'Choose a crop selection above, or leave Original to keep 100% full image.';
        status.className = 'qpaix-status-msg';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function setCropRatio(ratio) {
    imageModalState.currentRatio = ratio;
    const overlay = document.getElementById('qpaix-image-modal-overlay');
    const cropBox = overlay.querySelector('[data-role="crop-box"]');
    const cropImg = overlay.querySelector('[data-role="crop-img"]');

    if (ratio === 'original') {
      cropBox.style.display = 'none';
      return;
    }

    cropBox.style.display = 'block';
    requestAnimationFrame(() => {
      const vw = cropImg.clientWidth || 320;
      const vh = cropImg.clientHeight || 240;

      let targetW, targetH;
      if (ratio === 'free') {
        targetW = vw * 0.85;
        targetH = vh * 0.85;
      } else {
        let r = 1;
        if (ratio === '16:9') r = 16 / 9;
        else if (ratio === '4:3') r = 4 / 3;
        else if (ratio === '1:1') r = 1;
        else if (ratio === '9:16') r = 9 / 16;

        targetW = vw * 0.9;
        targetH = targetW / r;
        if (targetH > vh * 0.9) {
          targetH = vh * 0.9;
          targetW = targetH * r;
        }
      }

      const boxL = Math.max(0, (vw - targetW) / 2);
      const boxT = Math.max(0, (vh - targetH) / 2);

      imageModalState.cropBox = { x: boxL, y: boxT, w: targetW, h: targetH };
      cropBox.style.left = `${boxL}px`;
      cropBox.style.top = `${boxT}px`;
      cropBox.style.width = `${targetW}px`;
      cropBox.style.height = `${targetH}px`;
    });
  }

  function setupCropBoxInteractions(overlay) {
    const cropBox = overlay.querySelector('[data-role="crop-box"]');
    const cropImg = overlay.querySelector('[data-role="crop-img"]');

    let isInteracting = false;
    let mode = 'move'; // 'move' or 'nw', 'ne', 'sw', 'se'
    let startX = 0, startY = 0;
    let startL = 0, startT = 0, startW = 0, startH = 0;

    function getCoords(e) {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    }

    function onPointerDown(e) {
      const handle = e.target.getAttribute('data-handle');
      mode = handle || 'move';
      isInteracting = true;

      const p = getCoords(e);
      startX = p.x;
      startY = p.y;
      startL = imageModalState.cropBox.x;
      startT = imageModalState.cropBox.y;
      startW = imageModalState.cropBox.w;
      startH = imageModalState.cropBox.h;

      e.preventDefault();
      window.addEventListener('mousemove', onPointerMove);
      window.addEventListener('mouseup', onPointerUp);
      window.addEventListener('touchmove', onPointerMove, { passive: false });
      window.addEventListener('touchend', onPointerUp);
    }

    function onPointerMove(e) {
      if (!isInteracting) return;
      e.preventDefault();

      const p = getCoords(e);
      const dx = p.x - startX;
      const dy = p.y - startY;

      const maxW = cropImg.clientWidth || 320;
      const maxH = cropImg.clientHeight || 240;

      if (mode === 'move') {
        let newX = Math.max(0, Math.min(maxW - startW, startL + dx));
        let newY = Math.max(0, Math.min(maxH - startH, startT + dy));

        imageModalState.cropBox.x = newX;
        imageModalState.cropBox.y = newY;
        cropBox.style.left = `${newX}px`;
        cropBox.style.top = `${newY}px`;
      } else {
        // Resizing
        let newL = startL, newT = startT, newW = startW, newH = startH;
        const ratio = imageModalState.currentRatio;

        if (mode.includes('e')) newW = Math.max(30, Math.min(maxW - startL, startW + dx));
        if (mode.includes('s')) newH = Math.max(30, Math.min(maxH - startT, startH + dy));
        if (mode.includes('w')) {
          const clampedDx = Math.min(dx, startW - 30);
          newL = Math.max(0, startL + clampedDx);
          newW = startW - (newL - startL);
        }
        if (mode.includes('n')) {
          const clampedDy = Math.min(dy, startH - 30);
          newT = Math.max(0, startT + clampedDy);
          newH = startH - (newT - startT);
        }

        // Lock ratio if not free
        if (ratio !== 'free' && ratio !== 'original') {
          let r = 1;
          if (ratio === '16:9') r = 16 / 9;
          else if (ratio === '4:3') r = 4 / 3;
          else if (ratio === '1:1') r = 1;
          else if (ratio === '9:16') r = 9 / 16;

          newH = newW / r;
          if (newT + newH > maxH) {
            newH = maxH - newT;
            newW = newH * r;
          }
        }

        imageModalState.cropBox = { x: newL, y: newT, w: newW, h: newH };
        cropBox.style.left = `${newL}px`;
        cropBox.style.top = `${newT}px`;
        cropBox.style.width = `${newW}px`;
        cropBox.style.height = `${newH}px`;
      }
    }

    function onPointerUp() {
      isInteracting = false;
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
    }

    cropBox.addEventListener('mousedown', onPointerDown);
    cropBox.addEventListener('touchstart', onPointerDown, { passive: false });
  }

  function executeCropAndUpload() {
    const overlay = document.getElementById('qpaix-image-modal-overlay');
    const saveBtn = overlay.querySelector('[data-role="save"]');
    const status = overlay.querySelector('[data-role="status"]');
    const cropImg = overlay.querySelector('[data-role="crop-img"]');
    const rawImg = imageModalState.loadedImg;

    if (!imageModalState.selectedFile || !rawImg) return;

    saveBtn.disabled = true;
    status.textContent = 'Processing image...';
    status.className = 'qpaix-status-msg';

    if (imageModalState.currentRatio === 'original') {
      // Upload raw original file directly
      uploadImageFile(imageModalState.selectedFile);
    } else {
      // Crop using canvas
      const vw = cropImg.clientWidth || rawImg.naturalWidth;
      const vh = cropImg.clientHeight || rawImg.naturalHeight;
      const scaleX = rawImg.naturalWidth / vw;
      const scaleY = rawImg.naturalHeight / vh;

      const sx = Math.max(0, Math.round(imageModalState.cropBox.x * scaleX));
      const sy = Math.max(0, Math.round(imageModalState.cropBox.y * scaleY));
      const sw = Math.min(rawImg.naturalWidth - sx, Math.round(imageModalState.cropBox.w * scaleX));
      const sh = Math.min(rawImg.naturalHeight - sy, Math.round(imageModalState.cropBox.h * scaleY));

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, sw);
      canvas.height = Math.max(1, sh);
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(rawImg, sx, sy, sw, sh, 0, 0, sw, sh);

      canvas.toBlob((blob) => {
        if (!blob) {
          uploadImageFile(imageModalState.selectedFile);
          return;
        }
        const cleanName = (imageModalState.selectedFile.name || 'image').replace(/\.[^.]+$/, '') + '-cropped.webp';
        const croppedFile = new File([blob], cleanName, { type: 'image/webp' });
        uploadImageFile(croppedFile);
      }, 'image/webp', 0.92);
    }
  }

  function uploadImageFile(fileToUpload) {
    const overlay = document.getElementById('qpaix-image-modal-overlay');
    const status = overlay.querySelector('[data-role="status"]');
    const saveBtn = overlay.querySelector('[data-role="save"]');
    const progressWrap = overlay.querySelector('[data-role="progress-wrap"]');
    const progressFill = overlay.querySelector('[data-role="progress-fill"]');
    const progressPct = overlay.querySelector('[data-role="progress-pct"]');

    status.textContent = '';
    status.className = 'qpaix-status-msg';
    progressWrap.style.display = 'flex';
    progressFill.style.width = '0%';
    progressPct.textContent = '0%';

    let displayedPct = 0;
    let targetPct = 0;
    let rafId = null;
    function animateTo(target) {
      targetPct = target;
      if (rafId) return;
      const step = () => {
        if (displayedPct < targetPct) {
          displayedPct = Math.min(targetPct, displayedPct + Math.max(1, (targetPct - displayedPct) * 0.15));
          progressFill.style.width = displayedPct + '%';
          progressPct.textContent = Math.round(displayedPct) + '%';
          rafId = requestAnimationFrame(step);
        } else {
          rafId = null;
        }
      };
      rafId = requestAnimationFrame(step);
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('folder', 'INLINE');

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.withCredentials = true;

    xhr.upload.addEventListener('progress', (e) => {
      if (!e.lengthComputable) return;
      const realPct = (e.loaded / e.total) * 100;
      animateTo(Math.min(90, realPct));
    });

    xhr.addEventListener('load', () => {
      animateTo(100);
      const finish = () => {
        if (rafId) { requestAnimationFrame(finish); return; }
        progressWrap.style.display = 'none';
        if (xhr.status < 200 || xhr.status >= 300) {
          status.textContent = `Upload failed: HTTP ${xhr.status}`;
          status.className = 'qpaix-status-msg qpaix-error';
          saveBtn.disabled = false;
          return;
        }
        try {
          const data = JSON.parse(xhr.responseText);
          const target = imageModalState.targetEl;
          if (target && data.url) {
            target.src = data.url;

            // Apply user fit selection
            if (imageModalState.fitMode === 'contain') {
              target.style.objectFit = 'contain';
            } else if (imageModalState.fitMode === 'cover') {
              target.style.objectFit = 'cover';
            } else {
              target.style.objectFit = '';
            }

            const dataCms = target.getAttribute('data-cms');
            if (dataCms) {
              queueChange(dataCms, 'image', data.url);
            }
          }
          status.textContent = 'Saved successfully!';
          status.className = 'qpaix-status-msg qpaix-success';
          setTimeout(() => {
            closeImageUploadModal();
          }, 450);
        } catch (e) {
          status.textContent = `Upload parsing error: ${e.message}`;
          status.className = 'qpaix-status-msg qpaix-error';
          saveBtn.disabled = false;
        }
      };
      finish();
    });

    xhr.addEventListener('error', () => {
      if (rafId) cancelAnimationFrame(rafId);
      progressWrap.style.display = 'none';
      status.textContent = 'Upload failed: network error';
      status.className = 'qpaix-status-msg qpaix-error';
      saveBtn.disabled = false;
    });

    xhr.send(formData);
  }

  function setupLinkEdit(el, enabled) {
    if (enabled) {
      el.addEventListener('click', onLinkClick);
    } else {
      el.removeEventListener('click', onLinkClick);
    }
  }

  function onLinkClick(e) {
    if (!state.editMode) return;
    e.preventDefault();
    openLinkEditModal(e.currentTarget);
  }

  const linkModalState = { targetEl: null };

  function loadCmsLinkModal() {
    if (document.getElementById('qpaix-link-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'qpaix-link-modal-overlay';
    overlay.innerHTML = `
      <div id="qpaix-link-modal">
        <h4>Edit Link</h4>
        <div class="qpaix-link-field">
          <label>URL</label>
          <input type="text" data-role="url-input" placeholder="/contact or https://example.com">
        </div>
        <div class="qpaix-status-msg" data-role="status"></div>
        <div class="qpaix-form-actions">
          <button type="button" class="qpaix-btn-primary" data-role="save">Save</button>
          <button type="button" class="qpaix-btn-secondary" data-role="cancel">Cancel</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeLinkEditModal();
    });
    overlay.querySelector('[data-role="cancel"]').addEventListener('click', closeLinkEditModal);

    const urlInput = overlay.querySelector('[data-role="url-input"]');
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); overlay.querySelector('[data-role="save"]').click(); }
      if (e.key === 'Escape') closeLinkEditModal();
    });

    overlay.querySelector('[data-role="save"]').addEventListener('click', () => {
      const target = linkModalState.targetEl;
      const status = overlay.querySelector('[data-role="status"]');
      if (!target) return;
      const newUrl = urlInput.value.trim();
      if (!newUrl) {
        status.textContent = 'Please enter a URL.';
        status.className = 'qpaix-status-msg qpaix-error';
        return;
      }
      target.href = newUrl;
      queueChange(target.getAttribute('data-cms'), 'link', newUrl);
      closeLinkEditModal();
    });
  }

  function openLinkEditModal(el) {
    loadCmsLinkModal();
    linkModalState.targetEl = el;

    const overlay = document.getElementById('qpaix-link-modal-overlay');
    const urlInput = overlay.querySelector('[data-role="url-input"]');
    const status = overlay.querySelector('[data-role="status"]');

    urlInput.value = el.getAttribute('href') || '';
    status.textContent = '';
    status.className = 'qpaix-status-msg';

    overlay.classList.add('qpaix-open');
    setTimeout(() => { urlInput.focus(); urlInput.select(); }, 50);
  }

  function closeLinkEditModal() {
    const overlay = document.getElementById('qpaix-link-modal-overlay');
    if (overlay) overlay.classList.remove('qpaix-open');
    linkModalState.targetEl = null;
  }

  function queueChange(elementId, contentType, contentValue) {
    state.pendingChanges[elementId] = {
      page_slug: pageSlugForElement(elementId),
      element_id: elementId,
      content_type: contentType,
      content_value: contentValue,
    };
  }

  function showCmsAlert(message, type = 'success') {
    return new Promise((resolve) => {
      // Remove any existing alert
      const existing = document.getElementById('qpaix-cms-alert-overlay');
      if (existing) existing.remove();

      const safeDiv = document.createElement('div');
      safeDiv.textContent = message == null ? '' : String(message);
      const safeText = safeDiv.innerHTML;

      let iconHtml = '<i class="fa-solid fa-circle-check qpaix-alert-icon icon-success"></i>';
      let title = 'Success';
      if (type === 'error') {
        iconHtml = '<i class="fa-solid fa-circle-exclamation qpaix-alert-icon icon-error"></i>';
        title = 'Error';
      } else if (type === 'info') {
        iconHtml = '<i class="fa-solid fa-circle-info qpaix-alert-icon icon-info"></i>';
        title = 'Info';
      }

      const overlay = document.createElement('div');
      overlay.id = 'qpaix-cms-alert-overlay';
      overlay.innerHTML = `
        <div class="qpaix-cms-alert-box" role="alertdialog" aria-modal="true" aria-label="${title}">
          ${iconHtml}
          <div class="qpaix-alert-message">${safeText}</div>
          <button id="qpaix-cms-alert-ok" type="button">OK</button>
        </div>
      `;

      document.body.appendChild(overlay);

      // Animate in
      requestAnimationFrame(() => overlay.classList.add('qpaix-alert-visible'));

      const close = () => {
        overlay.classList.remove('qpaix-alert-visible');
        setTimeout(() => { overlay.remove(); resolve(); }, 200);
      };

      document.getElementById('qpaix-cms-alert-ok').addEventListener('click', close);
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Enter' || e.key === 'Escape') {
          document.removeEventListener('keydown', onKey);
          close();
        }
      });

      // Focus OK button
      setTimeout(() => document.getElementById('qpaix-cms-alert-ok')?.focus(), 50);
    });
  }
  window.showCmsAlert = showCmsAlert;
  // Keep alias for backward compat
  window.showCmsToast = (msg, type) => showCmsAlert(msg, type);

  async function saveAllPendingChanges() {
    const changes = Object.values(state.pendingChanges);
    if (changes.length === 0) {
      showCmsToast('No changes to save.', 'info');
      return;
    }

    const saveBtn = document.querySelector('#qpaix-cms-admin-bar [data-action="save"]');
    const originalHtml = saveBtn ? saveBtn.innerHTML : '';
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Saving...</span>';
    }

    try {
      const results = await Promise.allSettled(changes.map((change) => {
        const route = resolveSaveRoute(change.element_id);
        if (route) return route.save(change.element_id, change.content_value, change.content_type);
        return apiPost('/api/v2/page-elements', change);
      }));

      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('[cms] Some changes failed to save', failures);
        showCmsToast(`Saved with ${failures.length} error(s) — check console.`, 'error');
      } else {
        showCmsToast('Changes saved successfully!', 'success');
      }

      await recordHistory(changes);
      state.pendingChanges = {};

      // Invalidate local storage cache so refreshed pages get latest saved DB changes immediately
      try {
        localStorage.removeItem(`qpaix_page_elements_${PAGE_SLUG}`);
        localStorage.removeItem(`qpaix_page_elements_${SHARED_HEADER_SLUG}`);
      } catch (e) {}
    } catch (e) {
      console.error('[cms] Save failed', e);
      showCmsToast(`Save failed: ${e.message}`, 'error');
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = originalHtml || '<i class="fa-solid fa-check"></i><span>Save</span>';
      }
    }
  }

  async function recordHistory(changes) {
    try {
      const snapshot = {};
      document.querySelectorAll('[data-cms]').forEach((el) => {
        const id = el.getAttribute('data-cms');
        snapshot[id] = el.tagName === 'IMG' ? el.src : el.tagName === 'A' ? el.href : el.innerHTML;
      });
      await apiPost('/api/v2/history', {
        page_slug: PAGE_SLUG,
        snapshot,
        changed_keys: changes.map((c) => c.element_id),
      });
    } catch (e) {
      console.warn('[cms] Failed to record history', e);
    }
  }

  async function logout() {
    await apiPost('/api/admin/logout', {});
    window.location.reload();
  }

  // ────────────────────────────────────────────────────────────────────────
  // Master Header Injection — same pattern as the footer below: every page's hand-duplicated
  // <header> markup gets replaced with this single template at boot, so a header edit only ever
  // needs to happen once (here) instead of being copy-pasted across every page's HTML file.
  // ────────────────────────────────────────────────────────────────────────
  const MASTER_HEADER_HTML = `
      <header id="sisf-page-header" class="sisf-main-header sisf--it-company sisf-standerd-header">
         <div class="header-top sisf-skin--light">
            <div class="container">
               <div class="row px-2">
                  <div class="col-12">
                     <div class="header_col">
                        <div class="sisf-widget-holder sisf--left">
                           <div class="widget widget_sis_core_icon_list_item sisf-top-bar-widget">
                              <div class="sisf-icon-list-item sisf-icon--icon-pack">
                                 <a href="tel:07946059032" target="_self" data-cms="header-phone-link">
                                 <span class="sisf-e-title-inner">
                                 <span class="sisf-e-title-text"><span class="sisf-icon-simple-line-icons icon-call-in sisf-icon sisf-e me-1"></span> <span data-cms="header-phone-text">Call us: 07946059032</span></span>
                                 </span>
                                 </a>
                              </div>
                           </div>
                        </div>
                        <div class="header-center-icons">
                           <a class="me-3" href="#" data-cms="header-social-facebook"><i class="fa-brands fa-facebook"></i></a>
                           <a class="me-3" href="https://www.instagram.com/qpaix_infitech?igsh=MTZ3YWRtejV1d2RvZg==" target="_blank" data-cms="header-social-instagram"><i class="fa-brands fa-instagram"></i></a>
                           <a class="me-3" href="https://www.linkedin.com/company/102248873/admin/feed/posts/" target="_blank" data-cms="header-social-linkedin"><i class="fa-brands fa-linkedin"></i></a>
                           <a class="me-3" href="https://x.com/QpaixL53244" target="_blank" data-cms="header-social-twitter"><i class="fa-brands fa-x-twitter"></i></a>
                        </div>
                        <div class="mail-us">
                           <a href="mailto:info@qpaix.com" data-cms="header-email-link"><span class="sisf-e-title-text"><span class="sisf-icon-simple-line-icons icon-envelope-open sisf-icon sisf-e me-2"></span> <span data-cms="header-email-text">Mail us: info@qpaix.com</span></span></a>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
         </div>
         <div id="sisf-page-header-inner" class="sisf-skin--light position-relative d-flex align-items-center">
            <div class="container p-0">
               <a class="navbar-brand sisf-header-logo-link mobile-block" href="/">
               <img src="/images/qpaix-logo.jpg" alt="QPAIX" data-cms="site-logo">
               </a>
               <div class="sisf-centered-header-wrapper sisf--header d-flex justify-content-between align-items-center">
                  <a class="navbar-brand sisf-header-logo-link" href="/">
                  <img src="/images/qpaix-logo.jpg" alt="QPAIX" data-cms="site-logo-2">
                  </a>
                  <nav class="navbar navbar-expand-lg">
                     <div class="collapse navbar-collapse main-menu">
                        <div class="nav-menu-wrapper">
                           <ul class="navbar-nav mr-auto" id="menu">
                              <li class="nav-item"><a class="nav-link" href="/">Home</a></li>
                              <li class="nav-item submenu">
                                 <a class="nav-link" href="/about">Company<i class="fas fa-chevron-down custom-toggle-icon px-3"></i></a>
                                 <ul class="sub-menu">
                                    <li class="nav-item"><a class="nav-link" href="/about">About Us</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/team">Our Team</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/careers">Careers</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/faq">FAQ</a></li>
                                 </ul>
                              </li>
                              <li class="nav-item submenu">
                                 <a class="nav-link" href="/services">Services<i class="fas fa-chevron-down custom-toggle-icon px-3"></i></a>
                                 <ul class="sub-menu">
                                    <li class="nav-item"><a class="nav-link" href="/services/software-development">Software Development</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/services/enterprise-ai-solutions">Enterprise AI Solutions</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/services/data-analytics">Data Analytics</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/services/iot-driven-solutions">IoT-Driven Solutions</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/services/cloud-platform-services">Cloud Platform Services</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/services/drone-services">Drone Services</a></li>
                                 </ul>
                              </li>
                              <li class="nav-item submenu">
                                 <a class="nav-link" href="/products">Products<i class="fas fa-chevron-down custom-toggle-icon px-3"></i></a>
                                 <ul class="sub-menu">
                                    <li class="nav-item"><a class="nav-link" href="/products/gyan-saarthi">Gyan Saarthi (ERP)</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/products/cmms">CMMS</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/products/career-disha">Career Disha</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/products/rtk-system">RTK System</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/products/next-gen-scada">Next-Gen SCADA</a></li>
                                    <li class="nav-item"><a class="nav-link" href="/products/autopilot-uav">Autopilot UAV</a></li>
                                 </ul>
                              </li>
                              <li class="nav-item"><a class="nav-link" href="/blog">Blog</a></li>
                              <li class="nav-item"><a class="nav-link" href="/contact">Contact</a></li>
                           </ul>
                        </div>
                     </div>
                  </nav>
                  <div class="sisf-widget-holder sisf--two d-flex align-items-center">
                     <div class="header-btn">
                        <a href="/contact" class="sisf-button sisf-layout--outlined rounded-5" data-cms="header-cta-text">WORK WITH US</a>
                     </div>
                  </div>
               </div>
               <div class="navbar-toggle"></div>
               <div class="responsive-menu"></div>
            </div>
         </div>
      </header>
  `.trim();

  function injectMasterHeader() {
    const existingHeader = document.getElementById('sisf-page-header');
    if (!existingHeader) return;
    const temp = document.createElement('div');
    temp.innerHTML = MASTER_HEADER_HTML;
    const newHeader = temp.firstElementChild;
    existingHeader.replaceWith(newHeader);
    // function.js's mobile-menu (slicknav) setup ran against the OLD header at script-load time,
    // before this replacement — re-run it now against the new #menu so mobile nav still works.
    if (typeof window.qpaixHandleMobileMenus === 'function') {
      window.qpaixHandleMobileMenus();
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Master Footer Injection & Brand Favicon Sync
  // ────────────────────────────────────────────────────────────────────────
  const MASTER_FOOTER_HTML = `
      <footer class="main-footer">
         <div class="sisf-page-footer-inner-area">
            <div class="sisf-page-footer-top-area sisf-sis-page-footer-top-area border-0">
               <div class="container">
                  <div class="row align-items-center">
                     <div class="col-md-10">
                        <div class="sisf-block-heading wow slideInLeft">
                           <h2 class="block-heading">Get in <strong>Touch</strong></h2>
                        </div>
                     </div>
                     <div class="col-md-2">
                        <div class="sisf-footer-btn wow slideInRight">
                           <a href="/contact">
                           <span class="sisf-m-text">SEND US  A MESSAGE</span>
                           </a>
                        </div>
                     </div>
                     <div class="col-12">
                        <div class="sisf-ft-top-bottom-part">
                           <div class="row align-items-center">
                              <div class="col-md-2">
                                 <div class="footer-icon-image wow bounceInLeft">
                                    <figure>
                                       <img src="/images/got_idea_icon.png" class="w-100" alt="QPAIX" data-cms="footer-cta-icon">
                                    </figure>
                                 </div>
                              </div>
                              <div class="col-md-8">
                                 <div class="sisf-center wow fadeIn">
                                    <h3 data-cms="footer-cta-heading">Got an idea? Let's bring it to life and create something amazing together!</h3>
                                 </div>
                              </div>
                              <div class="col-md-2">
                                 <div class="sisf-m-button wow bounceInRight">
                                    <a href="/contact" class="btn-default"><span>GET STARTED</span></a>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
            <div class="sisf-page-footer-middle-area footer-single">
               <div class="container">
                  <div class="row">
                     <div class="col-lg-3 col-md-6">
                        <div class="footer-logo wow fadeInUp">
                           <a href="/">
                           <img src="/images/qpaix-logo.jpg" alt="QPAIX" data-cms="footer-logo">
                           </a>
                        </div>
                        <div class="text wow fadeInUp">
                           <p data-cms="footer-tagline">For inquiries, feedback, or support, feel free to reach out to us. We are always ready to collaborate and bring your ideas to life.</p>
                        </div>
                        <div class="footer-image wow fadeInUp mt-4">
                           <figure>
                              <img src="/images/footer_img1.png" alt="QPAIX" data-cms="footer-decorative-image">
                           </figure>
                        </div>
                     </div>
                     <div class="col-lg-3 col-md-6">
                        <!-- Links Start -->
                        <div class="footer-links wow fadeInUp">
                           <h3>Company</h3>
                           <ul>
                              <li><a href="/">Home</a></li>
                              <li><a href="/about">About Us</a></li>
                              <li><a href="/contact">Contact</a></li>
                              <li><a href="/login">CMS Login</a></li>
                              <li><a href="https://staff.qpaix.com" target="_blank" rel="noopener">Employee Portal</a></li>
                           </ul>
                        </div>
                        <!-- Links End -->
                        <!-- Footer Location Details Start -->
                        <div class="footer-contact footer-location wow fadeInUp">
                           <h3 data-cms="footer-office1-city">Ahmedabad (HQ)</h3>
                           <div class="footer-contact-details">
                              <!-- Footer Info Box Start -->
                              <div class="footer-info-box">
                                 <p data-cms="footer-office1-address">14th Floor, D&C Dynasty,<br> Near Stadium Circle, C.G. Road,<br> Navrangpura, Ahmedabad - 380009</p>
                              </div>
                              <!-- Footer Info Box End -->
                           </div>
                        </div>
                        <!-- Footer Location Details End -->
                     </div>
                     <div class="col-lg-3 col-md-6">
                        <!-- Footer Contact Details Start -->
                        <div class="footer-contact wow fadeInUp">
                           <h3>Contact</h3>
                           <div class="footer-contact-details">
                              <p class="my-2" data-cms="footer-phone-1">Tel : 07946059032</p>
                              <p class="my-2" data-cms="footer-phone-2">Tel : +91 9327591004</p>
                              <p class="my-2" data-cms="footer-email-1">info@qpaix.com</p>
                              <p class="mb-0" data-cms="footer-email-2">support@qpaix.com</p>
                           </div>
                        </div>
                        <!-- Footer Contact Details End -->
                        <!-- Footer Location Details Start -->
                        <div class="footer-contact footer-location wow fadeInUp">
                           <h3 data-cms="footer-office2-city">Support Hours</h3>
                           <div class="footer-contact-details">
                              <!-- Footer Info Box Start -->
                              <div class="footer-info-box">
                                 <p data-cms="footer-office2-address">Mon - Sat: 9:30 AM - 6:30 PM<br> Available for Consultation &<br> Custom IT Solutions</p>
                              </div>
                              <!-- Footer Info Box End -->
                           </div>
                        </div>
                        <!-- Footer Location Details End -->
                     </div>
                     <div class="col-lg-3 col-md-6">
                        <!-- Links Start -->
                        <div class="footer-links wow fadeInUp">
                           <h3>Agency</h3>
                           <div class="footer-info-box">
                              <p data-cms="footer-agency-text">We demystify technologies and provide cutting-edge software development, AI, and IoT solutions for your business.</p>
                           </div>
                           <div class="subscription-container text-center mt-4">
                              <form class="d-flex justify-content-center align-items-center">
                                 <input type="email" class="form-control" placeholder="Your email" aria-label="Your email">
                                 <button type="submit" class="btn btn-link ms-2"></button>
                              </form>
                           </div>
                        </div>
                        <!-- Links End -->
                        <!-- Footer Social Link Start -->
                        <div class="footer-links footer-social-links wow fadeInUp">
                           <h3>Follow Us</h3>
                           <ul>
                              <li><a href="#" data-cms="footer-social-facebook"><i class="fa-brands fa-facebook"></i></a></li>
                              <li><a href="https://www.instagram.com/qpaix_infitech?igsh=MTZ3YWRtejV1d2RvZg==" target="_blank" data-cms="footer-social-instagram"><i class="fa-brands fa-instagram"></i></a></li>
                              <li><a href="https://www.linkedin.com/company/102248873/admin/feed/posts/" target="_blank" data-cms="footer-social-linkedin"><i class="fa-brands fa-linkedin"></i></a></li>
                              <li><a href="https://x.com/QpaixL53244" target="_blank" data-cms="footer-social-twitter"><i class="fa-brands fa-x-twitter"></i></a></li>
                           </ul>
                        </div>
                        <!-- Footer Social Link End -->
                     </div>
                  </div>
               </div>
            </div>
            <div class="sisf-page-footer-bottom-area footer-single">
               <div class="container">
                  <!-- Footer Copyright Section Start -->
                  <div class="footer-copyright">
                     <div class="row align-items-center">
                        <div class="col-lg-6 col-md-6">
                           <!-- Footer Copyright Start -->
                           <div class="footer-copyright-text wow fadeInUp">
                              <p data-cms="footer-copyright">&copy; 2026 QPAIX Infitech Private Limited. All Rights Reserved.</p>
                           </div>
                           <!-- Footer Copyright End -->
                        </div>
                        <div class="col-lg-6 col-md-6">
                           <!-- Footer Privacy Link Start -->
                           <div class="footer-privacy-policy wow fadeInUp">
                              <ul>
                                 <li><a href="/privacy-policy">Privacy Policy</a></li>
                              </ul>
                           </div>
                           <!-- Footer Privacy Link End -->
                        </div>
                     </div>
                  </div>
                  <!-- Footer Copyright Section End -->
               </div>
            </div>
         </div>
      </footer>
  `.trim();

  function injectMasterFooter() {
    const footerContainer = document.getElementById('footerContainer');
    if (footerContainer) {
      footerContainer.innerHTML = MASTER_FOOTER_HTML;
      return;
    }
    const existingFooter = document.querySelector('footer.main-footer');
    if (existingFooter) {
      const temp = document.createElement('div');
      temp.innerHTML = MASTER_FOOTER_HTML;
      const newFooter = temp.firstElementChild;
      existingFooter.replaceWith(newFooter);
    }
  }

  function setupDynamicFavicon() {
    try {
      const v = '?v=3';
      // 1. Ensure SVG favicon link is prioritized
      let svgLink = document.querySelector('link[type="image/svg+xml"]');
      if (!svgLink) {
        svgLink = document.createElement('link');
        svgLink.rel = 'icon';
        svgLink.type = 'image/svg+xml';
        document.head.appendChild(svgLink);
      }
      svgLink.href = '/images/qpaix-favicon.svg' + v;

      // 2. Standard PNG favicon
      let icon = document.querySelector('link[rel="icon"]:not([type="image/svg+xml"])') || document.querySelector('link[rel="shortcut icon"]');
      if (!icon) {
        icon = document.createElement('link');
        icon.rel = 'icon';
        document.head.appendChild(icon);
      }
      icon.type = 'image/png';
      icon.href = '/images/qpaix-favicon.png' + v;

      // 3. Apple touch icon
      let appleIcon = document.querySelector('link[rel="apple-touch-icon"]');
      if (!appleIcon) {
        appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        document.head.appendChild(appleIcon);
      }
      appleIcon.href = '/images/qpaix-favicon.png' + v;
    } catch (e) {
      console.warn('[cms] Dynamic favicon notice:', e);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Boot
  // ────────────────────────────────────────────────────────────────────────
  function initPage() {
    // Permanently remove decorative hero background elements that cause ghost images
    document.querySelectorAll('.btm-empowering-image, .arrow-image, .graphic-fade-image, .graphic-fade--image').forEach((el) => el.remove());
    setupDynamicFavicon();
    injectMasterHeader();
    injectMasterFooter();
    autoTagEditableElements();

    // 1. Instant synchronous cache hydration to eliminate Flash of Stale/Placeholder Content
    hydrateCachedPageElements();
    hydrateCachedDynamicLists();

    // Fast-path: If cached elements are present, signal data ready immediately to avoid loader delay
    try {
      if (localStorage.getItem(`qpaix_page_elements_${PAGE_SLUG}`)) {
        if (typeof window.notifyQpaixDataReady === 'function') {
          window.notifyQpaixDataReady();
        }
      }
    } catch (e) {}

    // 2. Fetch fresh database data in parallel and notify preloader when ready
    Promise.all([loadPageElements(), loadDynamicLists()]).then(() => {
      tagPlaceholderDynamicImages();
      applyPageElements(); // re-apply in case any newly-tagged placeholder image already has a saved override
      loadAuthStatus();
      if (typeof window.notifyQpaixDataReady === 'function') {
        window.notifyQpaixDataReady();
      }
    }).catch(() => {
      if (typeof window.notifyQpaixDataReady === 'function') {
        window.notifyQpaixDataReady();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPage);
  } else {
    initPage();
  }
})();
