<p align="center">
  <img src="assets/images/logo.png" alt="Elim Christian Academy seal" width="100">
</p>

<h1 align="center">Elim Christian Academy Website</h1>

<p align="center">
  The official website of <strong>Elim Christian Academy, Inc.</strong>, Trece Martires City, Cavite.<br>
  <a href="https://eca-school-website.vercel.app"><strong>Visit the website →</strong></a>
</p>

<p align="center">
  <img src="screenshots/home.jpg" alt="Homepage of the ECA website" width="900">
</p>

## What is this?

A website where parents, students and visitors can learn about the school, read the latest news,
check the school calendar and see photos of school life. School staff update the content through
a private admin page, so no coding is needed to post news or announcements.

## What visitors can do

- Read about the school, its programs and how to enroll
- Follow the latest news and announcements
- Check upcoming dates on the school calendar
- Browse photo albums of school events
- Ask common questions through the help desk chat
- Make the text bigger or switch to high contrast for easier reading

<p align="center">
  <img src="screenshots/news.jpg" alt="News and events page" width="440">
  &nbsp;
  <img src="screenshots/calendar.jpg" alt="School calendar" width="440">
</p>

## Works on phones too

<p align="center">
  <img src="screenshots/phone.jpg" alt="Homepage on a phone" width="260">
</p>

## For school staff

Approved staff sign in with their Google account at **`/admin/login.html`** to:

- Post news and save drafts
- Add dates to the school calendar
- Upload photo albums
- Edit the announcements at the top of the website
- Optionally back up photos to Google Drive and share posts to the school's Facebook page

<p align="center">
  <img src="screenshots/admin-dashboard.jpg" alt="Admin dashboard" width="900">
</p>

> The sign-in page isn't linked from the public website. Bookmark it, and ask the website
> administrator to add your Google account to the staff list.

## For developers

Built with HTML, CSS and JavaScript, with a Node.js back end and a MySQL database, hosted on Vercel.

<details>
<summary><strong>Show the developer setup guide</strong> (installation, settings and deployment)</summary>

### Tech stack

| Part | Technology |
|---|---|
| Front end | HTML, CSS, vanilla JavaScript (no framework, no build step) |
| Back end | Node.js 20.6+ serverless functions in `api/` (Vercel Functions) |
| Database | MySQL 8 (hosted on Aiven; a local XAMPP database also works) |
| Staff sign-in | Google Sign-In with a signed, HttpOnly session cookie |
| Integrations | Google Drive API (photo archive), Facebook Graph API (Page posting) |
| Hosting | Vercel, deployed automatically from the `main` branch |

---

### Project structure

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

### Getting started

#### Requirements

- [Node.js](https://nodejs.org/) 20.6 or newer
- A MySQL 8 database (Aiven, or XAMPP on your own computer)

#### Run it on your computer

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

#### Useful commands

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

### Settings (environment variables)

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

### Admin portal

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

### Google Drive and Facebook

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

### Deployment

The site is hosted on **Vercel** and redeploys automatically on every push to `main`.

1. Import this repository in Vercel (**Framework Preset: Other**, no build command).
2. Add the settings from the settings table above under **Project > Settings > Environment Variables**.
   For the database certificate, use `DATABASE_CA_CERT` and paste the whole contents of `ca.pem`.
3. Deploy, then open `/api/health` to confirm everything is connected.

`.vercelignore` keeps `scripts/`, `db/`, settings files and certificates off the live site.

</details>

---

<p align="center">
  <sub>Developed as an IT internship project for Elim Christian Academy, Inc.<br>
  Photos, logo and school content belong to Elim Christian Academy and may not be reused without permission.</sub>
</p>
