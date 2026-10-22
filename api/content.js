/* GET /api/content
   Everything the PUBLIC website shows: published news, events,
   published albums and the announcement bar. No sign-in needed.
   Vercel keeps a copy for 15 seconds so the site stays fast;
   changes from the admin appear within about 15 seconds. */
import { allowMethods, handler, sendJson } from "./_lib/http.js";
import { getPublicContent } from "./_lib/content.js";

export default handler(async (req, res) => {
  if (!allowMethods(req, res, ["GET"])) return;
  const content = await getPublicContent();
  sendJson(res, 200, content, "public, max-age=0, s-maxage=15, stale-while-revalidate=60");
});
