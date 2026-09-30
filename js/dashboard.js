// QPAIX CMS Dashboard — structured CRUD modal for every entity, plus Approvals, History, and
// Team & Access. Loaded lazily by cms.js only for a logged-in admin/editor (never shipped to
// anonymous visitors), and only once per page via the qpaix-cms:open-dashboard event.
//
// Design: one generic "list + form" renderer driven by a small schema per entity, instead of a
// bespoke UI per entity — every cms_* table here follows the same shape (id, ordinary fields,
// display_order, is_deleted soft-delete), so one engine covers all of them.

(function () {
  'use strict';

  if (window.__qpaixDashboardLoaded) return;
  window.__qpaixDashboardLoaded = true;

  const state = {
    role: null,
    open: false,
    activeSection: null,
    editingId: null, // null = list view; 'new' = create form; else = edit form for that id
  };

  // ────────────────────────────────────────────────────────────────────────
  // Entity schemas — id, label, endpoint, and the form fields for create/edit.
  // Field types: text, textarea, html, number, checkbox, image, select.
  // ────────────────────────────────────────────────────────────────────────
  const ENTITIES = {
    offerings: {
      label: 'Services & Products',
      icon: 'fa-layer-group',
      endpoint: '/api/v2/offerings',
      titleField: 'title',
      subtitleField: 'kind',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'slug', label: 'Slug (auto if blank)', type: 'text' },
        { key: 'kind', label: 'Kind', type: 'select', options: ['service', 'product'], default: 'service' },
        { key: 'tagline', label: 'Tagline', type: 'text' },
        { key: 'short_description', label: 'Short Description', type: 'textarea' },
        { key: 'body', label: 'Full Body', type: 'html' },
        { key: 'icon_image_url', label: 'Icon Image', type: 'image' },
        { key: 'card_image_url', label: 'Card Image', type: 'image' },
        { key: 'parent_group', label: 'Parent Group', type: 'text' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
        { key: 'is_featured', label: 'Featured', type: 'checkbox' },
      ],
    },
    team: {
      label: 'Team',
      icon: 'fa-users',
      endpoint: '/api/v2/team',
      titleField: 'name',
      subtitleField: 'role',
      fields: [
        { key: 'name', label: 'Name', type: 'text', required: true },
        { key: 'role', label: 'Role', type: 'text' },
        { key: 'photo_url', label: 'Photo', type: 'image' },
        { key: 'bio', label: 'Bio', type: 'textarea' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    testimonials: {
      label: 'Testimonials',
      icon: 'fa-quote-left',
      endpoint: '/api/v2/testimonials',
      titleField: 'author_name',
      subtitleField: 'author_role',
      fields: [
        { key: 'quote', label: 'Quote', type: 'textarea', required: true },
        { key: 'author_name', label: 'Author Name', type: 'text', required: true },
        { key: 'author_role', label: 'Author Role', type: 'text' },
        { key: 'photo_url', label: 'Photo', type: 'image' },
        { key: 'rating', label: 'Rating (1-5)', type: 'number' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    'blog-posts': {
      label: 'Blog Posts',
      icon: 'fa-newspaper',
      endpoint: '/api/v2/blog-posts',
      titleField: 'title',
      subtitleField: 'category',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'slug', label: 'Slug (auto if blank)', type: 'text' },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'excerpt', label: 'Excerpt', type: 'textarea' },
        { key: 'featured_image_url', label: 'Featured Image', type: 'image' },
        { key: 'body', label: 'Body', type: 'html' },
      ],
    },
    faqs: {
      label: 'FAQs',
      icon: 'fa-circle-question',
      endpoint: '/api/v2/faqs',
      titleField: 'question',
      fields: [
        { key: 'question', label: 'Question', type: 'text', required: true },
        { key: 'answer', label: 'Answer', type: 'html' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    stats: {
      label: 'Stats',
      icon: 'fa-chart-simple',
      endpoint: '/api/v2/stats',
      titleField: 'label',
      subtitleField: 'number_text',
      fields: [
        { key: 'number_text', label: 'Number (e.g. 250+)', type: 'text', required: true },
        { key: 'label', label: 'Label', type: 'text', required: true },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    'client-logos': {
      label: 'Client Logos',
      icon: 'fa-building',
      endpoint: '/api/v2/client-logos',
      titleField: 'logo_url',
      fields: [
        { key: 'logo_url', label: 'Logo', type: 'image', required: true },
        { key: 'hover_logo_url', label: 'Hover Logo', type: 'image' },
        { key: 'link_url', label: 'Link URL', type: 'text' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    careers: {
      label: 'Careers',
      icon: 'fa-briefcase',
      endpoint: '/api/v2/careers',
      titleField: 'title',
      subtitleField: 'location',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'slug', label: 'Slug (auto if blank)', type: 'text' },
        { key: 'location', label: 'Location', type: 'text' },
        { key: 'employment_type', label: 'Employment Type', type: 'text' },
        { key: 'description', label: 'Description', type: 'html' },
        { key: 'is_open', label: 'Open', type: 'checkbox', default: true },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    'process-steps': {
      label: 'Process Steps',
      icon: 'fa-diagram-project',
      endpoint: '/api/v2/process-steps',
      titleField: 'title',
      subtitleField: 'step_number',
      fields: [
        { key: 'step_number', label: 'Step Number', type: 'number' },
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'icon_url', label: 'Icon', type: 'image' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    'tech-logos': {
      label: 'Tech Logos',
      icon: 'fa-microchip',
      endpoint: '/api/v2/tech-logos',
      titleField: 'name',
      fields: [
        { key: 'name', label: 'Name', type: 'text' },
        { key: 'logo_url', label: 'Logo', type: 'image', required: true },
        { key: 'link_url', label: 'Link URL', type: 'text' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
    values: {
      label: 'Values',
      icon: 'fa-heart',
      endpoint: '/api/v2/values',
      titleField: 'title',
      fields: [
        { key: 'title', label: 'Title', type: 'text', required: true },
        { key: 'description', label: 'Description', type: 'textarea' },
        { key: 'icon_url', label: 'Icon', type: 'image' },
        { key: 'display_order', label: 'Display Order', type: 'number', default: 0 },
      ],
    },
  };

  const ENTITY_ORDER = ['offerings', 'team', 'testimonials', 'blog-posts', 'faqs', 'stats',
    'client-logos', 'careers', 'process-steps', 'tech-logos', 'values'];

  // ────────────────────────────────────────────────────────────────────────
  // Fetch helpers (mirrors cms.js — kept local so this file has no load-order dependency)
  // ────────────────────────────────────────────────────────────────────────
  async function apiGet(path) {
    const res = await fetch(path, { credentials: 'include' });
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }
  async function apiSend(method, path, body) {
    const res = await fetch(path, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body != null ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `${method} ${path} failed: ${res.status}`);
    return data;
  }
  async function apiPost(path, body) {
    return apiSend('POST', path, body);
  }
  async function apiPatch(path, body) {
    return apiSend('PATCH', path, body);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function escapeAttr(str) {
    if (str == null) return '';
    return String(str).replace(/"/g, '&quot;');
  }

  // ── Custom UI dialog helpers (use showCmsAlert from cms.js when available) ──
  function cmsAlert(message, type) {
    if (typeof window.showCmsAlert === 'function') return window.showCmsAlert(message, type);
    alert(message);
    return Promise.resolve();
  }

  function cmsConfirm(message) {
    return new Promise((resolve) => {
      if (typeof window.showCmsAlert !== 'function') {
        resolve(window.confirm(message));
        return;
      }
      const existing = document.getElementById('qpaix-cms-confirm-overlay');
      if (existing) existing.remove();

      const safeDiv = document.createElement('div');
      safeDiv.textContent = message == null ? '' : String(message);
      const safeText = safeDiv.innerHTML;

      const overlay = document.createElement('div');
      overlay.id = 'qpaix-cms-confirm-overlay';
      overlay.innerHTML = `
        <div class="qpaix-cms-alert-box" role="alertdialog" aria-modal="true">
          <i class="fa-solid fa-triangle-exclamation qpaix-alert-icon icon-error"></i>
          <div class="qpaix-alert-message">${safeText}</div>
          <div style="display:flex;gap:12px;justify-content:center;">
            <button id="qpaix-cms-confirm-ok" type="button" style="background:#dc2626;">OK</button>
            <button id="qpaix-cms-confirm-cancel" type="button" style="background:#6b7a90;">Cancel</button>
          </div>
        </div>
      `;
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000001;background:rgba(6,12,26,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;opacity:0;transition:opacity 0.18s ease;';
      document.body.appendChild(overlay);
      requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.qpaix-cms-alert-box').style.cssText += 'transform:scale(1) translateY(0)!important;';
      });

      const close = (result) => {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); resolve(result); }, 200);
      };

      document.getElementById('qpaix-cms-confirm-ok').addEventListener('click', () => close(true));
      document.getElementById('qpaix-cms-confirm-cancel').addEventListener('click', () => close(false));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(false); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); close(true); }
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(false); }
      });
      setTimeout(() => document.getElementById('qpaix-cms-confirm-ok')?.focus(), 50);
    });
  }

  function cmsPrompt(message, defaultValue = '') {
    return new Promise((resolve) => {
      if (typeof window.showCmsAlert !== 'function') {
        resolve(window.prompt(message, defaultValue));
        return;
      }
      const existing = document.getElementById('qpaix-cms-prompt-overlay');
      if (existing) existing.remove();

      const safeDiv = document.createElement('div');
      safeDiv.textContent = message == null ? '' : String(message);
      const safeText = safeDiv.innerHTML;

      const overlay = document.createElement('div');
      overlay.id = 'qpaix-cms-prompt-overlay';
      overlay.innerHTML = `
        <div class="qpaix-cms-alert-box" role="dialog" aria-modal="true">
          <i class="fa-solid fa-key qpaix-alert-icon icon-info"></i>
          <div class="qpaix-alert-message">${safeText}</div>
          <input id="qpaix-cms-prompt-input" type="text" value="" placeholder="${defaultValue}" style="width:100%;box-sizing:border-box;border:1px solid #d0d7e6;border-radius:8px;padding:10px 14px;font-size:14px;margin-bottom:20px;outline:none;">
          <div style="display:flex;gap:12px;justify-content:center;">
            <button id="qpaix-cms-prompt-ok" type="button">OK</button>
            <button id="qpaix-cms-prompt-cancel" type="button" style="background:#6b7a90;">Cancel</button>
          </div>
        </div>
      `;
      overlay.style.cssText = 'position:fixed;inset:0;z-index:10000001;background:rgba(6,12,26,0.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:-apple-system,"Segoe UI",Roboto,sans-serif;opacity:0;transition:opacity 0.18s ease;';
      document.body.appendChild(overlay);
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });

      const close = (result) => {
        overlay.style.opacity = '0';
        setTimeout(() => { overlay.remove(); resolve(result); }, 200);
      };

      document.getElementById('qpaix-cms-prompt-ok').addEventListener('click', () => {
        close(document.getElementById('qpaix-cms-prompt-input').value || null);
      });
      document.getElementById('qpaix-cms-prompt-cancel').addEventListener('click', () => close(null));
      overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
      document.addEventListener('keydown', function onKey(e) {
        if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); close(document.getElementById('qpaix-cms-prompt-input')?.value || null); }
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); close(null); }
      });
      setTimeout(() => document.getElementById('qpaix-cms-prompt-input')?.focus(), 50);
    });
  }

  // ────────────────────────────────────────────────────────────────────────
  // Modal shell
  // ────────────────────────────────────────────────────────────────────────
  function buildShell() {
    const overlay = document.createElement('div');
    overlay.id = 'qpaix-cms-dashboard-overlay';
    overlay.innerHTML = `
      <div id="qpaix-cms-dashboard">
        <div class="qpaix-dash-sidebar">
          <div class="qpaix-dash-sidebar-header">QPAIX CMS</div>
          <div class="qpaix-dash-nav-section">Content</div>
          ${ENTITY_ORDER.map((key) => navItem(key, ENTITIES[key])).join('')}
          <div class="qpaix-dash-nav-section">Site</div>
          <div class="qpaix-dash-nav-item" data-section="settings"><i class="fa-solid fa-gear"></i> Settings</div>
          <div class="qpaix-dash-nav-item" data-section="history"><i class="fa-solid fa-clock-rotate-left"></i> Change History</div>
          <div class="qpaix-dash-nav-section" data-role="admin-only-section">Admin</div>
          <div class="qpaix-dash-nav-item" data-section="approvals" data-role="admin-only"><i class="fa-solid fa-clipboard-check"></i> Pending Approvals</div>
          <div class="qpaix-dash-nav-item" data-section="team-access" data-role="admin-only"><i class="fa-solid fa-user-shield"></i> Team &amp; Access</div>
        </div>
        <div class="qpaix-dash-main">
          <div class="qpaix-dash-header">
            <h3 data-role="section-title">Dashboard</h3>
            <button class="qpaix-dash-close" title="Close"><i class="fa-solid fa-xmark"></i></button>
          </div>
          <div class="qpaix-dash-body" data-role="body"></div>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeDashboard();
    });
    overlay.querySelector('.qpaix-dash-close').addEventListener('click', closeDashboard);
    overlay.querySelectorAll('.qpaix-dash-nav-item').forEach((item) => {
      item.addEventListener('click', () => selectSection(item.getAttribute('data-section')));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.open) closeDashboard();
    });

    return overlay;
  }

  function navItem(key, schema) {
    return `<div class="qpaix-dash-nav-item" data-section="${key}"><i class="fa-solid ${schema.icon}"></i> ${escapeHtml(schema.label)}</div>`;
  }

  function getOverlay() {
    return document.getElementById('qpaix-cms-dashboard-overlay') || buildShell();
  }

  async function openDashboard() {
    const overlay = getOverlay();
    if (!state.role) {
      try {
        const status = await apiGet('/api/admin/status');
        state.role = status.role || 'editor';
      } catch (e) {
        state.role = 'editor';
      }
      overlay.querySelectorAll('[data-role="admin-only"], [data-role="admin-only-section"]').forEach((el) => {
        el.style.display = state.role === 'admin' ? '' : 'none';
      });
    }
    overlay.classList.add('qpaix-open');
    state.open = true;
    document.body.style.overflow = 'hidden';
    if (!state.activeSection) selectSection(ENTITY_ORDER[0]);
  }

  function closeDashboard() {
    const overlay = document.getElementById('qpaix-cms-dashboard-overlay');
    if (overlay) overlay.classList.remove('qpaix-open');
    state.open = false;
    document.body.style.overflow = '';
  }

  function selectSection(section) {
    state.activeSection = section;
    state.editingId = null;
    const overlay = getOverlay();
    overlay.querySelectorAll('.qpaix-dash-nav-item').forEach((el) => {
      el.classList.toggle('qpaix-active', el.getAttribute('data-section') === section);
    });

    if (ENTITIES[section]) {
      overlay.querySelector('[data-role="section-title"]').textContent = ENTITIES[section].label;
      renderEntityList(section);
    } else if (section === 'settings') {
      overlay.querySelector('[data-role="section-title"]').textContent = 'Settings';
      renderSettings();
    } else if (section === 'history') {
      overlay.querySelector('[data-role="section-title"]').textContent = 'Change History';
      renderHistory();
    } else if (section === 'approvals') {
      overlay.querySelector('[data-role="section-title"]').textContent = 'Pending Approvals';
      renderApprovals();
    } else if (section === 'team-access') {
      overlay.querySelector('[data-role="section-title"]').textContent = 'Team & Access';
      renderTeamAccess();
    }
  }

  function getBody() {
    return getOverlay().querySelector('[data-role="body"]');
  }

  // ────────────────────────────────────────────────────────────────────────
  // Generic entity list + form
  // ────────────────────────────────────────────────────────────────────────
  async function renderEntityList(key) {
    const schema = ENTITIES[key];
    const body = getBody();
    body.innerHTML = '<div class="qpaix-loading">Loading…</div>';
    try {
      const rows = await apiGet(schema.endpoint);
      if (state.activeSection !== key) return; // user navigated away while this was in flight
      renderList(key, schema, rows);
    } catch (e) {
      body.innerHTML = `<div class="qpaix-empty-state">Failed to load: ${escapeHtml(e.message)}</div>`;
    }
  }

  function renderList(key, schema, rows) {
    const body = getBody();
    const toolbar = `
      <div class="qpaix-dash-toolbar">
        <button class="qpaix-btn-primary" data-role="add-new"><i class="fa-solid fa-plus"></i> Add New</button>
      </div>`;

    if (!rows || rows.length === 0) {
      body.innerHTML = toolbar + `<div class="qpaix-empty-state">No ${escapeHtml(schema.label.toLowerCase())} yet. Click "Add New" to create the first one.</div>`;
    } else {
      body.innerHTML = toolbar + `
        <table class="qpaix-dash-table">
          <thead><tr><th>${schema.titleField ? 'Title' : 'Item'}</th>${schema.subtitleField ? '<th>Detail</th>' : ''}<th style="text-align:right;">Actions</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr data-id="${escapeAttr(row.id)}">
                <td>${escapeHtml(String(row[schema.titleField] || '(untitled)'))}</td>
                ${schema.subtitleField ? `<td>${escapeHtml(String(row[schema.subtitleField] ?? ''))}</td>` : ''}
                <td class="qpaix-dash-actions">
                  <button class="qpaix-btn-secondary" data-action="edit">Edit</button>
                  <button class="qpaix-btn-danger" data-action="delete">Delete</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
    }

    body.querySelector('[data-role="add-new"]').addEventListener('click', () => renderForm(key, schema, null));
    body.querySelectorAll('tr[data-id]').forEach((tr) => {
      const id = tr.getAttribute('data-id');
      const row = rows.find((r) => String(r.id) === id);
      tr.querySelector('[data-action="edit"]').addEventListener('click', () => renderForm(key, schema, row));
      tr.querySelector('[data-action="delete"]').addEventListener('click', () => confirmDelete(key, schema, id));
    });
  }

  async function confirmDelete(key, schema, id) {
    const ok = await cmsConfirm(`Delete this ${schema.label.toLowerCase().replace(/s$/, '')}? This can't be undone from here.`);
    if (!ok) return;
    try {
      await apiSend('DELETE', `${schema.endpoint}/${id}`);
      renderEntityList(key);
    } catch (e) {
      await cmsAlert(`Delete failed: ${e.message}`, 'error');
    }
  }

  function renderForm(key, schema, existing) {
    const body = getBody();
    const isNew = !existing;
    const values = existing || {};

    body.innerHTML = `
      <button class="qpaix-btn-secondary" data-role="back"><i class="fa-solid fa-arrow-left"></i> Back to list</button>
      <div class="qpaix-dash-form mt-3">
        <form data-role="entity-form">
          ${schema.fields.map((f) => fieldHtml(f, values)).join('')}
          <div class="qpaix-form-actions">
            <button type="submit" class="qpaix-btn-primary">${isNew ? 'Create' : 'Save Changes'}</button>
            <button type="button" class="qpaix-btn-secondary" data-role="cancel">Cancel</button>
          </div>
          <div class="qpaix-status-msg" data-role="form-status"></div>
        </form>
      </div>
    `;

    body.querySelector('[data-role="back"]').addEventListener('click', () => renderEntityList(key));
    body.querySelector('[data-role="cancel"]').addEventListener('click', () => renderEntityList(key));

    schema.fields.filter((f) => f.type === 'image').forEach((f) => wireImageField(body, f));

    const form = body.querySelector('[data-role="entity-form"]');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = form.querySelector('[data-role="form-status"]');
      const submitBtn = form.querySelector('button[type="submit"]');
      const payload = collectFormValues(schema, form);
      submitBtn.disabled = true;
      statusEl.textContent = '';
      statusEl.className = 'qpaix-status-msg';
      try {
        if (isNew) {
          await apiSend('POST', schema.endpoint, payload);
        } else {
          await apiSend('PATCH', `${schema.endpoint}/${existing.id}`, payload);
        }
        statusEl.textContent = 'Saved.';
        statusEl.className = 'qpaix-status-msg qpaix-success';
        setTimeout(() => renderEntityList(key), 500);
      } catch (err) {
        statusEl.textContent = err.message.includes('queued') || err.message.includes('pending')
          ? err.message
          : `Save failed: ${err.message}`;
        statusEl.className = 'qpaix-status-msg qpaix-error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  function fieldHtml(f, values) {
    const raw = values[f.key] !== undefined && values[f.key] !== null ? values[f.key] : f.default;
    if (f.type === 'checkbox') {
      return `
        <div class="qpaix-field">
          <label><input type="checkbox" name="${f.key}" ${raw ? 'checked' : ''}> ${escapeHtml(f.label)}</label>
        </div>`;
    }
    if (f.type === 'select') {
      return `
        <div class="qpaix-field">
          <label>${escapeHtml(f.label)}</label>
          <select name="${f.key}">
            ${f.options.map((opt) => `<option value="${escapeAttr(opt)}" ${raw === opt ? 'selected' : ''}>${escapeHtml(opt)}</option>`).join('')}
          </select>
        </div>`;
    }
    if (f.type === 'textarea' || f.type === 'html') {
      return `
        <div class="qpaix-field">
          <label>${escapeHtml(f.label)}</label>
          <textarea name="${f.key}" ${f.required ? 'required' : ''}>${escapeHtml(raw || '')}</textarea>
        </div>`;
    }
    if (f.type === 'image') {
      return `
        <div class="qpaix-field">
          <label>${escapeHtml(f.label)}</label>
          <div data-role="image-field" data-key="${f.key}">
            ${raw ? `<img src="${escapeAttr(raw)}" class="qpaix-current-preview" style="max-height:120px;">` : ''}
            <input type="hidden" name="${f.key}" value="${escapeAttr(raw || '')}">
            <input type="file" accept="image/*" data-role="image-input">
            <div class="qpaix-status-msg" data-role="image-status"></div>
          </div>
        </div>`;
    }
    return `
      <div class="qpaix-field">
        <label>${escapeHtml(f.label)}</label>
        <input type="${f.type === 'number' ? 'number' : 'text'}" name="${f.key}" value="${escapeAttr(raw != null ? raw : '')}" ${f.required ? 'required' : ''}>
      </div>`;
  }

  function wireImageField(container, f) {
    const wrapper = container.querySelector(`[data-role="image-field"][data-key="${f.key}"]`);
    if (!wrapper) return;
    const fileInput = wrapper.querySelector('[data-role="image-input"]');
    const hiddenInput = wrapper.querySelector(`input[type="hidden"][name="${f.key}"]`);
    const statusEl = wrapper.querySelector('[data-role="image-status"]');

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (!file) return;
      statusEl.textContent = 'Uploading…';
      statusEl.className = 'qpaix-status-msg';
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'DASHBOARD');
        const res = await fetch('/api/upload', { method: 'POST', credentials: 'include', body: formData });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const data = await res.json();
        hiddenInput.value = data.url;
        statusEl.textContent = 'Uploaded.';
        statusEl.className = 'qpaix-status-msg qpaix-success';
        let preview = wrapper.querySelector('.qpaix-current-preview');
        if (!preview) {
          preview = document.createElement('img');
          preview.className = 'qpaix-current-preview';
          preview.style.maxHeight = '120px';
          wrapper.prepend(preview);
        }
        preview.src = data.url;
      } catch (e) {
        statusEl.textContent = `Upload failed: ${e.message}`;
        statusEl.className = 'qpaix-status-msg qpaix-error';
      }
    });
  }

  function collectFormValues(schema, form) {
    const payload = {};
    schema.fields.forEach((f) => {
      if (f.type === 'checkbox') {
        payload[f.key] = form.querySelector(`[name="${f.key}"]`).checked;
      } else if (f.type === 'number') {
        const v = form.querySelector(`[name="${f.key}"]`).value;
        payload[f.key] = v === '' ? null : Number(v);
      } else {
        payload[f.key] = form.querySelector(`[name="${f.key}"]`).value;
      }
    });
    return payload;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Settings (key-value)
  // ────────────────────────────────────────────────────────────────────────
  const SETTINGS_FIELDS = [
    { key: 'contact_email', label: 'Contact Email' },
    { key: 'contact_form_recipient_email', label: 'Contact Form Recipient Email' },
    { key: 'contact_phone', label: 'Contact Phone' },
  ];

  async function renderSettings() {
    const body = getBody();
    body.innerHTML = '<div class="qpaix-loading">Loading…</div>';
    try {
      const settings = await apiGet('/api/v2/settings');
      if (state.activeSection !== 'settings') return;
      body.innerHTML = `
        <div class="qpaix-dash-form">
          <form data-role="settings-form">
            ${SETTINGS_FIELDS.map((f) => `
              <div class="qpaix-field">
                <label>${escapeHtml(f.label)}</label>
                <input type="text" name="${f.key}" value="${escapeAttr(settings[f.key] || '')}">
              </div>
            `).join('')}
            <div class="qpaix-form-actions">
              <button type="submit" class="qpaix-btn-primary">Save Settings</button>
            </div>
            <div class="qpaix-status-msg" data-role="form-status"></div>
          </form>
        </div>`;

      body.querySelector('[data-role="settings-form"]').addEventListener('submit', async (e) => {
        e.preventDefault();
        const statusEl = body.querySelector('[data-role="form-status"]');
        statusEl.textContent = 'Saving…';
        statusEl.className = 'qpaix-status-msg';
        try {
          for (const f of SETTINGS_FIELDS) {
            const value = e.target.querySelector(`[name="${f.key}"]`).value;
            await apiSend('POST', '/api/v2/settings', { key: f.key, value });
          }
          statusEl.textContent = 'Saved.';
          statusEl.className = 'qpaix-status-msg qpaix-success';
        } catch (err) {
          statusEl.textContent = `Save failed: ${err.message}`;
          statusEl.className = 'qpaix-status-msg qpaix-error';
        }
      });
    } catch (e) {
      body.innerHTML = `<div class="qpaix-empty-state">Failed to load settings: ${escapeHtml(e.message)}</div>`;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Change History (current page's slug)
  // ────────────────────────────────────────────────────────────────────────
  function currentPageSlug() {
    const path = window.location.pathname.replace(/^\/+|\/+$/g, '');
    return path === '' ? 'index' : path.replace(/\//g, '-').toLowerCase();
  }

  async function renderHistory() {
    const body = getBody();
    const slug = currentPageSlug();
    body.innerHTML = '<div class="qpaix-loading">Loading…</div>';
    try {
      const rows = await apiGet(`/api/v2/history/${slug}`);
      if (state.activeSection !== 'history') return;
      if (!rows || rows.length === 0) {
        body.innerHTML = `<div class="qpaix-empty-state">No saved changes yet for this page (<strong>${escapeHtml(slug)}</strong>).</div>`;
        return;
      }
      body.innerHTML = `
        <p style="color:#6b7a90;font-size:13px;margin-bottom:16px;">Showing history for the current page: <strong>${escapeHtml(slug)}</strong></p>
        <table class="qpaix-dash-table">
          <thead>
            <tr>
              <th>When</th>
              <th>By</th>
              <th>Changed Fields</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((row) => `
              <tr data-history-id="${escapeAttr(row.id)}">
                <td style="white-space:nowrap;">${escapeHtml(new Date(row.created_at).toLocaleString())}</td>
                <td>${escapeHtml((row.admins && row.admins.username) || 'Admin')}</td>
                <td>${escapeHtml((row.changed_keys || []).join(', ') || '—')}</td>
                <td class="qpaix-dash-actions" style="text-align:right;white-space:nowrap;">
                  <button class="qpaix-btn-secondary" data-action="restore" title="Restore this version">
                    <i class="fa-solid fa-rotate-left"></i> Restore
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;

      body.querySelectorAll('tr[data-history-id]').forEach((tr) => {
        const historyId = tr.getAttribute('data-history-id');
        const row = rows.find((r) => String(r.id) === historyId);
        const restoreBtn = tr.querySelector('[data-action="restore"]');
        if (!restoreBtn || !row) return;

        restoreBtn.addEventListener('click', async () => {
          const dateStr = new Date(row.created_at).toLocaleString();
          const confirmed = await cmsConfirm(
            `Restore page to version from ${dateStr}?\n\nThis will replace the current page content with this snapshot.`
          );
          if (!confirmed) return;

          restoreBtn.disabled = true;
          restoreBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Restoring…';

          try {
            let restored = false;
            try {
              const res = await apiPost(`/api/v2/history/${historyId}/restore`, {});
              if (res && !res.error) restored = true;
            } catch (err) {
              console.warn('[cms] Backend restore endpoint call skipped, falling back to direct element restore', err);
            }

            if (!restored && row.changes && typeof row.changes === 'object') {
              const snapshot = { ...row.changes };
              delete snapshot.__changed_keys;
              const entries = Object.entries(snapshot);

              await Promise.all(entries.map(([elementId, value]) => {
                const strVal = value != null ? String(value) : '';
                const isImg = strVal.startsWith('http://') || strVal.startsWith('https://') || strVal.startsWith('/images') || /\.(webp|png|jpg|jpeg|svg|gif)$/i.test(strVal);
                const isHtml = strVal.includes('<') && strVal.includes('>');
                const contentType = isImg ? 'image' : isHtml ? 'html' : 'text';

                return apiPost('/api/v2/page-elements', {
                  page_slug: slug,
                  element_id: elementId,
                  content_type: contentType,
                  content_value: strVal
                });
              }));

              await apiPost('/api/v2/history', {
                page_slug: slug,
                snapshot,
                changed_keys: [`Restored snapshot from ${dateStr}`]
              });
            }

            await cmsAlert(`Page successfully restored to version from ${dateStr}! The page will now reload.`, 'success');
            window.location.reload();
          } catch (e) {
            console.error('[cms] Restore failed', e);
            await cmsAlert(`Restore failed: ${e.message}`, 'error');
            restoreBtn.disabled = false;
            restoreBtn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Restore';
          }
        });
      });
    } catch (e) {
      body.innerHTML = `<div class="qpaix-empty-state">Failed to load history: ${escapeHtml(e.message)}</div>`;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // Pending Approvals (admin only)
  // ────────────────────────────────────────────────────────────────────────
  async function renderApprovals() {
    const body = getBody();
    body.innerHTML = '<div class="qpaix-loading">Loading…</div>';
    try {
      const rows = await apiGet('/api/v2/approvals');
      if (state.activeSection !== 'approvals') return;
      if (!rows || rows.length === 0) {
        body.innerHTML = '<div class="qpaix-empty-state">No pending changes awaiting approval.</div>';
        return;
      }
      body.innerHTML = `
        <table class="qpaix-dash-table">
          <thead><tr><th>Type</th><th>Target</th><th>Submitted</th><th style="text-align:right;">Actions</th></tr></thead>
          <tbody>
            ${rows.map((row) => `
              <tr data-id="${escapeAttr(row.id)}">
                <td>${escapeHtml(row.request_type || '')}</td>
                <td>${escapeHtml(row.element_key || row.target_id || '')}</td>
                <td>${escapeHtml(new Date(row.created_at).toLocaleString())}</td>
                <td class="qpaix-dash-actions">
                  <button class="qpaix-btn-primary" data-action="approve">Approve</button>
                  <button class="qpaix-btn-danger" data-action="reject">Reject</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;
      body.querySelectorAll('tr[data-id]').forEach((tr) => {
        const id = tr.getAttribute('data-id');
        tr.querySelector('[data-action="approve"]').addEventListener('click', async () => {
          try {
            await apiSend('POST', `/api/v2/approvals/${id}/approve`);
            renderApprovals();
            refreshPendingBadgeExternal();
          } catch (e) {
            await cmsAlert(`Approve failed: ${e.message}`, 'error');
          }
        });
        tr.querySelector('[data-action="reject"]').addEventListener('click', async () => {
          try {
            await apiSend('POST', `/api/v2/approvals/${id}/reject`, {});
            renderApprovals();
            refreshPendingBadgeExternal();
          } catch (e) {
            await cmsAlert(`Reject failed: ${e.message}`, 'error');
          }
        });
      });
    } catch (e) {
      body.innerHTML = `<div class="qpaix-empty-state">Failed to load approvals: ${escapeHtml(e.message)}</div>`;
    }
  }

  function refreshPendingBadgeExternal() {
    const badge = document.querySelector('#qpaix-cms-admin-bar .qpaix-pending-count');
    if (!badge) return;
    apiGet('/api/v2/approvals').then((rows) => {
      const count = Array.isArray(rows) ? rows.length : 0;
      badge.textContent = String(count);
      badge.classList.toggle('qpaix-show', count > 0);
    }).catch(() => {});
  }

  // ────────────────────────────────────────────────────────────────────────
  // Team & Access (admin only)
  // ────────────────────────────────────────────────────────────────────────
  async function renderTeamAccess() {
    const body = getBody();
    body.innerHTML = '<div class="qpaix-loading">Loading…</div>';
    try {
      const users = await apiGet('/api/v2/team-access/users');
      if (state.activeSection !== 'team-access') return;
      body.innerHTML = `
        <div class="qpaix-dash-toolbar">
          <button class="qpaix-btn-primary" data-role="add-user"><i class="fa-solid fa-user-plus"></i> Add User</button>
        </div>
        <table class="qpaix-dash-table">
          <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Changes</th><th style="text-align:right;">Actions</th></tr></thead>
          <tbody>
            ${users.map((u) => `
              <tr data-id="${escapeAttr(u.id)}">
                <td>${escapeHtml(u.username || '')}</td>
                <td>${escapeHtml(u.email || '')}</td>
                <td>${escapeHtml(u.role || '')}</td>
                <td>${escapeHtml(String(u.changes_count ?? 0))}</td>
                <td class="qpaix-dash-actions">
                  <button class="qpaix-btn-secondary" data-action="reset-password">Reset Password</button>
                  <button class="qpaix-btn-danger" data-action="remove">Remove</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>`;

      body.querySelector('[data-role="add-user"]').addEventListener('click', () => renderAddUserForm());
      body.querySelectorAll('tr[data-id]').forEach((tr) => {
        const id = tr.getAttribute('data-id');
        tr.querySelector('[data-action="reset-password"]').addEventListener('click', () => promptResetPassword(id));
        tr.querySelector('[data-action="remove"]').addEventListener('click', async () => {
          const ok = await cmsConfirm('Remove this user? They will immediately lose CMS access.');
          if (!ok) return;
          try {
            await apiSend('DELETE', `/api/v2/team-access/users/${id}`);
            renderTeamAccess();
          } catch (e) {
            await cmsAlert(`Remove failed: ${e.message}`, 'error');
          }
        });
      });
    } catch (e) {
      body.innerHTML = `<div class="qpaix-empty-state">Failed to load team & access: ${escapeHtml(e.message)}</div>`;
    }
  }

  function renderAddUserForm() {
    const body = getBody();
    body.innerHTML = `
      <button class="qpaix-btn-secondary" data-role="back"><i class="fa-solid fa-arrow-left"></i> Back</button>
      <div class="qpaix-dash-form mt-3">
        <form data-role="add-user-form">
          <div class="qpaix-field"><label>Username</label><input type="text" name="username" required></div>
          <div class="qpaix-field"><label>Email</label><input type="email" name="email" required></div>
          <div class="qpaix-field"><label>Password (min 8 characters)</label><input type="text" name="password" required></div>
          <div class="qpaix-field">
            <label>Role</label>
            <select name="role">
              <option value="editor">Editor (changes require admin approval)</option>
              <option value="admin">Admin (publishes directly)</option>
            </select>
          </div>
          <div class="qpaix-form-actions">
            <button type="submit" class="qpaix-btn-primary">Create User</button>
            <button type="button" class="qpaix-btn-secondary" data-role="cancel">Cancel</button>
          </div>
          <div class="qpaix-status-msg" data-role="form-status"></div>
        </form>
      </div>`;
    body.querySelector('[data-role="back"]').addEventListener('click', renderTeamAccess);
    body.querySelector('[data-role="cancel"]').addEventListener('click', renderTeamAccess);
    body.querySelector('[data-role="add-user-form"]').addEventListener('submit', async (e) => {
      e.preventDefault();
      const statusEl = body.querySelector('[data-role="form-status"]');
      const form = e.target;
      const payload = {
        username: form.username.value,
        email: form.email.value,
        password: form.password.value,
        role: form.role.value,
      };
      try {
        await apiSend('POST', '/api/v2/team-access/users', payload);
        renderTeamAccess();
      } catch (err) {
        statusEl.textContent = err.message;
        statusEl.className = 'qpaix-status-msg qpaix-error';
      }
    });
  }

  async function promptResetPassword(id) {
    const newPassword = await cmsPrompt('Enter a new password (min 8 characters):');
    if (!newPassword) return;
    try {
      await apiSend('POST', `/api/v2/team-access/users/${id}/reset-password`, { newPassword });
      await cmsAlert('Password reset successfully!', 'success');
    } catch (e) {
      await cmsAlert(`Reset failed: ${e.message}`, 'error');
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  window.addEventListener('qpaix-cms:open-dashboard', openDashboard);
})();
