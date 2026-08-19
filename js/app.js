/* BT42.195km Race 2026 — App logic (launch version) */

(function () {
  const RACE_DATE = new Date('2026-09-19T06:30:00+02:00'); // CAT

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

    // Initialise Control Room when that page is shown
    if (pageId === 'control' && window.BT42Control) {
      window.BT42Control.init();
    }
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
  // Works with Netlify Forms. Shows success panel after submit.
  const RACE_DAY_ISO = '2026-09-19'; // age calculated on race day

  // Entry fees (MWK) — shown after race selection; bank account 782637
  const ENTRY_FEES = {
    '42.195': 15000,
    '10': 10000,
    '5': 5000
  };
  const FEE_LABELS = {
    '42.195': '42.195 km Marathon',
    '10': '10 km Race',
    '5': '5 km Fun Run'
  };

  function ageOnRaceDay(dobStr) {
    if (!dobStr) return null;
    const dob = new Date(dobStr + 'T12:00:00');
    const race = new Date(RACE_DAY_ISO + 'T12:00:00');
    let age = race.getFullYear() - dob.getFullYear();
    const m = race.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && race.getDate() < dob.getDate())) age--;
    return age;
  }

  function isValidMwPhone(raw) {
    // Accept common Malawi mobiles in any usual writing:
    // 0888381177, 888381177, 265888381177, +265888381177, with spaces/dashes
    let d = String(raw || '').replace(/[\s\-()]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    if (d.startsWith('265')) d = d.slice(3);
    if (d.startsWith('0')) d = d.slice(1);
    // local mobile: 8 or 9 + 8 digits (9 digits total)
    return /^[89]\d{8}$/.test(d);
  }

  window.handleRegister = function (e) {
    const form = document.getElementById('regForm');
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
      return false;
    }

    e.preventDefault();

    const formData = new FormData(form);
    const distance = (formData.get('distance') || '').toString();
    const dob = (formData.get('dob') || '').toString();
    const age = ageOnRaceDay(dob);

    const phoneVal = (formData.get('phone') || '').toString();
    if (!isValidMwPhone(phoneVal)) {
      alert('Please enter a valid Malawi mobile number (e.g. 0888381177, 888381177, 265888381177 or +265888381177).');
      return false;
    }
    const emPhone = (formData.get('emergencyPhone') || '').toString();
    if (!emPhone || !isValidMwPhone(emPhone)) {
      alert('Please enter a valid Malawi mobile for the emergency contact.');
      return false;
    }

    // Reject marathon if under 20 on race day
    if (distance === '42.195') {
      if (age === null || age < 20) {
        alert('Marathon entries are only open to runners who will be at least 20 years old on race day (19 September 2026). Please choose the 10 km or 5 km, or update your date of birth if it was entered incorrectly.');
        return false;
      }
    }

    // Also keep a local copy for offline/admin use
    let data = Object.fromEntries(formData.entries());
    data.submittedAt = new Date().toISOString();
    data.ageOnRaceDay = age;
    data.feeMwk = ENTRY_FEES[distance] || null;
    try {
      const existing = JSON.parse(localStorage.getItem('bt42_registrations') || '[]');
      existing.push(data);
      localStorage.setItem('bt42_registrations', JSON.stringify(existing));
    } catch (err) {
      console.warn('localStorage save failed', err);
    }

    // Shared list is required for OC monitoring; Forms is backup only.
    // Build a clean payload (avoid honeypot / form-name only fields)
    const payload = {
      fullName: data.fullName || data.name || '',
      phone: data.phone || '',
      email: data.email || '',
      distance: data.distance || '',
      dob: data.dob || '',
      gender: data.gender || '',
      emergencyName: data.emergencyName || '',
      emergencyPhone: data.emergencyPhone || '',
      submittedAt: data.submittedAt,
      ageOnRaceDay: data.ageOnRaceDay,
      feeMwk: data.feeMwk
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting…';
    }

    // Netlify Forms backup (do not block on this)
    fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString()
    }).catch(() => null);

    fetch('/.netlify/functions/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(async (res) => {
        const j = await res.json().catch(() => ({}));
        if (!res.ok || !j.ok) {
          throw new Error((j && (j.detail || j.error)) || ('HTTP ' + res.status));
        }
        showSuccess(data);
        form.reset();
        const fp = document.getElementById('fee-preview');
        if (fp) fp.style.display = 'none';
        if (data.email) {
          fetch('/.netlify/functions/send-certificate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'confirmation',
              to: data.email,
              fullName: data.fullName,
              distance: data.distance,
              raceDate: '19 September 2026'
            })
          }).catch(() => {});
        }
      })
      .catch((err) => {
        console.error('Shared register failed', err);
        alert(
          'Registration could not be saved to the official list. ' +
          'Please check your internet connection and try again.\n\n' +
          'Details: ' + (err && err.message ? err.message : String(err))
        );
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit registration';
        }
      });

    return false;
  };

  let lastReg = null;

  function formatMwk(n) {
    return Number(n).toLocaleString('en-MW') + ' MWK';
  }

  function showSuccess(reg) {
    lastReg = reg || lastReg;
    const el = document.getElementById('regSuccess');
    if (!el) return;

    const name = (lastReg && lastReg.fullName) || 'Athlete';
    const distance = (lastReg && lastReg.distance) || '';
    const fee = ENTRY_FEES[distance] || null;
    const distLabel = FEE_LABELS[distance] || distance || 'your race';
    const phone = (lastReg && lastReg.phone) || '';

    const feeLine = fee
      ? formatMwk(fee)
      : 'the amount shown for your race';

    const detail = document.getElementById('regSuccessDetail');
    if (detail) {
      detail.innerHTML = `
        <p>Thank you, <strong>${escapeHtml(name)}</strong>. Your registration for the <strong>${escapeHtml(distLabel)}</strong> has been received.</p>

        <div class="mpamba-confirm-card">
          <p class="mpamba-confirm-title">Pay by bank transfer</p>
          <ol class="mpamba-steps">
            <li>Transfer the entry fee to account <code>782637</code></li>
            <li>Use reference: <strong>your full name + mobile number</strong></li>
            <li>Keep your deposit slip or transfer confirmation</li>
          </ol>
          <p class="form-note" style="margin-top:0.75rem">Account: <code>782637</code> — reference: your name + mobile${phone ? ' (' + escapeHtml(phone) + ')' : ''}.</p>
        </div>

        <div class="post-pay-info">
          <p><strong>After payment</strong></p>
          <ul>
            <li>Keep the bank slip / transfer proof.</li>
            <li>Organisers verify payment, then assign your <strong>bib number</strong>.</li>
            <li>Bib details and packet-pickup info are sent to your phone/email once verified (closer to race week).</li>
            <li>Certificates: entry cert after payment verification; completion cert after you finish — emailed if you provided an email and email sending is configured on the server.</li>
          </ul>
        </div>`;
    }

    el.classList.remove('hidden');
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // Live hint when marathon selected
  const distSel = document.getElementById('distance');
  const dobInput = document.getElementById('dob');
  function checkMarathonAgeHint() {
    const hint = document.getElementById('marathon-age-hint');
    if (!distSel || !dobInput) return;
    if (distSel.value === '42.195' && dobInput.value) {
      const age = ageOnRaceDay(dobInput.value);
      if (hint) {
        if (age !== null && age < 20) {
          hint.textContent = 'Not eligible for the marathon: must be 20+ on 19 Sep 2026 (you would be ' + age + ').';
          hint.style.display = 'block';
        } else if (age !== null) {
          hint.textContent = 'Age on race day: ' + age + ' — eligible for the marathon.';
          hint.style.display = 'block';
        } else {
          hint.style.display = 'none';
        }
      }
    } else if (hint) {
      hint.style.display = 'none';
    }
  }
  function updateFeePreview() {
    const el = document.getElementById('fee-preview');
    if (!el || !distSel) return;
    const d = distSel.value;
    if (d && ENTRY_FEES[d] != null) {
      el.innerHTML = 'Entry fee: <strong>' + formatMwk(ENTRY_FEES[d]) + '</strong> — pay to account <code>782637</code> (ref: name + mobile)';
      el.style.display = 'block';
    } else {
      el.style.display = 'none';
    }
  }
  if (distSel) {
    distSel.addEventListener('change', () => { checkMarathonAgeHint(); updateFeePreview(); });
  }
  if (dobInput) dobInput.addEventListener('change', checkMarathonAgeHint);

  console.log('BT42.195 Race App — launch ready');
})();
