/**
 * Shared OC data sync — Netlify Blobs
 *
 * GET  /.netlify/functions/oc-sync
 *   Headers: x-oc-token: <OC_SYNC_TOKEN>
 *   Returns full shared state
 *
 * POST /.netlify/functions/oc-sync
 *   Headers: x-oc-token, x-oc-role: chair|committee
 *   Body: partial state to merge
 *   - payments: chair only
 *   - registrations, bibs, finishes: chair or committee
 *   - signatures: chair only
 *
 * Env: OC_SYNC_TOKEN (required in production)
 */

const { getStore } = require('@netlify/blobs');

const STORE_NAME = 'bt42-oc-sync';
const STATE_KEY = 'state';

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
    'Access-Control-Allow-Headers': 'Content-Type, x-oc-token, x-oc-role',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };
}

function unauthorized() {
  return {
    statusCode: 401,
    headers: corsHeaders(),
    body: JSON.stringify({ ok: false, error: 'Unauthorized' })
  };
}

function getToken(event) {
  const h = event.headers || {};
  return h['x-oc-token'] || h['X-Oc-Token'] || '';
}

function getRole(event) {
  const h = event.headers || {};
  const r = (h['x-oc-role'] || h['X-Oc-Role'] || 'committee').toLowerCase();
  return r === 'chair' ? 'chair' : 'committee';
}

async function readState(store) {
  try {
    const raw = await store.get(STATE_KEY, { type: 'json' });
    if (!raw || typeof raw !== 'object') return emptyState();
    return Object.assign(emptyState(), raw);
  } catch {
    return emptyState();
  }
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(), body: '' };
  }

  const expected = process.env.OC_SYNC_TOKEN || '';
  // Allow empty token only in non-production for local tests
  const token = getToken(event);
  if (expected && token !== expected) {
    return unauthorized();
  }
  if (!expected && process.env.CONTEXT === 'production') {
    return {
      statusCode: 503,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: false,
        error: 'OC_SYNC_TOKEN not configured on Netlify'
      })
    };
  }

  let store;
  try {
    store = getStore(STORE_NAME);
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({
        ok: false,
        error: 'Blob store unavailable',
        detail: String(err && err.message ? err.message : err)
      })
    };
  }

  if (event.httpMethod === 'GET') {
    const state = await readState(store);
    // Never return signature image blobs to committee — strip if not chair
    const role = getRole(event);
    if (role !== 'chair' && state.signatures) {
      state.signatures = {
        kalua: !!state.signatures.kalua,
        chinangwa: !!state.signatures.chinangwa,
        tenthani: !!state.signatures.tenthani,
        _presentOnly: true
      };
    }
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true, state })
    };
  }

  if (event.httpMethod === 'POST') {
    const role = getRole(event);
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ ok: false, error: 'Invalid JSON' })
      };
    }

    const current = await readState(store);
    const next = Object.assign({}, current);

    // Registrations: merge by phone+name key (append new)
    if (Array.isArray(body.registrations)) {
      const keyOf = (r) =>
        String(r.phone || '')
          .replace(/\s+/g, '')
          .toLowerCase() +
        '|' +
        String(r.fullName || '')
          .trim()
          .toLowerCase();
      const map = new Map();
      (current.registrations || []).forEach((r) => map.set(keyOf(r), r));
      body.registrations.forEach((r) => {
        const k = keyOf(r);
        if (!map.has(k)) map.set(k, r);
        else map.set(k, Object.assign({}, map.get(k), r));
      });
      next.registrations = Array.from(map.values());
    }

    // Payments: Chair only
    if (body.payments && typeof body.payments === 'object') {
      if (role !== 'chair') {
        return {
          statusCode: 403,
          headers: corsHeaders(),
          body: JSON.stringify({ ok: false, error: 'Only Chair can update payments' })
        };
      }
      next.payments = Object.assign({}, current.payments || {}, body.payments);
    }

    // Bibs & finishes: committee + chair
    if (body.bibs && typeof body.bibs === 'object') {
      next.bibs = Object.assign({}, current.bibs || {}, body.bibs);
    }
    if (body.finishes && typeof body.finishes === 'object') {
      next.finishes = Object.assign({}, current.finishes || {}, body.finishes);
    }
    if (body.attendance && typeof body.attendance === 'object') {
      next.attendance = Object.assign({}, current.attendance || {}, body.attendance);
    }

    // Signatures: Chair only
    if (body.signatures && typeof body.signatures === 'object') {
      if (role !== 'chair') {
        return {
          statusCode: 403,
          headers: corsHeaders(),
          body: JSON.stringify({ ok: false, error: 'Only Chair can update signatures' })
        };
      }
      next.signatures = Object.assign({}, current.signatures || {}, body.signatures);
    }

    next.updatedAt = new Date().toISOString();
    next.updatedBy = role;

    await store.setJSON(STATE_KEY, next);

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({ ok: true, state: next })
    };
  }

  return {
    statusCode: 405,
    headers: corsHeaders(),
    body: JSON.stringify({ ok: false, error: 'Method Not Allowed' })
  };
};
