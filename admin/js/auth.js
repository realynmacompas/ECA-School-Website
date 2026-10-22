/* =========================================================
   ECA Admin - talking to the sign-in back end (/api/auth)

   HOW SIGN-IN WORKS
   1. Google's button gives the login page a signed ID token.
   2. adminSignIn() sends it to /api/auth/login. The SERVER
      checks it with Google and looks the email up in the
      admins table. Only then does it set a secure session
      cookie (HttpOnly: page scripts can't read it).
   3. Every admin page asks /api/auth/me "who is signed in?"
      (layout.js). No valid session → back to the login page.

   The staff list and all checks are on the server, so they
   can't be skipped with the browser's developer tools.
   ========================================================= */

const ADMIN_API_HEADERS = {
  "Content-Type": "application/json",
  "X-ECA-Admin": "1" // the server rejects admin changes without this header
};

class AdminApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code || "";
  }
}

// Calls the back end and returns the JSON answer, or throws AdminApiError
async function adminApi(path, { method = "GET", body } = {}) {
  let response;
  try {
    response = await fetch(path, {
      method,
      headers: method === "GET" ? { "X-ECA-Admin": "1" } : ADMIN_API_HEADERS,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
      cache: "no-store"
    });
  } catch (err) {
    throw new AdminApiError("Can't reach the server. Check your internet connection and try again.", 0, "NETWORK");
  }

  let data = {};
  try { data = await response.json(); } catch (err) { /* not JSON (e.g. 404 page) */ }

  if (!response.ok) {
    let message = data.error || "Something went wrong. Please try again.";
    // Opened with Live Server, which can't run the /api back end
    if ((response.status === 404 || response.status === 405) && !data.error) {
      message = "The admin back end isn't running here. On your computer, use \"npm run dev\" instead of Live Server.";
    }
    throw new AdminApiError(message, response.status, data.code);
  }
  return data;
}

function isGoogleConfigured() {
  return typeof GOOGLE_CLIENT_ID === "string"
    && /\.apps\.googleusercontent\.com$/.test(GOOGLE_CLIENT_ID)
    && !GOOGLE_CLIENT_ID.startsWith("PASTE-");
}

// Login page: send Google's ID token to the server. Returns { admin, expiresAt }.
function adminSignIn(credential) {
  return adminApi("/api/auth/login", { method: "POST", body: { credential } });
}

// Admin pages: who is signed in? Returns { admin, expiresAt } or null (signed out).
async function fetchCurrentAdmin() {
  try {
    return await adminApi("/api/auth/me");
  } catch (err) {
    if (err.status === 401) return null;
    throw err;
  }
}

async function adminSignOut() {
  try { await adminApi("/api/auth/logout", { method: "POST", body: {} }); } catch (err) { /* cookie expires anyway */ }
}
