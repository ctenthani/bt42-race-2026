/**
 * Email helper — confirmation, payment, bib, certificates (PDF with MNCS logo)
 */
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function fetchLogoBytes(path) {
  const base = [
    process.env.URL ? process.env.URL.replace(/\/$/, '') : null,
    process.env.DEPLOY_PRIME_URL ? process.env.DEPLOY_PRIME_URL.replace(/\/$/, '') : null,
    'https://btrace.netlify.app'
  ].filter(Boolean);
  for (const b of base) {
    try {
      const res = await fetch(b + path);
      if (res.ok) return Buffer.from(await res.arrayBuffer());
    } catch (e) { /* try next */ }
  }
  return null;
}

async function buildCertificatePdf(opts) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const { width, height } = page.getSize();

  const navy = rgb(0.106, 0.31, 0.447);
  const green = rgb(0.153, 0.682, 0.376);
  const dark = rgb(0.12, 0.12, 0.12);
  const muted = rgb(0.4, 0.4, 0.4);

  // Double border like on-screen cert
  page.drawRectangle({ x: 28, y: 28, width: width - 56, height: height - 56, borderColor: navy, borderWidth: 3 });
  page.drawRectangle({ x: 36, y: 36, width: width - 72, height: height - 72, borderColor: green, borderWidth: 1.5 });

  // Logos: Athletics Malawi far left, MNCS far right
  try {
    const embedOne = async (path) => {
      const bytes = await fetchLogoBytes(path);
      if (!bytes) return null;
      try { return await doc.embedPng(bytes); } catch (e) {
        try { return await doc.embedJpg(bytes); } catch (e2) { return null; }
      }
    };
    const am = await embedOne('/assets/am-logo.png');
    const mncs = await embedOne('/assets/mncs-logo.png');
    const lw = 64;
    if (am) {
      const lh = (am.height / am.width) * lw;
      page.drawImage(am, { x: 48, y: height - 100, width: lw, height: lh });
    }
    if (mncs) {
      const lh = (mncs.height / mncs.width) * lw;
      page.drawImage(mncs, { x: width - 48 - lw, y: height - 100, width: lw, height: lh });
    }
  } catch (e) { /* no logo */ }

  page.drawText('MALAWI NATIONAL COUNCIL OF SPORTS', {
    x: (width - fontBold.widthOfTextAtSize('MALAWI NATIONAL COUNCIL OF SPORTS', 11)) / 2,
    y: height - 118,
    size: 11,
    font: fontBold,
    color: navy
  });
  page.drawText('BT42.195km Race 2026', {
    x: (width - font.widthOfTextAtSize('BT42.195km Race 2026', 12)) / 2,
    y: height - 136,
    size: 12,
    font,
    color: muted
  });

  const title = opts.isCompletion ? 'CERTIFICATE OF COMPLETION' : 'CERTIFICATE OF PARTICIPATION';
  page.drawText(title, {
    x: (width - fontBold.widthOfTextAtSize(title, 26)) / 2,
    y: height - 185,
    size: 26,
    font: fontBold,
    color: navy
  });

  const intro = 'This is to certify that';
  page.drawText(intro, {
    x: (width - font.widthOfTextAtSize(intro, 13)) / 2,
    y: height - 225,
    size: 13,
    font,
    color: dark
  });

  const name = String(opts.fullName || 'Athlete').slice(0, 80);
  const nameSize = name.length > 36 ? 20 : 24;
  page.drawText(name, {
    x: (width - fontBold.widthOfTextAtSize(name, nameSize)) / 2,
    y: height - 265,
    size: nameSize,
    font: fontBold,
    color: dark
  });

  const dist = String(opts.distance || 'race').slice(0, 80);
  let body;
  if (opts.isCompletion) {
    body = opts.finishTime
      ? `has successfully completed the ${dist} of the BT42.195km Race 2026 in a time of ${opts.finishTime}, organised under the auspices of the Malawi National Council of Sports.`
      : `has successfully completed the ${dist} of the BT42.195km Race 2026, organised under the auspices of the Malawi National Council of Sports.`;
  } else {
    body =
      opts.reason && /dnf/i.test(opts.reason)
        ? `was a registered participant in the ${dist} of the BT42.195km Race 2026 (Did Not Finish), organised under the auspices of the Malawi National Council of Sports.`
        : `was a registered participant in the ${dist} of the BT42.195km Race 2026, organised under the auspices of the Malawi National Council of Sports.`;
  }

  const maxW = width - 140;
  const words = body.split(' ');
  let line = '';
  let y = height - 305;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, 12) > maxW) {
      page.drawText(line, {
        x: (width - font.widthOfTextAtSize(line, 12)) / 2,
        y,
        size: 12,
        font,
        color: dark
      });
      y -= 18;
      line = w;
    } else line = test;
  }
  if (line) {
    page.drawText(line, {
      x: (width - font.widthOfTextAtSize(line, 12)) / 2,
      y,
      size: 12,
      font,
      color: dark
    });
  }

  page.drawText('Race day: 19 September 2026  ·  Blantyre, Malawi', {
    x: (width - font.widthOfTextAtSize('Race day: 19 September 2026  ·  Blantyre, Malawi', 11)) / 2,
    y: 150,
    size: 11,
    font,
    color: muted
  });

  const sigY = 78;
  const col = [90, 320, 560];
  const people = [
    ['Jim Kalua', 'Chairman, MNCS'],
    ['Kondwani Chamwala', 'President of Athletics Malawi'],
    ['Chifundo Tenthani', 'Chair, Organising Committee']
  ];
  const peopleFull = [
    ['Jim Kalua', 'Chairman of the Council', 'Malawi National Council of Sports', 'kalua'],
    ['Kondwani Chamwala', 'President of Athletics Malawi', 'Athletics Malawi', 'chamwala'],
    ['Chifundo Tenthani', 'Chair, Organising Committee', 'BT42.195km Race 2026', 'tenthani']
  ];
  const sigImages = opts.signatures || {};
  for (let i = 0; i < peopleFull.length; i++) {
    const p = peopleFull[i];
    const dataUrl = sigImages[p[3]];
    if (dataUrl && typeof dataUrl === 'string' && dataUrl.indexOf('data:image') === 0) {
      try {
        const b64 = dataUrl.split(',')[1];
        const bytes = Buffer.from(b64, 'base64');
        let img;
        if (dataUrl.indexOf('image/png') >= 0) img = await doc.embedPng(bytes);
        else img = await doc.embedJpg(bytes);
        const maxW = 140;
        const maxH = 36;
        let iw = img.width;
        let ih = img.height;
        const scale = Math.min(maxW / iw, maxH / ih, 1);
        iw *= scale;
        ih *= scale;
        page.drawImage(img, {
          x: col[i] + (150 - iw) / 2,
          y: sigY + 34,
          width: iw,
          height: ih
        });
      } catch (e) { /* ignore bad image */ }
    }
    page.drawLine({
      start: { x: col[i], y: sigY + 32 },
      end: { x: col[i] + 160, y: sigY + 32 },
      thickness: 0.8,
      color: muted
    });
    page.drawText(p[0], { x: col[i], y: sigY + 18, size: 10, font: fontBold, color: dark });
    page.drawText(p[1], { x: col[i], y: sigY + 6, size: 8, font, color: muted });
    page.drawText(p[2], { x: col[i], y: sigY - 6, size: 8, font, color: muted });
  }

  return Buffer.from(await doc.save()).toString('base64');
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method Not Allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ ok: false, error: 'Invalid JSON' }) };
  }

  const apiKey = process.env.EMAIL_API_KEY || process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || 'BT42.195km Race <onboarding@resend.dev>';
  if (!apiKey) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, skipped: true, error: 'EMAIL_API_KEY not configured' })
    };
  }

  let type = body.type || 'certificate';
  if (type === 'bib_assigned') type = 'bib';
  if (type === 'payment_verified') type = 'payment';
  if (type === 'participation_certificate') type = 'participation';
  if (type === 'completion_certificate') type = 'completion';
  const to = (body.to || body.email || '').trim();
  const fullName = body.fullName || 'Athlete';
  const distance = body.distance || '';
  const bib = body.bib || '';
  const raceDate = body.raceDate || '19 September 2026';
  const finishTime = body.finishTime || '';
  const reason = body.reason || '';

  if (!to) {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: false, error: 'Recipient email required' }) };
  }

  let subject = 'BT42.195km Race 2026';
  let html = '';
  let attachments = [];

  if (type === 'confirmation') {
    subject = 'Entry received — BT42.195km Race 2026';
    html = `<p>Dear ${esc(fullName)},</p>
<p>Thank you for registering for the <strong>BT42.195km Race</strong> (${esc(distance)}).</p>
<p>Race day: <strong>${esc(raceDate)}</strong>, Blantyre.</p>
<p>Your place is confirmed once payment is received:</p>
<ul>
<li>Bank transfer to account <strong>782637</strong></li>
<li>Reference: <strong>your full name + mobile number</strong></li>
</ul>
<p>You will receive further email when payment is verified and when your bib is assigned.</p>
<p>— Organising Committee, BT42.195km Race</p>`;
  } else if (type === 'bib') {
    subject = body.subject || 'Bib number assigned — BT42.195km Race 2026';
    html = body.html || `<p>Dear ${esc(fullName)},</p>
<p>Your entry for the <strong>BT42.195km Race</strong> (${esc(distance)}) is confirmed.</p>
<p>Your <strong>bib number is ${esc(String(bib))}</strong>.</p>
<p>Race day: <strong>${esc(raceDate)}</strong>.</p>
<p>— Organising Committee, BT42.195km Race</p>`;
  } else if (type === 'payment') {
    subject = body.subject || 'Payment verified — BT42.195km Race 2026';
    html = body.html || `<p>Dear ${esc(fullName)},</p>
<p>We have verified your payment for the <strong>BT42.195km Race</strong> (${esc(distance)}).</p>
<p>Your bib number will be assigned next; watch for another email.</p>
<p>— Organising Committee, BT42.195km Race</p>`;
  } else if (type === 'completion' || type === 'participation' || type === 'certificate' || type === 'completion_certificate') {
    const asCompletion =
      type === 'completion' ||
      type === 'completion_certificate' ||
      !!finishTime ||
      (body.subject || '').toLowerCase().includes('completion');
    const finalCompletion = asCompletion && !(reason && /dnf/i.test(reason));

    subject =
      body.subject ||
      (finalCompletion
        ? 'Certificate of Completion — BT42.195km Race 2026'
        : 'Certificate of Participation — BT42.195km Race 2026');

    html = finalCompletion
      ? `<p>Dear ${esc(fullName)},</p><p>Congratulations on completing the <strong>${esc(distance)}</strong>. Your official certificate is attached as a PDF.</p><p>— Organising Committee, BT42.195km Race</p>`
      : `<p>Dear ${esc(fullName)},</p><p>Thank you for taking part in the <strong>${esc(distance)}</strong>. Your certificate of participation is attached as a PDF.</p><p>— Organising Committee, BT42.195km Race</p>`;

    try {
      const pdfB64 = await buildCertificatePdf({
        fullName,
        distance,
        finishTime,
        reason,
        isCompletion: finalCompletion,
        signatures: body.signatures || {}
      });
      attachments.push({
        filename: finalCompletion
          ? 'BT42-Completion-Certificate.pdf'
          : 'BT42-Participation-Certificate.pdf',
        content: pdfB64
      });
    } catch (e) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: 'PDF generation failed: ' + (e.message || e) })
      };
    }
  } else {
    html = body.html || `<p>Dear ${esc(fullName)},</p><p>Message from BT42.195km Race.</p>`;
  }

  try {
    const payload = { from, to: [to], subject, html };
    if (attachments.length) payload.attachments = attachments;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ ok: false, error: data.message || 'Email provider error', detail: data })
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true, provider: 'resend', id: data.id, pdf: attachments.length > 0 })
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: false, error: err.message || String(err) })
    };
  }
};
