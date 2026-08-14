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
  const BUDGET_KEY = 'bt42_budget_edits';
  const ROLES_KEY = 'bt42_roles_edits';
  const ATTEND_KEY = 'bt42_meeting_attendance';
  const PAYMENT_KEY = 'bt42_payment_status';

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
    const meetLink = window.BT42_DATA.meetLink || 'https://meet.google.com/ixu-kyfn-pvc';
    let html = `
      <div class="meet-link-banner">
        <strong>Google Meet (all OC meetings)</strong><br>
        <a href="${meetLink}" target="_blank" rel="noopener">${meetLink}</a>
      </div>`;
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
            <p><strong>Google Meet:</strong> <a href="${meetLink}" target="_blank" rel="noopener">${meetLink}</a></p>
            <p><strong>Attendees:</strong> ${m.attendees}</p>
            <p><strong>Agenda</strong></p>
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

  // ---------- Budget (tentative; Chair-editable) ----------
  function loadBudget() {
    const base = JSON.parse(JSON.stringify(window.BT42_DATA.budget));
    try {
      const saved = JSON.parse(localStorage.getItem(BUDGET_KEY) || 'null');
      if (saved && saved.expenditure && saved.income) return saved;
    } catch {}
    return base;
  }

  function saveBudget(obj) {
    localStorage.setItem(BUDGET_KEY, JSON.stringify(obj));
  }

  function renderBudget() {
    const container = $('#ctrl-budget');
    if (!container) return;
    const budget = loadBudget();
    const exp = budget.expenditure;
    const inc = budget.income;
    const totalExp = exp.reduce((s, r) => s + (Number(r.est) || 0), 0);
    const totalInc = inc.reduce((s, r) => s + (Number(r.target) || 0), 0);
    const editable = isChair;

    let html = `<div class="budget-badge-row"><span class="tentative-badge">Tentative</span>${editable ? '<span class="edit-hint">Chair can edit amounts below</span>' : '<span class="edit-hint">View only — ask Chair to update figures</span>'}</div>
    <div class="budget-grid">
      <div>
        <h4>Estimated Expenditure</h4>
        <table class="ctrl-table">
          <thead><tr><th>Category</th><th>Item</th><th class="num">Estimate (MK)</th></tr></thead>
          <tbody>`;
    exp.forEach((r, i) => {
      if (editable) {
        html += `<tr>
          <td>${escapeHtml(r.cat)}</td>
          <td>${escapeHtml(r.item)}</td>
          <td class="num"><input type="number" class="budget-input exp-input" data-i="${i}" value="${Number(r.est) || 0}" min="0" step="10000" /></td>
        </tr>`;
      } else {
        html += `<tr><td>${escapeHtml(r.cat)}</td><td>${escapeHtml(r.item)}</td><td class="num">${formatMoney(r.est)}</td></tr>`;
      }
    });
    html += `<tr class="total-row"><td colspan="2"><strong>Total (tentative)</strong></td><td class="num"><strong id="budget-exp-total">${formatMoney(totalExp)}</strong></td></tr>
        </tbody></table>
      </div>
      <div>
        <h4>Income Targets</h4>
        <table class="ctrl-table">
          <thead><tr><th>Source</th><th class="num">Target (MK)</th></tr></thead>
          <tbody>`;
    inc.forEach((r, i) => {
      if (editable) {
        html += `<tr>
          <td>${escapeHtml(r.item)}</td>
          <td class="num"><input type="number" class="budget-input inc-input" data-i="${i}" value="${Number(r.target) || 0}" min="0" step="10000" /></td>
        </tr>`;
      } else {
        html += `<tr><td>${escapeHtml(r.item)}</td><td class="num">${formatMoney(r.target)}</td></tr>`;
      }
    });
    html += `<tr class="total-row"><td><strong>Total target (tentative)</strong></td><td class="num"><strong id="budget-inc-total">${formatMoney(totalInc)}</strong></td></tr>
        </tbody></table>
        <p class="budget-note">Surplus target: <strong id="budget-surplus">${formatMoney(totalInc - totalExp)}</strong>. Figures remain tentative until confirmed.</p>
      </div>
    </div>`;
    if (editable) {
      html += `<button type="button" class="btn btn-primary" id="budget-save-btn" style="margin-top:0.75rem">Save budget edits</button>
        <button type="button" class="btn btn-ghost" id="budget-reset-btn" style="margin-top:0.75rem;margin-left:0.5rem">Reset to defaults</button>
        <p id="budget-save-msg" style="font-size:0.8rem;color:var(--accent);margin-top:0.5rem;display:none">Budget saved on this device.</p>`;
    }
    container.innerHTML = html;

    if (editable) {
      const recalc = () => {
        const b = loadBudget();
        container.querySelectorAll('.exp-input').forEach(inp => {
          b.expenditure[Number(inp.dataset.i)].est = Number(inp.value) || 0;
        });
        container.querySelectorAll('.inc-input').forEach(inp => {
          b.income[Number(inp.dataset.i)].target = Number(inp.value) || 0;
        });
        const te = b.expenditure.reduce((s, r) => s + (Number(r.est) || 0), 0);
        const ti = b.income.reduce((s, r) => s + (Number(r.target) || 0), 0);
        const elE = $('#budget-exp-total'); if (elE) elE.textContent = formatMoney(te);
        const elI = $('#budget-inc-total'); if (elI) elI.textContent = formatMoney(ti);
        const elS = $('#budget-surplus'); if (elS) elS.textContent = formatMoney(ti - te);
        return b;
      };
      container.querySelectorAll('.budget-input').forEach(inp => {
        inp.addEventListener('input', recalc);
      });
      const saveBtn = $('#budget-save-btn');
      if (saveBtn) saveBtn.onclick = () => {
        saveBudget(recalc());
        const msg = $('#budget-save-msg');
        if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 1800); }
      };
      const resetBtn = $('#budget-reset-btn');
      if (resetBtn) resetBtn.onclick = () => {
        localStorage.removeItem(BUDGET_KEY);
        renderBudget();
      };
    }
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

  // ---------- Roles (Chair can assign names) ----------
  function loadRoles() {
    const base = window.BT42_DATA.roles.map(r => Object.assign({}, r));
    try {
      const saved = JSON.parse(localStorage.getItem(ROLES_KEY) || 'null');
      if (Array.isArray(saved) && saved.length) {
        return base.map((r, i) => Object.assign({}, r, saved[i] || {}));
      }
    } catch {}
    return base;
  }

  function saveRoles(arr) {
    localStorage.setItem(ROLES_KEY, JSON.stringify(arr));
  }

  function renderRoles() {
    const container = $('#ctrl-roles');
    if (!container) return;
    const roles = loadRoles();
    const editable = isChair;
    let html = `<p class="form-note" style="margin-bottom:0.75rem">${editable ? 'Chair can assign names to each role. Saved on this device.' : 'Role names are maintained by the Chair.'}</p>`;
    roles.forEach((r, i) => {
      html += `<div class="role-card">
        <div class="role-title">${escapeHtml(r.role)}</div>
        <div class="role-name">${editable
          ? `<input type="text" class="role-name-input" data-i="${i}" value="${escapeHtml(r.name || '')}" placeholder="Name TBD" />`
          : escapeHtml(r.name || 'TBD')}</div>
        <div class="role-resp">${escapeHtml(r.responsibilities)}</div>
      </div>`;
    });
    if (editable) {
      html += `<button type="button" class="btn btn-primary" id="roles-save-btn" style="margin-top:0.75rem">Save role assignments</button>
        <p id="roles-save-msg" style="font-size:0.8rem;color:var(--accent);margin-top:0.5rem;display:none">Saved.</p>`;
    }
    container.innerHTML = html;
    if (editable) {
      const btn = $('#roles-save-btn');
      if (btn) btn.onclick = () => {
        const next = loadRoles();
        container.querySelectorAll('.role-name-input').forEach(inp => {
          next[Number(inp.dataset.i)].name = inp.value.trim();
        });
        saveRoles(next);
        const msg = $('#roles-save-msg');
        if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 1500); }
      };
    }
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



  // ---------- Meeting attendance ----------
  function loadAttendance() {
    try { return JSON.parse(localStorage.getItem(ATTEND_KEY) || '{}'); }
    catch { return {}; }
  }

  function saveAttendance(map) {
    localStorage.setItem(ATTEND_KEY, JSON.stringify(map));
  }

  function getRoleNames() {
    // Prefer saved role names; fall back to data defaults
    const roles = (typeof loadRoles === 'function') ? loadRoles() : (window.BT42_DATA.roles || []);
    return roles
      .map(r => ({ role: r.role, name: (r.name || '').trim() }))
      .filter(r => r.name);
  }

  function renderAttendance() {
    const container = $('#ctrl-attendance');
    if (!container) return;
    const attendance = loadAttendance();
    const people = getRoleNames();
    const meetings = window.BT42_DATA.meetings || [];

    if (!people.length) {
      container.innerHTML = `<p class="form-note">Assign names under <strong>Roles</strong> first, then return here to mark attendance.</p>`;
      return;
    }

    let html = `<div class="attendance-wrap">`;
    meetings.forEach(m => {
      const key = 'm' + m.id;
      const set = attendance[key] || {};
      const presentCount = people.filter(p => set[p.name]).length;
      html += `
        <details class="ctrl-meeting attendance-card" ${m.id <= 2 ? 'open' : ''}>
          <summary>
            <span class="m-num">#${m.id}</span>
            <span class="m-date">${formatDate(m.date)}</span>
            <span class="m-focus">${m.focus}</span>
            <span class="attend-count">${presentCount}/${people.length} present</span>
          </summary>
          <div class="m-body">
            <div class="attend-list">`;
      people.forEach(p => {
        const checked = set[p.name] ? 'checked' : '';
        const id = `att-${m.id}-${p.name.replace(/\\W+/g, '_')}`;
        html += `
              <label class="attend-item">
                <input type="checkbox" data-meeting="${key}" data-name="${escapeHtml(p.name)}" ${checked} />
                <span><strong>${escapeHtml(p.name)}</strong> <small>${escapeHtml(p.role)}</small></span>
              </label>`;
      });
      html += `
            </div>
            <label style="display:block;margin-top:0.75rem;font-size:0.85rem;font-weight:600">Notes for this meeting</label>
            <textarea class="attend-notes" data-meeting="${key}" rows="2" style="width:100%;margin-top:0.35rem;padding:0.6rem;border:1px solid var(--border);border-radius:8px;font-family:inherit">${escapeHtml((attendance[key + '_notes'] || ''))}</textarea>
          </div>
        </details>`;
    });
    html += `</div>
      <button type="button" class="btn btn-primary" id="attend-save-btn" style="margin-top:0.75rem">Save attendance</button>
      <p id="attend-save-msg" style="font-size:0.8rem;color:var(--accent);margin-top:0.5rem;display:none">Attendance saved on this device.</p>`;
    container.innerHTML = html;

    const saveBtn = $('#attend-save-btn');
    if (saveBtn) {
      saveBtn.onclick = () => {
        const map = loadAttendance();
        container.querySelectorAll('.attend-item input[type="checkbox"]').forEach(cb => {
          const mk = cb.dataset.meeting;
          if (!map[mk]) map[mk] = {};
          map[mk][cb.dataset.name] = cb.checked;
        });
        container.querySelectorAll('.attend-notes').forEach(ta => {
          map[ta.dataset.meeting + '_notes'] = ta.value;
        });
        saveAttendance(map);
        const msg = $('#attend-save-msg');
        if (msg) { msg.style.display = 'block'; setTimeout(() => { msg.style.display = 'none'; }, 1600); }
        renderAttendance();
      };
    }
  }

  function loadPayments() {
    try { return JSON.parse(localStorage.getItem(PAYMENT_KEY) || '{}'); }
    catch { return {}; }
  }

  function savePayments(map) {
    localStorage.setItem(PAYMENT_KEY, JSON.stringify(map));
  }

  function participantKey(r, i) {
    const phone = (r.phone || '').replace(/\s+/g, '');
    const name = (r.fullName || '').trim().toLowerCase();
    return phone || name || ('idx-' + i);
  }

  function distanceLabel(d) {
    if (d === '42.195' || d === '42.195 km') return '42.195 km Marathon';
    if (d === '10') return '10 km Race';
    if (d === '5') return '5 km Fun Run';
    return d || '—';
  }

  function renderParticipants() {
    const container = $('#ctrl-participants');
    if (!container) return;
    let rows = [];
    try {
      rows = JSON.parse(localStorage.getItem('bt42_registrations') || '[]');
    } catch { rows = []; }
    const pays = loadPayments();

    let html = `<div class="notice" style="margin-bottom:1rem">
      <strong>Payment verification workflow</strong><br>
      1) Runner pays via <strong>TNM Mpamba code 500204</strong> or <strong>NBM account 1802283</strong>.<br>
      2) OC checks mobile money / bank statement against name or phone reference.<br>
      3) Mark <strong>Verified</strong> here — then generate the participant certificate.<br>
      <em>Fully automatic bank APIs are not available on this static site; verification is OC-confirmed against the payment channels above.</em>
    </div>`;

    if (!rows.length) {
      html += `<p style="color:var(--text-muted)">No local registrations on this device yet. After Netlify deploy, also check <strong>Forms → bt42-registration</strong>. You can still import by registering a test entry on this browser.</p>`;
      container.innerHTML = html;
      return;
    }

    const verified = rows.filter((r, i) => (pays[participantKey(r, i)] || {}).status === 'verified').length;
    const pending = rows.length - verified;

    html += `<p style="font-size:0.85rem;margin-bottom:0.75rem"><strong>${rows.length}</strong> entries · <strong>${verified}</strong> payment verified · <strong>${pending}</strong> pending</p>
      <div class="sponsor-table-wrap"><table class="ctrl-table">
      <thead><tr><th>#</th><th>Name</th><th>Phone</th><th>Distance</th><th>Payment</th><th>Actions</th></tr></thead><tbody>`;

    rows.forEach((r, i) => {
      const key = participantKey(r, i);
      const pay = pays[key] || { status: 'pending' };
      const st = pay.status || 'pending';
      const stLabel = st === 'verified' ? 'Verified' : (st === 'rejected' ? 'Rejected' : 'Pending');
      const stClass = st === 'verified' ? 'pay-ok' : (st === 'rejected' ? 'pay-no' : 'pay-wait');
      html += `<tr>
        <td>${i + 1}</td>
        <td><strong>${escapeHtml(r.fullName || '')}</strong></td>
        <td>${escapeHtml(r.phone || '')}</td>
        <td>${escapeHtml(distanceLabel(r.distance))}</td>
        <td><span class="pay-status ${stClass}">${stLabel}</span>${pay.note ? '<br><small>' + escapeHtml(pay.note) + '</small>' : ''}</td>
        <td class="actions-cell">
          <button type="button" class="btn-mini pay-verify" data-key="${escapeHtml(key)}" data-i="${i}">Verify</button>
          <button type="button" class="btn-mini pay-reject" data-key="${escapeHtml(key)}">Reject</button>
          <button type="button" class="btn-mini pay-cert" data-i="${i}" ${st !== 'verified' ? 'disabled title="Verify payment first"' : ''}>Certificate</button>
        </td>
      </tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;

    container.querySelectorAll('.pay-verify').forEach(btn => {
      btn.onclick = () => {
        const map = loadPayments();
        const note = prompt('Optional note (e.g. Mpamba ref / bank deposit time):', (map[btn.dataset.key] || {}).note || '') || '';
        map[btn.dataset.key] = {
          status: 'verified',
          note: note,
          verifiedAt: new Date().toISOString(),
          verifiedBy: isChair ? 'Chair' : 'Committee'
        };
        savePayments(map);
        renderParticipants();
      };
    });
    container.querySelectorAll('.pay-reject').forEach(btn => {
      btn.onclick = () => {
        const map = loadPayments();
        map[btn.dataset.key] = {
          status: 'rejected',
          note: prompt('Reason (optional):', '') || '',
          verifiedAt: new Date().toISOString()
        };
        savePayments(map);
        renderParticipants();
      };
    });
    container.querySelectorAll('.pay-cert').forEach(btn => {
      btn.onclick = () => {
        const i = Number(btn.dataset.i);
        const r = rows[i];
        if (!r) return;
        openCertificate(r);
      };
    });
  }

  function openCertificate(r) {
    const distance = distanceLabel(r.distance);
    const name = r.fullName || 'Participant';
    const phone = r.phone || '';
    const certId = 'BT42-' + (phone.replace(/\D/g, '').slice(-8) || Date.now().toString(36).toUpperCase());
    const issued = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const w = window.open('', '_blank', 'width=900,height=1200');
    if (!w) {
      alert('Please allow pop-ups to view the certificate.');
      return;
    }
    w.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Certificate — ${name.replace(/</g, '')}</title>
<style>
  @page { size: A4 landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, 'Times New Roman', serif; margin: 0; background: #eee; color: #1a1a1a; }
  .sheet {
    width: 297mm; min-height: 210mm; margin: 12px auto; background: #fff;
    border: 10px solid #1B4F72; padding: 18mm 16mm; position: relative;
  }
  .sheet::before {
    content: ''; position: absolute; inset: 6px; border: 2px solid #D4AC0D; pointer-events: none;
  }
  .hdr { text-align: center; margin-bottom: 1.2rem; }
  .org { font-size: 13px; letter-spacing: 0.12em; text-transform: uppercase; color: #1B4F72; font-weight: 700; }
  .event { font-size: 22px; margin: 0.4rem 0 0; color: #154360; }
  .sub { font-size: 13px; color: #555; margin-top: 0.25rem; }
  h1 { text-align: center; font-size: 28px; letter-spacing: 0.08em; margin: 1.2rem 0 0.4rem; color: #7D6608; }
  .intro { text-align: center; font-size: 14px; margin: 0.5rem 0; }
  .pname { text-align: center; font-size: 32px; font-weight: 700; margin: 0.6rem 0; border-bottom: 1px solid #ccc; display: inline-block; padding: 0 1.5rem 0.25rem; }
  .pname-wrap { text-align: center; }
  .detail { text-align: center; font-size: 15px; margin: 0.75rem auto 1.2rem; max-width: 80%; line-height: 1.5; }
  .sigs { display: flex; justify-content: space-around; gap: 1.5rem; margin-top: 2rem; text-align: center; }
  .sig { flex: 1; max-width: 220px; }
  .sig-line { border-top: 1px solid #333; margin: 2.5rem 0.5rem 0.35rem; }
  .sig-name { font-weight: 700; font-size: 13px; }
  .sig-title { font-size: 11px; color: #444; }
  .foot { text-align: center; margin-top: 1.5rem; font-size: 11px; color: #666; }
  .actions { text-align: center; margin: 12px; }
  .actions button { padding: 0.6rem 1.2rem; font-size: 14px; cursor: pointer; margin: 0 0.25rem; }
  @media print { body { background: #fff; } .actions { display: none; } .sheet { margin: 0; border-width: 8px; } }
</style>
</head>
<body>
  <div class="actions">
    <button onclick="window.print()">Print / Save PDF</button>
    <button onclick="window.close()">Close</button>
  </div>
  <div class="sheet">
    <div class="hdr">
      <div class="org">Malawi National Council of Sports</div>
      <div class="event">BT42.195 km Race 2026</div>
      <div class="sub">Blantyre · Saturday, 19 September 2026</div>
    </div>
    <h1>CERTIFICATE OF PARTICIPATION</h1>
    <p class="intro">This is to certify that</p>
    <div class="pname-wrap"><div class="pname">${name.replace(/</g, '')}</div></div>
    <p class="detail">
      is a registered participant in the <strong>${distance.replace(/</g, '')}</strong>
      of the BT42.195 km Race 2026, organised under the auspices of the
      <strong>Malawi National Council of Sports</strong>.
    </p>
    <p class="detail" style="font-size:13px;color:#555">
      Certificate ID: ${certId} · Issued: ${issued}
      ${phone ? ' · Tel: ' + phone.replace(/</g, '') : ''}
    </p>
    <div class="sigs">
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Jim Kalua</div>
        <div class="sig-title">Chairman of the Council<br>Malawi National Council of Sports</div>
      </div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Ivy Chinangwa</div>
        <div class="sig-title">Acting Chief Executive Officer<br>Malawi National Council of Sports</div>
      </div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Chifundo Tenthani</div>
        <div class="sig-title">Chair, Organising Committee<br>BT42.195 km Race 2026</div>
      </div>
    </div>
    <p class="foot">Official certificate of the BT42.195 km Race 2026 · Malawi National Council of Sports</p>
  </div>
</body>
</html>`);
    w.document.close();
  }

  // Expose for optional public use
  window.BT42OpenCertificate = openCertificate;

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
    renderAttendance();
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
