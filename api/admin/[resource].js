/* =========================================================
   Admin content API (signed-in staff only)

   /api/admin/news            GET list · POST create
   /api/admin/news?id=n1      GET one  · PUT update · DELETE
   /api/admin/events          same as news
   /api/admin/albums          same as news
   /api/admin/announcements   GET · PUT (the whole bar at once)

   One file handles all four, because Vercel's free plan allows
   a limited number of back-end files (functions).
   ========================================================= */
import { allowMethods, handler, readJsonBody, sendJson, HttpError } from "../_lib/http.js";
import { requireAdmin } from "../_lib/auth.js";
import * as content from "../_lib/content.js";

const RESOURCES = {
  news: { list: content.listNews, get: content.getNews, save: content.saveNews, remove: content.deleteNews, name: "news post" },
  events: { list: content.listEvents, get: null, save: content.saveEvent, remove: content.deleteEvent, name: "event" },
  albums: { list: content.listAlbums, get: content.getAlbum, save: content.saveAlbum, remove: content.deleteAlbum, name: "album" }
};

export default handler(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const resource = url.pathname.split("/").filter(Boolean).pop();
  const id = url.searchParams.get("id");

  if (resource === "announcements") {
    if (!allowMethods(req, res, ["GET", "PUT"])) return;
    await requireAdmin(req, res);
    if (req.method === "GET") return sendJson(res, 200, await content.getAnnouncements());
    return sendJson(res, 200, await content.saveAnnouncements(await readJsonBody(req)));
  }

  const r = RESOURCES[resource];
  if (!r) throw new HttpError(404, "Not found.");
  if (!allowMethods(req, res, id ? ["GET", "PUT", "DELETE"] : ["GET", "POST"])) return;
  const admin = await requireAdmin(req, res);

  if (req.method === "GET" && !id) return sendJson(res, 200, await r.list());
  if (req.method === "GET") {
    const item = r.get ? await r.get(id) : (await r.list()).find((x) => x.id === id) || null;
    if (!item) throw new HttpError(404, `This ${r.name} no longer exists.`, "NOT_FOUND");
    return sendJson(res, 200, item);
  }
  if (req.method === "POST") return sendJson(res, 201, await r.save(await readJsonBody(req), admin.email));
  if (req.method === "PUT") return sendJson(res, 200, await r.save(await readJsonBody(req), admin.email, id));
  await r.remove(id);
  return sendJson(res, 200, { ok: true });
});
