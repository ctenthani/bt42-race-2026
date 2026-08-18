/**
 * Email helper — confirmation, payment, bib, certificates (PDF attachment)
 * POST /.netlify/functions/send-certificate
 * Env: EMAIL_API_KEY or RESEND_API_KEY, EMAIL_FROM
 */
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function buildCertificatePdf(opts) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([842, 595]); // A4 landscape
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const { width, height } = page.getSize();

  const title = opts.isCompletion ? 'Certificate of Completion' : 'Certificate of Participation';
  const navy = rgb(0.106, 0.31, 0.447);
  const green = rgb(0.153, 0.682, 0.376);
  const dark = rgb(0.1, 0.1, 0.1);
  const muted = rgb(0.35, 0.35, 0.35);

  // Border
  page.drawRectangle({
    x: 24,
    y: 24,
    width: width - 48,
    height: height - 48,
    borderColor: navy,
    borderWidth: 2
  });
  page.drawRectangle({
    x: 32,
    y: 32,
    width: width - 64,
    height: height - 64,
    borderColor: green,
    borderWidth: 1
  });

  page.drawText('BT42.195km Race 2026', {
    x: 60,
    y: height - 70,
    size: 14,
    font: fontBold,
    color: navy
  });
  page.drawText('Malawi National Council of Sports', {
    x: 60,
    y: height - 90,
    size: 11,
    font,
    color: muted
  });

  const titleWidth = fontBold.widthOfTextAtSize(title, 28);
  page.drawText(title, {
    x: (width - titleWidth) / 2,
    y: height - 150,
    size: 28,
    font: fontBold,
    color: navy
  });

  const line1 = 'This is to certify that';
  page.drawText(line1, {
    x: (width - font.widthOfTextAtSize(line1, 14)) / 2,
    y: height - 200,
    size: 14,
    font,
    color: dark
  });

  const name = String(opts.fullName || 'Athlete').slice(0, 80);
  const nameSize = name.length > 40 ? 22 : 26;
  page.drawText(name, {
    x: (width - fontBold.widthOfTextAtSize(name, nameSize)) / 2,
    y: height - 245,
    size: nameSize,
    font: fontBold,
    color: dark
  });

  const dist = String(opts.distance || '').slice(0, 60);
  let body;
  if (opts.isCompletion) {
    body = opts.finishTime
      ? `has successfully completed the ${dist} on 19 September 2026 in a time of ${opts.finishTime}.`
      : `has successfully completed the ${dist} on 19 September 2026.`;
  } else {
    body =
      opts.reason && opts.reason.includes('DNF')
        ? `was a registered participant in the ${dist} (Did Not Finish) on 19 September 2026.`
        : `was a registered participant in the ${dist} on 19 September 2026.`;
  }

  // Simple word wrap
  const maxW = width - 120;
  const words = body.split(' ');
  let line = '';
  let y = height - 290;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (font.widthOfTextAtSize(test, 13) > maxW) {
      page.drawText(line, {
        x: (width - font.widthOfTextAtSize(line, 13)) / 2,
        y,
        size: 13,
        font,
        color: dark
      });
      y -= 20;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) {
    page.drawText(line, {
      x: (width - font.widthOfTextAtSize(line, 13)) / 2,
      y,
      size: 13,
      font,
      color: dark
    });
  }

  page.drawText('Blantyre, Malawi  ·  Organised under the Malawi National Council of Sports', {
    x: 60,
    y: 120,
    size: 10,
    font,
    color: muted
  });

  const sigY = 70;
  page.drawText('Jim Kalua', { x: 80, y: sigY + 18, size: 10, font: fontBold, color: dark });
  page.drawText('Chairman, MNCS', { x: 80, y: sigY, size: 9, font, color: muted });

  page.drawText('Ivy Chinangwa', { x: 320, y: sigY + 18, size: 10, font: fontBold, color: dark });
  page.drawText('Acting CEO, MNCS', { x: 320, y: sigY, size: 9, font, color: muted });

  page.drawText('Chifundo Tenthani', { x: 560, y: sigY + 18, size: 10, font: fontBold, color: dark });
  page.drawText('OC Chair', { x: 560, y: sigY, size: 9, font, color: muted });

  const bytes = await doc.save();
  return Buffer.from(bytes).toString('base64');
}

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
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

  const type = body.type || 'certificate';
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
    html = `<p>Dear ${esc(fullName)},</p><p>Thank you for registering for the <strong>BT42.195km Race</strong> (${esc(distance)}).</p><p>Race day: <strong>${esc(raceDate)}</strong>, Blantyre.</p><p>Pay via TNM Mpamba <code>*444#</code> → 4 → <code>500204</code> or NBM <code>1802283</code>.</p><p>— Organising Committee</p>`;
  } else if (type === 'bib') {
    subject = 'Bib number assigned — BT42.195km Race 2026';
    html = `<p>Dear ${esc(fullName)},</p><p>Your bib number is <strong>${esc(String(bib))}</strong> for the ${esc(distance)}.</p><p>— Organising Committee</p>`;
  } else if (type === 'payment') {
    subject = 'Payment verified — BT42.195km Race 2026';
    html = `<p>Dear ${esc(fullName)},</p><p>Your payment for the ${esc(distance)} has been verified.</p><p>— Organising Committee</p>`;
  } else {
    // Certificate types — attach PDF
    const isCompletion =
      type === 'completion' ||
      type === 'completion_certificate' ||
      (body.subject || '').toLowerCase().includes('completion') ||
      !!finishTime;
    const isParticipation =
      type === 'participation' ||
      (body.subject || '').toLowerCase().includes('participation') ||
      !!reason;

    const completion = isCompletion && !isParticipation ? true : isCompletion && !reason;
    // Prefer explicit flags
    let asCompletion = type === 'completion' || type === 'completion_certificate';
    if (type === 'certificate' && body.subject) {
      asCompletion = /completion/i.test(body.subject);
    }
    if (finishTime) asCompletion = true;
    if (reason && /dnf/i.test(reason)) asCompletion = false;

    subject =
      body.subject ||
      (asCompletion
        ? 'Certificate of Completion — BT42.195km Race 2026'
        : 'Certificate of Participation — BT42.195km Race 2026');

    html = asCompletion
      ? `<p>Dear ${esc(fullName)},</p><p>Congratulations on completing the <strong>${esc(distance)}</strong>. Your certificate is attached as a PDF.</p><p>— Organising Committee, BT42.195km Race</p>`
      : `<p>Dear ${esc(fullName)},</p><p>Thank you for participating in the <strong>${esc(distance)}</strong>. Your certificate of participation is attached as a PDF.</p><p>— Organising Committee, BT42.195km Race</p>`;

    try {
      const pdfB64 = await buildCertificatePdf({
        fullName,
        distance,
        finishTime,
        reason,
        isCompletion: asCompletion
      });
      attachments.push({
        filename: asCompletion
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
  }

  try {
    const payload = {
      from,
      to: [to],
      subject,
      html
    };
    if (attachments.length) payload.attachments = attachments;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json'
      },
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
