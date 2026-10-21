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

## Admin sign-in (Google)

Staff sign in at `/admin/login.html` with **Google only** (no passwords on this site).
The page is not linked from the public site; staff should bookmark it.

Settings are in `admin/js/auth-config.js`:

- `GOOGLE_CLIENT_ID`: the Web application OAuth Client ID from Google Cloud Console
  (not a secret; never put the Client Secret in this project)
- `ALLOWED_ADMIN_EMAILS`: the Google accounts allowed into the dashboard
- `ALLOWED_ADMIN_DOMAINS` (optional): a Google Workspace domain the school owns

Google Cloud Console > Credentials > the OAuth client must list these
**Authorized JavaScript origins**:

```
https://eca-school-website.vercel.app
http://localhost:5500
http://127.0.0.1:5500
```

Sessions last 8 hours and end when the tab is closed (`ADMIN_SESSION_HOURS`).

**Security note:** the staff-list check runs in the browser, so it only keeps
honest visitors out. That is fine while the admin saves to the browser (demo mode).
When the admin saves to a real server, the server must verify the Google ID token
(signature, audience, expiry) and the email on every request. The token is kept in
the session (`session.credential` in `admin/js/auth.js`) for that.
