/**
 * Email helper — entry confirmation, bib assignment, certificates
 * POST /.netlify/functions/send-certificate
 * Env: EMAIL_API_KEY or RESEND_API_KEY, EMAIL_FROM
 */
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }
  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'BT42.195km Race <onboarding@resend.dev>';
  if (!apiKey) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ ok: false, skipped: true, error: 'EMAIL_API_KEY not configured. Email not sent.' })
    };
  }
  const type = body.type || 'certificate';
  const to = body.to || body.email;
  const fullName = body.fullName || 'Athlete';
  const distance = body.distance || '';
  const bib = body.bib || '';
  const raceDate = body.raceDate || '19 September 2026';
  if (!to) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: false, error: 'Recipient email required' }) };
  }
  const esc = (s) => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  let subject = 'BT42.195km Race 2026';
  let html = '';
  if (type === 'confirmation') {
    subject = 'Entry received — BT42.195km Race 2026';
    html = `<p>Dear ${esc(fullName)},</p><p>Thank you for registering for the <strong>BT42.195km Race</strong> (${esc(distance)}).</p><p>Race day: <strong>${esc(raceDate)}</strong>, Blantyre.</p><p>Your place is confirmed once payment is received:</p><ul><li>TNM Mpamba: *444# → 4 → code <strong>500204</strong></li><li>National Bank of Malawi: <strong>1802283</strong> (reference: your name + mobile)</li></ul><p>You will receive further email when payment is verified and when your bib is assigned.</p><p>— Organising Committee, BT42.195km Race</p>`;
  } else if (type === 'bib') {
    subject = 'Bib number assigned — BT42.195km Race 2026';
    html = `<p>Dear ${esc(fullName)},</p><p>Your entry for the <strong>BT42.195km Race</strong> (${esc(distance)}) is confirmed.</p><p>Your <strong>bib number is ${esc(String(bib))}</strong>.</p><p>Race day: <strong>${esc(raceDate)}</strong>.</p><p>— Organising Committee, BT42.195km Race</p>`;
  } else if (type === 'payment') {
    subject = 'Payment verified — BT42.195km Race 2026';
    html = `<p>Dear ${esc(fullName)},</p><p>We have verified your payment for the <strong>BT42.195km Race</strong> (${esc(distance)}).</p><p>Your bib number will be assigned next.</p><p>— Organising Committee, BT42.195km Race</p>`;
  } else {
    subject = body.subject || 'Certificate — BT42.195km Race 2026';
    html = body.certificateHtml || body.html || `<p>Dear ${esc(fullName)},</p><p>Your certificate for the BT42.195km Race.</p>`;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { statusCode: 502, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: data.message || 'Email provider error', detail: data }) };
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: true, provider: 'resend', id: data.id }) };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ ok: false, error: err.message || String(err) }) };
  }
};
