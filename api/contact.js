const nodemailer = require('nodemailer');
const { parse: parseQuery } = require('querystring');

const MAX_BODY_BYTES = 32 * 1024;

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function wantsJson(req) {
  const accept = req.headers.accept || '';
  return accept.includes('application/json');
}

function redirect(res, location) {
  res.statusCode = 303;
  res.setHeader('Location', location);
  res.end();
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (Buffer.byteLength(raw) > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(raw));
    req.on('error', reject);
  });
}

async function readForm(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }

  const raw = typeof req.body === 'string' ? req.body : await readRawBody(req);
  const contentType = req.headers['content-type'] || '';

  if (contentType.includes('application/json')) {
    return JSON.parse(raw || '{}');
  }

  return parseQuery(raw);
}

function clean(value) {
  return String(value || '').trim();
}

module.exports = async function contactHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    const form = await readForm(req);

    if (clean(form._honey)) {
      if (wantsJson(req)) {
        res.status(200).json({ ok: true });
      } else {
        redirect(res, '/thank-you.html');
      }
      return;
    }

    const name = clean(form.name);
    const email = clean(form.email);
    const business = clean(form.business);
    const selectedPackage = clean(form.package);
    const message = clean(form.message);
    const source = clean(form.source) || 'saleel.ca contact form';

    if (!name || !email || !email.includes('@')) {
      res.status(400).json({ ok: false, error: 'Name and a valid email are required.' });
      return;
    }

    const smtpUser = process.env.GMAIL_USER;
    const smtpPass = process.env.GMAIL_APP_PASSWORD;

    if (!smtpUser || !smtpPass) {
      console.error('Missing Gmail SMTP environment variables');
      res.status(500).json({ ok: false, error: 'Email service is not configured.' });
      return;
    }

    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT || 465);
    const to = process.env.CONTACT_TO || 'info@saleel.ca';
    const from = process.env.MAIL_FROM || smtpUser;

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const subject = `New Saleel inquiry from ${name}`;
    const text = [
      'New Saleel website inquiry',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Business: ${business || '-'}`,
      `Interested in: ${selectedPackage || '-'}`,
      `Source: ${source}`,
      '',
      'Message:',
      message || '-',
    ].join('\n');

    const html = `
      <h2>New Saleel website inquiry</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse: collapse;">
        <tr><td><strong>Name</strong></td><td>${escapeHtml(name)}</td></tr>
        <tr><td><strong>Email</strong></td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
        <tr><td><strong>Business</strong></td><td>${escapeHtml(business || '-')}</td></tr>
        <tr><td><strong>Interested in</strong></td><td>${escapeHtml(selectedPackage || '-')}</td></tr>
        <tr><td><strong>Source</strong></td><td>${escapeHtml(source)}</td></tr>
      </table>
      <h3>Message</h3>
      <p>${escapeHtml(message || '-').replace(/\n/g, '<br>')}</p>
    `;

    await transporter.sendMail({
      to,
      from: `"Saleel Website" <${from}>`,
      replyTo: email,
      subject,
      text,
      html,
    });

    if (wantsJson(req)) {
      res.status(200).json({ ok: true });
    } else {
      redirect(res, '/thank-you.html');
    }
  } catch (error) {
    console.error('Contact form failed:', error);
    res.status(500).json({ ok: false, error: 'Unable to send message right now.' });
  }
};
