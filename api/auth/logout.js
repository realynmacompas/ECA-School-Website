/* POST /api/auth/logout
   Removes the session cookie. Always succeeds. */
import { allowMethods, handler, sendJson } from "../_lib/http.js";
import { clearSessionCookie } from "../_lib/session.js";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["POST"])) return;
  clearSessionCookie(req, res);
  sendJson(res, 200, { ok: true });
});
