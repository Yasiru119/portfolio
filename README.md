# YW Designs — Website + Admin Panel

A full website for YW Designs (Yasiru Pabasara) with a real backend and a
password-protected admin panel — no code editing needed to update content.

## What's included

- **Public site** (`public/index.html`) — the premium dark portfolio site.
  All content (contact info, socials, portfolio projects, testimonials) is
  pulled live from the backend, not hardcoded.
- **Backend** (`server/`) — a small Node.js/Express server that stores data
  in a simple JSON file (`data/site-data.json`) and handles the contact form.
- **Admin panel** (`public/admin/`) — log in at `/admin` to:
  - View and manage contact form messages
  - Add/edit/delete portfolio projects (with image upload)
  - Add/edit/delete testimonials
  - Update phone, WhatsApp, email, website, location, and social links
  - Change the admin password

## 1. Run it locally

```bash
npm install
npm start
```

Then open:
- Site: http://localhost:3000
- Admin: http://localhost:3000/admin

**Your admin login:**
- Username: `admin`
- Password: `YWDesigns8244`

⚠️ **Change this password the first time you log in** (Admin panel → Account tab).
It's currently stored as a bcrypt hash in `.env` — never commit that file
with real secrets to a public repo.

## 2. Before you publish — checklist

- [ ] Log in to `/admin` and change the password immediately
- [ ] Fill in your remaining contact details in **Site Settings** (website URL,
      location, social links)
- [ ] Replace the 9 placeholder portfolio entries with your real projects
      and images (Portfolio tab → Edit → upload image)
- [ ] Replace the 3 placeholder testimonials with real client quotes
- [ ] Once your site has a live URL, put it in **Site Settings → Website**,
      and generate a real QR code pointing to that URL (any free QR
      generator, e.g. qr-code-generator.com) to replace the QR icon in the
      Contact section of `public/index.html`
- [ ] Set a strong, random `SESSION_SECRET` in `.env` (see below)
- [ ] Set up regular backups of `data/site-data.json` and `public/uploads/`
      (see "Data & backups" below)

## 3. Generating a new admin password hash

If you ever need to reset the password manually instead of using the
Account tab, run:

```bash
node -e "console.log(require('bcryptjs').hashSync('YOUR_NEW_PASSWORD', 10))"
```

Copy the output into `ADMIN_PASSWORD_HASH` in `.env`, then restart the server.

## 4. Deploying it live

This is a standard Node.js app, so it runs on almost any host. Two easy,
free-tier-friendly options:

### Option A — Render.com (recommended, easiest)
1. Push this project to a GitHub repository (the `.gitignore` already
   excludes `node_modules` and `.env`).
2. On [render.com](https://render.com), click **New → Web Service**, connect
   your repo.
3. Build command: `npm install` — Start command: `npm start`
4. Under **Environment**, add the variables from `.env.example`
   (`ADMIN_USER`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `PORT`).
5. Deploy. Render gives you a live `https://yourapp.onrender.com` URL.

**Important:** Render's free tier has an *ephemeral filesystem* — if the
service restarts, anything written to `data/site-data.json` or
`public/uploads/` after deploy could be lost. For a low-traffic portfolio
site this is usually fine short-term, but for anything serious, upgrade to a
paid instance with a persistent disk, or use Render's "Disks" add-on.

### Option B — Railway.app
Same idea as Render: connect the repo, set the same environment variables,
and Railway supports persistent volumes on paid plans if you want the
uploads/data folder to survive restarts.

### Domain & SSL
Both Render and Railway give you free HTTPS out of the box and let you
attach your own custom domain (e.g. `www.ywdesigns.com`) once you buy one
from any registrar (Namecheap, GoDaddy, etc.) — just point a CNAME record at
the host they give you.

## 5. Data & backups

Everything lives in one file: `data/site-data.json`. Back it up
periodically (copy it somewhere safe) especially before redeploying on a
host with an ephemeral filesystem. Uploaded portfolio images live in
`public/uploads/` — back that folder up too.

## 6. Project structure

```
├── server/
│   ├── server.js      # Express app, all routes
│   └── db.js          # tiny JSON read/write helper
├── public/
│   ├── index.html      # public-facing site
│   ├── assets/         # logo, profile photo
│   ├── uploads/         # portfolio images uploaded via admin
│   └── admin/
│       ├── index.html  # admin dashboard UI
│       └── admin.js    # admin dashboard logic
├── data/
│   └── site-data.json  # all editable content lives here
├── .env                 # secrets (not committed)
└── package.json
```
