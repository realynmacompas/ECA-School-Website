/* POST /api/auth/login   body: { credential: "<Google ID token>" }
   Checks the Google sign-in and the admins table, then sets the session cookie. */
import { allowMethods, handler, readJsonBody, sendJson, HttpError } from "../_lib/http.js";
import { verifyGoogleCredential, findActiveAdmin } from "../_lib/auth.js";
import { createSessionToken, setSessionCookie } from "../_lib/session.js";
import { query } from "../_lib/db.js";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  if (req.headers["x-eca-admin"] !== "1") throw new HttpError(403, "Request blocked.", "MISSING_HEADER");

  const { credential } = await readJsonBody(req);
  const google = await verifyGoogleCredential(credential);

  const admin = await findActiveAdmin(google.email);
  if (!admin) {
    throw new HttpError(403, `${google.email} isn't on the ECA staff list. Sign in with your school-approved Google account, or ask the website administrator to add this one.`, "NOT_ADMIN");
  }

  // Keep the name up to date and remember the last sign-in
  await query("UPDATE admins SET name = ?, last_login_at = UTC_TIMESTAMP() WHERE id = ?", [google.name || admin.name, admin.id]);

  const { token, expiresAt } = createSessionToken(admin.email);
  setSessionCookie(req, res, token, expiresAt - Math.floor(Date.now() / 1000));

  sendJson(res, 200, {
    admin: { email: admin.email, name: google.name || admin.name, picture: google.picture, role: admin.role },
    expiresAt
  });
});
