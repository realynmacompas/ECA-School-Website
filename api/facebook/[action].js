/* =========================================================
   Facebook Page connection (signed-in staff only)

   GET  /api/facebook/connect     → goes to Facebook to log in and pick the Page
   GET  /api/facebook/callback    ← Facebook comes back here
   GET  /api/facebook/status      → which Page is connected
   POST /api/facebook/select      → choose a Page (when the account manages several)
   POST /api/facebook/disconnect  → stop posting to Facebook

   One file for all of them (Vercel's free plan limits the
   number of back-end files).
   ========================================================= */
import { allowMethods, handler, readJsonBody, sendJson, HttpError } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import { buildConnectUrl, finishConnect, facebookStatus, selectPage, disconnect, isConfigured } from "../_lib/facebook.js";

const SETTINGS_PAGE = "/admin/settings.html";

function redirect(res, location) {
  res.statusCode = 302;
  res.setHeader("Location", location);
  res.setHeader("Cache-Control", "no-store");
  res.end();
}

function backToSettings(res, params) {
  redirect(res, `${SETTINGS_PAGE}?${new URLSearchParams(params)}`);
}

export default handler(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const action = url.pathname.split("/").filter(Boolean).pop();

  if (action === "connect" || action === "callback") {
    if (!allowMethods(req, res, ["GET"])) return;
    let admin;
    try {
      admin = await requireAdmin(req, res);
    } catch (err) {
      return redirect(res, "/admin/login.html?expired=1");
    }
    if (!isConfigured()) {
      return backToSettings(res, { facebook: "error", message: "Facebook isn't set up yet: FACEBOOK_APP_ID and FACEBOOK_APP_SECRET are missing in the server settings." });
    }
    if (action === "connect") return redirect(res, buildConnectUrl(req, admin.email));

    if (url.searchParams.get("error")) return backToSettings(res, { facebook: "cancelled" });
    try {
      const result = await finishConnect(req, { code: url.searchParams.get("code"), state: url.searchParams.get("state") }, admin);
      return backToSettings(res, result.choose ? { facebook: "choose" } : { facebook: "connected", page: result.pageName });
    } catch (err) {
      console.error("[facebook] connect failed:", err.code, err.message);
      return backToSettings(res, { facebook: "error", message: err instanceof HttpError ? err.message : "Couldn't connect Facebook. Please try again." });
    }
  }

  if (action === "status") {
    if (!allowMethods(req, res, ["GET"])) return;
    const admin = await requireAdmin(req, res);
    return sendJson(res, 200, await facebookStatus(admin));
  }

  if (action === "select") {
    if (!allowMethods(req, res, ["POST"])) return;
    const admin = await requireAdmin(req, res);
    const body = await readJsonBody(req);
    return sendJson(res, 200, await selectPage(body.pageId, admin));
  }

  if (action === "disconnect") {
    if (!allowMethods(req, res, ["POST"])) return;
    await requireAdmin(req, res);
    await disconnect();
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(404, "Not found.");
});
