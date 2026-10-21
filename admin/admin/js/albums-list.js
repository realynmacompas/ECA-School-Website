/* =========================================================
   ECA Admin - Albums list (Life at ECA)
   Homepage preview, filters (status, search), paging, delete.
   ========================================================= */

const PAGE_SIZE = 10;

const listEl = document.getElementById("albumList");
const homepageEl = document.getElementById("homepageList");
const searchInput = document.getElementById("search");
const statusButtons = document.querySelectorAll(".segmented__btn");

const state = {
  allAlbums: [],
  homepageIds: [],   // ids of the 4 albums the homepage shows
  status: "all",     // "all" | "published" | "draft"
  search: "",
  page: 1
};

// Messages passed from the form page, e.g. albums.html?saved=published
function showSavedMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const messages = {
    published: "Album published! It's now in Life at ECA.",
    draft: "Saved as a draft. Only admins can see it until you publish.",
    updated: "Changes saved."
  };
  const saved = params.get("saved");
  if (messages[saved]) showToast(messages[saved], saved === "draft" ? "info" : "success");
  if (saved) history.replaceState(null, "", "albums.html");
}

/* ---------- Helpers ---------- */
function photoCountText(album) {
  const count = album.photos.length;
  return `${count} photo${count === 1 ? "" : "s"}`;
}

function coverHTML(album, className) {
  const cover = album.photos[0];
  return cover
    ? `<img class="${className}" src="${escapeHTML(assetUrl(cover))}" alt="">`
    : `<span class="${className} item__thumb--empty" aria-hidden="true">No photo</span>`;
}

/* ---------- "On the homepage now" strip ---------- */
function renderHomepage() {
  const picked = pickHomepageAlbums(state.allAlbums);
  state.homepageIds = picked.map((a) => a.id);

  const slots = [];
  for (let i = 0; i < HOMEPAGE_ALBUM_SPOTS; i++) {
    const album = picked[i];
    if (!album) {
      slots.push(`<li class="homepage-strip__slot homepage-strip__slot--empty">Empty spot</li>`);
      continue;
    }
    slots.push(`
      <li class="homepage-strip__slot">
        <a href="album-form.html?id=${encodeURIComponent(album.id)}">
          ${coverHTML(album, "homepage-strip__img")}
          <span class="homepage-strip__label">${album.featured ? "Pinned" : "Newest"}</span>
          <strong class="homepage-strip__title">${escapeHTML(album.title)}</strong>
        </a>
      </li>`);
  }
  homepageEl.innerHTML = slots.join("");
}

/* ---------- Filtering ---------- */
function getFilteredAlbums() {
  const search = state.search.trim().toLowerCase();
  return state.allAlbums.filter((album) => {
    if (state.status !== "all" && album.status !== state.status) return false;
    if (search && !album.title.toLowerCase().includes(search)) return false;
    return true;
  });
}

function updateCounts() {
  const published = state.allAlbums.filter((a) => a.status === "published").length;
  document.getElementById("countAll").textContent = state.allAlbums.length;
  document.getElementById("countPublished").textContent = published;
  document.getElementById("countDraft").textContent = state.allAlbums.length - published;
}

/* ---------- List rendering ---------- */
function rowHTML(album) {
  const isDraft = album.status === "draft";
  const onHomepage = state.homepageIds.includes(album.id);
  let homepageBadge = "";
  if (onHomepage) homepageBadge = `<span class="pill pill--home">${album.featured ? "Pinned" : "On homepage"}</span>`;

  return `
    <li class="row${isDraft ? " row--draft" : ""}">
      <div class="row__thumb album-cover">
        ${coverHTML(album, "album-cover__img")}
        <span class="album-cover__count">${photoCountText(album)}</span>
      </div>
      <div class="row__main">
        <strong class="row__title">${escapeHTML(album.title)}</strong>
        ${album.caption ? `<span class="row__caption">${escapeHTML(album.caption)}</span>` : ""}
      </div>
      <span class="row__date">${formatDate(album.date)}</span>
      <div class="row__status">
        <span class="pill ${isDraft ? "pill--draft" : "pill--published"}">${isDraft ? "Draft" : "Published"}</span>
        ${homepageBadge}
      </div>
      <div class="row__actions">
        <a class="btn btn--outline btn--sm" href="album-form.html?id=${encodeURIComponent(album.id)}">Edit</a>
        <button type="button" class="btn btn--danger btn--sm" data-delete="${escapeHTML(album.id)}">Delete</button>
      </div>
    </li>`;
}

function render() {
  const filtered = getFilteredAlbums();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (state.allAlbums.length === 0) {
    listEl.innerHTML = `<li class="item-list__empty">No albums yet. <a href="album-form.html">Create your first one</a>.</li>`;
  } else if (pageItems.length === 0) {
    listEl.innerHTML = `<li class="item-list__empty">No albums match your search or filters.</li>`;
  } else {
    listEl.innerHTML = pageItems.map(rowHTML).join("");
  }

  document.getElementById("pagerText").textContent = filtered.length
    ? `Showing ${start + 1}–${start + pageItems.length} of ${filtered.length} albums`
    : "";
  document.getElementById("prevPage").disabled = state.page <= 1;
  document.getElementById("nextPage").disabled = state.page >= totalPages;
}

// Homepage strip and badges depend on the whole list, so refresh everything together
function renderAll() {
  updateCounts();
  renderHomepage();
  render();
}

/* ---------- Events ---------- */
statusButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.status = btn.dataset.status;
    state.page = 1;
    statusButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    render();
  });
});

searchInput.addEventListener("input", () => {
  state.search = searchInput.value;
  state.page = 1;
  render();
});

document.getElementById("prevPage").addEventListener("click", () => { state.page--; render(); });
document.getElementById("nextPage").addEventListener("click", () => { state.page++; render(); });

listEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  const album = state.allAlbums.find((a) => a.id === button.dataset.delete);
  if (!album) return;

  const isPublished = album.status === "published";
  const choice = await confirmDialog({
    title: "Delete this album?",
    message: `"${album.title}" and its ${photoCountText(album)} will be removed from the website. This cannot be undone.`
      + (isPublished ? " To only hide it, move it to Drafts instead." : ""),
    confirmText: "Delete",
    altText: isPublished ? "Move to Drafts" : "",
    danger: true
  });
  if (choice === "cancel") return;

  button.disabled = true;
  try {
    if (choice === "alt") {
      await saveAlbum({ id: album.id, status: "draft" });
      album.status = "draft";
      showToast(`"${album.title}" was moved to Drafts. It's hidden from the website.`, "info");
    } else {
      await deleteAlbum(album.id);
      state.allAlbums = state.allAlbums.filter((a) => a.id !== album.id);
      showToast(`"${album.title}" was deleted.`);
    }
    renderAll();
  } catch (err) {
    button.disabled = false;
    showToast("Couldn't save the change. Please try again.", "error");
  }
});

/* ---------- Start ---------- */
async function init() {
  showSavedMessageFromUrl();

  try {
    state.allAlbums = await listAlbums();
    renderAll();
  } catch (err) {
    listEl.innerHTML = "";
    homepageEl.innerHTML = "";
    showToast("Couldn't load the albums. Please refresh the page.", "error");
  }
}

init();