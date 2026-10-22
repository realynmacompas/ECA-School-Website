# Elim Christian Academy Website (Front End)

Static site built with HTML, CSS, and vanilla JavaScript. No build step; deploy to Vercel as a static site.

## Structure

```
eca-website/
├── index.html          Landing page
├── css/style.css       All styles (colors and spacing are CSS variables at the top)
├── js/main.js          Ticker, header, hero carousel, news slider, upcoming dates, accessibility options
│                       (newsItems and schoolEvents data arrays are at the top)
├── js/chatbot.js       Rule-based FAQ help desk (answers are in the `faqs` array)
└── assets/images/      Photos from the school's Facebook page (cropped and compressed)
    ├── logo.png, favicon.png  School seal
    ├── hero-*.jpg          Hero slides
    ├── alumni-*.jpg, enrollment-poster.jpg  Posters shown beside hero text
    ├── about-1/2.jpg       About section
    ├── program-*.jpg       Program cards
    ├── news/               News card images
    ├── gallery/            Campus life grid
    └── apply-banner.jpg    Enrollment banner
```

## Landing page sections

Announcement ticker, top bar (accessibility options, contacts, portal link), sticky header,
hero carousel, priority links (Admissions, School Calendar, Faculty & Staff, Contact),
Why ECA, programs, News & Events (news slider + upcoming dates), campus life gallery,
enrollment (banner, steps, requirements), map, footer (quick links, school policies,
featured links), back-to-top button, help desk chat.

## Design guidelines followed

Based on common school website practice (SchoolStatus, Wix, Realsmart, Ubiq Education):

| Guideline | How the site handles it |
|---|---|
| Simple homepage | One section per purpose; removed the duplicate stats band and footer call-to-action strip |
| Quick links for urgent updates | Announcement ticker + priority link tiles under the hero |
| Responsive layout | Tested at 390px (phone), 820–1024px (tablet), 1440px (desktop); menu collapses at 1100px |
| Clear navigation (7-link rule) | 6 menu links + Enroll Now button; logo links to Home |
| Accessibility | Text size (A−/A/A+), high-contrast mode, skip link, alt text, keyboard support, visible focus, WCAG AA color contrast, reduced-motion support |
| Priority links | Admissions, School Calendar, Faculty & Staff Directory, Contact in tiles, menu, and footer |
| Visual storytelling | Real photos in the hero, programs, and Life at ECA gallery |
| Portals | "Parent & Student Portal" in the footer (page not built yet). The staff admin login is not linked from the public site |
| Policies | Footer "School Policies": Data Privacy Notice, Child Protection Policy, Anti-Bullying Policy, Student Handbook |

Not included yet: a second language (Filipino) and a campus video / virtual tour. Add them when
the school provides translated content or video.

## Photos

Photos and posters come from the school's official Facebook page and were cropped and compressed for the web.
They are only 720px wide, so hero images look soft on large screens. Ask the school for the original files
and replace them using the same file names.

- `logo.png` / `favicon.png` are cut from the school seal.
- News posters use `fit: "contain"` in `js/main.js` so their text is not cropped.

## Content guidelines (school website)

- Prefer group photos over close-ups of individual students; never publish student names without consent.
- Only name students or alumni when the school has already announced it (e.g., the alumni congratulations posts).
- The help desk chat only answers from a fixed FAQ list and replies politely to offensive language.
- Only link social accounts the school confirms as official.

## Before launch, confirm

- Permission from the school to publish the student photos (Data Privacy Act)
- SHS strands offered (chatbot answer marked `[CONFIRM]`)
- Recognition badges in the footer (DepEd, ESC, PEAC, taken from the enrollment poster)
- Direct links to each Facebook post for the news cards (currently link to the page)
- Gallery captions describe what the photos appear to show; adjust if the events differ

## Not yet built

These pages are linked from the homepage but don't exist yet:

- `about.html`, `academics.html`, `admissions.html`
- `calendar.html` (full school calendar)
- `faculty.html` (faculty and staff directory; ask the school which details may be published)
- `policies.html` (data privacy notice, child protection policy, anti-bullying policy, student handbook)
- `portal.html` (a real parent/student portal needs a backend, e.g. PHP + MySQL, with secure login)

## Back end (Vercel Functions + MySQL)

The `api/` folder is the back end. Vercel runs each file as a web address
(`api/auth/login.js` → `/api/auth/login`); files in `api/_lib/` are shared helpers.

```
api/
  _lib/        config, MySQL connection, session cookie, Google check, helpers
  auth/        login.js, me.js, logout.js
  admin/[resource].js  admin content: /api/admin/news, events, albums, announcements
  content.js   /api/content: everything the public site shows (published only)
  image.js     /api/image?id=: uploaded photos
  drive/[action].js  Google Drive: connect, callback, status, sync, disconnect
  health.js    /api/health: is everything set up?
db/schema.sql  database tables
scripts/       db.js (tables + staff list), dev-server.js (local testing)
.env.example   list of settings (copy to .env.local)
```

### Settings

All accounts and passwords are **settings, not code** (see `.env.example`):
`GOOGLE_CLIENT_ID`, `SESSION_SECRET`, `SESSION_HOURS`, `DATABASE_URL`, `DATABASE_CA_CERT`.

- On Vercel: Project > Settings > Environment Variables
- On your computer: a `.env.local` file (never committed)

Switching from personal accounts to the school's later means changing these values,
then running `npm run db:setup` and `npm run admin:add` on the new database.

### Run it on your computer

Needs Node.js 20.6 or newer.

```
npm install
copy .env.example .env.local     (then fill it in)
npm run db:setup                 creates the tables
npm run db:seed                  adds the sample content (only into empty tables)
npm run admin:add -- you@gmail.com
npm run dev                      → http://localhost:5500
```

Use `npm run dev`, not VS Code Live Server: Live Server can't run the `/api` back end.
Check the set-up any time at `/api/health`.

### Staff list

```
npm run admin:add -- name@gmail.com
npm run admin:remove -- name@gmail.com
npm run admin:list
```

### Content (news, events, albums, announcements)

All content lives in MySQL. Pages read and save it only through `admin/js/store.js`:
public pages get published content from `/api/content` (one request, cached by Vercel
for 15 seconds, so admin changes appear within about 15 seconds); admin pages use
`/api/admin/...` (signed-in staff only, drafts included). The server re-checks every
rule the admin forms check (required fields, lengths, dates, links, photo types and
sizes, 4 photos per album, 6 homepage pins).

Uploaded photos are shrunk in the browser (max 1200px), stored in the `images` table and
shown as `api/image?id=123`. Each one also gets an organized copy in Google Drive (below).

### Google Drive (photo archive)

Every uploaded photo is copied to the connected Google Drive, in folders like
`ECA Website / News / 2026-10 Foundation Day` and `ECA Website / Albums / 2026-10 Sports Fest`.
The website keeps showing photos from its own database, so Drive problems never break
the public pages. Photos deleted on the website stay in Drive.

- **Which Drive:** whoever clicks **Settings > Google Drive > Connect** in the admin and
  signs in with Google. No account is written in the code or in Vercel.
- **Permission:** `drive.file` only: the website sees only files it created, nothing else.
- **Server settings:** `GOOGLE_CLIENT_SECRET` (secret, Vercel + `.env.local` only).
  The Drive key is stored encrypted with `SESSION_SECRET` (changing it = reconnect Drive).
- **Google Cloud set-up (once):** enable the **Google Drive API**; in the OAuth client add
  Authorized redirect URIs `https://eca-school-website.vercel.app/api/drive/callback` and
  `http://localhost:5500/api/drive/callback`; under Audience click **Publish app**
  (in "Testing", Google stops the Drive access after 7 days).

**Handing over to the school's account:** sign in to the admin, open **Settings**, click
**Switch account**, choose the school's Google account, then **Copy photos to Drive**.
(If the school uses its own Google Cloud project too, also change `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` in Vercel and the Client ID in `admin/js/auth-config.js`.)

## Admin sign-in (Google)

Staff sign in at `/admin/login.html` with **Google only** (no passwords on this site).
The page is not linked from the public site; staff should bookmark it.

1. Google's button gives the page a signed ID token.
2. `/api/auth/login` verifies it with Google (signature, expiry, our Client ID) and
   checks the email in the `admins` table.
3. The server sets an 8-hour session cookie (`eca_admin`: HttpOnly, SameSite=Lax,
   Secure on https, signed with `SESSION_SECRET`).
4. Every admin page asks `/api/auth/me`; removed staff lose access right away.

The front end only needs the Client ID (`admin/js/auth-config.js`). Google Cloud >
Credentials > the OAuth client must list these **Authorized JavaScript origins**:

```
https://eca-school-website.vercel.app
http://localhost:5500
http://127.0.0.1:5500
```
