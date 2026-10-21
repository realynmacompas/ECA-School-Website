/* =========================================================
   Elim Christian Academy - Main scripts
   1. Announcement ticker
   2. Header (mobile menu, shrink on scroll, back-to-top)
   3. Hero carousel
   4. News slider
   5. Scroll reveal and number counters
   6. Upcoming dates
   7. Accessibility options
   8. Life at ECA (homepage albums) and 
   9. Load content from the data store.
   ========================================================= */

document.documentElement.classList.add("js");

const FB_PAGE = "https://www.facebook.com/ElimChristianAcademy";

/* ---------- Upcoming dates ----------
   From the DepEd School Calendar for SY 2026-2027 (three-term calendar).
   Add ECA's own events (exams, foundation day, recognition) and remove past ones as needed.
   end is optional; use it for date ranges. */
const schoolEvents = [
  { title: "Term 2 Classes", start: "2026-09-16", end: "2026-12-04" },
  { title: "End-of-Term 2 Activities", start: "2026-12-07", end: "2026-12-18" },
  { title: "Term 3 Classes Begin", start: "2027-01-04" },
  { title: "Final Assessments and Closing Activities", start: "2027-03-24", end: "2027-04-08" },
  { title: "End of School Year 2026-2027", start: "2027-04-08" }
];

/* ---------- Helpers ---------- */
function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function parseDate(isoDate) {
  return new Date(isoDate + "T00:00:00");
}

// Only allow links to a homepage section ("#apply") or a normal web page.
// Returns the attributes for an <a>, or "" if the link is empty or unsafe.
function linkAttributes(link) {
  if (!link) return "";
  if (/^#[\w-]+$/.test(link)) {
    // On other pages (like life.html) the section is on the homepage
    const onThisPage = document.getElementById(link.slice(1));
    return `href="${onThisPage ? "" : "index.html"}${link}"`;
  }
  try {
    const url = new URL(link);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return `href="${escapeHTML(url.href)}" target="_blank" rel="noopener"`;
    }
  } catch (err) { /* not a valid link */ }
  return "";
}

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* =========================================================
   1. Announcement ticker
   ========================================================= */
function renderTicker(announcements) {
  const ticker = document.querySelector(".ticker");
  const track = document.getElementById("tickerTrack");
  if (!ticker || !track) return;

  const messages = announcements.enabled ? announcements.messages.filter((m) => m.visible) : [];
  if (!messages.length) {
    ticker.hidden = true;
    return;
  }

  track.innerHTML = messages.map((m) => {
    const attrs = linkAttributes(m.link);
    const text = escapeHTML(m.text);
    return `<li>${attrs ? `<a ${attrs}>${text}</a>` : `<span>${text}</span>`}</li>`;
  }).join("");

  // Duplicate the items so the CSS animation (-50%) loops seamlessly.
  // The copies are hidden from screen readers and keyboard focus.
  Array.from(track.children).forEach((item) => {
    const copy = item.cloneNode(true);
    copy.setAttribute("aria-hidden", "true");
    copy.querySelectorAll("a").forEach((a) => (a.tabIndex = -1));
    track.appendChild(copy);
  });
  ticker.hidden = false;
}

/* =========================================================
   2. Header: mobile menu, shrink on scroll, back-to-top
   ========================================================= */
(function initHeader() {
  const header = document.getElementById("siteHeader");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("primary-nav");
  const toTop = document.getElementById("toTop");

  function setOpen(open) {
    nav.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.querySelector(".sr-only").textContent = open ? "Close menu" : "Open menu";
  }

  toggle.addEventListener("click", () => setOpen(!nav.classList.contains("is-open")));
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setOpen(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });

  function onScroll() {
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 60);
    toTop.classList.toggle("is-visible", y > 700);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
})();

/* =========================================================
   3. Hero carousel
   ========================================================= */
(function initHero() {
  const hero = document.querySelector(".hero");
  if (!hero) return;

  const slides = hero.querySelectorAll(".hero__slide");
  const dotsWrap = hero.querySelector(".hero__dots");
  const currentEl = document.getElementById("heroCurrent");
  const totalEl = document.getElementById("heroTotal");
  const INTERVAL = 6000;
  let current = 0;
  let timer = null;

  hero.style.setProperty("--interval", `${INTERVAL}ms`);
  totalEl.textContent = String(slides.length).padStart(2, "0");

  const dots = Array.from(slides).map((_, i) => {
    const dot = document.createElement("button");
    dot.className = "hero__dot";
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `Go to slide ${i + 1}`);
    dot.addEventListener("click", () => { goTo(i); restart(); });
    dotsWrap.appendChild(dot);
    return dot;
  });

  function goTo(index) {
    current = (index + slides.length) % slides.length;

    slides.forEach((slide, i) => {
      const active = i === current;
      slide.classList.toggle("is-active", active);
      slide.setAttribute("aria-hidden", String(!active));
      slide.querySelectorAll("a").forEach((a) => (a.tabIndex = active ? 0 : -1));
    });

    dots.forEach((dot, i) => {
      // Re-adding the attribute restarts the CSS progress animation
      dot.removeAttribute("aria-selected");
      void dot.offsetWidth;
      dot.setAttribute("aria-selected", String(i === current));
      dot.classList.toggle("is-done", i < current);
    });

    currentEl.textContent = String(current + 1).padStart(2, "0");
  }

  function start() {
    hero.classList.remove("is-paused");
    if (prefersReducedMotion || timer) return;
    timer = setInterval(() => goTo(current + 1), INTERVAL);
  }

  function stop() {
    hero.classList.add("is-paused");
    clearInterval(timer);
    timer = null;
  }

  function restart() {
    stop();
    start();
  }

  hero.querySelector(".hero__arrow--prev").addEventListener("click", () => { goTo(current - 1); restart(); });
  hero.querySelector(".hero__arrow--next").addEventListener("click", () => { goTo(current + 1); restart(); });

  document.addEventListener("keydown", (e) => {
    const heroVisible = hero.getBoundingClientRect().bottom > 0;
    if (!heroVisible || e.target.matches("input, textarea")) return;
    if (e.key === "ArrowLeft") { goTo(current - 1); restart(); }
    if (e.key === "ArrowRight") { goTo(current + 1); restart(); }
  });

  hero.addEventListener("focusin", stop);
  hero.addEventListener("focusout", start);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

  let touchStartX = 0;
  hero.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  hero.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { goTo(current + (dx < 0 ? 1 : -1)); restart(); }
  });

  goTo(0);
  start();
})();

/* =========================================================
   4. News slider
   ========================================================= */
const MAX_NEWS_ON_HOMEPAGE = 10;

function renderNews(allNews) {
  const track = document.getElementById("newsTrack");
  if (!track) return;

  const prevBtn = document.getElementById("newsPrev");
  const nextBtn = document.getElementById("newsNext");
  const countEl = document.getElementById("newsCount");
  const progressEl = document.getElementById("newsProgress");
  let index = 0;

    // Only published posts, newest first (listNews already sorts them)
  const newsItems = allNews.filter((n) => n.status === "published").slice(0, MAX_NEWS_ON_HOMEPAGE);

  if (!newsItems.length) {
    track.innerHTML = `<li class="news-card news-card--empty"><div class="news-card__body"><p>No news yet. Follow us on Facebook for the latest updates.</p></div></li>`;
    document.querySelector(".news .slider-controls").hidden = true;
    return;
  }

  track.innerHTML = newsItems.map((item) => {
    // "Read more" opens the full post on the News & Events page
    const linkAttrs = `href="news.html#${encodeURIComponent(item.id)}"`;
    const title = escapeHTML(item.title);
    const src = escapeHTML(item.image || "");
    const contain = Boolean(item.isPoster);

    let media = `<span class="news-card__placeholder" aria-hidden="true">ECA News</span>`;
    if (item.image) {
      media = `
        ${contain ? `<img class="news-card__backdrop" src="${src}" alt="" aria-hidden="true" loading="lazy">` : ""}
        <img class="news-card__img${contain ? " news-card__img--contain" : ""}" src="${src}" alt="${title}" loading="lazy">`;
    }

    let dateBadge = "";
    if (item.date) {
      const date = parseDate(item.date);
      const fullDate = date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      dateBadge = `
        <time class="news-card__date" datetime="${item.date}" title="${fullDate}">
          <strong>${date.getDate()}</strong><span>${date.toLocaleDateString("en-US", { month: "short" })}</span>
        </time>`;
    }

    return `
      <li class="news-card">
        <div class="news-card__media">${media}${dateBadge}</div>
        <div class="news-card__body">
          <span class="news-card__tag">${escapeHTML(item.category)}</span>
          <h3 class="news-card__title"><a ${linkAttrs}>${title}</a></h3>
          <a class="link-arrow news-card__more" ${linkAttrs} tabindex="-1" aria-hidden="true">Read more</a>
        </div>
      </li>`;
  }).join("");

  const cards = track.children;

  function gapSize() {
    return parseFloat(getComputedStyle(track).gap) || 0;
  }

  function visibleCount() {
    const cardWidth = cards[0].getBoundingClientRect().width + gapSize();
    return Math.max(1, Math.floor((track.parentElement.clientWidth + gapSize() + 1) / cardWidth));
  }

  function update() {
    if (!cards.length) return;
    const maxIndex = Math.max(0, cards.length - visibleCount());
    index = Math.min(Math.max(index, 0), maxIndex);

    const step = cards[0].getBoundingClientRect().width + gapSize();
    track.style.transform = `translateX(${-index * step}px)`;

    const shown = Math.min(index + visibleCount(), cards.length);
    countEl.textContent = `${String(shown).padStart(2, "0")}/${String(cards.length).padStart(2, "0")}`;
    progressEl.style.width = `${(shown / cards.length) * 100}%`;

    prevBtn.disabled = index === 0;
    nextBtn.disabled = index >= maxIndex;
  }

  prevBtn.addEventListener("click", () => { index--; update(); });
  nextBtn.addEventListener("click", () => { index++; update(); });

  let touchStartX = 0;
  track.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  track.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40) { index += dx < 0 ? 1 : -1; update(); }
  });

  window.addEventListener("resize", update);
  update();
}

/* =========================================================
   5. Scroll reveal and number counters
   ========================================================= */
(function initReveal() {
  const items = document.querySelectorAll(".reveal");
  const counters = document.querySelectorAll("[data-count]");

  // Small stagger for items that share the same parent (tiles, cards, steps)
  items.forEach((el) => {
    const siblings = Array.from(el.parentElement.children).filter((c) => c.classList.contains("reveal"));
    el.style.setProperty("--delay", `${siblings.indexOf(el) * 0.1}s`);
  });

  function countUp(el) {
    const target = Number(el.dataset.count);
    const suffix = el.dataset.suffix || "";
    // Years look odd counting from 0, so start them near the target
    const from = target > 1900 && target < 2100 ? target - 40 : 0;
    const duration = 1400;
    const startTime = performance.now();

    function frame(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.round(from + (target - from) * eased);
      el.textContent = (target >= 10000 ? value.toLocaleString() : value) + (progress === 1 ? suffix : "");
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    items.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      counterObserver.unobserve(entry.target);
    });
  }, { threshold: 0.6 });

  items.forEach((el) => revealObserver.observe(el));
  counters.forEach((el) => counterObserver.observe(el));
})();

/* =========================================================
   6. Upcoming dates (school calendar)
   ========================================================= */
function renderEvents(schoolEvents) {
  const list = document.getElementById("eventsList");
  if (!list) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d, opts) => d.toLocaleDateString("en-US", opts);

  // Hide events that have already ended, show at most 4
  const upcoming = schoolEvents
    .filter((ev) => parseDate(ev.end || ev.start) >= today)
    .slice(0, 4);

  if (!upcoming.length) {
    list.innerHTML = `<li class="events__empty">No upcoming dates posted yet.</li>`;
    return;
  }

  list.innerHTML = upcoming.map((ev) => {
    const start = parseDate(ev.start);
    const end = ev.end ? parseDate(ev.end) : null;
    const ongoing = start <= today && end && end >= today;
    let range = fmt(start, { weekday: "short", month: "long", day: "numeric", year: "numeric" });
    if (end) range = `${fmt(start, { month: "short", day: "numeric" })} \u2013 ${fmt(end, { month: "short", day: "numeric", year: "numeric" })}`;

    return `
      <li class="event${ongoing ? " event--ongoing" : ""}">
        <time class="event__date" datetime="${ev.start}">
          <span>${fmt(start, { month: "short" })}</span><strong>${start.getDate()}</strong>
        </time>
        <div class="event__info">
          <strong>${escapeHTML(ev.title)}</strong>
          <span>${range}${ongoing ? ' <em class="event__badge">Ongoing</em>' : ""}</span>
        </div>
      </li>`;
  }).join("");
}

/* =========================================================
   7. Accessibility options (text size, high contrast)
   Saved in localStorage so the choice stays on the next visit.
   ========================================================= */
(function initA11y() {
  const root = document.documentElement;
  const sizeButtons = document.querySelectorAll("[data-text-size]");
  const contrastBtn = document.getElementById("contrastToggle");

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { /* storage blocked */ }
  }

  function setTextSize(size) {
    if (size === "md") root.removeAttribute("data-text");
    else root.setAttribute("data-text", size);
    sizeButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.textSize === size)));
    save("ecaTextSize", size);
    window.dispatchEvent(new Event("resize")); // let the news slider re-measure
  }

  function setContrast(high) {
    root.classList.toggle("high-contrast", high);
    contrastBtn.setAttribute("aria-pressed", String(high));
    save("ecaContrast", high ? "high" : "normal");
  }

  sizeButtons.forEach((btn) => btn.addEventListener("click", () => setTextSize(btn.dataset.textSize)));
  contrastBtn.addEventListener("click", () => setContrast(!root.classList.contains("high-contrast")));

  // Reflect the preference applied by the inline script in <head>
  const current = root.getAttribute("data-text") || "md";
  sizeButtons.forEach((btn) => btn.setAttribute("aria-pressed", String(btn.dataset.textSize === current)));
  contrastBtn.setAttribute("aria-pressed", String(root.classList.contains("high-contrast")));
})();

/* ---------- Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* =========================================================
   8. Life at ECA: 4 albums on the homepage
   Which 4 is decided by pickHomepageAlbums() in store.js
   (pinned albums first, then the newest), the same rule the admin shows.
   ========================================================= */

// Tile sizes for the grid, depending on how many albums there are
const GALLERY_LAYOUTS = {
  1: ["full"],
  2: ["big", "big"],
  3: ["big", "tall", "tall"],
  4: ["big", "tall", "", ""],
  5: ["big", "", "", "", ""],
  6: ["big", "tall", "", "", "wide", "wide"]
};

function renderGallery(albums) {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;

  const picked = pickHomepageAlbums(albums);
  if (!picked.length) {
    grid.innerHTML = `<p class="gallery__empty">Photos coming soon.</p>`;
    return;
  }

  const sizes = GALLERY_LAYOUTS[picked.length];
  grid.innerHTML = picked.map((album, i) => {
    const sizeClass = sizes[i] ? ` gallery__item--${sizes[i]}` : "";
    const count = album.photos.length;
    return `
      <figure class="gallery__item${sizeClass}">
        <a class="gallery__link" href="life.html#${encodeURIComponent(album.id)}" aria-label="Open album: ${escapeHTML(album.title)}"></a>
        <img src="${escapeHTML(album.photos[0] || "")}" alt="${escapeHTML(album.title)}" loading="lazy">
        ${count > 1 ? `<span class="gallery__count">${count} photos</span>` : ""}
        <figcaption>
          <strong>${escapeHTML(album.title)}</strong>
          ${album.caption ? `<span>${escapeHTML(album.caption)}</span>` : ""}
        </figcaption>
      </figure>`;
  }).join("");
}

/* =========================================================
   9. Load content from the data store
   All four lists load at the same time. If something fails,
   the rest of the page (hero, programs, apply form) still works.
   ========================================================= */
async function loadSiteContent() {
  try {
    const [news, events, albums, announcements] = await Promise.all([
      listNews(), listEvents(), listAlbums(), getAnnouncements()
    ]);
    renderTicker(announcements);
    renderNews(news);
    renderEvents(events);
    renderGallery(albums);
  } catch (err) {
    console.error("Couldn't load site content:", err);
    const track = document.getElementById("newsTrack");
    if (track) track.innerHTML = `<li class="news-card news-card--empty"><div class="news-card__body"><p>News couldn't load. Please refresh the page or visit our Facebook page.</p></div></li>`;
  }
}

loadSiteContent();