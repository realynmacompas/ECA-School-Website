/* GET /api/auth/me
   Who is signed in. 200 with the admin, or 401 if not signed in. */
import { allowMethods, handler, sendJson } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const admin = await requireAdmin(req, res);
  sendJson(res, 200, {
    admin: { email: admin.email, name: admin.name, role: admin.role },
    expiresAt: admin.sessionExpiresAt
  });
});
