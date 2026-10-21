/* =========================================================
   MySQL connection (mysql2).
   Settings: DATABASE_URL, and DATABASE_CA_CERT or DATABASE_CA_CERT_FILE
   (see .env.example).
   Switching to the school's MySQL later = change those values.
   ========================================================= */
import fs from "node:fs";
import mysql from "mysql2/promise";
import { requireEnv } from "./config.js";

let pool = null;

function sslOptions() {
  if (process.env.DATABASE_SSL === "off") return undefined; // local MySQL without SSL only
  let ca = process.env.DATABASE_CA_CERT;
  if (ca) {
    // .env files keep the certificate on one line with "\n"; turn those back into line breaks
    ca = ca.replace(/\\n/g, "\n");
  } else if (process.env.DATABASE_CA_CERT_FILE) {
    // On your computer: path to the downloaded ca.pem (easier than pasting it)
    ca = fs.readFileSync(process.env.DATABASE_CA_CERT_FILE, "utf8");
  }
  return ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: true };
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
