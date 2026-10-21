/* =========================================================
   ECA Admin - News list
   Filters (status, search, category), paging, and delete.
   ========================================================= */

const PAGE_SIZE = 10;

const listEl = document.getElementById("newsList");
const searchInput = document.getElementById("search");
const categorySelect = document.getElementById("categoryFilter");
const statusButtons = document.querySelectorAll(".segmented__btn");

// Everything the page needs to remember in one place
const state = {
  allNews: [],
  status: "all",   // "all" | "published" | "draft"
  search: "",
  category: "",
  page: 1
};

// Messages passed from the form page, e.g. news.html?saved=published
function showSavedMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const messages = {
    published: "Posted! It's now on the homepage.",
    draft: "Saved as a draft. Only admins can see it until you publish.",
    updated: "Changes saved."
  };
  const saved = params.get("saved");
  if (messages[saved]) showToast(messages[saved], saved === "draft" ? "info" : "success");
  // Remove ?saved=… so refreshing the page doesn't show the message again
  if (saved) history.replaceState(null, "", "news.html");
}

/* ---------- Filtering ---------- */
function getFilteredNews() {
  const search = state.search.trim().toLowerCase();
  return state.allNews.filter((item) => {
    if (state.status !== "all" && item.status !== state.status) return false;
    if (state.category && item.category !== state.category) return false;
    if (search && !item.title.toLowerCase().includes(search)) return false;
    return true;
  });
}

function updateCounts() {
  const published = state.allNews.filter((n) => n.status === "published").length;
  document.getElementById("countAll").textContent = state.allNews.length;
  document.getElementById("countPublished").textContent = published;
  document.getElementById("countDraft").textContent = state.allNews.length - published;
}

/* ---------- Rendering ---------- */
function rowHTML(item) {
  const isDraft = item.status === "draft";
  const thumb = item.image
    ? `<img class="row__thumb${item.isPoster ? " row__thumb--poster" : ""}" src="${escapeHTML(assetUrl(item.image))}" alt="">`
    : `<span class="row__thumb item__thumb--empty" aria-hidden="true">No photo</span>`;

  return `
    <li class="row${isDraft ? " row--draft" : ""}">
      ${thumb}
      <div class="row__main">
        <strong class="row__title">${escapeHTML(item.title)}</strong>
        <span class="tag">${escapeHTML(item.category)}</span>
      </div>
      <span class="row__date">${formatDate(item.date)}</span>
      <span class="pill ${isDraft ? "pill--draft" : "pill--published"}">${isDraft ? "Draft" : "Published"}</span>
      <div class="row__actions">
        <a class="btn btn--outline btn--sm" href="news-form.html?id=${encodeURIComponent(item.id)}">Edit</a>
        <button type="button" class="btn btn--danger btn--sm" data-delete="${escapeHTML(item.id)}">Delete</button>
      </div>
    </li>`;
}

function render() {
  const filtered = getFilteredNews();
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);

  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = filtered.slice(start, start + PAGE_SIZE);

  if (state.allNews.length === 0) {
    listEl.innerHTML = `<li class="item-list__empty">No news yet. <a href="news-form.html">Post your first one</a>.</li>`;
  } else if (pageItems.length === 0) {
    listEl.innerHTML = `<li class="item-list__empty">No posts match your search or filters.</li>`;
  } else {
    listEl.innerHTML = pageItems.map(rowHTML).join("");
  }

  document.getElementById("pagerText").textContent = filtered.length
    ? `Showing ${start + 1}–${start + pageItems.length} of ${filtered.length} posts`
    : "";
  document.getElementById("prevPage").disabled = state.page <= 1;
  document.getElementById("nextPage").disabled = state.page >= totalPages;
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

categorySelect.addEventListener("change", () => {
  state.category = categorySelect.value;
  state.page = 1;
  render();
});

document.getElementById("prevPage").addEventListener("click", () => { state.page--; render(); });
document.getElementById("nextPage").addEventListener("click", () => { state.page++; render(); });

// One listener for all Delete buttons (they are re-created on every render)
listEl.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  const item = state.allNews.find((n) => n.id === button.dataset.delete);
  if (!item) return;

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
  categorySelect.insertAdjacentHTML("beforeend",
    NEWS_CATEGORIES.map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join(""));

  showSavedMessageFromUrl();

  try {
    state.allNews = await listNews();
    updateCounts();
    render();
  } catch (err) {
    listEl.innerHTML = "";
    showToast("Couldn't load the news. Please refresh the page.", "error");
  }
}

init();