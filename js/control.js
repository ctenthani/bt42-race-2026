/* BT42.195 km Race 2026 — Control Room logic */

(function () {
  // Committee PIN = shared planner. Chair PIN = shared planner + Chair notes.
  const COMMITTEE_PIN = 'bt42oc';
  const CHAIR_PIN = 'bt42chair';

  const STORAGE_KEY = 'bt42_checklist_status';
  const SPONSOR_KEY = 'bt42_sponsor_status';
  const NOTES_KEY = 'bt42_control_notes';
  const DASH_KEY = 'bt42_dashboard_metrics';
  const DEADLINE_KEY = 'bt42_deadline_status';
  const CHAIR_NOTES_KEY = 'bt42_chair_meeting_notes_edits';

  let unlocked = sessionStorage.getItem('bt42_control_unlocked') === '1';
  let isChair = sessionStorage.getItem('bt42_control_role') === 'chair';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.from((ctx || document).querySelectorAll(sel)); }

  // ---------- Auth gate ----------
  function showGate() {
    const gate = $('#control-gate');
    const room = $('#control-room');
    if (gate) gate.classList.remove('hidden');
    if (room) room.classList.add('hidden');
  }

  function applyRoleUI() {
    // Chair notes tab & panel: chair only
    $$('.ctrl-tab[data-panel="chair"], #panel-chair').forEach(el => {
      if (isChair) el.classList.remove('chair-only-hidden');
      else el.classList.add('chair-only-hidden');
    });
    // Chair-editable metrics block
    const dashEdit = $('#ctrl-dash-edit');
    if (dashEdit) {
      if (isChair) dashEdit.classList.remove('chair-only-hidden');
      else dashEdit.classList.add('chair-only-hidden');
    }
    const badge = $('#ctrl-role-badge');
    if (badge) {
      badge.textContent = isChair ? 'Signed in as Chair' : 'Signed in as Committee';
      badge.className = isChair ? 'role-badge chair' : 'role-badge committee';
    }
    // If non-chair is on chair panel, switch to dashboard
    if (!isChair) {
      const chairPanel = $('#panel-chair');
      if (chairPanel && chairPanel.classList.contains('active')) {
        $$('.ctrl-tab').forEach(t => t.classList.remove('active'));
        $$('.ctrl-panel').forEach(p => p.classList.remove('active'));
        const dashTab = $('.ctrl-tab[data-panel="dash"]');
        const dashPanel = $('#panel-dash');
        if (dashTab) dashTab.classList.add('active');
        if (dashPanel) dashPanel.classList.add('active');
      }
    }
  }

  function unlock(role) {
    unlocked = true;
    isChair = role === 'chair';
    sessionStorage.setItem('bt42_control_unlocked', '1');
    sessionStorage.setItem('bt42_control_role', isChair ? 'chair' : 'committee');
    const gate = $('#control-gate');
    const room = $('#control-room');
    if (gate) gate.classList.add('hidden');
    if (room) room.classList.remove('hidden');
    renderAll();
    applyRoleUI();
  }

  function tryUnlock(e) {
    e.preventDefault();
    const input = $('#control-pin');
    if (!input) return;
    const val = input.value.trim().toLowerCase();
    if (val === CHAIR_PIN) {
      unlock('chair');
    } else if (val === COMMITTEE_PIN) {
      unlock('committee');
    } else {
      alert('Incorrect password. Use the committee password, or the Chair password for Chair-only notes.');
      input.value = '';
    }
  }

  function logoutControl() {
    sessionStorage.removeItem('bt42_control_unlocked');
    sessionStorage.removeItem('bt42_control_role');
    unlocked = false;
    isChair = false;
    showGate();
    const input = $('#control-pin');
    if (input) input.value = '';
  }

  // ---------- Status persistence ----------
  function loadStatuses() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch { return {}; }
  }

  function saveStatuses(map) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  }

  function loadSponsorStatuses() {
    try {
      return JSON.parse(localStorage.getItem(SPONSOR_KEY) || '{}');
    } catch { return {}; }
  }

  function saveSponsorStatuses(map) {
    localStorage.setItem(SPONSOR_KEY, JSON.stringify(map));
  }

  // ---------- Metrics ----------
  function loadDashboard() {
    const defaults = Object.assign({}, window.BT42_DATA.dashboardDefaults || {});
    try {
      const saved = JSON.parse(localStorage.getItem(DASH_KEY) || '{}');
      return Object.assign(defaults, saved);
    } catch { return defaults; }
  }

  function saveDashboard(obj) {
    localStorage.setItem(DASH_KEY, JSON.stringify(obj));
  }

  function loadDeadlineStatuses() {
    try { return JSON.parse(localStorage.getItem(DEADLINE_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveDeadlineStatuses(map) {
    localStorage.setItem(DEADLINE_KEY, JSON.stringify(map));
  }

  function computeMetrics() {
    const data = window.BT42_DATA;
    const statuses = loadStatuses();
    let done = 0, total = data.checklist.length;
    data.checklist.forEach(item => {
      const s = statuses[item.id] || item.status;
      if (s === 'done') done++;
    });
    const pct = total ? Math.round((done / total) * 100) : 0;

    const sponsorMap = loadSponsorStatuses();
    let contacted = 0, signed = 0;
    data.sponsors.forEach((s, i) => {
      const st = sponsorMap[i] || s.status;
      if (st !== 'To Contact') contacted++;
      if (st === 'Signed' || st === 'Confirmed') signed++;
    });

    const now = new Date();
    const race = new Date(data.raceDate);
    const daysLeft = Math.max(0, Math.ceil((race - now) / (1000 * 60 * 60 * 24)));

    const dash = loadDashboard();
    const dlMap = loadDeadlineStatuses();
    const deadlines = data.deadlines || [];
    let dlDone = 0;
    deadlines.forEach(d => { if ((dlMap[d.id] || 'todo') === 'done') dlDone++; });

    return {
      done, total, pct, contacted, signed,
      sponsorTotal: data.sponsors.length, daysLeft, dash, dlDone, dlTotal: deadlines.length
    };
  }

  function renderDashboard() {
    const m = computeMetrics();
    const d = m.dash;
    const el = $('#ctrl-metrics');
    if (!el) return;
    el.innerHTML = `
      <div class="metric-card">
        <div class="metric-value">${m.daysLeft}</div>
        <div class="metric-label">Days to Race</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${m.pct}%</div>
        <div class="metric-label">Checklist Done</div>
        <div class="metric-sub">${m.done} / ${m.total} tasks</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${m.contacted}</div>
        <div class="metric-label">Sponsors Contacted</div>
        <div class="metric-sub">${m.signed} signed · ${m.sponsorTotal} total</div>
      </div>
      <div class="metric-card">
        <div class="metric-value">${m.dlDone}/${m.dlTotal}</div>
        <div class="metric-label">Deadlines Done</div>
      </div>
    `;

    const bar = $('#ctrl-progress-bar');
    if (bar) bar.style.width = m.pct + '%';

    const next = window.BT42_DATA.meetings.find(mt => new Date(mt.date) >= new Date(new Date().toDateString()));
    const nextEl = $('#ctrl-next-meeting');
    if (nextEl && next) {
      nextEl.innerHTML = `<strong>Next OC Meeting:</strong> ${formatDate(next.date)} · ${next.time}<br><em>${next.focus}</em>`;
    }

    // Editable Chair metrics form
    const edit = $('#ctrl-dash-edit');
    if (edit) {
      edit.innerHTML = `
        <h3 class="ctrl-section-title">Chair-editable metrics</h3>
        <p class="form-note" style="margin-bottom:0.75rem">Only you (Chair) should edit these. Values save on this device.</p>
        <div class="dash-edit-grid">
          <label>Registrations actual <input type="number" id="dash-reg-actual" value="${d.registrationsActual}" min="0" /></label>
          <label>Registrations target <input type="number" id="dash-reg-target" value="${d.registrationsTarget}" min="0" /></label>
          <label>Marathon actual <input type="number" id="dash-mar-actual" value="${d.marathonActual}" min="0" /></label>
          <label>Marathon target <input type="number" id="dash-mar-target" value="${d.marathonTarget}" min="0" /></label>
          <label>Sponsorship actual (MK) <input type="number" id="dash-spon-actual" value="${d.sponsorshipActualMk}" min="0" /></label>
          <label>Sponsorship target (MK) <input type="number" id="dash-spon-target" value="${d.sponsorshipTargetMk}" min="0" /></label>
          <label class="full">Safety status <input type="text" id="dash-safety" value="${escapeHtml(d.safetyStatus)}" /></label>
          <label class="full">Media notes <input type="text" id="dash-media" value="${escapeHtml(d.mediaNotes)}" /></label>
        </div>
        <button type="button" class="btn btn-primary" id="dash-save-btn" style="margin-top:0.75rem">Save metrics</button>
        <p id="dash-save-msg" style="font-size:0.8rem;color:var(--accent);margin-top:0.5rem;display:none">Saved.</p>
        <div class="metric-card" style="margin-top:1rem;text-align:left">
          <div><strong>Regs:</strong> ${d.registrationsActual} / ${d.registrationsTarget}
            (Marathon ${d.marathonActual} / ${d.marathonTarget})</div>
          <div><strong>Sponsorship:</strong> ${formatMoney(d.sponsorshipActualMk)} / ${formatMoney(d.sponsorshipTargetMk)}</div>
          <div><strong>Safety:</strong> ${escapeHtml(d.safetyStatus)}</div>
        </div>`;
      const saveBtn = $('#dash-save-btn');
      if (saveBtn) {
        saveBtn.onclick = () => {
          const next = {
            registrationsActual: Number($('#dash-reg-actual').value) || 0,
            registrationsTarget: Number($('#dash-reg-target').value) || 0,
            marathonActual: Number($('#dash-mar-actual').value) || 0,
            marathonTarget: Number($('#dash-mar-target').value) || 0,
            sponsorshipActualMk: Number($('#dash-spon-actual').value) || 0,
            sponsorshipTargetMk: Number($('#dash-spon-target').value) || 0,
            safetyStatus: $('#dash-safety').value || '',
            mediaNotes: $('#dash-media').value || '',
            satisfactionTarget: d.satisfactionTarget
          };
          saveDashboard(next);
          const msg = $('#dash-save-msg');
          if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 1500); }
          renderDashboard();
        };
      }
    }
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }

  function formatMoney(n) {
    return 'MK ' + Number(n).toLocaleString('en-MW');
  }

  // ---------- Checklist ----------
  function renderChecklist() {
    const container = $('#ctrl-checklist');
    if (!container) return;
    const statuses = loadStatuses();
    const cats = [...new Set(window.BT42_DATA.checklist.map(c => c.cat))];

    let html = '';
    cats.forEach(cat => {
      const items = window.BT42_DATA.checklist.filter(c => c.cat === cat);
      html += `<div class="ctrl-cat"><h4>${cat}</h4>`;
      items.forEach(item => {
        const st = statuses[item.id] || item.status;
        html += `
          <div class="ctrl-task ${st}" data-id="${item.id}">
            <button class="status-btn" data-id="${item.id}" title="Click to cycle status">${statusIcon(st)}</button>
            <div class="task-body">
              <div class="task-title">${item.task}</div>
              <div class="task-meta">${item.owner} · Due ${item.due}</div>
            </div>
          </div>`;
      });
      html += '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.status-btn').forEach(btn => {
      btn.addEventListener('click', () => cycleStatus(btn.dataset.id));
    });
  }

  function statusIcon(st) {
    if (st === 'done') return '✅';
    if (st === 'doing') return '🔄';
    if (st === 'blocked') return '⛔';
    return '⬜';
  }

  function cycleStatus(id) {
    const map = loadStatuses();
    const order = ['todo', 'doing', 'done', 'blocked'];
    const current = map[id] || 'todo';
    const next = order[(order.indexOf(current) + 1) % order.length];
    map[id] = next;
    saveStatuses(map);
    renderChecklist();
    renderDashboard();
  }

  // ---------- Meetings ----------
  function renderMeetings() {
    const container = $('#ctrl-meetings');
    if (!container) return;
    let html = '';
    window.BT42_DATA.meetings.forEach(m => {
      const past = new Date(m.date) < new Date(new Date().toDateString());
      html += `
        <details class="ctrl-meeting ${past ? 'past' : ''}">
          <summary>
            <span class="m-num">#${m.id}</span>
            <span class="m-date">${formatDate(m.date)}</span>
            <span class="m-focus">${m.focus}</span>
          </summary>
          <div class="m-body">
            <p><strong>Time:</strong> ${m.time} · <strong>Type:</strong> ${m.type}</p>
            <p><strong>Attendees:</strong> ${m.attendees}</p>
            <ol>${m.agenda.map(a => `<li>${a}</li>`).join('')}</ol>
          </div>
        </details>`;
    });
    container.innerHTML = html;
  }

  // ---------- Sponsors ----------
  function renderSponsors() {
    const container = $('#ctrl-sponsors');
    if (!container) return;
    const map = loadSponsorStatuses();
    const statuses = ['To Contact', 'Contacted', 'In Discussion', 'Signed', 'Declined'];

    let html = `<div class="sponsor-table-wrap"><table class="ctrl-table">
      <thead><tr><th>#</th><th>Organisation</th><th>Tier</th><th>Status</th><th>Notes</th></tr></thead><tbody>`;

    window.BT42_DATA.sponsors.forEach((s, i) => {
      const st = map[i] || s.status;
      html += `<tr>
        <td>${s.priority}</td>
        <td><strong>${s.org}</strong><br><small>${s.category}</small></td>
        <td>${s.tier}</td>
        <td>
          <select data-idx="${i}" class="sponsor-status">
            ${statuses.map(opt => `<option value="${opt}" ${opt === st ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </td>
        <td><small>${s.notes}</small></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll('.sponsor-status').forEach(sel => {
      sel.addEventListener('change', () => {
        const map = loadSponsorStatuses();
        map[sel.dataset.idx] = sel.value;
        saveSponsorStatuses(map);
        renderDashboard();
      });
    });
  }

  // ---------- Budget ----------
  function renderBudget() {
    const container = $('#ctrl-budget');
    if (!container) return;
    const exp = window.BT42_DATA.budget.expenditure;
    const inc = window.BT42_DATA.budget.income;
    const totalExp = exp.reduce((s, r) => s + r.est, 0);
    const totalInc = inc.reduce((s, r) => s + r.target, 0);

    let html = `<div class="budget-grid">
      <div>
        <h4>Estimated Expenditure</h4>
        <table class="ctrl-table">
          <thead><tr><th>Category</th><th>Item</th><th class="num">Estimate</th></tr></thead>
          <tbody>`;
    exp.forEach(r => {
      html += `<tr><td>${r.cat}</td><td>${r.item}</td><td class="num">${formatMoney(r.est)}</td></tr>`;
    });
    html += `<tr class="total-row"><td colspan="2"><strong>Total</strong></td><td class="num"><strong>${formatMoney(totalExp)}</strong></td></tr>
        </tbody></table>
      </div>
      <div>
        <h4>Income Targets</h4>
        <table class="ctrl-table">
          <thead><tr><th>Source</th><th class="num">Target</th></tr></thead>
          <tbody>`;
    inc.forEach(r => {
      html += `<tr><td>${r.item}</td><td class="num">${formatMoney(r.target)}</td></tr>`;
    });
    html += `<tr class="total-row"><td><strong>Total Target</strong></td><td class="num"><strong>${formatMoney(totalInc)}</strong></td></tr>
        </tbody></table>
        <p class="budget-note">Surplus target: <strong>${formatMoney(totalInc - totalExp)}</strong>. Update with real quotes as they arrive.</p>
      </div>
    </div>`;
    container.innerHTML = html;
  }

  // ---------- Run sheet ----------
  function renderRunsheet() {
    const container = $('#ctrl-runsheet');
    if (!container) return;
    let html = `<table class="ctrl-table">
      <thead><tr><th>Time</th><th>Activity</th><th>Location</th><th>Lead</th></tr></thead><tbody>`;
    window.BT42_DATA.runsheet.forEach(r => {
      const highlight = r.activity.toLowerCase().includes('start') || r.activity.toLowerCase().includes('prize');
      html += `<tr class="${highlight ? 'highlight' : ''}">
        <td>${r.time}</td><td>${r.activity}</td><td>${r.location}</td><td>${r.lead}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // ---------- Roles ----------
  function renderRoles() {
    const container = $('#ctrl-roles');
    if (!container) return;
    let html = `<table class="ctrl-table">
      <thead><tr><th>Role</th><th>Name</th><th>Responsibilities</th></tr></thead><tbody>`;
    window.BT42_DATA.roles.forEach(r => {
      html += `<tr>
        <td><strong>${r.role}</strong></td>
        <td>${r.name || '<em>TBC</em>'}</td>
        <td>${r.responsibilities}</td>
      </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
  }

  // ---------- Success metrics ----------
  function renderTargets() {
    const container = $('#ctrl-targets');
    if (!container) return;
    let html = '<ul class="target-list">';
    window.BT42_DATA.successMetrics.forEach(t => {
      html += `<li><strong>${t.metric}:</strong> ${t.target}</li>`;
    });
    html += '</ul>';
    container.innerHTML = html;
  }

  // ---------- Notes ----------
  function renderNotes() {
    const ta = $('#ctrl-notes');
    if (!ta) return;
    ta.value = localStorage.getItem(NOTES_KEY) || '';
    ta.addEventListener('input', () => {
      localStorage.setItem(NOTES_KEY, ta.value);
    });
  }

  // ---------- Tab switching inside control ----------
  function initControlTabs() {
    $$('.ctrl-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.ctrl-tab').forEach(t => t.classList.remove('active'));
        $$('.ctrl-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        const panel = $('#panel-' + tab.dataset.panel);
        if (panel) panel.classList.add('active');
      });
    });
  }


  function renderParticipants() {
    const container = $('#ctrl-participants');
    if (!container) return;
    let rows = [];
    try {
      rows = JSON.parse(localStorage.getItem('bt42_registrations') || '[]');
    } catch { rows = []; }

    if (!rows.length) {
      container.innerHTML = `<p style="color:var(--text-muted)">No local registrations on this device yet. After Netlify deploy, open <strong>Forms → bt42-registration</strong> for the full list. Submissions from this browser also appear here.</p>`;
      return;
    }

    let html = `<p style="font-size:0.85rem;margin-bottom:0.75rem"><strong>${rows.length}</strong> local submission(s) on this device</p>
      <div class="sponsor-table-wrap"><table class="ctrl-table">
      <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Distance</th><th>Gender</th><th>Submitted</th></tr></thead><tbody>`;
    rows.forEach((r, i) => {
      const when = r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '—';
      html += `<tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(r.fullName || '')}</td>
        <td>${escapeHtml(r.phone || '')}</td>
        <td>${escapeHtml(r.distance || '')}</td>
        <td>${escapeHtml(r.gender || '')}</td>
        <td><small>${when}</small></td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function renderDeadlines() {
    const container = $('#ctrl-deadlines');
    if (!container) return;
    const map = loadDeadlineStatuses();
    const today = new Date(new Date().toDateString());
    let html = '';
    (window.BT42_DATA.deadlines || []).forEach(d => {
      const st = map[d.id] || 'todo';
      const when = new Date(d.when + 'T12:00:00');
      const overdue = st !== 'done' && when < today;
      html += `
        <div class="ctrl-task ${st}${overdue ? ' blocked' : ''}${d.critical ? ' critical-dl' : ''}" data-id="${d.id}">
          <button class="status-btn deadline-btn" data-id="${d.id}" title="Mark deadline status">${statusIcon(st)}</button>
          <div class="task-body">
            <div class="task-title">${d.critical ? '🔴 ' : ''}${d.title}</div>
            <div class="task-meta">${formatDate(d.when)}${overdue ? ' · OVERDUE' : ''} — ${d.detail}</div>
          </div>
        </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.deadline-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const map = loadDeadlineStatuses();
        const order = ['todo', 'doing', 'done', 'blocked'];
        const current = map[btn.dataset.id] || 'todo';
        map[btn.dataset.id] = order[(order.indexOf(current) + 1) % order.length];
        saveDeadlineStatuses(map);
        renderDeadlines();
        renderDashboard();
      });
    });
  }

  function renderChairNotes() {
    const container = $('#ctrl-chair-notes');
    if (!container) return;
    const edits = (() => { try { return JSON.parse(localStorage.getItem(CHAIR_NOTES_KEY) || '{}'); } catch { return {}; } })();
    let html = '<p class="form-note" style="margin-bottom:1rem">Prepared for you as Chair. Add your own notes per meeting — saved on this device only.</p>';
    (window.BT42_DATA.chairMeetingNotes || []).forEach(n => {
      const extra = edits[n.meetingId] || '';
      html += `
        <details class="ctrl-meeting">
          <summary>
            <span class="m-num">M${n.meetingId}</span>
            <span class="m-date">${formatDate(n.date)}</span>
            <span class="m-focus">${n.title}</span>
          </summary>
          <div class="m-body">
            <p><strong>Chair talking points</strong></p>
            <ul>${n.notes.map(x => `<li>${x}</li>`).join('')}</ul>
            <p><strong>Decisions needed</strong></p>
            <ul>${n.decisionsNeeded.map(x => `<li>${x}</li>`).join('')}</ul>
            <label style="display:block;margin-top:0.75rem;font-weight:600;font-size:0.85rem">Your notes for this meeting</label>
            <textarea class="chair-note-edit" data-mid="${n.meetingId}" rows="3" style="width:100%;margin-top:0.35rem;padding:0.6rem;border:1px solid var(--border);border-radius:8px;font-family:inherit">${escapeHtml(extra)}</textarea>
          </div>
        </details>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('.chair-note-edit').forEach(ta => {
      ta.addEventListener('input', () => {
        const edits = (() => { try { return JSON.parse(localStorage.getItem(CHAIR_NOTES_KEY) || '{}'); } catch { return {}; } })();
        edits[ta.dataset.mid] = ta.value;
        localStorage.setItem(CHAIR_NOTES_KEY, JSON.stringify(edits));
      });
    });
  }

  function renderAll() {
    renderDashboard();
    renderChecklist();
    renderMeetings();
    renderSponsors();
    renderBudget();
    renderRunsheet();
    renderRoles();
    renderTargets();
    renderParticipants();
    renderDeadlines();
    if (isChair) renderChairNotes();
    renderNotes();
    initControlTabs();
    applyRoleUI();
  }

  // ---------- Public API for main app ----------
  window.BT42Control = {
    init() {
      const form = $('#control-pin-form');
      if (form) {
        form.removeEventListener('submit', tryUnlock);
        form.addEventListener('submit', tryUnlock);
      }
      const logoutBtn = $('#ctrl-logout');
      if (logoutBtn) logoutBtn.onclick = logoutControl;

      if (unlocked) {
        unlock(isChair ? 'chair' : 'committee');
      } else {
        showGate();
      }
    },
    unlock,
    logout: logoutControl,
    renderAll
  };
})();
