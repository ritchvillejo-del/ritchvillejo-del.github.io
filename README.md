# Ritch Villejo — GoHighLevel Specialist Portfolio

A GHL-first portfolio focused on CRM automation, lead intake, speed-to-lead, nurture, reactivation, missed-call recovery, qualification, and pipeline operations. Supporting capabilities include WordPress, SEO, and video editing.

The portfolio includes real GoHighLevel workflow screenshots and embedded Google Drive video samples.

This version includes a real Node.js + Express contact backend.

## What the backend does

When a visitor submits the contact form, the server:

1. Validates all required fields on the server.
2. Checks a hidden honeypot field and a minimum-submit-time signal for basic bot filtering.
3. Rate-limits repeated contact attempts.
4. Saves the inquiry to Supabase when configured.
5. Sends an email notification through Resend when configured.
6. Shows only friendly errors to visitors. Technical details stay in server logs.
7. Uses a local `.local-data/inquiries.json` fallback while developing locally if no external integrations are configured.

For production, configure both Supabase and Resend. The application succeeds if at least one delivery path works, so an email outage does not automatically lose an inquiry that was already saved to Supabase.

## 1. Run locally

Install Node.js 18+.

```bash
npm install
```

Copy `.env.example` to `.env`:

```bash
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Then:

```bash
npm start
```

Open:

```text
http://localhost:3000
```

Check backend status:

```text
http://localhost:3000/health
```

Without Supabase or Resend credentials, local development still stores successful submissions in:

```text
.local-data/inquiries.json
```

That local file is ignored by Git.

## 2. Create the Supabase table

1. Create a Supabase project.
2. Open **SQL Editor**.
3. Paste and run `supabase.sql` from this repository.
4. Go to **Project Settings > API**.
5. Copy your Project URL and service-role key.

Set:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

**Never place the service-role key in `index.html` or `script.js`. It belongs only in server environment variables.**

## 3. Configure Resend email notifications

1. Create a Resend account.
2. Add and verify a sending domain.
3. Create an API key.
4. Decide which email address should receive portfolio inquiries.

Set:

```text
RESEND_API_KEY=re_xxxxxxxxx
CONTACT_TO_EMAIL=your-email@example.com
CONTACT_FROM_EMAIL=Portfolio <contact@your-verified-domain.com>
```

The email uses the visitor's address as `Reply-To`, so pressing Reply in your inbox responds directly to the lead.

## 4. Deploy to Render

Push this whole folder to GitHub, including:

- `server.js`
- `package.json`
- `index.html`
- `style.css`
- `script.js`
- `assets/`
- `supabase.sql`
- `render.yaml`

Do **not** commit `.env`.

### Option A — Render Blueprint

In Render:

1. **New > Blueprint**
2. Select your GitHub repository.
3. Render reads `render.yaml`.
4. Enter the requested secret environment variables.
5. Deploy.

### Option B — Manual Web Service

Use:

```text
Runtime: Node
Build Command: npm install
Start Command: npm start
Health Check Path: /health
```

Add these Environment Variables in Render:

```text
NODE_ENV=production
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
RESEND_API_KEY=...
CONTACT_TO_EMAIL=...
CONTACT_FROM_EMAIL=...
```

Do not enable the local file fallback on Render.

## 5. Test after deployment

Open:

```text
https://YOUR-RENDER-SITE.onrender.com/health
```

A fully configured installation should report:

```json
{
  "status": "ok",
  "databaseConfigured": true,
  "emailConfigured": true,
  "localFallback": false
}
```

Then submit a real test from the contact form and confirm:

- A new row appears in `portfolio_inquiries` in Supabase.
- An email arrives at `CONTACT_TO_EMAIL`.
- The website shows the success confirmation.

## Contact form fields

The form collects:

- Name
- Email
- Company / Brand (optional)
- Requested service
- Project details

The hidden anti-spam fields are not visible to normal visitors.
