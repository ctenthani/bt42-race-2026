/**
 * Public registration — writes to shared store (Blobs preferred, then JSONBin)
 * POST /.netlify/functions/register
 */

const STORE_NAME = 'bt42-oc-sync';
const STATE_KEY = 'state';

const emptyState = () => ({
  registrations: [],
  payments: {},
  bibs: {},
  finishes: {},
  attendance: {},
  signatures: {},
  suppressedKeys: [],
  updatedAt: null,
  updatedBy: null
});

function corsHeaders() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
}

function json(status, body) {
  return { statusCode: status, headers: corsHeaders(), body: JSON.stringify(body) };
}

function envNonEmpty(name) {
  const v = process.env[name];
  return v && String(v).trim().length > 0 ? String(v).trim() : '';
}

function blobsCredentials() {
  const siteID =
    envNonEmpty('NETLIFY_SITE_ID') ||
    envNonEmpty('SITE_ID') ||
    envNonEmpty('BLOBS_SITE_ID');
  const token =
    envNonEmpty('NETLIFY_BLOBS_TOKEN') ||
    envNonEmpty('NETLIFY_AUTH_TOKEN') ||
    envNonEmpty('BLOBS_TOKEN');
  return { siteID, token, ready: !!(siteID && token) };
}

async function withBlobStore(fn) {
  const { getStore } = require('@netlify/blobs');
  const { siteID, token, ready } = blobsCredentials();
  const store = ready
    ? getStore({ name: STORE_NAME, siteID, token, consistency: 'strong' })
    : getStore({ name: STORE_NAME, consistency: 'strong' });
  return fn(store);
}

async function blobsRead() {
  return withBlobStore(async (store) => {
    const raw = await store.get(STATE_KEY, { type: 'json' });
    if (!raw || typeof raw !== 'object') return emptyState();
    return Object.assign(emptyState(), raw);
  });
}

async function blobsWrite(state) {
  return withBlobStore(async (store) => {
    await store.setJSON(STATE_KEY, state);
  });
}

function jsonbinConfigured() {
  return !!(envNonEmpty('JSONBIN_BIN_ID') && envNonEmpty('JSONBIN_API_KEY'));
}

async function fetchWithTimeout(url, options, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function jsonbinRead() {
  const id = envNonEmpty('JSONBIN_BIN_ID');
  const key = envNonEmpty('JSONBIN_API_KEY');
  const res = await fetchWithTimeout(
    'https://api.jsonbin.io/v3/b/' + id + '/latest',
    { headers: { 'X-Master-Key': key } },
    8000
  );
  if (!res.ok) throw new Error('JSONBin read ' + res.status);
  const data = await res.json();
  return Object.assign(emptyState(), data.record || data || {});
}

async function jsonbinWrite(state) {
  const id = envNonEmpty('JSONBIN_BIN_ID');
  const key = envNonEmpty('JSONBIN_API_KEY');
  const res = await fetchWithTimeout(
    'https://api.jsonbin.io/v3/b/' + id,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': key,
        'X-Bin-Versioning': 'false'
      },
      body: JSON.stringify(state)
    },
    8000
  );
  if (!res.ok) throw new Error('JSONBin write ' + res.status);
}

function keyOf(r) {
  return (
    String(r.phone || '')
      .replace(/\s+/g, '')
      .toLowerCase() +
    '|' +
    String(r.fullName || '')
      .trim()
      .toLowerCase()
  );
}

function normalizeReg(body) {
  return {
    fullName: String(body.fullName || body.name || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
    distance: String(body.distance || '').trim(),
    dob: String(body.dob || '').trim(),
    gender: String(body.gender || '').trim(),
    emergencyName: String(body.emergencyName || '').trim(),
    emergencyPhone: String(body.emergencyPhone || '').trim(),
    club: String(body.club || '').trim(),
    submittedAt: body.submittedAt || new Date().toISOString(),
    ageOnRaceDay: body.ageOnRaceDay != null ? body.ageOnRaceDay : null,
    feeMwk: body.feeMwk != null ? body.feeMwk : null,
    source: 'web-register'
  };
}

async function readState() {
  // Blobs only when credentials exist — do not wait on JSONBin (currently 522)
  if (blobsCredentials().ready) {
    return { state: await blobsRead(), backend: 'blobs' };
  }
  try {
    return { state: await blobsRead(), backend: 'blobs-auto' };
  } catch (e1) {
    if (jsonbinConfigured()) {
      try {
        return { state: await jsonbinRead(), backend: 'jsonbin' };
      } catch (e2) {
        throw new Error('No storage: blobs=' + (e1.message || e1) + ' jsonbin=' + (e2.message || e2));
      }
    }
    throw new Error('No storage backend: ' + (e1.message || e1));
  }
}

async function writeState(state) {
  if (blobsCredentials().ready) {
    await blobsWrite(state);
    return 'blobs';
  }
  try {
    await blobsWrite(state);
    return 'blobs-auto';
  } catch (e1) {
    if (jsonbinConfigured()) {
      await jsonbinWrite(state);
      return 'jsonbin';
    }
    throw e1;
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'Method Not Allowed' });
  }

  if (process.env.REGISTRATION_ENABLED === 'false') {
    return json(403, { ok: false, error: 'Registration is closed' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'Invalid JSON' });
  }

  const reg = normalizeReg(body);
  if (!reg.fullName || !reg.phone || !reg.distance) {
    return json(400, { ok: false, error: 'fullName, phone and distance are required' });
  }

  if (reg.distance === '42.195' && reg.dob) {
    const race = new Date('2026-09-19');
    const dob = new Date(reg.dob);
    let age = race.getFullYear() - dob.getFullYear();
    const m = race.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && race.getDate() < dob.getDate())) age--;
    if (age < 20) {
      return json(400, {
        ok: false,
        error: 'Marathon entrants must be at least 20 years old on 19 September 2026'
      });
    }
    reg.ageOnRaceDay = age;
  }

  try {
    const { state } = await readState();
    const sup = new Set(state.suppressedKeys || []);
    const list = Array.isArray(state.registrations) ? state.registrations.slice() : [];
    const k = keyOf(reg);
    if (sup.has(k)) {
      // Chair previously deleted this person — allow re-register by removing suppress
      state.suppressedKeys = (state.suppressedKeys || []).filter((x) => x !== k);
    }
    const idx = list.findIndex((r) => keyOf(r) === k);
    if (idx >= 0) list[idx] = Object.assign({}, list[idx], reg);
    else list.push(reg);
    state.registrations = list;
    state.updatedAt = new Date().toISOString();
    state.updatedBy = 'register';
    const backend = await writeState(state);
    return json(200, {
      ok: true,
      backend,
      message: 'Registration saved to shared list'
    });
  } catch (err) {
    return json(500, {
      ok: false,
      error: 'Could not save registration',
      detail: err && err.message ? err.message : String(err)
    });
  }
};
