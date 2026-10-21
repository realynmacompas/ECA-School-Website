/* =========================================================
   ECA Admin - Dashboard
   Fills in the counts and lists using the data store.
   ========================================================= */

document.getElementById("todayDate").textContent = new Date().toLocaleDateString("en-US", {
  weekday: "long", month: "long", day: "numeric", year: "numeric"
});

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/* ---------- News tile + recent news list ---------- */
function renderNews(news) {
  const drafts = news.filter((n) => n.status === "draft").length;
  document.getElementById("newsCount").textContent = news.length;

  const note = document.getElementById("newsNote");
  note.textContent = drafts > 0 ? `${plural(drafts, "draft")} not yet published` : "All posts are published";
  note.classList.toggle("tile__note--alert", drafts > 0);

  const list = document.getElementById("recentNews");
  const recent = news.slice(0, 3); // already sorted newest first

  if (recent.length === 0) {
    list.innerHTML = `<li class="item-list__empty">No news yet. <a href="news-form.html">Post your first one</a>.</li>`;
    return;
  }

  list.innerHTML = recent.map((item) => {
    const isDraft = item.status === "draft";
    return `
      <li class="item">
        ${item.image
          ? `<img class="item__thumb" src="${escapeHTML(assetUrl(item.image))}" alt="">`
          : `<span class="item__thumb item__thumb--empty" aria-hidden="true">No photo</span>`}
        <div class="item__body">
          <strong class="item__title">${escapeHTML(item.title)}</strong>
          <span class="item__meta">${escapeHTML(item.category)} · ${formatDate(item.date)}</span>
        </div>
        <span class="pill ${isDraft ? "pill--draft" : "pill--published"}">${isDraft ? "Draft" : "Published"}</span>
        <a href="news-form.html?id=${encodeURIComponent(item.id)}" class="item__action">Edit</a>
      </li>`;
  }).join("");
}

/* ---------- Events tile + coming up list ---------- */
function renderEvents(events) {
  const today = todayISO();
  // An event is upcoming until its last day has passed
  const upcoming = events.filter((ev) => (ev.end || ev.start) >= today);

  document.getElementById("eventsCount").textContent = upcoming.length;

  // "Next" = the first event that hasn't started yet
  const next = upcoming.find((ev) => ev.start >= today);
  document.getElementById("eventsNote").textContent = next
    ? `Next: ${formatDate(next.start, { month: "short", day: "numeric" })}, ${next.title}`
    : "No upcoming events";

  const list = document.getElementById("upcomingEvents");
  const soon = upcoming.slice(0, 3);

  if (soon.length === 0) {
    list.innerHTML = `<li class="item-list__empty">No upcoming events. <a href="events.html">Add one</a>.</li>`;
    return;
  }

  list.innerHTML = soon.map((ev) => {
    const badge = dateBadgeParts(ev.start);
    return `
      <li class="event-row">
        <span class="date-badge"><span>${badge.month}</span><strong>${badge.day}</strong></span>
        <div><strong>${escapeHTML(ev.title)}</strong><span class="item__meta">${formatDateRange(ev.start, ev.end)}</span></div>
      </li>`;
  }).join("");
}

/* ---------- Albums tile ---------- */
function renderAlbums(albums) {
  const published = albums.filter((a) => a.status === "published").length;
  const pinned = pickHomepageAlbums(albums).filter((a) => a.featured).length;
  document.getElementById("albumsCount").textContent = published;
  document.getElementById("albumsNote").textContent = pinned
    ? `${pinned} of ${HOMEPAGE_ALBUM_SPOTS} homepage spots pinned`
    : "Homepage shows the newest albums";
}

/* ---------- Announcements tile ---------- */
function renderAnnouncements(announcements) {
  const status = document.getElementById("announcementStatus");
  const visible = announcements.messages.filter((m) => m.visible).length;

  if (announcements.enabled) {
    status.innerHTML = `<span class="dot" aria-hidden="true"></span>ON`;
    status.classList.remove("tile__status--off");
  } else {
    status.innerHTML = `<span class="dot dot--off" aria-hidden="true"></span>OFF`;
    status.classList.add("tile__status--off");
  }

  document.getElementById("announcementNote").textContent = announcements.enabled
    ? `${plural(visible, "message")} scrolling`
    : "Hidden from the website";
}

/* ---------- Load everything ---------- */
async function loadDashboard() {
  try {
    // Promise.all loads the four lists at the same time instead of one by one
    const [news, events, albums, announcements] = await Promise.all([
      listNews(), listEvents(), listAlbums(), getAnnouncements()
    ]);
    renderNews(news);
    renderEvents(events);
    renderAlbums(albums);
    renderAnnouncements(announcements);
  } catch (err) {
    console.error(err);
    document.getElementById("loadError").hidden = false;
  }
}

document.getElementById("resetDemo").addEventListener("click", async () => {
  const choice = await confirmDialog({
    title: "Reset demo content?",
    message: "All news, events, albums and announcements go back to the original sample data. Your changes will be lost.",
    confirmText: "Reset",
    danger: true
  });
  if (choice !== "confirm") return;
  resetDemoData();
  await loadDashboard();
  showToast("Demo content was reset.");
});

loadDashboard();