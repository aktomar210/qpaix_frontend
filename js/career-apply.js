// Careers "Apply Now" form — shared by three places: the careers list page (renderCareers's
// cards, via a popup modal), the career detail page's own "Apply Now" button (same popup modal),
// and an inline copy of the same form embedded directly under the job description on the detail
// page. Public-facing, no login required: the resume upload goes through the dedicated
// /api/careers/resume-upload endpoint (not the admin-only /api/upload), and the application
// itself is emailed via /api/job-application — no database record is kept (explicit choice), so
// there's nothing here to track beyond the sent email.
(function () {
  'use strict';

  const modalState = {
    position: '',
    uploadedResumeUrl: null,
  };

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formFieldsHtml() {
    return `
      <div class="qpaix-apply-field">
        <label>Full Name</label>
        <input type="text" name="name" required>
      </div>
      <div class="qpaix-apply-field">
        <label>Email</label>
        <input type="email" name="email" required>
      </div>
      <div class="qpaix-apply-field">
        <label>Phone</label>
        <input type="tel" name="phone">
      </div>
      <div class="qpaix-apply-field">
        <label>Resume (PDF, DOC, or DOCX — max 5MB)</label>
        <div class="qpaix-apply-dropzone" data-role="dropzone">
          <input type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" data-role="resume-input" style="display:none;">
          <div data-role="dropzone-text">Click to choose your resume, or drag it here</div>
          <div class="qpaix-apply-filename" data-role="filename"></div>
        </div>
      </div>
      <div class="qpaix-apply-field">
        <label>Cover Message (optional)</label>
        <textarea name="message" placeholder="Tell us why you're a great fit..."></textarea>
      </div>
      <div class="qpaix-apply-actions">
        <button type="submit" class="qpaix-apply-submit" data-role="submit">Submit Application</button>
      </div>
      <div class="qpaix-apply-status" data-role="status"></div>
    `;
  }

  function wireForm(root, position, { onSuccess } = {}) {
    const state = { position: position || 'General Application', uploadedResumeUrl: null };

    const dropzone = root.querySelector('[data-role="dropzone"]');
    const fileInput = root.querySelector('[data-role="resume-input"]');
    const form = root.querySelector('[data-role="apply-form"]');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('qpaix-dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('qpaix-dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('qpaix-dragover');
      if (e.dataTransfer.files[0]) {
        fileInput.files = e.dataTransfer.files;
        handleResumeSelected(root, state, e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) handleResumeSelected(root, state, fileInput.files[0]);
    });

    form.addEventListener('submit', (e) => onSubmit(e, root, state, onSuccess));

    return state;
  }

  async function handleResumeSelected(root, state, file) {
    const status = root.querySelector('[data-role="status"]');
    const filenameEl = root.querySelector('[data-role="filename"]');
    const submitBtn = root.querySelector('[data-role="submit"]');

    filenameEl.textContent = `Uploading ${file.name}...`;
    status.textContent = '';
    status.className = 'qpaix-apply-status';
    submitBtn.disabled = true;
    state.uploadedResumeUrl = null;

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/careers/resume-upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      state.uploadedResumeUrl = data.url;
      filenameEl.textContent = `✓ ${file.name}`;
    } catch (e) {
      filenameEl.textContent = '';
      status.textContent = e.message;
      status.className = 'qpaix-apply-status qpaix-error';
    } finally {
      submitBtn.disabled = false;
    }
  }

  async function onSubmit(e, root, state, onSuccess) {
    e.preventDefault();
    const form = e.target;
    const status = root.querySelector('[data-role="status"]');
    const submitBtn = root.querySelector('[data-role="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    status.textContent = '';
    status.className = 'qpaix-apply-status';

    try {
      const res = await fetch('/api/job-application', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          position: state.position,
          message: form.message.value.trim(),
          resumeUrl: state.uploadedResumeUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.message || 'Failed to submit application');

      status.textContent = 'Application submitted — thank you! We will be in touch soon.';
      status.className = 'qpaix-apply-status qpaix-success';
      form.reset();
      root.querySelector('[data-role="filename"]').textContent = '';
      state.uploadedResumeUrl = null;
      if (typeof onSuccess === 'function') onSuccess();
    } catch (err) {
      status.textContent = err.message;
      status.className = 'qpaix-apply-status qpaix-error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Application';
    }
  }

  // --- Popup modal (careers list cards + detail page's top Apply Now button) ---

  function ensureModal() {
    if (document.getElementById('qpaix-apply-modal-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'qpaix-apply-modal-overlay';
    overlay.innerHTML = `
      <div id="qpaix-apply-modal">
        <button type="button" class="qpaix-apply-close" data-role="close" aria-label="Close">&times;</button>
        <h4>Apply Now</h4>
        <div class="qpaix-apply-position" data-role="position-label"></div>
        <form data-role="apply-form">
          ${formFieldsHtml()}
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('[data-role="close"]').addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('qpaix-open')) closeModal();
    });
  }

  function openModal(position) {
    ensureModal();
    const overlay = document.getElementById('qpaix-apply-modal-overlay');
    overlay.querySelector('[data-role="apply-form"]').reset();
    overlay.querySelector('[data-role="filename"]').textContent = '';
    overlay.querySelector('[data-role="status"]').textContent = '';
    overlay.querySelector('[data-role="status"]').className = 'qpaix-apply-status';
    overlay.querySelector('[data-role="position-label"]').textContent = `Applying for: ${position || 'General Application'}`;

    modalState.position = position || 'General Application';
    modalState.uploadedResumeUrl = null;
    wireForm(overlay, modalState.position, { onSuccess: () => setTimeout(closeModal, 2000) });

    overlay.classList.add('qpaix-open');
  }

  function closeModal() {
    const overlay = document.getElementById('qpaix-apply-modal-overlay');
    if (overlay) overlay.classList.remove('qpaix-open');
  }

  // --- Inline embed (career detail page, directly under the job description) ---

  function mountInlineForm(container, position) {
    if (!container || container.dataset.qpaixApplyMounted === 'true') return;
    container.dataset.qpaixApplyMounted = 'true';
    container.innerHTML = `
      <h4 class="mb-3">Apply for this position</h4>
      <form data-role="apply-form" class="qpaix-apply-inline-form">
        ${formFieldsHtml()}
      </form>
    `;
    wireForm(container, position, {});
  }

  function updateInlineFormPosition(container, position) {
    if (!container) return;
    const state = { position: position || 'General Application' };
    container.dataset.qpaixApplyPosition = state.position;
  }

  // Wire up any element carrying data-apply-position (the careers list cards + the detail page's
  // own top Apply Now button both use this), including ones added dynamically after this script
  // runs (via event delegation, so renderCareers's later innerHTML replacement doesn't need its
  // own listener wiring). Elements that should scroll to the inline form instead of opening the
  // modal carry data-apply-scroll-target alongside data-apply-position.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-apply-position]');
    if (!trigger) return;
    e.preventDefault();

    const scrollTargetSelector = trigger.getAttribute('data-apply-scroll-target');
    if (scrollTargetSelector) {
      const target = document.querySelector(scrollTargetSelector);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    openModal(trigger.getAttribute('data-apply-position'));
  });

  window.qpaixOpenApplyModal = openModal;
  window.qpaixMountInlineApplyForm = mountInlineForm;
})();
