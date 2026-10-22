/* =========================================================
   Small helpers for API responses and requests.
   Written with plain Node.js so the same code runs on Vercel
   and on the local test server (scripts/dev-server.js).
   (Files in api/_lib are helpers, not web addresses: Vercel
   skips folders that start with "_".)
   ========================================================= */

export class HttpError extends Error {
  constructor(status, message, code = "") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// cacheControl: "no-store" by default (admin data must never be cached)
export function sendJson(res, status, data, cacheControl = "no-store") {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", cacheControl);
  res.end(JSON.stringify(data));
}

const MAX_BODY_BYTES = 4 * 1024 * 1024; // Vercel's limit is 4.5 MB; an album with 4 shrunk photos is ~2 MB

export async function readJsonBody(req, maxBytes = MAX_BODY_BYTES) {
  // Vercel already parses JSON bodies into req.body (and throws if the JSON is broken)
  let parsed;
  try {
    parsed = req.body;
  } catch (err) {
    throw new HttpError(400, "Request body is not valid JSON.");
  }
  if (parsed !== undefined) {
    if (typeof parsed === "string") return parseJson(parsed);
    return parsed || {};
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new HttpError(413, "This is too large to save. Try fewer or smaller photos.");
    chunks.push(chunk);
  }
  return parseJson(Buffer.concat(chunks).toString("utf8"));
}

function parseJson(text) {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new HttpError(400, "Request body is not valid JSON.");
  }
}

// Only allow the listed methods; answers 405 otherwise
export function allowMethods(req, res, methods) {
  if (methods.includes(req.method)) return true;
  res.setHeader("Allow", methods.join(", "));
  sendJson(res, 405, { error: "Method not allowed." });
  return false;
}

// Wraps a handler so any error becomes a clean JSON answer (no stack traces to the browser)
export function handler(fn) {
  return async (req, res) => {
    try {
      await fn(req, res);
    } catch (err) {
      if (err instanceof HttpError) {
        sendJson(res, err.status, { error: err.message, code: err.code || undefined });
        return;
      }
      console.error("[api] unexpected error:", err);
      sendJson(res, 500, { error: "Something went wrong on the server. Please try again." });
    }
  };
}
