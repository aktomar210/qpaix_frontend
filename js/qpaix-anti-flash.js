/**
 * QPAIX Anti-Flash Image Interceptor
 * 
 * Runs synchronously in <head> before <body> elements are parsed.
 * Prevents the "Flash of Default Image" by:
 * 1. Synchronously reading CMS overrides from localStorage for the current page & shared header.
 * 2. Pre-loading the CMS images immediately.
 * 3. Hiding only the specific [data-cms] image elements that have overrides so local placeholders never flash.
 * 4. Intercepting elements via MutationObserver during parsing to swap el.src to the CMS URL on the very first microtask.
 * 5. Revealing the image seamlessly once loaded.
 */
(function () {
  'use strict';

  try {
    var path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    var pageSlug = path === '' ? 'index' : path.replace(/\//g, '-').toLowerCase();
    var keys = ['qpaix_page_elements_' + pageSlug, 'qpaix_page_elements_shared-header'];

    var imageOverrides = {};
    var imageSelectors = [];

    keys.forEach(function (key) {
      try {
        var raw = localStorage.getItem(key);
        if (!raw) return;
        var rows = JSON.parse(raw);
        if (Array.isArray(rows)) {
          rows.forEach(function (row) {
            if (row && row.element_id && row.content_type === 'image' && row.content_value) {
              imageOverrides[row.element_id] = row.content_value;
              imageSelectors.push('[data-cms="' + row.element_id + '"]');
              if (row.element_id === 'dynamic-' + pageSlug + '-image-1') {
                imageSelectors.push('.banner-img img', '.sisf-banner img');
              }
            }
          });
        }
      } catch (e) {}
    });

    // Expose for cms.js or other scripts
    window.__QPAIX_IMAGE_OVERRIDES = imageOverrides;

    if (imageSelectors.length === 0) return;

    // 1. Preload the CMS images immediately at the highest browser priority
    Object.keys(imageOverrides).forEach(function (id) {
      var url = imageOverrides[id];
      if (url && typeof url === 'string') {
        var link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
      }
    });

    // 2. Hide only the overridden images so the default local placeholder NEVER displays
    var style = document.createElement('style');
    style.id = 'qpaix-anti-flash-style';
    style.textContent =
      imageSelectors.join(',\n') +
      ' {\n  opacity: 0 !important;\n}\n' +
      imageSelectors.map(function (sel) { return sel + '.qpaix-cms-loaded'; }).join(',\n') +
      ' {\n  opacity: 1 !important;\n  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1) !important;\n}';
    document.head.appendChild(style);

    function swapImage(imgEl, newUrl) {
      if (!imgEl) return;
      if (imgEl.tagName === 'IMG') {
        if (imgEl.src !== newUrl) {
          imgEl.src = newUrl;
        }
        if (imgEl.complete && imgEl.naturalWidth > 0) {
          imgEl.classList.add('qpaix-cms-loaded');
        } else {
          imgEl.addEventListener('load', function () {
            imgEl.classList.add('qpaix-cms-loaded');
          }, { once: true });
          imgEl.addEventListener('error', function () {
            imgEl.classList.add('qpaix-cms-loaded');
          }, { once: true });
        }
      } else {
        imgEl.style.backgroundImage = 'url("' + newUrl + '")';
        imgEl.classList.add('qpaix-cms-loaded');
      }
    }

    function checkNode(el) {
      if (!el || el.nodeType !== 1) return;
      var id = el.getAttribute && el.getAttribute('data-cms');
      if (!id && el.tagName === 'IMG' && el.closest && el.closest('.banner-img, .sisf-banner')) {
        id = 'dynamic-' + pageSlug + '-image-1';
        el.setAttribute('data-cms', id);
      }
      if (id && imageOverrides[id]) {
        swapImage(el, imageOverrides[id]);
      }
      if (el.querySelectorAll) {
        var list = el.querySelectorAll('[data-cms], .banner-img img, .sisf-banner img');
        for (var k = 0; k < list.length; k++) {
          var child = list[k];
          var cid = child.getAttribute('data-cms');
          if (!cid && child.tagName === 'IMG') {
            cid = 'dynamic-' + pageSlug + '-image-1';
            child.setAttribute('data-cms', cid);
          }
          if (cid && imageOverrides[cid]) {
            swapImage(child, imageOverrides[cid]);
          }
        }
      }
    }

    // 3. MutationObserver catches nodes as the HTML parser constructs them
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          checkNode(added[j]);
        }
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });

    // 4. Cleanup and fail-safe reveal
    function revealAll() {
      observer.disconnect();
      document.querySelectorAll(imageSelectors.join(',')).forEach(function (el) {
        var id = el.getAttribute('data-cms');
        if (id && imageOverrides[id]) {
          swapImage(el, imageOverrides[id]);
        }
        el.classList.add('qpaix-cms-loaded');
      });
      setTimeout(function () {
        var s = document.getElementById('qpaix-anti-flash-style');
        if (s) s.remove();
      }, 350);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', revealAll);
    } else {
      revealAll();
    }

    // Never keep any element hidden longer than 600ms even on slow networks
    setTimeout(revealAll, 600);

  } catch (e) {
    console.warn('[qpaix-anti-flash] init error:', e);
  }
})();
