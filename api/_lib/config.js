/* =========================================================
   Reads settings from environment variables.
   On Vercel: Project > Settings > Environment Variables.
   On your computer: the .env.local file (see .env.example).
   ========================================================= */
import { HttpError } from "./http.js";

// Returns the value, or throws a clear "not set up" error
export function requireEnv(name) {
  const value = process.env[name];
  if (!value || !String(value).trim()) {
    throw new HttpError(503, `The server isn't set up yet (missing ${name}).`, "NOT_CONFIGURED");
  }
  return String(value).trim();
}

export function sessionHours() {
  const hours = Number(process.env.SESSION_HOURS || 8);
  return Number.isFinite(hours) && hours > 0 && hours <= 24 * 7 ? hours : 8;
}

// Which settings exist (true/false only, never the values)
export function configStatus() {
  return {
    googleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    // Only needed for Google Drive (Phase 3); the site works without it
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ? true : "not set (Google Drive off)",
    sessionSecret: Boolean(process.env.SESSION_SECRET),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    // Aiven (and most hosted MySQL) need the CA certificate; a local database with DATABASE_SSL=off doesn't
    // A certificate is bundled in api/_lib/aiven-ca.js, so this setting is optional (see /api/health "ssl")
    databaseCaCert: process.env.DATABASE_SSL === "off" ? "not needed (SSL off)"
      : (process.env.DATABASE_CA_CERT || process.env.DATABASE_CA_CERT_FILE) ? true : "not set (using bundled)"
  };
}
