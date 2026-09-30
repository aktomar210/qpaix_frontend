// QPAIX contact form submission — posts to the backend's /api/contact endpoint.
// Kept separate from cms.js since it's page-specific, not part of the shared CMS loop.
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('qpaix-contact-form');
    if (!form) return;

    const statusEl = document.getElementById('qpaix-contact-status');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      if (statusEl) statusEl.textContent = '';

      const payload = {
        name: form.name.value.trim(),
        email: form.email.value.trim(),
        phone: form.phone.value.trim(),
        subject: form.subject.value.trim(),
        message: form.message.value.trim(),
      };

      try {
        const res = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          if (statusEl) {
            statusEl.textContent = 'Thanks — your message has been sent. We will get back to you shortly.';
            statusEl.style.color = '#2e7d32';
          }
          form.reset();
        } else {
          throw new Error(data.message || 'Failed to send message');
        }
      } catch (err) {
        console.error('[contact-form]', err);
        if (statusEl) {
          statusEl.textContent = 'Something went wrong — please try again or email us directly.';
          statusEl.style.color = '#c62828';
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }
    });
  });
})();
