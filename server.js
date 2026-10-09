require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const SUPABASE_URL = String(process.env.SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_SERVICE_ROLE_KEY = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '');
const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '');
const CONTACT_TO_EMAIL = String(process.env.CONTACT_TO_EMAIL || '');
const CONTACT_FROM_EMAIL = String(process.env.CONTACT_FROM_EMAIL || '');
const LOCAL_INQUIRY_FALLBACK = String(process.env.LOCAL_INQUIRY_FALLBACK || (!isProduction ? 'true' : 'false')).toLowerCase() === 'true';

const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
const hasResend = Boolean(RESEND_API_KEY && CONTACT_TO_EMAIL && CONTACT_FROM_EMAIL);

if (isProduction) {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');
app.use(express.json({ limit: '50kb' }));
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// Lightweight security headers. Kept intentionally compatible with the portfolio's external assets.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

// Simple in-memory rate limit for a small portfolio contact form.
// Render's single free instance is a good fit for this. A distributed limiter can replace it later if needed.
const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_MAX = 5;
const rateBuckets = new Map();

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function contactRateLimit(req, res, next) {
  const key = getClientIp(req);
  const now = Date.now();
  const bucket = rateBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(key, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return next();
  }

  bucket.count += 1;
  if (bucket.count > RATE_MAX) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({
      message: 'Too many attempts. Please wait a few minutes and try again.'
    });
  }

  next();
}

function clean(value, maxLength) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s{3,}/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function cleanMessage(value, maxLength) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, maxLength);
}

function isValidEmail(email) {
  if (!email || email.length > 180) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hashForLog(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 12);
}

const allowedServices = new Set([
  'GoHighLevel Workflow Build',
  'CRM Audit & Cleanup',
  'Lead Nurture & Reactivation',
  'Pipeline & Routing Setup',
  'Missed Call / Conversation Recovery',
  'Ongoing GHL Support',
  'Video Editing & Content Production',
  'Website / SEO Support',
  'Other'
]);

async function saveToSupabase(inquiry) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/portfolio_inquiries`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify({
      name: inquiry.name,
      email: inquiry.email,
      company: inquiry.company || null,
      service: inquiry.service,
      message: inquiry.message,
      source: 'portfolio',
      status: 'new',
      submitted_at: inquiry.submittedAt
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Supabase insert failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

async function sendWithResend(inquiry) {
  const safeName = escapeHtml(inquiry.name);
  const safeEmail = escapeHtml(inquiry.email);
  const safeCompany = escapeHtml(inquiry.company || 'Not provided');
  const safeService = escapeHtml(inquiry.service);
  const safeMessage = escapeHtml(inquiry.message).replace(/\n/g, '<br>');

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: CONTACT_FROM_EMAIL,
      to: [CONTACT_TO_EMAIL],
      reply_to: inquiry.email,
      subject: `New portfolio inquiry: ${inquiry.service} — ${inquiry.name}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:auto;color:#1f1f1f;line-height:1.6">
          <div style="border-bottom:3px solid #318df5;padding-bottom:14px;margin-bottom:20px">
            <h2 style="margin:0">New Portfolio Inquiry</h2>
            <p style="margin:5px 0 0;color:#666">Submitted from Ritch's GoHighLevel portfolio contact form</p>
          </div>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Company / Brand:</strong> ${safeCompany}</p>
          <p><strong>Service:</strong> ${safeService}</p>
          <p><strong>Message:</strong></p>
          <div style="background:#f5f5f5;border-radius:12px;padding:16px">${safeMessage}</div>
          <p style="font-size:12px;color:#777;margin-top:22px">Reply directly to this email to respond to ${safeName}.</p>
        </div>
      `,
      text: [
        'NEW PORTFOLIO INQUIRY',
        '',
        `Name: ${inquiry.name}`,
        `Email: ${inquiry.email}`,
        `Company / Brand: ${inquiry.company || 'Not provided'}`,
        `Service: ${inquiry.service}`,
        '',
        'Message:',
        inquiry.message
      ].join('\n')
    })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Resend delivery failed (${response.status}): ${detail.slice(0, 300)}`);
  }
}

function saveLocalFallback(inquiry) {
  const dataDir = path.join(__dirname, '.local-data');
  const file = path.join(dataDir, 'inquiries.json');
  fs.mkdirSync(dataDir, { recursive: true });

  let rows = [];
  if (fs.existsSync(file)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (Array.isArray(parsed)) rows = parsed;
    } catch {
      rows = [];
    }
  }

  rows.push(inquiry);
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
}

app.post('/api/contact', contactRateLimit, async (req, res) => {
  // Honeypot. Real visitors never see or fill this field.
  if (clean(req.body.website, 200)) {
    return res.status(200).json({ message: 'Thanks. Your project inquiry has been sent.' });
  }

  const name = clean(req.body.name, 120);
  const email = clean(req.body.email, 180).toLowerCase();
  const company = clean(req.body.company, 160);
  const service = clean(req.body.service, 120);
  const message = cleanMessage(req.body.message, 5000);
  const startedAt = Number(req.body.started_at || 0);

  if (!name || !email || !service || !message) {
    return res.status(400).json({ message: 'Please complete all required fields.' });
  }

  if (name.length < 2) {
    return res.status(400).json({ message: 'Please enter your name.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address.' });
  }

  if (!allowedServices.has(service)) {
    return res.status(400).json({ message: 'Please select a valid service.' });
  }

  if (message.length < 20) {
    return res.status(400).json({ message: 'Please add a little more detail about your project.' });
  }

  // Very fast submits are usually automated. Do not expose that classification publicly.
  if (startedAt && Date.now() - startedAt < 1800) {
    return res.status(200).json({ message: 'Thanks. Your project inquiry has been sent.' });
  }

  const inquiry = {
    name,
    email,
    company,
    service,
    message,
    submittedAt: new Date().toISOString()
  };

  let stored = false;
  let emailed = false;
  const failures = [];

  if (hasSupabase) {
    try {
      await saveToSupabase(inquiry);
      stored = true;
    } catch (error) {
      failures.push(error);
      console.error('[contact:supabase]', error.message);
    }
  }

  if (hasResend) {
    try {
      await sendWithResend(inquiry);
      emailed = true;
    } catch (error) {
      failures.push(error);
      console.error('[contact:resend]', error.message);
    }
  }

  if (!stored && !emailed && LOCAL_INQUIRY_FALLBACK) {
    try {
      saveLocalFallback(inquiry);
      stored = true;
      console.warn('[contact] Saved using local development fallback. Configure Supabase/Resend before production.');
    } catch (error) {
      failures.push(error);
      console.error('[contact:local]', error.message);
    }
  }

  if (!stored && !emailed) {
    console.error('[contact] Delivery unavailable', {
      request: hashForLog(`${email}:${Date.now()}`),
      supabaseConfigured: hasSupabase,
      resendConfigured: hasResend,
      failures: failures.map((error) => error.message)
    });

    return res.status(503).json({
      message: 'The contact service is temporarily unavailable. Please email me directly instead.'
    });
  }

  return res.status(200).json({
    message: 'Thanks. Your project inquiry has been sent.'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    databaseConfigured: hasSupabase,
    emailConfigured: hasResend,
    localFallback: LOCAL_INQUIRY_FALLBACK && !isProduction
  });
});

// Do not expose backend/configuration files through the static web server.
const blockedStaticFiles = new Set([
  '/server.js',
  '/package.json',
  '/package-lock.json',
  '/README.md',
  '/render.yaml',
  '/supabase.sql',
  '/.gitignore',
  '/.env',
  '/.env.example'
]);

app.use((req, res, next) => {
  if (blockedStaticFiles.has(req.path) || req.path.startsWith('/.local-data/')) {
    return res.status(404).send('Not found.');
  }
  next();
});

app.use(express.static(__dirname, {
  dotfiles: 'ignore',
  extensions: ['html'],
  maxAge: isProduction ? '1h' : 0
}));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ message: 'Not found.' });
  }
  return res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
  console.log(`Supabase: ${hasSupabase ? 'configured' : 'not configured'}`);
  console.log(`Email: ${hasResend ? 'configured' : 'not configured'}`);
  if (LOCAL_INQUIRY_FALLBACK && !isProduction) {
    console.log('Local inquiry fallback: enabled');
  }
});
