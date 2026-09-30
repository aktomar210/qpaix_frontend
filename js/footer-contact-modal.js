// Footer "Send Us A Message" popup — opens a blurred-background modal with the same contact
// form fields as the Contact page, posting to the existing public /api/contact endpoint. Lives
// site-wide (loaded on every page, same as cms.js) since the footer itself is shared across every
// page via cms.js's MASTER_FOOTER_HTML.
(function () {
  'use strict';

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function ensureModal() {
    if (document.getElementById('qpaix-footer-contact-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'qpaix-footer-contact-overlay';
    overlay.innerHTML = `
      <div id="qpaix-footer-contact-modal">
        <button type="button" class="qpaix-fc-close" data-role="close" aria-label="Close">&times;</button>
        <h4>Send Us A Message</h4>
        <p class="qpaix-fc-subtitle">Tell us a bit about your project — we'll get back to you shortly.</p>
        <form data-role="contact-form">
          <div class="qpaix-fc-field">
            <label>Full Name</label>
            <input type="text" name="name" required>
          </div>
          <div class="qpaix-fc-field">
            <label>Email</label>
            <input type="email" name="email" required>
          </div>
          <div class="qpaix-fc-field">
            <label>Phone</label>
            <input type="tel" name="phone">
          </div>
          <div class="qpaix-fc-field">
            <label>Subject</label>
            <input type="text" name="subject">
          </div>
          <div class="qpaix-fc-field">
            <label>Message</label>
            <textarea name="message" placeholder="Tell us about your project or query..." required></textarea>
          </div>
          <div class="qpaix-fc-actions">
            <button type="submit" class="qpaix-fc-submit" data-role="submit">Send Message</button>
          </div>
          <div class="qpaix-fc-status" data-role="status"></div>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
    overlay.querySelector('[data-role="close"]').addEventListener('click', closeModal);
    overlay.querySelector('[data-role="contact-form"]').addEventListener('submit', onSubmit);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('qpaix-open')) closeModal();
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    const overlay = document.getElementById('qpaix-footer-contact-overlay');
    const form = e.target;
    const status = overlay.querySelector('[data-role="status"]');
    const submitBtn = overlay.querySelector('[data-role="submit"]');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    status.textContent = '';
    status.className = 'qpaix-fc-status';

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.value.trim(),
          email: form.email.value.trim(),
          phone: form.phone.value.trim(),
          subject: form.subject.value.trim(),
          message: form.message.value.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to send message');

      status.textContent = 'Thanks — your message has been sent. We will get back to you shortly.';
      status.className = 'qpaix-fc-status qpaix-fc-success';
      form.reset();
      setTimeout(closeModal, 2000);
    } catch (err) {
      status.textContent = err.message;
      status.className = 'qpaix-fc-status qpaix-fc-error';
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Send Message';
    }
  }

  function openModal() {
    ensureModal();
    const overlay = document.getElementById('qpaix-footer-contact-overlay');
    overlay.querySelector('[data-role="contact-form"]').reset();
    overlay.querySelector('[data-role="status"]').textContent = '';
    overlay.querySelector('[data-role="status"]').className = 'qpaix-fc-status';
    overlay.classList.add('qpaix-open');
  }

  function closeModal() {
    const overlay = document.getElementById('qpaix-footer-contact-overlay');
    if (overlay) overlay.classList.remove('qpaix-open');
  }

  // Event delegation on document so this works even though the footer (and this button) is
  // injected dynamically by cms.js's injectMasterFooter() after this script runs.
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.sisf-footer-btn a');
    if (!trigger) return;
    e.preventDefault();
    openModal();
  });

  window.qpaixOpenFooterContactModal = openModal;
})();
