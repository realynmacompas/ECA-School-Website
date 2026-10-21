/* =========================================================
   ECA Admin - small helpers used by every admin page
   ========================================================= */

// Makes text safe to put inside innerHTML (prevents script injection)
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text == null ? "" : String(text);
  return div.innerHTML;
}

// Image paths are saved relative to the website root ("assets/images/...").
// Admin pages live one folder down, so they need "../" in front.
function assetUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  return "../" + path;
}

// "2026-09-22" -> Date at local midnight (avoids time zone shifts)
function parseDate(isoDate) {
  return new Date(isoDate + "T00:00:00");
}

// Today as "YYYY-MM-DD" in local time
function todayISO() {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

// "2026-09-22" -> "Sep 22, 2026"
function formatDate(isoDate, options = { month: "short", day: "numeric", year: "numeric" }) {
  if (!isoDate) return "";
  return parseDate(isoDate).toLocaleDateString("en-US", options);
}

// Event dates: "Dec 7 – Dec 18, 2026" or "Mon, January 4, 2027"
function formatDateRange(start, end) {
  if (!end || end === start) {
    return formatDate(start, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
  }
  return `${formatDate(start, { month: "short", day: "numeric" })} – ${formatDate(end)}`;
}

// Parts for the small date badge: { month: "Dec", day: 7 }
function dateBadgeParts(isoDate) {
  const d = parseDate(isoDate);
  return { month: d.toLocaleDateString("en-US", { month: "short" }), day: d.getDate() };
}

/* ---------- Photos (used by the News and Album forms) ---------- */
const MAX_UPLOAD_MB = 10;           // reject files bigger than this
const MAX_IMAGE_SIDE = 1200;        // resize photos so the longest side is at most 1200px
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Returns an error message, or "" if the file is OK
function checkImageFile(file) {
  if (!ALLOWED_TYPES.includes(file.type)) return "Please choose a JPG, PNG or WEBP photo.";
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `This photo is too large. Please choose one under ${MAX_UPLOAD_MB} MB.`;
  return "";
}

// Shrinks a photo in the browser before saving (faster uploads, less storage)
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Couldn't read the file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("This file doesn't look like a photo."));
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";                 // PNGs with transparency get a white background
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}