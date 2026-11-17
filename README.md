<p align="center">
  <img src="assets/images/logo.png" alt="Elim Christian Academy seal" width="110">
</p>

<h1 align="center">Elim Christian Academy Website</h1>

<p align="center">
  The official website and content admin portal of <strong>Elim Christian Academy, Inc.</strong><br>
  Barangay De Ocampo, Trece Martires City, Cavite &middot; Est. 1993
</p>

<p align="center">
  <a href="https://eca-school-website.vercel.app"><strong>Visit the website</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#getting-started">Run it locally</a>
  &nbsp;&middot;&nbsp;
  <a href="#admin-portal">Admin portal</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/Node.js-20.6%2B-339933?logo=nodedotjs&logoColor=white" alt="Node.js 20.6+">
  <img src="https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white" alt="MySQL 8">
  <img src="https://img.shields.io/badge/Deployed%20on-Vercel-000000?logo=vercel&logoColor=white" alt="Deployed on Vercel">
</p>

<!-- Add a screenshot of the homepage here, for example:
<p align="center"><img src="docs/homepage.png" alt="ECA homepage" width="900"></p>
-->

---

## Table of contents

- [About the project](#about-the-project)
- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Getting started](#getting-started)
- [Settings (environment variables)](#settings-environment-variables)
- [Admin portal](#admin-portal)
- [Google Drive and Facebook](#google-drive-and-facebook)
- [Deployment](#deployment)
- [Content and privacy guidelines](#content-and-privacy-guidelines)
- [Roadmap](#roadmap)

---

## About the project

This website gives parents, students and visitors one place to find school information:
programs, admissions, news, the school calendar and photos of campus life. School staff keep
it up to date through a private admin portal, so posting news or an announcement doesn't
require editing code.

The public pages are plain HTML, CSS and JavaScript with no build step. A small back end in
`api/` (Vercel Functions on Node.js) stores the content in MySQL and handles staff sign-in.

---

## Features

### Public website

| Page | What it shows |
|---|---|
| **Home** (`index.html`) | Announcement ticker, hero slides, quick links, programs, latest news, upcoming dates, campus life photos, enrollment steps and requirements, map and contact details |
| **About** (`about.html`) | School story, mission and vision, leadership, recognition and a visit section |
| **News & Events** (`news.html`) | All news with category filter and search, full article view, and the school calendar |
| **Life at ECA** (`life.html`) | Photo albums with a swipeable photo strip and a full-screen viewer |
| **Privacy Policy** (`privacy.html`) | What information the site collects and how it is used |

Also on every page:

- **Accessibility:** text size controls (A− / A / A+), high-contrast mode, skip link, keyboard support, visible focus, alt text, WCAG AA color contrast and reduced-motion support
- **Responsive layout:** tested on phones (390px), tablets (820 to 1024px) and desktops (1440px)
- **Help desk chat:** answers common questions from a fixed FAQ list, such as enrollment, requirements and office hours

### Admin portal

| Section | What staff can do |
|---|---|
| **Dashboard** | See counts, drafts, recent news and upcoming events at a glance |
| **News** | Write, edit, publish or save news as drafts, with a photo and live preview |
| **Events** | Add school calendar dates (classes, activities, holidays) |
| **Albums** | Upload photo albums and pin up to 6 to the homepage |
| **Announcements** | Manage the scrolling messages at the top of every page |
| **Settings** | Connect Google Drive (photo backup) and the school's Facebook Page (posting) |

---

## Tech stack

| Part | Technology |
|---|---|
| Front end | HTML, CSS, vanilla JavaScript (no framework, no build step) |
| Back end | Node.js 20.6+ serverless functions in `api/` (Vercel Functions) |
| Database | MySQL 8 (hosted on Aiven; a local XAMPP database also works) |
| Staff sign-in | Google Sign-In with a signed, HttpOnly session cookie |
| Integrations | Google Drive API (photo archive), Facebook Graph API (Page posting) |
| Hosting | Vercel, deployed automatically from the `main` branch |

---

## Project structure

```
ECA-School-Website/
├── index.html, about.html, news.html, life.html, privacy.html   Public pages
├── css/style.css            Public site styles (colors, fonts and corners are variables at the top)
├── js/
│   ├── main.js              Header, hero, news slider, upcoming dates, accessibility options
│   ├── news.js              News list, article view and calendar
│   ├── life.js              Albums and photo viewer
│   └── chatbot.js           Help desk FAQ answers
├── assets/images/           School seal, photos and posters
├── admin/                   Admin portal pages, styles and scripts
│   └── js/store.js          The only file that talks to the back end
├── api/                     Back end (each file becomes a web address)
│   ├── _lib/                Shared helpers: config, database, sessions, Drive, Facebook
│   ├── auth/                login, me, logout
│   ├── admin/[resource].js  /api/admin/news, events, albums, announcements
│   ├── content.js           /api/content: published content for the public pages
│   ├── image.js             /api/image?id=: uploaded photos
│   ├── drive/, facebook/    Google Drive and Facebook Page connections
│   └── health.js            /api/health: checks that everything is set up
├── db/schema.sql            Database tables
├── scripts/                 Database setup, staff list and local dev server
└── .env.example             List of settings (copy to .env.local)
```

---

## Getting started

### Requirements

- [Node.js](https://nodejs.org/) 20.6 or newer
- A MySQL 8 database (Aiven, or XAMPP on your own computer)

### Run it on your computer

```bash
# 1. Install the packages
npm install

# 2. Create your settings file, then fill it in
copy .env.example .env.local        # Windows
cp .env.example .env.local          # macOS / Linux

# 3. Create the database tables and add sample content
npm run db:setup
npm run db:seed

# 4. Give yourself access to the admin
npm run admin:add -- you@gmail.com

# 5. Start the local server
npm run dev
```

Open **http://localhost:5500**. To check your set-up at any time, visit **/api/health**.

> **Note:** Use `npm run dev`, not VS Code Live Server. Live Server can't run the `/api` back end,
> and both use port 5500, so close Live Server first.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Starts the local server at http://localhost:5500 |
| `npm run env:check` | Checks that the settings in `.env.local` are filled in |
| `npm run db:setup` | Creates any missing database tables (safe to run again) |
| `npm run db:seed` | Adds sample content, only into empty tables |
| `npm run admin:add -- name@gmail.com` | Adds a staff member to the admin |
| `npm run admin:remove -- name@gmail.com` | Removes a staff member |
| `npm run admin:list` | Lists everyone with admin access |

---

## Settings (environment variables)

All accounts and passwords are **settings, not code**. They go in `.env.local` on your computer
(never committed) and in **Vercel > Project > Settings > Environment Variables** online.
See [`.env.example`](.env.example) for the full list with notes.

| Setting | Secret? | Purpose |
|---|:---:|---|
| `DATABASE_URL` | Yes | MySQL connection, `mysql://USER:PASSWORD@HOST:PORT/DATABASE` |
| `DATABASE_CA_CERT` / `DATABASE_CA_CERT_FILE` | No | Aiven CA certificate for a secure database connection |
| `SESSION_SECRET` | Yes | Signs the staff sign-in cookie and encrypts the Drive and Facebook keys |
| `SESSION_HOURS` | No | How long a sign-in lasts (default 8) |
| `GOOGLE_CLIENT_ID` | No | Google Sign-In (same value as `admin/js/auth-config.js`) |
| `GOOGLE_CLIENT_SECRET` | Yes | Google Drive connection |
| `FACEBOOK_APP_ID` | No | Facebook Page posting (leave empty to turn it off) |
| `FACEBOOK_APP_SECRET` | Yes | Facebook Page posting |
| `SITE_URL` | No | Website address used in Facebook "Read more" links |

> **Never commit real values.** `.env.local` and `*.pem` files are already in `.gitignore`.

---

## Admin portal

Staff sign in at **`/admin/login.html`** with their **Google account only**; there are no passwords on
this site. The login page isn't linked from the public website, so staff should bookmark it.

**How sign-in works**

1. Google's sign-in button gives the page a signed ID token.
2. `/api/auth/login` verifies the token with Google (signature, expiry and Client ID) and checks that the email is on the staff list (`admins` table).
3. The server sets an 8-hour session cookie (`eca_admin`: HttpOnly, SameSite=Lax, Secure on HTTPS).
4. Every admin page checks `/api/auth/me`, so a removed staff member loses access right away.

**How content is saved**

- Public pages load published content from `/api/content` in one request. Vercel caches it for 15 seconds, so changes appear within about 15 seconds.
- Admin pages use `/api/admin/...`, which only works for signed-in staff and includes drafts.
- The server re-checks every rule the forms check: required fields, lengths, dates, links, photo types and sizes, 4 photos per album and 6 homepage pins.
- Uploaded photos are resized in the browser (max 1200px), stored in the database and shown as `api/image?id=123`.

<details>
<summary><strong>Google Cloud set-up for sign-in</strong></summary>

In **Google Cloud > Credentials**, the OAuth client must list these **Authorized JavaScript origins**:

```
https://eca-school-website.vercel.app
http://localhost:5500
http://127.0.0.1:5500
```

</details>

---

## Google Drive and Facebook

Both are optional and are connected from **Admin > Settings**. No account or Page is written in the
code; whoever clicks **Connect** chooses it, which makes it easy to hand over to the school's own
accounts later.

<details>
<summary><strong>Google Drive: photo archive</strong></summary>

Every uploaded photo is also copied to the connected Google Drive, in folders such as
`ECA Website / News / 2026-10 Foundation Day`. The website keeps showing photos from its own
database, so a Drive problem never breaks the public pages. Photos deleted on the website stay in Drive.

- **Permission:** `drive.file` only. The website can see only the files it created.
- **Settings:** `GOOGLE_CLIENT_SECRET`. The Drive key is stored encrypted with `SESSION_SECRET`, so changing that secret means reconnecting Drive.
- **One-time Google Cloud set-up:**
  1. Enable the **Google Drive API**.
  2. In the OAuth client, add these **Authorized redirect URIs**:
     `https://eca-school-website.vercel.app/api/drive/callback` and `http://localhost:5500/api/drive/callback`
  3. Under **Audience**, click **Publish app**. In "Testing" mode, Google stops Drive access after 7 days.

**Handing over:** sign in to the admin, open **Settings**, click **Switch account**, choose the school's
Google account, then click **Copy photos to Drive**. If the school uses its own Google Cloud project,
also update `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel and the Client ID in `admin/js/auth-config.js`.

</details>

<details>
<summary><strong>Facebook Page: posting news and albums</strong></summary>

On the News and Album forms, **"Also post to the school's Facebook page"** posts the item to the connected
Page when it is published, with its text, photos and a "Read more" link back to the website. Each item is
posted once; later edits don't change the Facebook post. If Facebook fails, the website still saves and the
admin sees a warning.

- **Settings:** `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET`. The Page key is stored encrypted with `SESSION_SECRET`.
- **One-time Meta set-up:**
  1. In **Meta for Developers**, create an app with the use case **Manage everything on your Page**
     (permissions `pages_show_list`, `pages_read_engagement`, `pages_manage_posts`).
  2. Add the **Valid OAuth Redirect URIs**:
     `https://eca-school-website.vercel.app/api/facebook/callback` and `http://localhost:5500/api/facebook/callback`
  3. The app can stay in **Development mode**. Only people with a role on the app can connect, and no App Review is needed.

**Handing over:** add the school's Page admin to the app under **App roles**. They then sign in to the admin,
open **Settings**, click **Switch Page** and choose the school's Page.

</details>

---

## Deployment

The site is hosted on **Vercel** and redeploys automatically on every push to `main`.

1. Import this repository in Vercel (**Framework Preset: Other**, no build command).
2. Add the settings from [Settings](#settings-environment-variables) under **Project > Settings > Environment Variables**.
   For the database certificate, use `DATABASE_CA_CERT` and paste the whole contents of `ca.pem`.
3. Deploy, then open `/api/health` to confirm everything is connected.

`.vercelignore` keeps `scripts/`, `db/`, settings files and certificates off the live site.

---

## Content and privacy guidelines

- Use group photos rather than close-ups of individual students, and never publish a student's name without consent.
- Only name students or alumni the school has already announced publicly.
- If someone asks for a photo of them or their child to be removed, take it down promptly (see `privacy.html`).
- Only link social media accounts the school confirms as official.
- The help desk chat answers only from its fixed FAQ list.

### Before launch, confirm with the school

- [ ] Permission to publish the student photos (Data Privacy Act of 2012)
- [ ] Senior High School strands offered (help desk answer marked `[CONFIRM]`)
- [ ] Recognition badges in the footer (DepEd, ESC, PEAC)
- [ ] Original, full-size photos to replace the compressed Facebook copies (same file names)

---

## Roadmap

Pages linked from the site that are not built yet:

- [ ] `academics.html`: programs and curriculum
- [ ] `admissions.html`: enrollment details
- [ ] `faculty.html`: faculty and staff directory (ask the school which details may be published)
- [ ] `policies.html`: data privacy notice, child protection, anti-bullying and student handbook
- [ ] `portal.html`: parent and student portal (needs its own secure sign-in)

---

<p align="center">
  Developed as an IT internship project for Elim Christian Academy, Inc.<br>
  <sub>Photos, logo and school content belong to Elim Christian Academy and may not be reused without permission.</sub>
</p>
