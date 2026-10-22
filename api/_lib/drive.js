/* =========================================================
   Google Drive: an organized copy of every uploaded photo

   WHO'S DRIVE?  Whoever clicks "Connect Google Drive" in the
   admin (Settings page) and signs in with Google. Switching to
   the school's account later = click "Switch account" and sign
   in with that account. Nothing in the code or Vercel changes.

   WHAT CAN THE WEBSITE SEE?  Only files and folders it created
   itself (Google's "drive.file" permission). It can't read
   anything else in that Drive.

   WHERE?  ECA Website / News / 2026-10 Foundation Day / ...
           ECA Website / Albums / 2026-10 Sports Fest / ...

   The website keeps showing photos from its own database, so a
   Drive problem (or a switch) never breaks the public pages.
   Photos deleted from the website stay in Drive (archive).

   Settings needed: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET,
   SESSION_SECRET (encrypts the stored Drive key).
   ========================================================= */
import { requireEnv } from "./config.js";
import { getPool, query } from "./db.js";
import { HttpError } from "./http.js";
import { createSignedValue, readSignedValue, encryptSecret, decryptSecret } from "./session.js";

export const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const ROOT_FOLDER_NAME = () => (process.env.DRIVE_ROOT_FOLDER_NAME || "ECA Website").trim();
const FOLDER_MIME = "application/vnd.google-apps.folder";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const API = "https://www.googleapis.com/drive/v3";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

export class DriveError extends HttpError {
  constructor(message, code = "DRIVE_ERROR", status = 502) {
    super(status, message, code);
  }
}

/* ---------- Connecting an account (Google sign-in with Drive permission) ---------- */

// The address Google sends the person back to. Must be listed in Google Cloud >
// Credentials > the OAuth client > Authorized redirect URIs.
export function redirectUri(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim()
    || (req.socket && req.socket.encrypted ? "https" : "http");
  return `${proto}://${req.headers.host}/api/drive/callback`;
}

export function buildConnectUrl(req, adminEmail) {
  const params = new URLSearchParams({
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    redirect_uri: redirectUri(req),
    response_type: "code",
    scope: `openid email ${DRIVE_SCOPE}`,
    access_type: "offline",            // gives a long-lasting key (refresh token)
    prompt: "consent select_account",  // always ask which account, always return the key
    include_granted_scopes: "false",
    state: createSignedValue({ admin: adminEmail }, 10 * 60) // 10 minutes to finish signing in
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

function decodeJwtPayload(jwt) {
  try {
    return JSON.parse(Buffer.from(String(jwt).split(".")[1], "base64url").toString("utf8"));
  } catch (err) {
    return {};
  }
}

async function postForm(url, fields) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(fields)
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

// Google sent the person back with ?code=...&state=...
export async function finishConnect(req, { code, state }, admin) {
  const signed = readSignedValue(state);
  if (!signed || signed.admin !== admin.email) {
    throw new DriveError("The Google sign-in took too long or didn't match. Please click Connect again.", "BAD_STATE", 400);
  }
  const { ok, data } = await postForm(TOKEN_URL, {
    code: String(code || ""),
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    redirect_uri: redirectUri(req),
    grant_type: "authorization_code"
  });
  if (!ok) {
    console.error("[drive] code exchange failed:", data.error, data.error_description);
    throw new DriveError("Google didn't accept the sign-in. Please click Connect again.", "EXCHANGE_FAILED", 400);
  }
  const scopes = String(data.scope || "").split(" ");
  if (!scopes.includes(DRIVE_SCOPE)) {
    throw new DriveError("Google Drive permission wasn't given. Click Connect again and tick the Google Drive box.", "NO_DRIVE_SCOPE", 400);
  }
  if (!data.refresh_token) {
    throw new DriveError("Google didn't give a long-lasting key. Please click Connect again.", "NO_REFRESH_TOKEN", 400);
  }
  // The ID token comes straight from Google's token address over HTTPS, so it can be trusted as-is
  const profile = decodeJwtPayload(data.id_token);
  if (!profile.email || profile.email_verified !== true) {
    throw new DriveError("Couldn't read that Google account's email. Please try again.", "NO_EMAIL", 400);
  }
  const email = String(profile.email).toLowerCase();
  accessTokenCache = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in || 0) - 120) * 1000, refreshToken: data.refresh_token };

  const rootFolderId = await findOrCreateFolder(ROOT_FOLDER_NAME(), "root", data.access_token);
  const previous = await getConnectionRow();

  await query(
    `INSERT INTO drive_connection (id, email, refresh_token, root_folder_id, connected_by, connected_at)
     VALUES (1, ?, ?, ?, ?, UTC_TIMESTAMP())
     ON DUPLICATE KEY UPDATE email = VALUES(email), refresh_token = VALUES(refresh_token),
       root_folder_id = VALUES(root_folder_id), connected_by = VALUES(connected_by), connected_at = VALUES(connected_at)`,
    [email, encryptSecret(data.refresh_token), rootFolderId, admin.email]);

  // Switching accounts: give back the old account's access
  if (previous && previous.refreshToken && previous.refreshToken !== data.refresh_token) {
    await revoke(previous.refreshToken);
  }
  return { email, rootFolderId };
}

async function revoke(refreshToken) {
  try {
    await postForm("https://oauth2.googleapis.com/revoke", { token: refreshToken });
  } catch (err) { /* best effort: the key is deleted from our database anyway */ }
}

export async function disconnect() {
  const connection = await getConnectionRow();
  if (!connection) return;
  if (connection.refreshToken) await revoke(connection.refreshToken);
  await query("DELETE FROM drive_folders WHERE root_folder_id = ?", [connection.rootFolderId]);
  await query("DELETE FROM drive_connection WHERE id = 1");
  accessTokenCache = null;
}

/* ---------- The stored connection ---------- */
async function getConnectionRow() {
  const rows = await query("SELECT email, refresh_token, root_folder_id, connected_by, connected_at FROM drive_connection WHERE id = 1");
  if (!rows[0]) return null;
  let refreshToken = "";
  try { refreshToken = decryptSecret(rows[0].refresh_token); } catch (err) { /* SESSION_SECRET changed */ }
  return {
    email: rows[0].email, refreshToken, rootFolderId: rows[0].root_folder_id,
    connectedBy: rows[0].connected_by, connectedAt: rows[0].connected_at
  };
}

let accessTokenCache = null; // { token, expiresAt, refreshToken }

async function accessToken(connection) {
  if (!connection.refreshToken) {
    throw new DriveError("The saved Google Drive key can't be read (SESSION_SECRET changed?). Reconnect in Settings > Google Drive.", "DRIVE_RECONNECT");
  }
  if (accessTokenCache && accessTokenCache.refreshToken === connection.refreshToken && accessTokenCache.expiresAt > Date.now()) {
    return accessTokenCache.token;
  }
  const { ok, data } = await postForm(TOKEN_URL, {
    client_id: requireEnv("GOOGLE_CLIENT_ID"),
    client_secret: requireEnv("GOOGLE_CLIENT_SECRET"),
    refresh_token: connection.refreshToken,
    grant_type: "refresh_token"
  });
  if (!ok) {
    console.error("[drive] token refresh failed:", data.error, data.error_description);
    if (data.error === "invalid_grant") {
      throw new DriveError(`Google Drive access for ${connection.email} was removed or expired. Reconnect in Settings > Google Drive.`, "DRIVE_RECONNECT");
    }
    throw new DriveError("Couldn't reach Google Drive. Please try again.", "DRIVE_UNAVAILABLE");
  }
  accessTokenCache = { token: data.access_token, expiresAt: Date.now() + (Number(data.expires_in || 3600) - 120) * 1000, refreshToken: connection.refreshToken };
  return data.access_token;
}

async function driveRequest(url, token, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, ...(options.headers || {}) } });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    const error = new DriveError(`Google Drive error (${response.status}).`, "DRIVE_API_ERROR");
    error.httpStatus = response.status;
    error.detail = detail.slice(0, 300);
    throw error;
  }
  return response;
}

/* ---------- Folders ---------- */
function folderQuery(name, parentId) {
  const safe = name.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  return `name = '${safe}' and mimeType = '${FOLDER_MIME}' and '${parentId}' in parents and trashed = false`;
}

async function findOrCreateFolder(name, parentId, token) {
  const search = await driveRequest(`${API}/files?${new URLSearchParams({ q: folderQuery(name, parentId), fields: "files(id)", pageSize: "1", spaces: "drive" })}`, token);
  const found = (await search.json()).files || [];
  if (found[0]) return found[0].id;
  const created = await driveRequest(`${API}/files?fields=id`, token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] })
  });
  return (await created.json()).id;
}

// "News/2026-10 Foundation Day" → folder id (created if needed, remembered in drive_folders)
async function ensureFolderPath(connection, folderPath, token) {
  let parentId = connection.rootFolderId;
  let soFar = "";
  for (const name of folderPath.split("/")) {
    soFar = soFar ? `${soFar}/${name}` : name;
    const cached = await query("SELECT folder_id FROM drive_folders WHERE root_folder_id = ? AND path = ?", [connection.rootFolderId, soFar]);
    if (cached[0]) {
      parentId = cached[0].folder_id;
      continue;
    }
    parentId = await findOrCreateFolder(name, parentId, token);
    await query("INSERT INTO drive_folders (root_folder_id, path, folder_id) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE folder_id = VALUES(folder_id)",
      [connection.rootFolderId, soFar, parentId]);
  }
  return parentId;
}

async function forgetFolders(connection) {
  await query("DELETE FROM drive_folders WHERE root_folder_id = ?", [connection.rootFolderId]);
}

/* ---------- Uploading ---------- */
const EXTENSIONS = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

function cleanName(text, max = 80) {
  return String(text || "Untitled").replace(/[\\/\u0000-\u001f]+/g, "-").replace(/\s+/g, " ").trim().slice(0, max) || "Untitled";
}

async function uploadFile(token, { name, mime, data, folderId }) {
  const boundary = `eca-${Date.now().toString(36)}`;
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [folderId] })}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${mime}\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--`)
  ]);
  const response = await driveRequest(`${UPLOAD_API}/files?uploadType=multipart&fields=id`, token, {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body
  });
  return (await response.json()).id;
}

// Where a photo belongs, from the post or album that uses it
async function photoContext(imageId) {
  const src = `api/image?id=${imageId}`;
  const [rows] = await getPool().query(
    `(SELECT 'News' AS kind, title, date, 0 AS position FROM news WHERE image = ? LIMIT 1)
     UNION ALL
     (SELECT 'Albums' AS kind, a.title, a.date, p.position FROM album_photos p JOIN albums a ON a.id = p.album_id WHERE p.src = ? LIMIT 1)
     LIMIT 1`, [src, src]);
  return rows[0] || null;
}

/* ---------- Copying photos to the connected Drive ----------
   Copies photos that aren't in the CURRENT account's Drive yet
   (new uploads, or everything after switching accounts).
   ids: only these photos (after a save) · timeLimitMs: stop early, the rest waits. */
export async function syncImages({ ids = null, limit = 25, timeLimitMs = 20000 } = {}) {
  const connection = await getConnectionRow();
  if (!connection) return { connected: false, copied: 0, failed: 0, remaining: 0 };
  const started = Date.now();
  const token = await accessToken(connection);

  const idFilter = ids && ids.length ? `AND i.id IN (${ids.map(() => "?").join(",")})` : "";
  const [pending] = await getPool().query(
    `SELECT i.id, i.mime FROM images i
     WHERE (i.drive_account IS NULL OR i.drive_account <> ?) ${idFilter}
       AND (EXISTS (SELECT 1 FROM news n WHERE n.image = CONCAT('api/image?id=', i.id))
         OR EXISTS (SELECT 1 FROM album_photos p WHERE p.src = CONCAT('api/image?id=', i.id)))
     ORDER BY i.id LIMIT ?`,
    [connection.email, ...(ids || []), limit]);

  let copied = 0;
  let failed = 0;
  let lastError = "";
  for (const image of pending) {
    if (Date.now() - started > timeLimitMs) break;
    try {
      const context = await photoContext(image.id);
      if (!context) continue;
      const folderPath = `${context.kind}/${String(context.date).slice(0, 7)} ${cleanName(context.title)}`;
      const name = `${cleanName(context.title, 60)} - ${context.kind === "Albums" ? `photo ${Number(context.position) + 1}` : "photo"} (${image.id}).${EXTENSIONS[image.mime] || "jpg"}`;
      const [[row]] = await getPool().query("SELECT data FROM images WHERE id = ?", [image.id]);

      let fileId;
      try {
        fileId = await uploadFile(token, { name, mime: image.mime, data: row.data, folderId: await ensureFolderPath(connection, folderPath, token) });
      } catch (err) {
        if (err.httpStatus !== 404) throw err;
        // A remembered folder was deleted in Drive: forget the folders and try once more
        await forgetFolders(connection);
        fileId = await uploadFile(token, { name, mime: image.mime, data: row.data, folderId: await ensureFolderPath(connection, folderPath, token) });
      }
      await query("UPDATE images SET drive_file_id = ?, drive_account = ?, drive_synced_at = UTC_TIMESTAMP() WHERE id = ?",
        [fileId, connection.email, image.id]);
      copied++;
    } catch (err) {
      failed++;
      lastError = err.message;
      console.error(`[drive] couldn't copy photo ${image.id}:`, err.code, err.message, err.detail || "");
      if (err.code === "DRIVE_RECONNECT") throw err;
      if (err.httpStatus === 404 && String(err.detail).includes(connection.rootFolderId)) {
        throw new DriveError(`The "${ROOT_FOLDER_NAME()}" folder was deleted from Drive. Click Switch account (same account is fine) to create it again.`, "DRIVE_RECONNECT");
      }
    }
  }
  const { remaining } = await pendingCount(connection.email);
  return { connected: true, copied, failed, remaining, error: failed ? lastError : undefined };
}

async function pendingCount(email) {
  const [[counts]] = await getPool().query(
    `SELECT COUNT(*) AS total, SUM(i.drive_account IS NULL OR i.drive_account <> ?) AS remaining FROM images i
     WHERE EXISTS (SELECT 1 FROM news n WHERE n.image = CONCAT('api/image?id=', i.id))
        OR EXISTS (SELECT 1 FROM album_photos p WHERE p.src = CONCAT('api/image?id=', i.id))`, [email || ""]);
  return { total: Number(counts.total || 0), remaining: Number(counts.remaining || 0) };
}

/* ---------- For the Settings page ---------- */
export async function driveStatus() {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const connection = await getConnectionRow();
  const counts = await pendingCount(connection ? connection.email : "");
  if (!connection) return { configured, connected: false, photos: counts };
  return {
    configured,
    connected: true,
    email: connection.email,
    connectedBy: connection.connectedBy,
    connectedAt: connection.connectedAt,
    needsReconnect: !connection.refreshToken,
    folderName: ROOT_FOLDER_NAME(),
    folderUrl: `https://drive.google.com/drive/folders/${encodeURIComponent(connection.rootFolderId)}`,
    photos: counts
  };
}

// Used after saving a post or album: copy its new photos right away (never fails the save)
export async function copyToDriveQuietly(imageSources) {
  const ids = imageSources.map((src) => /^api\/image\?id=(\d+)$/.exec(String(src || ""))).filter(Boolean).map((m) => Number(m[1]));
  if (!ids.length) return null;
  try {
    return await syncImages({ ids, limit: ids.length, timeLimitMs: 15000 });
  } catch (err) {
    console.error("[drive] copy after save failed:", err.code, err.message);
    return { connected: true, copied: 0, failed: ids.length, error: err.message };
  }
}
