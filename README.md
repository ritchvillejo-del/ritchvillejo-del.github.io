# Ritch Villejo Portfolio — Auto Dude Revamp

A complete corporate-ready redesign focused on:

- Video editing
- Auto Dude Mobile Detailing as the featured company/case study
- WordPress website support
- Local SEO
- GoHighLevel automations
- Interactive 3D-inspired interface and scroll motion

## Run locally

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Deploy to Render

Create a **Web Service** connected to the GitHub repository.

- Build Command: `npm install`
- Start Command: `npm start`
- Node version: 18 or newer

## Main files to edit

- `index.html` — wording, links, portfolio sections, selected videos
- `style.css` — colors, layout, typography, animation styling
- `script.js` — scrolling, interactions, video reel, contact form behavior
- `server.js` — Node/Express contact endpoint
- `assets/profile.png` — main portrait
- `assets/portrait-alt.png` — About section portrait

## Auto Dude logo

The top-right client mark currently loads the public Auto Dude logo from its Linktree image URL. If you later upload the original logo PNG, place it in `assets/` and replace that URL in `index.html` with the local filename.

## Video portfolio

The portfolio uses Google Drive preview embeds. If a video does not appear, confirm that its Drive sharing setting allows viewers with the link to access it.

## Contact form note

Submissions are saved to `messages.json`. This is fine for local testing, but Render's normal filesystem is not intended as permanent message storage. For production, connect the form to email, a database, or a CRM webhook.
