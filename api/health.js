/* GET /api/health
   Quick check that the back end is set up: which settings exist
   (yes/no only, never the values) and whether MySQL answers.
   Open https://eca-school-website.vercel.app/api/health after deploying. */
import { allowMethods, handler, sendJson } from "./_lib/http.js";
import { configStatus } from "./_lib/config.js";
import { query } from "./_lib/db.js";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const settings = configStatus();

  let database = "not checked (DATABASE_URL missing)";
  if (settings.databaseUrl) {
    try {
      await query("SELECT 1 FROM admins LIMIT 1");
      database = "connected";
    } catch (err) {
      // Show a short reason without exposing passwords or host names
      database = err.code === "ER_NO_SUCH_TABLE"
        ? "connected, but tables are missing: run npm run db:setup"
        : `can't connect (${err.code || "error"})`;
    }
  }

  const ok = Object.values(settings).every((value) => value !== false) && database === "connected";
  sendJson(res, ok ? 200 : 503, { ok, settings, database });
});
