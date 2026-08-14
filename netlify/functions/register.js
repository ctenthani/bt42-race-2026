/**
 * Public registration endpoint — any device can submit; writes to shared store.
 * POST /.netlify/functions/register
 * Body: JSON registration fields (fullName, phone, email, distance, dob, ...)
 *
 * Uses same storage as oc-sync (JSONBin preferred, then Blobs with credentials).
 * Does NOT require OC_SYNC_TOKEN (public form). Optional: REGISTRATION_ENABLED=false to close.
 */

const emptyState = () => ({
  registrations: [],
  payments: {},
  bibs: {},
  finishes: {},
  attendance: {},
  signatures: {},
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

function jsonbinConfigured() {
  return !!(process.env.JSONBIN_BIN_ID && process.env.JSONBIN_API_KEY);
}

async function jsonbinRead() {
  const id = process.env.JSONBIN_BIN_ID;
  const key = process.env.JSONBIN_API_KEY;
  const res = await fetch('https://api.jsonbin.io/v3/b/' + id + '/latest', {
    headers: { 'X-Master-Key': key }
  });
  if (!res.ok) throw new Error('JSONBin read ' + res.status);
  const data = await res.json();
  return Object.assign(emptyState(), data.record || data || {});
}

async function jsonbinWrite(state) {
  const id = process.env.JSONBIN_BIN_ID;
  const key = process.env.JSONBIN_API_KEY;
  const res = await fetch('https://api.jsonbin.io/v3/b/' + id, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': key,
      'X-Bin-Versioning': 'false'
    },
    body: JSON.stringify(state)
  });
  if (!res.ok) throw new Error('JSONBin write ' + res.status);
}

function blobsReady() {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.BLOBS_SITE_ID || '';
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.BLOBS_TOKEN ||
    '';
  return !!(siteID && token);
}

async function blobsReadWrite(mutator) {
  const { getStore } = require('@netlify/blobs');
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || process.env.BLOBS_SITE_ID;
  const token =
    process.env.NETLIFY_BLOBS_TOKEN ||
    process.env.NETLIFY_AUTH_TOKEN ||
    process.env.BLOBS_TOKEN;
  const store = getStore({
    name: 'bt42-oc-sync',
    consistency: 'strong',
    siteID,
    token
  });
  const raw = await store.get('state', { type: 'json' });
  const state = Object.assign(emptyState(), raw || {});
  const next = mutator(state);
  await store.setJSON('state', next);
  return next;
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

  if (!jsonbinConfigured() && !blobsReady()) {
    return json(503, {
      ok: false,
      error:
        'Shared storage not configured. Set JSONBIN_BIN_ID + JSONBIN_API_KEY on Netlify (or Blobs credentials), then redeploy.'
    });
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

  // Marathon age rule (server-side)
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
    const append = (state) => {
      const list = Array.isArray(state.registrations) ? state.registrations.slice() : [];
      const k = keyOf(reg);
      const idx = list.findIndex((r) => keyOf(r) === k);
      if (idx >= 0) list[idx] = Object.assign({}, list[idx], reg);
      else list.push(reg);
      state.registrations = list;
      state.updatedAt = new Date().toISOString();
      state.updatedBy = 'register';
      return state;
    };

    let backend = 'jsonbin';
    if (jsonbinConfigured()) {
      const state = await jsonbinRead();
      await jsonbinWrite(append(state));
    } else {
      backend = 'blobs';
      await blobsReadWrite(append);
    }

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
