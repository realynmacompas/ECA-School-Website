/* =========================================================
   ECA - data store (talks to the back end)

   Every page reads and saves content ONLY through the
   functions below (listNews, saveNews, ...). They used to keep
   data in this browser's localStorage; now they call the
   server, so everyone sees the same content.

   - Public pages (index, news, life) load everything with ONE
     request to /api/content (published content only).
   - Admin pages use /api/admin/... (signed-in staff only, drafts
     included). Those calls go through adminApi() in auth.js,
     which sends the sign-in cookie and handles errors.
   ========================================================= */

const HOMEPAGE_ALBUM_SPOTS = 6;   // Life at ECA on the homepage shows up to 6 albums
const MAX_ALBUM_PHOTOS = 4;       // photos allowed in one album
// Categories staff can choose from on the News form (edit this list to add more)
const NEWS_CATEGORIES = ["Achievement", "Admissions", "Alumni", "Announcement", "Careers", "Event", "Seminar", "Spiritual Life"];
// Categories for Life at ECA albums
const ALBUM_CATEGORIES = ["Academics", "Campus", "Celebrations", "Community", "Spiritual Life", "Sports"];
// Event types (decide the colour on the public calendar). Events without a type count as "activity".
const EVENT_TYPES = { classes: "Classes", activity: "School activity", holiday: "Holiday / No classes" };

const IS_ADMIN_PAGE = /\/admin\//.test(window.location.pathname);

function newId(prefix) {
  if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/* ---------- Public pages: one request for everything ---------- */
let publicContentPromise = null;

function loadPublicContent() {
  if (!publicContentPromise) {
    publicContentPromise = fetch("/api/content", { headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Couldn't load the website content (${response.status}).`);
        return response.json();
      })
      .catch((err) => {
        publicContentPromise = null; // allow a retry on the next call
        throw err;
      });
  }
  return publicContentPromise;
}

/* ---------- Admin pages: signed-in requests ---------- */
async function adminRequest(path, options) {
  try {
    return await adminApi(path, options); // from auth.js
  } catch (err) {
    // Session ended while working: back to the login page
    if (err.status === 401) window.location.replace("login.html?expired=1");
    throw err;
  }
}

function idQuery(id) {
  return `?id=${encodeURIComponent(id)}`;
}

/* =========================================================
   Public functions: the ONLY way pages touch the data
   ========================================================= */

/* ---------- News ---------- */
async function listNews() {
  if (!IS_ADMIN_PAGE) return (await loadPublicContent()).news;
  return adminRequest("/api/admin/news"); // newest first, drafts included
}

async function getNews(id) {
  try {
    return await adminRequest(`/api/admin/news${idQuery(id)}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

// New post: no id. Edit: with id (only the fields sent are changed).
function saveNews(item) {
  const { id, ...fields } = item;
  return id
    ? adminRequest(`/api/admin/news${idQuery(id)}`, { method: "PUT", body: fields })
    : adminRequest("/api/admin/news", { method: "POST", body: fields });
}

function deleteNews(id) {
  return adminRequest(`/api/admin/news${idQuery(id)}`, { method: "DELETE" });
}

/* ---------- Events ---------- */
async function listEvents() {
  if (!IS_ADMIN_PAGE) return (await loadPublicContent()).events;
  return adminRequest("/api/admin/events"); // soonest first
}

function saveEvent(item) {
  const { id, ...fields } = item;
  return id
    ? adminRequest(`/api/admin/events${idQuery(id)}`, { method: "PUT", body: fields })
    : adminRequest("/api/admin/events", { method: "POST", body: fields });
}

function deleteEvent(id) {
  return adminRequest(`/api/admin/events${idQuery(id)}`, { method: "DELETE" });
}

/* ---------- Life at ECA albums ---------- */

// Which published albums the homepage shows: pinned (featured) first, then the newest.
// Albums must already be sorted newest first (listAlbums does this).
function pickHomepageAlbums(albums) {
  const published = albums.filter((a) => a.status === "published");
  const pinned = published.filter((a) => a.featured);
  const others = published.filter((a) => !a.featured);
  return [...pinned, ...others].slice(0, HOMEPAGE_ALBUM_SPOTS);
}

async function listAlbums() {
  if (!IS_ADMIN_PAGE) return (await loadPublicContent()).albums;
  return adminRequest("/api/admin/albums"); // newest first
}

async function getAlbum(id) {
  try {
    return await adminRequest(`/api/admin/albums${idQuery(id)}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

function saveAlbum(item) {
  const { id, ...fields } = item;
  return id
    ? adminRequest(`/api/admin/albums${idQuery(id)}`, { method: "PUT", body: fields })
    : adminRequest("/api/admin/albums", { method: "POST", body: fields });
}

function deleteAlbum(id) {
  return adminRequest(`/api/admin/albums${idQuery(id)}`, { method: "DELETE" });
}

/* ---------- Announcement bar ---------- */
async function getAnnouncements() {
  if (!IS_ADMIN_PAGE) return (await loadPublicContent()).announcements;
  return adminRequest("/api/admin/announcements");
}

function saveAnnouncements(announcements) {
  return adminRequest("/api/admin/announcements", { method: "PUT", body: announcements });
}
