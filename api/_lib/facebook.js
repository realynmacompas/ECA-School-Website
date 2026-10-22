/* =========================================================
   Facebook Page: post news and albums from the admin

   WHICH PAGE?  Whoever clicks "Connect Facebook Page" in the
   admin (Settings page), logs in to Facebook and picks a Page
   they manage. Switching to the school's Page later = click
   "Switch Page" and pick that Page. No code or Vercel changes.

   WHO CAN CONNECT?  While the Meta app is in Development mode,
   only people with a role on the app (Meta for Developers >
   App roles) can log in. Add the school's Page admin there
   before the handover.

   HOW?  Facebook gives a "Page access token" made from a
   long-lived login, so it doesn't expire. It is stored
   encrypted (SESSION_SECRET) in facebook_connection.

   WHEN?  Only when a post or album is PUBLISHED with "Also
   post to the school's Facebook page" ticked, and only once
   (facebook_post_id remembers it). A Facebook problem never
   stops the website save; the admin sees a warning instead.

   Settings needed: FACEBOOK_APP_ID, FACEBOOK_APP_SECRET,
   SESSION_SECRET. Optional: SITE_URL, FACEBOOK_GRAPH_VERSION,
   FACEBOOK_LOGIN_CONFIG_ID.
   ========================================================= */
import { requireEnv } from "./config.js";
import { getPool, query } from "./db.js";
import { HttpError } from "./http.js";
import { createSignedValue, readSignedValue, encryptSecret, decryptSecret } from "./session.js";

export const FACEBOOK_PERMISSIONS = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
const GRAPH_VERSION = () => (process.env.FACEBOOK_GRAPH_VERSION || "v23.0").trim();
const GRAPH = () => `https://graph.facebook.com/${GRAPH_VERSION()}`;
const MAX_MESSAGE = 5000;

// The public website address used in Facebook posts ("Read more: ...").
// Not taken from the request, so posts made while testing on localhost still link to the real site.
export function siteUrl() {
  return (process.env.SITE_URL || "https://eca-school-website.vercel.app").trim().replace(/\/+$/, "");
}

export class FacebookError extends HttpError {
  constructor(message, code = "FACEBOOK_ERROR", status = 502) {
    super(status, message, code);
  }
}

export function isConfigured() {
  return Boolean(process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET);
}

/* ---------- Talking to Facebook (Graph API) ---------- */
async function graph(path, { method = "GET", params = {}, form = null } = {}) {
  const url = new URL(`${GRAPH()}/${path.replace(/^\//, "")}`);
  let body;
  if (form) {
    body = form;                                   // multipart (photo uploads)
  } else if (method === "GET") {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  } else {
    body = new URLSearchParams(params);
  }
  let response;
  try {
    response = await fetch(url, { method, body });
  } catch (err) {
    throw new FacebookError("Couldn't reach Facebook. Please try again.", "FACEBOOK_UNAVAILABLE");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const e = data.error || {};
    console.error("[facebook] API error:", response.status, e.code, e.error_subcode, e.message);
    // 190 = the key is no longer valid (password changed, app removed, Page role removed...)
    if (e.code === 190 || e.code === 102) {
      throw new FacebookError("Facebook access was removed or expired. Reconnect in Settings > Facebook Page.", "FACEBOOK_RECONNECT");
    }
    if (e.code === 10 || e.code === 200 || e.code === 3) {
      throw new FacebookError("Facebook didn't allow this post. Reconnect in Settings > Facebook Page and allow all the permissions.", "FACEBOOK_PERMISSION");
    }
    const error = new FacebookError(`Facebook error: ${String(e.message || response.status).slice(0, 200)}`);
    error.fbCode = e.code;
    throw error;
  }
  return data;
}

/* ---------- Connecting (Facebook login, then pick a Page) ---------- */
export function redirectUri(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim()
    || (req.socket && req.socket.encrypted ? "https" : "http");
  return `${proto}://${req.headers.host}/api/facebook/callback`;
}

export function buildConnectUrl(req, adminEmail) {
  const params = new URLSearchParams({
    client_id: requireEnv("FACEBOOK_APP_ID"),
    redirect_uri: redirectUri(req),
    response_type: "code",
    state: createSignedValue({ admin: adminEmail, for: "facebook" }, 10 * 60),
    auth_type: "rerequest"                         // ask again for permissions that were unticked before
  });
  // "Facebook Login for Business" apps use a configuration id instead of a scope list
  if (process.env.FACEBOOK_LOGIN_CONFIG_ID) params.set("config_id", process.env.FACEBOOK_LOGIN_CONFIG_ID.trim());
  else params.set("scope", FACEBOOK_PERMISSIONS.join(","));
  return `https://www.facebook.com/${GRAPH_VERSION()}/dialog/oauth?${params}`;
}

// Facebook sent the person back with ?code=...&state=...
// Returns the Pages they manage. One Page = connected right away; several = they choose in Settings.
export async function finishConnect(req, { code, state }, admin) {
  const signed = readSignedValue(state);
  if (!signed || signed.admin !== admin.email || signed.for !== "facebook") {
    throw new FacebookError("The Facebook login took too long or didn't match. Please click Connect again.", "BAD_STATE", 400);
  }
  const appId = requireEnv("FACEBOOK_APP_ID");
  const appSecret = requireEnv("FACEBOOK_APP_SECRET");

  const short = await graph("oauth/access_token", {
    params: { client_id: appId, client_secret: appSecret, redirect_uri: redirectUri(req), code: String(code || "") }
  });
  // Long-lived login → Page keys made from it don't expire
  const long = await graph("oauth/access_token", {
    params: { grant_type: "fb_exchange_token", client_id: appId, client_secret: appSecret, fb_exchange_token: short.access_token }
  });
  const userToken = long.access_token || short.access_token;

  const permissions = await graph("me/permissions", { params: { access_token: userToken } });
  const granted = new Set((permissions.data || []).filter((p) => p.status === "granted").map((p) => p.permission));
  const missing = FACEBOOK_PERMISSIONS.filter((p) => !granted.has(p));
  if (missing.length) {
    throw new FacebookError(`Facebook permission wasn't given (${missing.join(", ")}). Click Connect again and allow everything, including the Page.`, "FACEBOOK_PERMISSION", 400);
  }

  const me = await graph("me", { params: { fields: "name", access_token: userToken } });
  const accounts = await graph("me/accounts", { params: { fields: "id,name,access_token,tasks", limit: "100", access_token: userToken } });
  const pages = (accounts.data || []).filter((p) => p.access_token && (!p.tasks || p.tasks.includes("CREATE_CONTENT")));
  if (!pages.length) {
    throw new FacebookError("No Facebook Page was shared, or you can't post on it. Click Connect again and tick the Page you manage.", "NO_PAGES", 400);
  }

  await query("DELETE FROM facebook_page_choices");
  for (const page of pages) {
    await query("INSERT INTO facebook_page_choices (page_id, page_name, page_token, user_name, chosen_by) VALUES (?, ?, ?, ?, ?)",
      [String(page.id), String(page.name || "").slice(0, 200), encryptSecret(page.access_token), String(me.name || "").slice(0, 120), admin.email]);
  }
  if (pages.length === 1) {
    const connected = await selectPage(pages[0].id, admin);
    return { choose: false, pageName: connected.pageName };
  }
  return { choose: true, count: pages.length };
}

// Pages waiting to be chosen (after logging in with an account that manages several)
export async function pageChoices(admin) {
  const rows = await query("SELECT page_id, page_name FROM facebook_page_choices WHERE chosen_by = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 30 MINUTE ORDER BY page_name", [admin.email]);
  return rows.map((r) => ({ id: r.page_id, name: r.page_name }));
}

export async function selectPage(pageId, admin) {
  const rows = await query("SELECT page_id, page_name, page_token, user_name FROM facebook_page_choices WHERE page_id = ? AND chosen_by = ?",
    [String(pageId || ""), admin.email]);
  if (!rows[0]) throw new FacebookError("That Page choice expired. Please click Connect again.", "CHOICE_EXPIRED", 400);
  const choice = rows[0];
  await query(
    `INSERT INTO facebook_connection (id, page_id, page_name, page_token, user_name, connected_by, connected_at)
     VALUES (1, ?, ?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE page_id = VALUES(page_id), page_name = VALUES(page_name), page_token = VALUES(page_token),
       user_name = VALUES(user_name), connected_by = VALUES(connected_by), connected_at = VALUES(connected_at)`,
    [choice.page_id, choice.page_name, choice.page_token, choice.user_name, admin.email]);
  await query("DELETE FROM facebook_page_choices");
  return { pageId: choice.page_id, pageName: choice.page_name };
}

export async function disconnect() {
  await query("DELETE FROM facebook_connection WHERE id = 1");
  await query("DELETE FROM facebook_page_choices");
}

async function getConnection() {
  const rows = await query("SELECT page_id, page_name, page_token, user_name, connected_by, connected_at FROM facebook_connection WHERE id = 1");
  if (!rows[0]) return null;
  let token = "";
  try { token = decryptSecret(rows[0].page_token); } catch (err) { /* SESSION_SECRET changed */ }
  return {
    pageId: rows[0].page_id, pageName: rows[0].page_name, token, userName: rows[0].user_name,
    connectedBy: rows[0].connected_by, connectedAt: rows[0].connected_at
  };
}

/* ---------- For the Settings page and the forms ---------- */
export async function facebookStatus(admin) {
  const configured = isConfigured();
  const connection = await getConnection();
  const choices = admin ? await pageChoices(admin) : [];
  if (!connection) return { configured, connected: false, choices };
  return {
    configured,
    connected: true,
    needsReconnect: !connection.token,
    pageId: connection.pageId,
    pageName: connection.pageName,
    pageUrl: `https://www.facebook.com/${encodeURIComponent(connection.pageId)}`,
    userName: connection.userName,
    connectedBy: connection.connectedBy,
    connectedAt: connection.connectedAt,
    choices
  };
}

/* ---------- Writing the post ---------- */
function postText(kind, item) {
  const parts = [item.title];
  if (kind === "news") {
    const text = item.body || item.summary;
    if (text) parts.push(text);
    parts.push(`Read more: ${siteUrl()}/news.html#${encodeURIComponent(item.id)}`);
  } else {
    if (item.caption) parts.push(item.caption);
    parts.push(`See the album: ${siteUrl()}/life.html#${encodeURIComponent(item.id)}`);
  }
  let message = parts.join("\n\n");
  if (message.length > MAX_MESSAGE) message = `${message.slice(0, MAX_MESSAGE - 1)}…`;
  return message;
}

const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

// Uploads one photo to the Page. extra = { published: "false" } for albums, or { message } for one-photo posts.
async function uploadPhoto(connection, src, extra) {
  const form = new FormData();
  form.set("access_token", connection.token);
  for (const [k, v] of Object.entries(extra)) form.set(k, v);

  const match = /^api\/image\?id=(\d+)$/.exec(String(src || ""));
  if (match) {
    const [[row]] = await getPool().query("SELECT mime, data FROM images WHERE id = ?", [Number(match[1])]);
    if (!row) throw new FacebookError("A photo of this post couldn't be found.", "PHOTO_MISSING", 400);
    form.set("source", new Blob([row.data], { type: row.mime }), `photo.${EXTENSIONS[row.mime] || "jpg"}`);
  } else if (/^assets\/images\/[\w./-]+$/.test(String(src || ""))) {
    // Photos that ship with the website: Facebook downloads them from the live site
    form.set("url", `${siteUrl()}/${src}`);
  } else {
    throw new FacebookError("A photo of this post can't be sent to Facebook.", "PHOTO_UNSUPPORTED", 400);
  }
  return graph(`${connection.pageId}/photos`, { method: "POST", form });
}

async function publish(connection, kind, item) {
  const message = postText(kind, item);
  const photos = (kind === "news" ? [item.image] : item.photos).filter(Boolean);
  let postId;

  if (photos.length === 1) {
    const result = await uploadPhoto(connection, photos[0], { message });
    postId = result.post_id || `${connection.pageId}_${result.id}`;
  } else if (photos.length > 1) {
    const params = { message, access_token: connection.token };
    for (const [i, src] of photos.entries()) {
      const uploaded = await uploadPhoto(connection, src, { published: "false" });
      params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: uploaded.id });
    }
    postId = (await graph(`${connection.pageId}/feed`, { method: "POST", params })).id;
  } else {
    postId = (await graph(`${connection.pageId}/feed`, { method: "POST", params: { message, access_token: connection.token } })).id;
  }

  let url = "";
  try {
    url = (await graph(postId, { params: { fields: "permalink_url", access_token: connection.token } })).permalink_url || "";
  } catch (err) { /* the post exists; the link is a nice extra */ }
  if (!url || !/^https:\/\/([\w-]+\.)?facebook\.com\//.test(url)) url = `https://www.facebook.com/${postId}`;
  return { postId, url };
}

/* Called after saving a published post or album with "Also post to Facebook" ticked.
   Never throws: the website save already worked. Returns what to tell the admin. */
export async function shareQuietly(kind, item) {
  const table = kind === "news" ? "news" : "albums";
  try {
    const [[row]] = await getPool().query(`SELECT facebook_post_id FROM ${table} WHERE id = ?`, [item.id]);
    if (!row) return null;
    if (row.facebook_post_id) return { posted: false, already: true };

    const connection = await getConnection();
    if (!connection) return { posted: false, error: "No Facebook Page is connected (Settings > Facebook Page)." };
    if (!connection.token) return { posted: false, error: "The saved Facebook key can't be read. Reconnect in Settings > Facebook Page." };

    const { postId, url } = await publish(connection, kind, item);
    await query(`UPDATE ${table} SET facebook_post_id = ?, facebook_url = ? WHERE id = ?`, [postId, url, item.id]);
    return { posted: true, url, pageName: connection.pageName };
  } catch (err) {
    console.error(`[facebook] couldn't post ${kind} ${item.id}:`, err.code, err.message);
    return { posted: false, error: err instanceof HttpError ? err.message : "Couldn't post to Facebook. Please try again later." };
  }
}
