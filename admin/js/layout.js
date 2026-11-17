/* =========================================================
   ECA Admin - shared layout
   Builds the sidebar (desktop), the top bar and bottom tabs
   (phone) on every admin page, so the menu is written once.

   Each page tells this file which menu item is active:
   <body data-page="dashboard">
   ========================================================= */

const NAV_ITEMS = [
  { id: "dashboard",     label: "Dashboard",          short: "Home",   href: "dashboard.html",     icon: "home" },
  { id: "news",          label: "News",               short: "News",   href: "news.html",          icon: "news" },
  { id: "events",        label: "Events",             short: "Events", href: "events.html",        icon: "calendar" },
  { id: "albums",        label: "Albums",             short: "Albums", href: "albums.html",        icon: "photo" },
  { id: "announcements", label: "Announcements",      short: "Alerts", href: "announcements.html", icon: "megaphone" },
  { id: "settings",      label: "Settings",           short: "Settings", href: "settings.html",    icon: "settings" }
];

// Simple outline icons (stroke = currentColor, so they follow the text color)
const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  news: '<path d="M4 4h13v16H6a2 2 0 0 1-2-2z"/><path d="M17 8h3v10a2 2 0 0 1-2 2"/><path d="M8 8h5M8 12h5M8 16h3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  photo: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
  megaphone: '<path d="M3 11v2h3l6 5V6L6 11z"/><path d="M16 9a4 4 0 0 1 0 6"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  drive: '<path d="M8 3h8l6 10-4 7H6l-4-7z"/><path d="m8 3 6 10H2M16 3l-6 10 4 7"/>',
  external: '<path d="M14 3h7v7M21 3l-9 9M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>'
};

function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
}

/* ---------- Sign-in check ----------
   Asks the server (/api/auth/me, in auth.js) who is signed in.
   The page stays hidden until the server says yes; otherwise
   the person goes back to the login page. */
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // re-check every 5 minutes while a page is open

// Hide the admin until the server confirms the sign-in (see .auth-pending in admin.css)
document.documentElement.classList.add("auth-pending");

async function requireSignIn() {
  try {
    const result = await fetchCurrentAdmin();
    if (!result) {
      window.location.replace("login.html?expired=1");
      return null;
    }
    return result.admin;
  } catch (err) {
    // Server not reachable or not set up: show why on the login page
    window.location.replace(`login.html?error=${encodeURIComponent(err.message)}`);
    return null;
  }
}

async function signOut() {
  await adminSignOut();
  window.location.href = "login.html?signedout=1";
}

// Sends the person to the login page if the session ends while the page is open
function watchSession() {
  setInterval(async () => {
    try {
      if (!(await fetchCurrentAdmin())) window.location.replace("login.html?expired=1");
    } catch (err) { /* offline for a moment: try again next time */ }
  }, SESSION_CHECK_INTERVAL);
}

/* ---------- Build the layout ---------- */
async function renderLayout() {
  const session = await requireSignIn();
  if (!session) return;
  document.documentElement.classList.remove("auth-pending");
  watchSession();

  const activePage = document.body.dataset.page;
  const displayName = session.name || session.email.split("@")[0];
  const initial = displayName.charAt(0).toUpperCase();

  const navLinks = NAV_ITEMS.map((item) => {
    const isActive = item.id === activePage;
    return `<a href="${item.href}" class="sidebar__link${isActive ? " is-active" : ""}"${isActive ? ' aria-current="page"' : ""}>
      ${icon(item.icon)}<span>${item.label}</span></a>`;
  }).join("");

  const tabLinks = NAV_ITEMS.map((item) => {
    const isActive = item.id === activePage;
    return `<a href="${item.href}" class="tabbar__link${isActive ? " is-active" : ""}"${isActive ? ' aria-current="page"' : ""}>
      ${icon(item.icon, 22)}<span>${item.short}</span></a>`;
  }).join("");

  // Desktop sidebar
  document.getElementById("sidebar").innerHTML = `
    <div class="sidebar__brand">
      <img src="../assets/images/logo.png" alt="">
      <div><strong>ECA Admin</strong><span>Website content</span></div>
    </div>
    <nav class="sidebar__nav" aria-label="Admin menu">${navLinks}</nav>
    <div class="sidebar__bottom">
      <a href="../index.html" target="_blank" rel="noopener" class="sidebar__website">${icon("external", 18)}View the website</a>
      <div class="sidebar__user">
        <span class="avatar" aria-hidden="true">${escapeHTML(initial)}</span>
        <div class="sidebar__user-name"><strong>${escapeHTML(displayName)}</strong><span title="${escapeHTML(session.email)}">${escapeHTML(session.email)}</span></div>
        <button type="button" class="sidebar__logout" data-action="sign-out">Log out</button>
      </div>
    </div>`;

  // Phone top bar + bottom tabs
  document.getElementById("mobileBar").innerHTML = `
    <a href="dashboard.html" class="mobilebar__brand"><img src="../assets/images/logo.png" alt=""><strong>ECA Admin</strong></a>
    <div class="account">
      <button type="button" class="avatar avatar--button" id="accountButton" aria-expanded="false" aria-controls="accountMenu" aria-label="Account menu">${escapeHTML(initial)}</button>
      <div class="account__menu" id="accountMenu" hidden>
        <p class="account__name">Signed in as<br><strong>${escapeHTML(session.email)}</strong></p>
        <a href="../index.html" target="_blank" rel="noopener">View the website</a>
        <button type="button" data-action="sign-out">Log out</button>
      </div>
    </div>`;

  document.getElementById("tabbar").innerHTML = tabLinks;

  // Log out buttons (sidebar and phone menu)
  document.querySelectorAll('[data-action="sign-out"]').forEach((btn) => btn.addEventListener("click", signOut));

  // Phone account menu: open/close, and close when tapping elsewhere
  const accountButton = document.getElementById("accountButton");
  const accountMenu = document.getElementById("accountMenu");
  accountButton.addEventListener("click", () => {
    const open = accountMenu.hidden;
    accountMenu.hidden = !open;
    accountButton.setAttribute("aria-expanded", String(open));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".account")) {
      accountMenu.hidden = true;
      accountButton.setAttribute("aria-expanded", "false");
    }
  });
}

renderLayout();