/* =========================================================
   Who is allowed in.
   1. verifyGoogleCredential: asks Google's library to check the
      sign-in token (signature, expiry, issuer, and that it was
      made for OUR Client ID).
   2. findActiveAdmin: the email must be in the admins table
      with is_active = 1. Manage it with:
        npm run admin:add -- name@gmail.com
        npm run admin:remove -- name@gmail.com
   3. requireAdmin: used by every admin API. Reads the session
      cookie and re-checks the admins table on every request,
      so removing someone takes effect right away.
   ========================================================= */
import { OAuth2Client } from "google-auth-library";
import { requireEnv } from "./config.js";
import { query } from "./db.js";
import { HttpError } from "./http.js";
import { COOKIE_NAME, getCookie, readSessionToken, clearSessionCookie } from "./session.js";

let googleClient = null;

export async function verifyGoogleCredential(credential) {
  if (!credential || typeof credential !== "string") {
    throw new HttpError(400, "Missing Google sign-in.");
  }
  const clientId = requireEnv("GOOGLE_CLIENT_ID");
  googleClient = googleClient || new OAuth2Client(clientId);

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
    payload = ticket.getPayload();
  } catch (err) {
    throw new HttpError(401, "Google sign-in couldn't be verified. Please try again.", "BAD_GOOGLE_TOKEN");
  }
  if (!payload || !payload.email || payload.email_verified !== true) {
    throw new HttpError(401, "This Google account's email address isn't verified.", "EMAIL_NOT_VERIFIED");
  }
  return {
    email: payload.email.toLowerCase(),
    name: payload.name || "",
    picture: payload.picture || ""
  };
}

export async function findActiveAdmin(email) {
  const rows = await query(
    "SELECT id, email, name, role FROM admins WHERE email = ? AND is_active = 1 LIMIT 1",
    [String(email || "").toLowerCase()]
  );
  return rows[0] || null;
}

// Throws 401 if not signed in. For POST/PUT/PATCH/DELETE also requires the
// "X-ECA-Admin" header, which other websites can't add (extra protection).
export async function requireAdmin(req, res) {
  if (!["GET", "HEAD"].includes(req.method) && req.headers["x-eca-admin"] !== "1") {
    throw new HttpError(403, "Request blocked.", "MISSING_HEADER");
  }
  const session = readSessionToken(getCookie(req, COOKIE_NAME));
  if (!session) throw new HttpError(401, "Please sign in.", "SIGNED_OUT");

  const admin = await findActiveAdmin(session.email);
  if (!admin) {
    clearSessionCookie(req, res);
    throw new HttpError(401, "Your account no longer has access. Please contact the website administrator.", "NOT_ADMIN");
  }
  return { ...admin, sessionExpiresAt: session.exp };
}
