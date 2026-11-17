/* =========================================================
   Checks .env.local for common mistakes:   npm run env:check
   Shows setting NAMES and problems only, never the values,
   so the output is safe to screenshot.
   ========================================================= */
import fs from "node:fs";

const FILE = ".env.local";
const REQUIRED = ["GOOGLE_CLIENT_ID", "SESSION_SECRET", "DATABASE_URL"];
let problems = 0;
const say = (ok, text) => { console.log(`${ok ? "✓" : "✗"} ${text}`); if (!ok) problems++; };

if (!fs.existsSync(FILE)) {
  say(false, `${FILE} not found in this folder. Run:  copy .env.example .env.local`);
  process.exit(1);
}

const raw = fs.readFileSync(FILE);
if (raw[0] === 0xff || raw[0] === 0xfe) say(false, "File is saved as UTF-16. In VS Code: click the encoding in the bottom bar > Save with Encoding > UTF-8");

// What Node itself loads (same as npm run dev / db:setup)
const loaded = {};
try { Object.assign(loaded, process.loadEnvFile ? (process.loadEnvFile(FILE), process.env) : {}); } catch (err) { say(false, `Node can't read ${FILE}: ${err.message}`); }

// What is written in the file (to compare)
const written = {};
for (const line of raw.toString("utf8").split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 0) { say(false, `A line has no "=" sign (starts with "${trimmed.slice(0, 12)}…")`); continue; }
  const name = line.slice(0, eq);
  if (name !== name.trim()) say(false, `"${name}" has spaces around the name; remove them`);
  written[name.trim()] = line.slice(eq + 1).trim();
}

for (const name of REQUIRED) {
  const value = loaded[name] || "";
  if (!(name in written)) say(false, `${name} is missing from the file`);
  else if (!value) say(false, `${name} is in the file but Node reads it as EMPTY`);
  else say(true, `${name} loaded (${value.length} characters)`);
}

// Google Drive (Phase 3): needed for Settings > Connect Google Drive
const driveSecret = loaded.GOOGLE_CLIENT_SECRET || "";
if (!("GOOGLE_CLIENT_SECRET" in written)) say(false, "GOOGLE_CLIENT_SECRET is missing (needed for Google Drive). Add GOOGLE_CLIENT_SECRET=... from the Google Cloud client page");
else if (!driveSecret) say(false, "GOOGLE_CLIENT_SECRET is in the file but Node reads it as EMPTY");
else say(/^GOCSPX-/.test(driveSecret) || driveSecret.length >= 20, /^GOCSPX-/.test(driveSecret) || driveSecret.length >= 20
  ? `GOOGLE_CLIENT_SECRET loaded (${driveSecret.length} characters)`
  : "GOOGLE_CLIENT_SECRET looks too short. Copy the whole secret (it starts with GOCSPX-)");

// Facebook (Phase 4): optional, needed for Settings > Facebook Page
const fbId = loaded.FACEBOOK_APP_ID || "";
const fbSecret = loaded.FACEBOOK_APP_SECRET || "";
if (!fbId && !fbSecret) console.log("- FACEBOOK_APP_ID / FACEBOOK_APP_SECRET not set (Facebook posting is off; that's OK)");
else {
  say(/^\d{6,20}$/.test(fbId), /^\d{6,20}$/.test(fbId) ? `FACEBOOK_APP_ID loaded (${fbId.length} digits)` : "FACEBOOK_APP_ID should be only digits (Meta app > App settings > Basic > App ID)");
  say(/^[a-f0-9]{32}$/i.test(fbSecret), /^[a-f0-9]{32}$/i.test(fbSecret) ? "FACEBOOK_APP_SECRET loaded (32 characters)" : "FACEBOOK_APP_SECRET should be 32 letters/numbers (App settings > Basic > App secret > Show)");
}

// DATABASE_URL details
const w = written.DATABASE_URL || "";
const v = loaded.DATABASE_URL || "";
const quoted = /^["'].*["']$/.test(w);
if (w && /#/.test(w) && !quoted) say(false, `DATABASE_URL contains "#" (in the password?). Node cuts the line there. Put the whole value in double quotes: DATABASE_URL="mysql://..."`);
if (w && v && w.replace(/^["']|["']$/g, "").length !== v.length) say(false, `DATABASE_URL in the file is ${w.length} characters but Node reads ${v.length}. Put the whole value in double quotes.`);
if (v) {
  say(v.startsWith("mysql://"), v.startsWith("mysql://") ? "DATABASE_URL starts with mysql://" : "DATABASE_URL should start with mysql:// (copy Aiven's Service URI)");
  try {
    const url = new URL(v);
    say(Boolean(url.username && url.password), url.username && url.password ? "DATABASE_URL has a user and password" : "DATABASE_URL is missing the user or password");
    say(Boolean(url.port), url.port ? "DATABASE_URL has a port number" : "DATABASE_URL is missing the :port number");
    say(url.pathname.length > 1, url.pathname.length > 1 ? "DATABASE_URL has a database name" : "DATABASE_URL is missing the database name at the end (Aiven: /defaultdb)");
  } catch (err) {
    say(false, "DATABASE_URL isn't a valid address. Copy Aiven's Service URI again.");
  }
}

// Certificate
const caFile = loaded.DATABASE_CA_CERT_FILE;
if (loaded.DATABASE_SSL === "off") say(true, "SSL is off (only for a database on this computer)");
else if (loaded.DATABASE_CA_CERT) say(true, "DATABASE_CA_CERT is set");
else if (caFile) say(fs.existsSync(caFile), fs.existsSync(caFile) ? `Certificate file found (${caFile})` : `Certificate file "${caFile}" not found. Download ca.pem from Aiven into this folder.`);
else say(false, "No certificate: set DATABASE_CA_CERT_FILE=ca.pem and put Aiven's ca.pem in this folder");

console.log(problems ? `\n${problems} problem(s) found.` : "\nAll good. Next: npm run db:setup");
process.exitCode = problems ? 1 : 0;
