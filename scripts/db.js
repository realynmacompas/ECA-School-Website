/* =========================================================
   Database tool (run on your computer, not on the website)

     npm run db:setup                         create the tables (safe to repeat)
     npm run db:seed                          add the sample content (only into EMPTY tables)
     npm run admin:add -- name@gmail.com      allow someone into the admin
     npm run admin:remove -- name@gmail.com   remove someone's access
     npm run admin:list                       see who has access

   Uses DATABASE_URL / DATABASE_CA_CERT from .env.local.
   To set up the school's database later: put its values in
   .env.local, then run db:setup and admin:add again.
   ========================================================= */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { query, getPool, closePool } from "../api/_lib/db.js";
import { SEED_DATA } from "./seed-data.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function setup() {
  const sql = await fs.readFile(path.join(here, "..", "db", "schema.sql"), "utf8");
  const statements = sql
    .split("\n").filter((line) => !line.trim().startsWith("--")).join("\n")
    .split(";").map((s) => s.trim()).filter(Boolean);
  for (const statement of statements) await getPool().query(statement);
  console.log(`Done: ${statements.length} table(s) checked/created.`);
}

async function isEmpty(table) {
  const [[{ n }]] = await getPool().query(`SELECT COUNT(*) AS n FROM ${table}`);
  return Number(n) === 0;
}

// Sample content, so a new database doesn't start blank. Never overwrites existing posts.
async function seed() {
  const by = "sample content";
  if (await isEmpty("news")) {
    for (const n of SEED_DATA.news) {
      await query(`INSERT INTO news (id, title, category, date, summary, body, author, image, is_poster, facebook_url, status, created_by, updated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [n.id, n.title, n.category, n.date, n.summary || "", n.body || "", n.author || "", n.image || "", n.isPoster ? 1 : 0, n.facebookUrl || "", n.status, by, by]);
    }
    console.log(`✓ News: ${SEED_DATA.news.length} sample posts added.`);
  } else console.log("- News already has posts; left as is.");

  if (await isEmpty("events")) {
    for (const e of SEED_DATA.events) {
      await query("INSERT INTO events (id, title, start_date, end_date, type, note, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [e.id, e.title, e.start, e.end || null, e.type || "activity", e.note || "", by, by]);
    }
    console.log(`✓ Events: ${SEED_DATA.events.length} sample events added.`);
  } else console.log("- Events already has dates; left as is.");

  if (await isEmpty("albums")) {
    for (const a of SEED_DATA.albums) {
      await query("INSERT INTO albums (id, title, caption, category, date, featured, status, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [a.id, a.title, a.caption || "", a.category || "", a.date, a.featured ? 1 : 0, a.status, by, by]);
      for (const [position, src] of a.photos.entries()) {
        await query("INSERT INTO album_photos (album_id, position, src) VALUES (?, ?, ?)", [a.id, position, src]);
      }
    }
    console.log(`✓ Albums: ${SEED_DATA.albums.length} sample albums added.`);
  } else console.log("- Albums already has albums; left as is.");

  if (await isEmpty("announcements")) {
    for (const [position, m] of SEED_DATA.announcements.messages.entries()) {
      await query("INSERT INTO announcements (id, text, link, visible, position) VALUES (?, ?, ?, ?, ?)",
        [m.id, m.text, m.link || "", m.visible ? 1 : 0, position]);
    }
    await query("INSERT IGNORE INTO site_settings (name, value) VALUES ('announcements_enabled', ?)", [SEED_DATA.announcements.enabled ? "1" : "0"]);
    console.log(`✓ Announcements: ${SEED_DATA.announcements.messages.length} sample messages added.`);
  } else console.log("- Announcements already has messages; left as is.");
}

function emailsFromArgs(args) {
  const emails = args.map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) throw new Error("Add at least one email, e.g.  npm run admin:add -- name@gmail.com");
  const bad = emails.filter((e) => !EMAIL_PATTERN.test(e));
  if (bad.length) throw new Error(`Not a valid email: ${bad.join(", ")}`);
  return emails;
}

async function addAdmins(args) {
  for (const email of emailsFromArgs(args)) {
    await query("INSERT INTO admins (email) VALUES (?) ON DUPLICATE KEY UPDATE is_active = 1", [email]);
    console.log(`✓ ${email} can now sign in to the admin.`);
  }
}

async function removeAdmins(args) {
  for (const email of emailsFromArgs(args)) {
    const result = await query("UPDATE admins SET is_active = 0 WHERE email = ?", [email]);
    console.log(result.affectedRows ? `✓ ${email} no longer has access.` : `- ${email} wasn't on the list.`);
  }
}

async function listAdmins() {
  const rows = await query("SELECT email, name, role, is_active, last_login_at FROM admins ORDER BY email");
  if (!rows.length) return console.log("No admins yet. Add one with:  npm run admin:add -- name@gmail.com");
  console.table(rows.map((r) => ({
    email: r.email, name: r.name, role: r.role,
    access: r.is_active ? "yes" : "removed", "last sign-in (UTC)": r.last_login_at || "never"
  })));
}

const [command, ...args] = process.argv.slice(2);
const commands = { setup, seed, "add-admin": addAdmins, "remove-admin": removeAdmins, "list-admins": listAdmins };

try {
  if (!commands[command]) throw new Error(`Unknown command "${command || ""}". Use: setup, seed, add-admin, remove-admin, list-admins`);
  await commands[command](args);
} catch (err) {
  let message = err.message;
  if (err.code === "ER_NO_SUCH_TABLE") message = "Tables are missing. Run: npm run db:setup";
  else if (/certificate/i.test(err.message)) message = `${err.message}\n  → Check DATABASE_CA_CERT in .env.local (Aiven: Overview > CA certificate).`;
  else if (err.code === "ER_ACCESS_DENIED_ERROR") message = "Wrong database user or password. Check DATABASE_URL in .env.local.";
  else if (["ENOTFOUND", "ECONNREFUSED", "ETIMEDOUT"].includes(err.code)) message = `Can't reach the database (${err.code}). Check DATABASE_URL, and that the Aiven service is running.`;
  console.error(`✗ ${message}`);
  process.exitCode = 1;
} finally {
  await closePool();
}
