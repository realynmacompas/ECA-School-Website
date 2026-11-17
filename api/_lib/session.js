/* =========================================================
   Admin session cookie.
   After Google sign-in is verified, the server gives the
   browser a signed cookie ("eca_admin"):
   - HttpOnly: page scripts can't read or steal it
   - SameSite=Lax: other websites can't use it to send requests
   - Secure on https (the live site)
   - Signed with SESSION_SECRET, so it can't be edited or faked
   ========================================================= */
import crypto from "node:crypto";
import { requireEnv, sessionHours } from "./config.js";

export const COOKIE_NAME = "eca_admin";

function sign(payloadPart) {
  return crypto.createHmac("sha256", requireEnv("SESSION_SECRET")).update(payloadPart).digest("base64url");
}

export function createSessionToken(email) {
  const now = Math.floor(Date.now() / 1000);
  const payload = { email, iat: now, exp: now + Math.round(sessionHours() * 3600) };
  const payloadPart = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${payloadPart}.${sign(payloadPart)}`, expiresAt: payload.exp };
}

// Returns { email, exp } or null if missing, edited or expired
export function readSessionToken(token) {
  if (!token || typeof token !== "string") return null;
  const [payloadPart, signature] = token.split(".");
  if (!payloadPart || !signature) return null;

  const expected = Buffer.from(sign(payloadPart));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    if (!payload.email || !payload.exp || payload.exp < Date.now() / 1000) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

export function getCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function isHttps(req) {
  const proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  return proto === "https" || Boolean(req.socket && req.socket.encrypted);
}

export function setSessionCookie(req, res, token, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.round(maxAgeSeconds))}`
  ];
  if (isHttps(req)) parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

export function clearSessionCookie(req, res) {
  setSessionCookie(req, res, "", 0);
}

/* ---------- Signed short-lived values (e.g. the Google Drive "state") ---------- */
// Returns "payload.signature"; readSignedValue gives the object back, or null if edited or expired
export function createSignedValue(data, maxAgeSeconds) {
  const payloadPart = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + maxAgeSeconds })).toString("base64url");
  return `${payloadPart}.${sign(payloadPart)}`;
}

export function readSignedValue(value) {
  const [payloadPart, signature] = String(value || "").split(".");
  if (!payloadPart || !signature) return null;
  const expected = Buffer.from(sign(payloadPart));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !crypto.timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
    return data.exp && data.exp >= Date.now() / 1000 ? data : null;
  } catch (err) {
    return null;
  }
}

/* ---------- Encrypting secrets stored in the database (AES-256-GCM) ----------
   Used for the Google Drive key. The encryption key comes from SESSION_SECRET,
   so changing SESSION_SECRET means connecting Google Drive again. */
function encryptionKey() {
  return crypto.createHash("sha256").update(`eca-db-secrets:${requireEnv("SESSION_SECRET")}`).digest();
}

export function encryptSecret(plainText) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(String(plainText), "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(stored) {
  const [version, iv, tag, data] = String(stored || "").split(".");
  if (version !== "v1" || !iv || !tag || !data) throw new Error("Unreadable secret");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
