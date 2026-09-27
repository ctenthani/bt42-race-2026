/**
 * Public live results + Find athlete
 */
const STORE_NAME = 'bt42-oc-sync';
const STATE_KEY = 'state';

function json(code, body) {
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function envNonEmpty(name) {
  const v = process.env[name];
  return v && String(v).trim() ? String(v).trim() : '';
}

function emptyState() {
  return { registrations: [], bibs: {}, finishes: {}, payments: {}, updatedAt: null };
}

async function blobsRead() {
  try {
    const { getStore } = require('@netlify/blobs');
    const siteID = envNonEmpty('NETLIFY_SITE_ID') || envNonEmpty('SITE_ID');
    const token = envNonEmpty('NETLIFY_BLOBS_TOKEN') || envNonEmpty('NETLIFY_AUTH_TOKEN');
    const store = siteID && token
      ? getStore({ name: STORE_NAME, siteID, token, consistency: 'strong' })
      : getStore({ name: STORE_NAME, consistency: 'strong' });
    const raw = await store.get(STATE_KEY, { type: 'json' });
    if (!raw || typeof raw !== 'object') return null;
    return Object.assign(emptyState(), raw);
  } catch (e) {
    return null;
  }
}

async function jsonbinRead() {
  const id = envNonEmpty('JSONBIN_BIN_ID');
  const key = envNonEmpty('JSONBIN_API_KEY');
  if (!id || !key) return null;
  try {
    const res = await fetch('https://api.jsonbin.io/v3/b/' + id + '/latest', {
      headers: { 'X-Master-Key': key }
    });
    if (!res.ok) return null;
    const data = await res.json();
    const record = data.record || data;
    if (!record || typeof record !== 'object') return null;
    return Object.assign(emptyState(), record);
  } catch (e) {
    return null;
  }
}

async function fetchForms() {
  const siteID = envNonEmpty('NETLIFY_SITE_ID') || envNonEmpty('SITE_ID');
  const token = envNonEmpty('NETLIFY_AUTH_TOKEN') || envNonEmpty('NETLIFY_BLOBS_TOKEN');
  if (!siteID || !token) return [];
  try {
    const headers = { Authorization: 'Bearer ' + token };
    const fr = await fetch('https://api.netlify.com/api/v1/sites/' + siteID + '/forms', { headers });
    if (!fr.ok) return [];
    const forms = await fr.json();
    const hit = (forms || []).find((f) => f.name === 'bt42-registration' || f.name === 'registration');
    if (!hit) return [];
    const sr = await fetch('https://api.netlify.com/api/v1/forms/' + hit.id + '/submissions?per_page=1000', { headers });
    if (!sr.ok) return [];
    const subs = await sr.json();
    return (subs || []).map((s) => {
      const d = s.data || s;
      return {
        fullName: d.fullName || d.name || d['Full Name'] || '',
        phone: d.phone || d.mobile || '',
        email: d.email || '',
        distance: d.distance || d.race || '',
        submittedAt: s.created_at || '',
        source: 'netlify-forms'
      };
    }).filter((r) => r.fullName);
  } catch (e) {
    return [];
  }
}

function keyOf(r, i) {
  const phone = String(r.phone || r.teamContactPhone || '').replace(/\s+/g, '');
  const name = String(r.fullName || '').trim().toLowerCase();
  if (phone && name) return phone + '|' + name;
  return phone || name || ('idx-' + i);
}

function distCode(d) {
  const s = String(d || '').toLowerCase();
  if (s.indexOf('42') >= 0) return '42.195';
  if (s.indexOf('10') >= 0) return '10';
  if (s.indexOf('5') >= 0) return '5';
  return s || '';
}

function mergeRegs(a, b) {
  const map = new Map();
  (a || []).concat(b || []).forEach((r, i) => {
    const k = keyOf(r, i);
    if (!map.has(k)) map.set(k, r);
    else map.set(k, Object.assign({}, r, map.get(k)));
  });
  return Array.from(map.values());
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*' }, body: '' };
  }
  try {
    let state = (await blobsRead()) || (await jsonbinRead()) || emptyState();
    const forms = await fetchForms();
    const regs = mergeRegs(state.registrations || [], forms);
    const fins = state.finishes || {};
    const bibs = state.bibs || {};
    const rows = regs.map((r, i) => {
      const k = keyOf(r, i);
      const fin = fins[k] || {};
      const bib = (bibs[k] && bibs[k].number) || r.bib || '';
      return {
        name: r.fullName || '',
        email: r.email || r.teamContactEmail || '',
        gender: r.gender || '',
        distance: distCode(r.distance),
        bib: String(bib || ''),
        status: fin.status || 'entered',
        time: fin.time || '',
        at: fin.finishedAt || ''
      };
    }).filter((r) => r.name);
    return json(200, {
      ok: true,
      source: (state.registrations && state.registrations.length) ? 'store+forms' : (forms.length ? 'forms' : 'empty'),
      count: rows.length,
      updatedAt: state.updatedAt || new Date().toISOString(),
      rows
    });
  } catch (e) {
    return json(200, { ok: true, rows: [], error: String(e && e.message ? e.message : e) });
  }
};
