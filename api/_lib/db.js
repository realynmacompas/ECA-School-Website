/* =========================================================
   MySQL connection (mysql2).
   Settings: DATABASE_URL, and DATABASE_CA_CERT or DATABASE_CA_CERT_FILE
   (see .env.example).
   Switching to the school's MySQL later = change those values.
   ========================================================= */
import fs from "node:fs";
import crypto from "node:crypto";
import mysql from "mysql2/promise";
import { requireEnv } from "./config.js";
import { BUNDLED_CA_CERT } from "./aiven-ca.js";

let pool = null;

// Certificates pasted into Vercel (or .env files) often lose their line breaks,
// gain spaces or quotes. Rebuild them in the exact format TLS expects.
export function normalizeCertificate(raw) {
  let text = String(raw || "").trim().replace(/^["']+|["']+$/g, "").replace(/\\n/g, "\n").replace(/\r/g, "");
  const blocks = text.match(/-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g);
  if (!blocks) return text; // not a PEM certificate: let TLS report the problem
  return blocks.map((block) => {
    const body = block.replace(/-----(BEGIN|END) CERTIFICATE-----/g, "").replace(/[^A-Za-z0-9+/=]/g, "");
    return `-----BEGIN CERTIFICATE-----\n${body.match(/.{1,64}/g).join("\n")}\n-----END CERTIFICATE-----`;
  }).join("\n") + "\n";
}

function describeCertificate(pem) {
  try {
    const cert = new crypto.X509Certificate(pem);
    return { valid: true, subject: cert.subject.replace(/^CN=/, ""), validTo: cert.validTo };
  } catch (err) {
    return { valid: false };
  }
}

// Which CA certificate to trust, and where it came from (shown by /api/health).
// Order: DATABASE_CA_CERT setting → DATABASE_CA_CERT_FILE → certificate bundled in aiven-ca.js.
// A setting that isn't a valid certificate is skipped (with a note) instead of breaking the connection.
export function chooseCertificate({ setting, file, bundled } = {
  setting: process.env.DATABASE_CA_CERT,
  file: process.env.DATABASE_CA_CERT_FILE,
  bundled: BUNDLED_CA_CERT
}) {
  const notes = [];
  if (setting) {
    const pem = normalizeCertificate(setting);
    const info = describeCertificate(pem);
    if (info.valid) return { pem, source: "DATABASE_CA_CERT setting", ...info, notes };
    notes.push("DATABASE_CA_CERT is set but isn't a valid certificate, so it was ignored");
  }
  if (file) {
    try {
      const pem = normalizeCertificate(fs.readFileSync(file, "utf8"));
      const info = describeCertificate(pem);
      if (info.valid) return { pem, source: `file ${file}`, ...info, notes };
      notes.push(`${file} isn't a valid certificate, so it was ignored`);
    } catch (err) {
      notes.push(`${file} couldn't be read (${err.code || "error"}), so it was ignored`);
    }
  }
  if (bundled) {
    const pem = normalizeCertificate(bundled);
    const info = describeCertificate(pem);
    if (info.valid) return { pem, source: "bundled (api/_lib/aiven-ca.js)", ...info, notes };
  }
  return { pem: "", source: "none", valid: false, notes };
}

function sslOptions() {
  if (process.env.DATABASE_SSL === "off") return undefined; // local MySQL without SSL only
  const chosen = chooseCertificate();
  chosen.notes.forEach((note) => console.warn(`[db] ${note}`));
  return chosen.pem ? { ca: chosen.pem, rejectUnauthorized: true } : { rejectUnauthorized: true };
}

export function getPool() {
  if (pool) return pool;
  const url = new URL(requireEnv("DATABASE_URL"));
  pool = mysql.createPool({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    ssl: sslOptions(),
    // Serverless functions run many small copies: keep each one's pool tiny
    connectionLimit: 3,
    maxIdle: 1,
    idleTimeout: 30000,
    enableKeepAlive: true,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: true // DATE columns come back as "2026-10-21" (no time zone surprises)
  });
  return pool;
}

export async function query(sql, params = []) {
  const [rows] = await getPool().execute(sql, params);
  return rows;
}

export async function closePool() {
  if (pool) await pool.end();
  pool = null;
}
