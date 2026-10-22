/* GET /api/image?id=123
   An uploaded photo. Each id is never reused, so browsers and
   Vercel may keep a copy for a long time (fast pages). */
import { allowMethods, handler, sendJson } from "./_lib/http.js";
import { getImage } from "./_lib/content.js";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET", "HEAD"])) return;
  const id = new URL(req.url, "http://localhost").searchParams.get("id");
  if (!/^\d{1,10}$/.test(id || "")) return sendJson(res, 400, { error: "Invalid photo id." });

  const image = await getImage(id);
  if (!image) return sendJson(res, 404, { error: "Photo not found." }, "public, max-age=60");

  res.statusCode = 200;
  res.setHeader("Content-Type", image.mime);
  res.setHeader("Content-Length", image.data.length);
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(req.method === "HEAD" ? undefined : image.data);
});
