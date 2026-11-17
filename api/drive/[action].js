/* =========================================================
   Google Drive connection (signed-in staff only)

   GET  /api/drive/connect     → goes to Google to pick an account
   GET  /api/drive/callback    ← Google comes back here
   GET  /api/drive/status      → which account, how many photos copied
   POST /api/drive/sync        → copy photos that aren't in Drive yet
   POST /api/drive/disconnect  → stop using Drive

   One file for all of them (Vercel's free plan limits the
   number of back-end files).
   ========================================================= */
import { allowMethods, handler, sendJson, HttpError } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import { buildConnectUrl, finishConnect, driveStatus, syncImages, disconnect } from "../_lib/drive.js";

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

  if (action === "connect") {
    if (!allowMethods(req, res, ["GET"])) return;
    let admin;
    try {
      admin = await requireAdmin(req, res);
    } catch (err) {
      return redirect(res, "/admin/login.html?expired=1");
    }
    if (!process.env.GOOGLE_CLIENT_SECRET) {
      return backToSettings(res, { drive: "error", message: "Google Drive isn't set up yet: GOOGLE_CLIENT_SECRET is missing in the server settings." });
    }
    return redirect(res, buildConnectUrl(req, admin.email));
  }

  if (action === "callback") {
    if (!allowMethods(req, res, ["GET"])) return;
    let admin;
    try {
      admin = await requireAdmin(req, res);
    } catch (err) {
      return redirect(res, "/admin/login.html?expired=1");
    }
    if (url.searchParams.get("error")) {
      return backToSettings(res, { drive: "cancelled" });
    }
    try {
      const result = await finishConnect(req, { code: url.searchParams.get("code"), state: url.searchParams.get("state") }, admin);
      return backToSettings(res, { drive: "connected", email: result.email });
    } catch (err) {
      console.error("[drive] connect failed:", err.code, err.message);
      return backToSettings(res, { drive: "error", message: err instanceof HttpError ? err.message : "Couldn't connect Google Drive. Please try again." });
    }
  }

  if (action === "status") {
    if (!allowMethods(req, res, ["GET"])) return;
    await requireAdmin(req, res);
    return sendJson(res, 200, await driveStatus());
  }

  if (action === "sync") {
    if (!allowMethods(req, res, ["POST"])) return;
    await requireAdmin(req, res);
    return sendJson(res, 200, await syncImages({ limit: 10, timeLimitMs: 20000 }));
  }

  if (action === "disconnect") {
    if (!allowMethods(req, res, ["POST"])) return;
    await requireAdmin(req, res);
    await disconnect();
    return sendJson(res, 200, { ok: true });
  }

  throw new HttpError(404, "Not found.");
});
