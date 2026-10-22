/* =========================================================
   Website content in MySQL: news, events, albums,
   announcements and uploaded photos.

   Every save is checked here (lengths, dates, allowed links,
   photo types and sizes, homepage pin limit). The admin forms
   check the same things, but the server must never trust the
   browser.

   The objects returned have the SAME shape the pages already
   use (see admin/js/store.js), e.g. news:
   { id, title, category, date, summary, body, author, image,
     isPoster, facebookUrl, status }
   ========================================================= */
import crypto from "node:crypto";
import { getPool, query } from "./db.js";
import { HttpError } from "./http.js";

export const EVENT_TYPES = ["classes", "activity", "holiday"];
export const HOMEPAGE_ALBUM_SPOTS = 6;
export const MAX_ALBUM_PHOTOS = 4;
const MAX_ANNOUNCEMENTS = 10;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;   // after the browser shrinks photos they are ~100-400 KB
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const STATUSES = ["draft", "published"];

/* =========================================================
   Small helpers
   ========================================================= */
function bad(message) {
  return new HttpError(400, message, "INVALID");
}

function cleanText(value, label, max, { required = false } = {}) {
  const text = value == null ? "" : String(value).trim();
  if (required && !text) throw bad(`Please add ${label}.`);
  if (text.length > max) throw bad(`${label[0].toUpperCase()}${label.slice(1)} is too long (max ${max} characters).`);
  return text;
}

function cleanDate(value, label, { required = false } = {}) {
  const text = value == null ? "" : String(value).trim();
  if (!text) {
    if (required) throw bad(`Please choose ${label}.`);
    return "";
  }
  const parsed = new Date(`${text}T00:00:00Z`);
  if (!DATE_PATTERN.test(text) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== text) {
    throw bad(`${label[0].toUpperCase()}${label.slice(1)} isn't a valid date.`);
  }
  return text;
}

function cleanStatus(value) {
  const status = String(value || "draft");
  if (!STATUSES.includes(status)) throw bad("Status must be draft or published.");
  return status;
}

function todayISO() {
  // School is in the Philippines (UTC+8)
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
}

export function newId(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function cleanId(value) {
  const id = String(value || "");
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw bad("Invalid id.");
  return id;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (err) {
    return false;
  }
}

function cleanFacebookUrl(value) {
  const text = cleanText(value, "the Facebook link", 500);
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol === "https:" && /(^|\.)facebook\.com$|(^|\.)fb\.watch$/.test(url.hostname)) return url.href;
  } catch (err) { /* falls through */ }
  throw bad("The Facebook link must be a full facebook.com link starting with https://");
}

// Announcement links: nothing, a homepage section ("#apply"), or a web page
function cleanLink(value) {
  const text = cleanText(value, "the link", 500);
  if (!text || /^#[\w-]+$/.test(text)) return text;
  if (isHttpUrl(text)) return new URL(text).href;
  throw bad("A message link must be a homepage section or a full link starting with https://");
}

async function withTransaction(work) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await work(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}

/* =========================================================
   Photos
   New photos arrive from the admin forms as data URLs
   ("data:image/jpeg;base64,..."). They are saved in the
   images table and the post keeps the short address
   "api/image?id=123". Photos that ship with the website
   ("assets/images/...") are kept as they are.
   ========================================================= */
const IMAGE_URL = /^api\/image\?id=(\d+)$/;

function imageIdOf(src) {
  const match = IMAGE_URL.exec(String(src || ""));
  return match ? Number(match[1]) : null;
}

async function saveImage(conn, dataUrl, email) {
  const match = /^data:(image\/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$/i.exec(dataUrl);
  if (!match) throw bad("A photo couldn't be read. Please choose it again.");
  const mime = match[1].toLowerCase();
  if (!IMAGE_TYPES.includes(mime)) throw bad("Photos must be JPG, PNG or WEBP.");
  const data = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!data.length) throw bad("A photo is empty. Please choose it again.");
  if (data.length > MAX_IMAGE_BYTES) throw bad("A photo is too large. Please choose a smaller one.");
  const [result] = await conn.execute(
    "INSERT INTO images (mime, data, bytes, created_by) VALUES (?, ?, ?, ?)",
    [mime, data, data.length, email]
  );
  return `api/image?id=${result.insertId}`;
}

// Returns the address to store for a photo field
async function resolvePhoto(conn, value, email) {
  const src = String(value || "").trim();
  if (!src) return "";
  if (src.startsWith("data:")) return saveImage(conn, src, email);
  if (IMAGE_URL.test(src) || /^assets\/images\/[\w./-]+$/.test(src)) return src;
  throw bad("Please upload the photo again.");
}

// Deletes uploaded photos that no post or album uses anymore
async function deleteUnusedImages(conn, sources) {
  for (const id of new Set(sources.map(imageIdOf).filter(Boolean))) {
    const src = `api/image?id=${id}`;
    const [[{ uses }]] = await conn.query(
      "SELECT (SELECT COUNT(*) FROM news WHERE image = ?) + (SELECT COUNT(*) FROM album_photos WHERE src = ?) AS uses",
      [src, src]
    );
    if (Number(uses) === 0) await conn.execute("DELETE FROM images WHERE id = ?", [id]);
  }
}

export async function getImage(id) {
  const rows = await query("SELECT mime, data FROM images WHERE id = ?", [Number(id)]);
  return rows[0] || null;
}

/* =========================================================
   News
   ========================================================= */
function newsFromRow(row) {
  return {
    id: row.id, title: row.title, category: row.category, date: row.date,
    summary: row.summary, body: row.body || "", author: row.author, image: row.image,
    isPoster: Boolean(row.is_poster), facebookUrl: row.facebook_url, status: row.status
  };
}

// Same rules as the News form: drafts need a title; publishing needs category, date and photo
function validateNews(input) {
  const status = cleanStatus(input.status);
  const item = {
    title: cleanText(input.title, "a title", 160, { required: true }),
    category: cleanText(input.category, "the category", 60),
    date: cleanDate(input.date, "a date") || todayISO(),
    summary: cleanText(input.summary, "the short description", 300),
    body: cleanText(input.body, "the article text", 5000),
    author: cleanText(input.author, "the \"Posted by\" name", 80),
    image: String(input.image || ""),
    isPoster: Boolean(input.isPoster),
    facebookUrl: cleanFacebookUrl(input.facebookUrl),
    status
  };
  if (status === "published") {
    if (!item.category) throw bad("Please choose a category before publishing.");
    if (!item.image) throw bad("Please add a photo before publishing.");
  }
  return item;
}

export async function listNews({ publishedOnly = false } = {}) {
  const rows = await query(
    `SELECT * FROM news ${publishedOnly ? "WHERE status = 'published'" : ""} ORDER BY date DESC, created_at DESC`
  );
  return rows.map(newsFromRow);
}

export async function getNews(id) {
  const rows = await query("SELECT * FROM news WHERE id = ?", [cleanId(id)]);
  return rows[0] ? newsFromRow(rows[0]) : null;
}

export async function saveNews(input, email, id = null) {
  return withTransaction(async (conn) => {
    let existing = null;
    if (id) {
      const [rows] = await conn.execute("SELECT * FROM news WHERE id = ? FOR UPDATE", [cleanId(id)]);
      if (!rows[0]) throw new HttpError(404, "This news post no longer exists.", "NOT_FOUND");
      existing = newsFromRow(rows[0]);
    }
    const item = validateNews({ ...(existing || {}), ...input }); // partial updates keep the other fields
    item.image = await resolvePhoto(conn, item.image, email);
    const values = [item.title, item.category, item.date, item.summary, item.body, item.author,
      item.image, item.isPoster ? 1 : 0, item.facebookUrl, item.status, email];

    if (existing) {
      await conn.execute(
        `UPDATE news SET title = ?, category = ?, date = ?, summary = ?, body = ?, author = ?, image = ?,
         is_poster = ?, facebook_url = ?, status = ?, updated_by = ? WHERE id = ?`, [...values, existing.id]);
      if (existing.image !== item.image) await deleteUnusedImages(conn, [existing.image]);
      return { ...item, id: existing.id };
    }
    const newIdValue = newId("n");
    await conn.execute(
      `INSERT INTO news (title, category, date, summary, body, author, image, is_poster, facebook_url, status,
       updated_by, created_by, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [...values, email, newIdValue]);
    return { ...item, id: newIdValue };
  });
}

export async function deleteNews(id) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute("SELECT image FROM news WHERE id = ? FOR UPDATE", [cleanId(id)]);
    if (!rows[0]) return;
    await conn.execute("DELETE FROM news WHERE id = ?", [id]);
    await deleteUnusedImages(conn, [rows[0].image]);
  });
}

/* =========================================================
   Events
   ========================================================= */
function eventFromRow(row) {
  return { id: row.id, title: row.title, start: row.start_date, end: row.end_date || "", type: row.type, note: row.note };
}

function validateEvent(input) {
  const start = cleanDate(input.start, "a start date", { required: true });
  let end = cleanDate(input.end, "the end date");
  if (end && end < start) throw bad("End date can't be before the start date.");
  if (end === start) end = "";
  const type = EVENT_TYPES.includes(input.type) ? input.type : "activity";
  return {
    title: cleanText(input.title, "the event name", 120, { required: true }),
    start, end, type,
    note: cleanText(input.note, "the note", 200)
  };
}

export async function listEvents() {
  const rows = await query("SELECT * FROM events ORDER BY start_date ASC, title ASC");
  return rows.map(eventFromRow);
}

export async function saveEvent(input, email, id = null) {
  return withTransaction(async (conn) => {
    let existing = null;
    if (id) {
      const [rows] = await conn.execute("SELECT * FROM events WHERE id = ? FOR UPDATE", [cleanId(id)]);
      if (!rows[0]) throw new HttpError(404, "This event no longer exists.", "NOT_FOUND");
      existing = eventFromRow(rows[0]);
    }
    const item = validateEvent({ ...(existing || {}), ...input });
    const values = [item.title, item.start, item.end || null, item.type, item.note, email];
    if (existing) {
      await conn.execute("UPDATE events SET title = ?, start_date = ?, end_date = ?, type = ?, note = ?, updated_by = ? WHERE id = ?",
        [...values, existing.id]);
      return { ...item, id: existing.id };
    }
    const newIdValue = newId("e");
    await conn.execute("INSERT INTO events (title, start_date, end_date, type, note, updated_by, created_by, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [...values, email, newIdValue]);
    return { ...item, id: newIdValue };
  });
}

export async function deleteEvent(id) {
  await query("DELETE FROM events WHERE id = ?", [cleanId(id)]);
}

/* =========================================================
   Albums (Life at ECA)
   ========================================================= */
function albumFromRow(row, photos) {
  return {
    id: row.id, title: row.title, caption: row.caption, category: row.category, date: row.date,
    photos, featured: Boolean(row.featured), status: row.status
  };
}

async function photosByAlbum(runner, albumIds) {
  const map = new Map(albumIds.map((id) => [id, []]));
  if (!albumIds.length) return map;
  const [rows] = await runner.query(
    "SELECT album_id, src FROM album_photos WHERE album_id IN (?) ORDER BY album_id, position", [albumIds]);
  rows.forEach((row) => map.get(row.album_id).push(row.src));
  return map;
}

export async function listAlbums({ publishedOnly = false } = {}) {
  const rows = await query(
    `SELECT * FROM albums ${publishedOnly ? "WHERE status = 'published'" : ""} ORDER BY date DESC, created_at DESC`);
  const photos = await photosByAlbum(getPool(), rows.map((r) => r.id));
  return rows.map((row) => albumFromRow(row, photos.get(row.id)));
}

export async function getAlbum(id) {
  const rows = await query("SELECT * FROM albums WHERE id = ?", [cleanId(id)]);
  if (!rows[0]) return null;
  const photos = await photosByAlbum(getPool(), [rows[0].id]);
  return albumFromRow(rows[0], photos.get(rows[0].id));
}

function validateAlbum(input) {
  const status = cleanStatus(input.status);
  const photos = Array.isArray(input.photos) ? input.photos.map((p) => String(p || "")).filter(Boolean) : [];
  if (photos.length > MAX_ALBUM_PHOTOS) throw bad(`An album can have up to ${MAX_ALBUM_PHOTOS} photos.`);
  const item = {
    title: cleanText(input.title, "a title", 80, { required: true }),
    caption: cleanText(input.caption, "the caption", 100),
    category: cleanText(input.category, "the category", 60),
    date: cleanDate(input.date, "a date") || todayISO(),
    photos,
    featured: Boolean(input.featured),
    status
  };
  if (status === "published" && !photos.length) throw bad("Please add at least one photo before publishing.");
  return item;
}

export async function saveAlbum(input, email, id = null) {
  return withTransaction(async (conn) => {
    let existing = null;
    if (id) {
      const [rows] = await conn.execute("SELECT * FROM albums WHERE id = ? FOR UPDATE", [cleanId(id)]);
      if (!rows[0]) throw new HttpError(404, "This album no longer exists.", "NOT_FOUND");
      const photos = await photosByAlbum(conn, [rows[0].id]);
      existing = albumFromRow(rows[0], photos.get(rows[0].id));
    }
    const item = validateAlbum({ ...(existing || {}), ...input });
    const albumId = existing ? existing.id : newId("al");

    // Homepage pin limit (same rule as the album form)
    if (item.featured && item.status === "published") {
      const [[{ pinned }]] = await conn.query(
        "SELECT COUNT(*) AS pinned FROM albums WHERE featured = 1 AND status = 'published' AND id <> ?", [albumId]);
      if (Number(pinned) >= HOMEPAGE_ALBUM_SPOTS) throw bad(`Only ${HOMEPAGE_ALBUM_SPOTS} albums can be pinned to the homepage.`);
    }

    const photos = [];
    for (const src of item.photos) photos.push(await resolvePhoto(conn, src, email));

    const values = [item.title, item.caption, item.category, item.date, item.featured ? 1 : 0, item.status, email];
    if (existing) {
      await conn.execute("UPDATE albums SET title = ?, caption = ?, category = ?, date = ?, featured = ?, status = ?, updated_by = ? WHERE id = ?",
        [...values, albumId]);
      await conn.execute("DELETE FROM album_photos WHERE album_id = ?", [albumId]);
    } else {
      await conn.execute("INSERT INTO albums (title, caption, category, date, featured, status, updated_by, created_by, id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [...values, email, albumId]);
    }
    for (const [position, src] of photos.entries()) {
      await conn.execute("INSERT INTO album_photos (album_id, position, src) VALUES (?, ?, ?)", [albumId, position, src]);
    }
    if (existing) await deleteUnusedImages(conn, existing.photos.filter((src) => !photos.includes(src)));
    return { ...item, photos, id: albumId };
  });
}

export async function deleteAlbum(id) {
  return withTransaction(async (conn) => {
    const [rows] = await conn.execute("SELECT src FROM album_photos WHERE album_id = ?", [cleanId(id)]);
    await conn.execute("DELETE FROM albums WHERE id = ?", [id]); // album_photos go with it (ON DELETE CASCADE)
    await deleteUnusedImages(conn, rows.map((r) => r.src));
  });
}

/* =========================================================
   Announcement bar
   ========================================================= */
export async function getAnnouncements() {
  const [messages, settings] = await Promise.all([
    query("SELECT id, text, link, visible FROM announcements ORDER BY position, id"),
    query("SELECT value FROM site_settings WHERE name = 'announcements_enabled'")
  ]);
  return {
    enabled: settings[0] ? settings[0].value === "1" : true,
    messages: messages.map((m) => ({ id: m.id, text: m.text, link: m.link, visible: Boolean(m.visible) }))
  };
}

// Replaces the whole bar at once (the page has one "Save changes" button)
export async function saveAnnouncements(input) {
  const list = Array.isArray(input && input.messages) ? input.messages : [];
  if (list.length > MAX_ANNOUNCEMENTS) throw bad(`You can have up to ${MAX_ANNOUNCEMENTS} messages.`);
  const seen = new Set();
  const messages = list.map((m) => {
    let id = /^[A-Za-z0-9_-]{1,64}$/.test(String(m.id || "")) ? String(m.id) : newId("a");
    if (seen.has(id)) id = newId("a");
    seen.add(id);
    return { id, text: cleanText(m.text, "the message", 150, { required: true }), link: cleanLink(m.link), visible: m.visible !== false };
  });
  const enabled = Boolean(input && input.enabled);

  await withTransaction(async (conn) => {
    await conn.execute("DELETE FROM announcements");
    for (const [position, m] of messages.entries()) {
      await conn.execute("INSERT INTO announcements (id, text, link, visible, position) VALUES (?, ?, ?, ?, ?)",
        [m.id, m.text, m.link, m.visible ? 1 : 0, position]);
    }
    await conn.execute(
      "INSERT INTO site_settings (name, value) VALUES ('announcements_enabled', ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [enabled ? "1" : "0"]);
  });
  return { enabled, messages };
}

/* =========================================================
   Everything the public website shows (published only)
   ========================================================= */
export async function getPublicContent() {
  const [news, events, albums, announcements] = await Promise.all([
    listNews({ publishedOnly: true }), listEvents(), listAlbums({ publishedOnly: true }), getAnnouncements()
  ]);
  return { news, events, albums, announcements };
}
