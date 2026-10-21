/* =========================================================
   ECA Admin - sign-in session helpers
   Used by the login page and by layout.js on every admin page.
   Settings (Client ID, allowed emails) are in auth-config.js.

   HOW IT WORKS
   - Google's button gives us a signed "ID token" (credential)
     that says who the person is (email, name, picture).
   - We check that the email is on the staff list, then keep
     a session in sessionStorage (closing the tab signs out).

   IMPORTANT - what this does NOT protect yet
   Checks that run in the browser can be skipped by anyone
   using the browser's developer tools. That is acceptable
   while the admin only saves to this browser (store.js demo
   mode). When the admin starts saving to a real server, the
   server must verify the Google token's signature and the
   email on every save. The token is kept in the session
   (session.credential) so it can be sent to the server then.
   ========================================================= */

const ADMIN_SESSION_KEY = "ecaAdminSession";
const GOOGLE_ISSUERS = ["accounts.google.com", "https://accounts.google.com"];

function isGoogleConfigured() {
  return typeof GOOGLE_CLIENT_ID === "string"
    && /\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID)
    && !GOOGLE_CLIENT_ID.startsWith("PASTE-");
}

function normalizeList(list) {
  return (Array.isArray(list) ? list : []).map((item) => String(item).trim().toLowerCase()).filter(Boolean);
}

// hostedDomain is Google's "hd" value: only set for Google Workspace accounts
function isAllowedAdmin(email, hostedDomain) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return false;
  if (normalizeList(ALLOWED_ADMIN_EMAILS).includes(cleanEmail)) return true;
  const domain = String(hostedDomain || "").toLowerCase();
  return Boolean(domain) && normalizeList(ALLOWED_ADMIN_DOMAINS).includes(domain);
}

// Reads the middle part of Google's ID token (header.PAYLOAD.signature).
// This does NOT check the signature; the server will do that later.
function decodeGoogleCredential(credential) {
  const part = String(credential || "").split(".")[1];
  if (!part) throw new Error("Not a Google ID token");
  const base64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  const bytes = Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)); // TextDecoder keeps names like "Peñaflor" intact
}

// The checks a browser can do on the token. Returns an error message, or "" if OK.
function checkGoogleProfile(profile) {
  const nowSeconds = Date.now() / 1000;
  if (!GOOGLE_ISSUERS.includes(profile.iss) || profile.aud !== GOOGLE_CLIENT_ID) {
    return "This sign-in didn't come from the school's Google setup. Please try again.";
  }
  if (!profile.exp || profile.exp < nowSeconds) {
    return "Your Google sign-in expired. Please try again.";
  }
  if (!profile.email || profile.email_verified !== true) {
    return "This Google account's email address isn't verified, so it can't be used.";
  }
  return "";
}

/* ---------- Session (sessionStorage) ---------- */
function saveAdminSession(profile, credential) {
  const now = Date.now();
  const session = {
    email: String(profile.email).toLowerCase(),
    name: profile.name || "",
    picture: profile.picture || "",
    hd: profile.hd || "",
    credential,
    signedInAt: now,
    expiresAt: now + ADMIN_SESSION_HOURS * 60 * 60 * 1000
  };
  // Throws if the browser blocks storage; the login page shows a message
  sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));
  return session;
}

function clearAdminSession() {
  try { sessionStorage.removeItem(ADMIN_SESSION_KEY); } catch (err) { /* storage blocked */ }
}

function hasStoredAdminSession() {
  try { return sessionStorage.getItem(ADMIN_SESSION_KEY) !== null; } catch (err) { return false; }
}

// The signed-in staff member, or null. Also signs out sessions that expired
// or whose email was removed from the staff list since they signed in.
function readAdminSession() {
  let session = null;
  try { session = JSON.parse(sessionStorage.getItem(ADMIN_SESSION_KEY)); } catch (err) { return null; }
  if (!session || !session.email) return null;
  if (Date.now() > session.expiresAt || !isAllowedAdmin(session.email, session.hd)) {
    clearAdminSession();
    return null;
  }
  return session;
}
