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
      // Full details go to the server log (Vercel > Logs); the page gets a short reason + hint
      console.error("[health] database error:", err.code, err.message);
      database = `can't connect (${err.code || "error"})`;
      if (err.code === "ER_NO_SUCH_TABLE") database = "connected, but tables are missing: run npm run db:setup";
      else if (/SSL|certificate|CERT/i.test(`${err.code} ${err.message}`)) database += ": check DATABASE_CA_CERT (Aiven > Overview > CA certificate)";
      else if (err.code === "ER_ACCESS_DENIED_ERROR") database += ": check the user/password in DATABASE_URL";
      else if (["ENOTFOUND", "ETIMEDOUT", "ECONNREFUSED"].includes(err.code)) database += ": check the host/port in DATABASE_URL and that the Aiven service is running";
    }
  }

  const ok = Object.values(settings).every((value) => value !== false) && database === "connected";
  sendJson(res, ok ? 200 : 503, { ok, settings, database });
});
