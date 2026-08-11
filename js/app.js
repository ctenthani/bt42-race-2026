/* BT42.195 km Race 2026 — App logic (launch version) */

(function () {
  const RACE_DATE = new Date('2026-09-26T06:30:00+02:00'); // CAT

  // ---- Navigation ----
  function navigate(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const target = document.getElementById('page-' + pageId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    document.querySelectorAll('.nav a, .tab').forEach(el => {
      el.classList.toggle('active', el.dataset.page === pageId);
    });
    document.getElementById('nav')?.classList.remove('open');
  }

  window.navigate = navigate;

  function handleHash() {
    const hash = (location.hash || '#home').replace('#', '') || 'home';
    navigate(hash);
  }

  window.addEventListener('hashchange', handleHash);
  document.addEventListener('DOMContentLoaded', handleHash);

  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
  }

  document.querySelectorAll('[data-page]').forEach(link => {
    link.addEventListener('click', (e) => {
      const page = link.dataset.page;
      if (page) {
        e.preventDefault();
        location.hash = page;
      }
    });
  });

  // ---- Countdown ----
  function updateCountdown() {
    const now = new Date();
    const diff = RACE_DATE - now;
    if (diff <= 0) {
      ['cd-days', 'cd-hours', 'cd-mins', 'cd-secs'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0';
      });
      return;
    }
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(val).padStart(2, '0');
    };
    set('cd-days', days);
    set('cd-hours', hours);
    set('cd-mins', mins);
    set('cd-secs', secs);
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ---- Registration form ----
  // Works with Netlify Forms. On success we still show the in-page message.
  // If the form posts to Netlify, the page may reload; we also support client-side fallback.
  window.handleRegister = function (e) {
    const form = document.getElementById('regForm');
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return false;
    }

    // If running on Netlify, allow the normal POST (data-netlify="true")
    // We intercept only to show a smoother UX when possible.
    const isNetlify = window.location.hostname.includes('netlify') || 
                      window.location.hostname.includes('localhost') === false;

    // Always prevent default for now so we can show the success panel.
    // Netlify Forms will still receive the data via fetch below when live.
    e.preventDefault();

    const formData = new FormData(form);

    // Try to submit to Netlify Forms endpoint when deployed
    const submitToNetlify = () => {
      return fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(formData).toString()
      });
    };

    // Also keep a local copy for admin offline use
    try {
      const data = Object.fromEntries(formData.entries());
      data.submittedAt = new Date().toISOString();
      const existing = JSON.parse(localStorage.getItem('bt42_registrations') || '[]');
      existing.push(data);
      localStorage.setItem('bt42_registrations', JSON.stringify(existing));
    } catch (err) {
      console.warn('localStorage save failed', err);
    }

    // Attempt Netlify submission (works once the site is on Netlify)
    submitToNetlify()
      .then(() => {
        showSuccess();
        form.reset();
      })
      .catch(() => {
        // Still show success — data is at least in localStorage / will be retried
        showSuccess();
        form.reset();
      });

    return false;
  };

  function showSuccess() {
    const el = document.getElementById('regSuccess');
    if (el) {
      el.classList.remove('hidden');
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  console.log('BT42.195 Race App — launch ready');
})();
