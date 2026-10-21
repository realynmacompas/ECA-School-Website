/* =========================================================
   Life at ECA page (life.html)
   One row per album: title, date, caption and a photo strip.
   The strip scrolls sideways (arrows on desktop, swipe on phones).
   Clicking a photo opens the viewer at that photo.
   Opening life.html#al3 scrolls to that album and opens it
   (the homepage tiles link here like that).
   Uses escapeHTML/parseDate from main.js and listAlbums from store.js.
   ========================================================= */

(function initLifePage() {
  const list = document.getElementById("albumList");
  if (!list) return;

  const PAGE_SIZE = 6; // albums shown before "Show more albums"

  const statusEl = document.getElementById("albumStatus");
  const moreBtn = document.getElementById("moreAlbums");
  const viewer = document.getElementById("viewer");
  const viewerImg = document.getElementById("viewerImg");
  const prevBtn = document.getElementById("viewerPrev");
  const nextBtn = document.getElementById("viewerNext");

  const state = {
    albums: [],       // published albums, newest first
    shown: PAGE_SIZE,
    open: null,       // album shown in the viewer
    photoIndex: 0,
    opener: null      // the photo button that opened the viewer (focus goes back to it)
  };

  function formatAlbumDate(iso) {
    return parseDate(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }

  /* ---------- Album rows ---------- */
  function rowHTML(album) {
    const count = album.photos.length;
    const title = escapeHTML(album.title);
    const photos = album.photos.map((src, i) => `
      <li>
        <button type="button" class="album-row__photo" data-album="${escapeHTML(album.id)}" data-index="${i}"
          aria-label="Open photo ${i + 1} of ${count}: ${title}">
          <img src="${escapeHTML(src)}" alt="" loading="lazy">
          <span class="album-row__zoom" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></span>
        </button>
      </li>`).join("");

    return `
      <article class="album-row" id="album-${escapeHTML(album.id)}" aria-labelledby="title-${escapeHTML(album.id)}">
        <div class="album-row__head">
          <div class="album-row__info">
            <h2 class="album-row__title" id="title-${escapeHTML(album.id)}">${title}</h2>
            ${album.caption ? `<p class="album-row__caption">${escapeHTML(album.caption)}</p>` : ""}
          </div>
          <div class="album-row__controls">
            <span class="album-row__count">${count} photo${count === 1 ? "" : "s"}</span>
            <button type="button" class="round-btn" data-scroll="-1" aria-label="Previous photos in ${title}"><svg aria-hidden="true"><use href="#i-left"></use></svg></button>
            <button type="button" class="round-btn" data-scroll="1" aria-label="Next photos in ${title}"><svg aria-hidden="true"><use href="#i-right"></use></svg></button>
          </div>
        </div>
        <div class="album-row__progress" aria-hidden="true"><span></span></div>
        <ul class="album-row__strip">${photos}</ul>
        <p class="album-row__hint" aria-hidden="true">Swipe to see more &rarr;</p>
      </article>`;
  }

  // Show the arrows and the gold line only when the photos don't all fit
  function updateRow(row) {
    const strip = row.querySelector(".album-row__strip");
    const maxScroll = strip.scrollWidth - strip.clientWidth;
    const scrollable = maxScroll > 1;
    row.classList.toggle("is-scrollable", scrollable);

    const [prev, next] = row.querySelectorAll("[data-scroll]");
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft >= maxScroll - 1;

    // Gold line = how far along the strip the visitor is
    const seen = scrollable ? (strip.scrollLeft + strip.clientWidth) / strip.scrollWidth : 0;
    row.querySelector(".album-row__progress span").style.width = `${seen * 100}%`;
  }

  function updateAllRows() {
    list.querySelectorAll(".album-row").forEach(updateRow);
  }

  function render() {
    if (!state.albums.length) {
      statusEl.textContent = "No albums yet. Please check back soon.";
      statusEl.hidden = false;
      list.innerHTML = "";
      moreBtn.hidden = true;
      return;
    }
    statusEl.hidden = true;
    list.innerHTML = state.albums.slice(0, state.shown).map(rowHTML).join("");
    moreBtn.hidden = state.albums.length <= state.shown;

    list.querySelectorAll(".album-row__strip").forEach((strip) => {
      strip.addEventListener("scroll", () => updateRow(strip.closest(".album-row")), { passive: true });
    });
    updateAllRows();
  }

  moreBtn.addEventListener("click", () => {
    const firstNew = state.shown;
    state.shown += PAGE_SIZE;
    render();
    // Move keyboard focus to the first newly shown album
    const photo = list.children[firstNew] && list.children[firstNew].querySelector(".album-row__photo");
    if (photo) photo.focus();
  });

  list.addEventListener("click", (event) => {
    // Arrows: move the strip by one photo
    const arrow = event.target.closest("[data-scroll]");
    if (arrow) {
      const strip = arrow.closest(".album-row").querySelector(".album-row__strip");
      const step = strip.firstElementChild.getBoundingClientRect().width + parseFloat(getComputedStyle(strip).columnGap || 0);
      strip.scrollBy({ left: Number(arrow.dataset.scroll) * step, behavior: "smooth" });
      return;
    }
    // Photos: open the viewer at that photo
    const photo = event.target.closest("[data-album]");
    if (photo) openAlbum(photo.dataset.album, photo, Number(photo.dataset.index));
  });

  window.addEventListener("resize", updateAllRows);

  /* ---------- Photo viewer ---------- */
  function showPhoto(index) {
    const photos = state.open.photos;
    state.photoIndex = (index + photos.length) % photos.length; // wrap around
    viewerImg.src = photos[state.photoIndex];
    viewerImg.alt = `${state.open.title}, photo ${state.photoIndex + 1} of ${photos.length}`;
    document.getElementById("viewerCount").textContent = `${state.photoIndex + 1} / ${photos.length}`;
  }

  function openAlbum(id, opener, startIndex = 0) {
    const album = state.albums.find((a) => a.id === id);
    if (!album) return;
    state.open = album;
    state.opener = opener || null;

    document.getElementById("viewerTitle").textContent = album.title;
    document.getElementById("viewerMeta").textContent =
      [album.caption, formatAlbumDate(album.date)].filter(Boolean).join(" · ");
    const single = album.photos.length < 2;
    prevBtn.hidden = single;
    nextBtn.hidden = single;
    document.getElementById("viewerCount").hidden = single;
    showPhoto(startIndex);

    history.replaceState(null, "", `#${encodeURIComponent(album.id)}`); // shareable link
    if (!viewer.open) viewer.showModal();
  }

  prevBtn.addEventListener("click", () => showPhoto(state.photoIndex - 1));
  nextBtn.addEventListener("click", () => showPhoto(state.photoIndex + 1));
  document.getElementById("viewerClose").addEventListener("click", () => viewer.close());

  viewer.addEventListener("keydown", (event) => {
    if (state.open.photos.length < 2) return;
    if (event.key === "ArrowLeft") showPhoto(state.photoIndex - 1);
    if (event.key === "ArrowRight") showPhoto(state.photoIndex + 1);
  });

  // Click on the dark background closes the viewer
  viewer.addEventListener("click", (event) => {
    if (event.target === viewer) viewer.close();
  });

  // Swipe on phones
  let touchStartX = 0;
  viewerImg.addEventListener("touchstart", (e) => { touchStartX = e.touches[0].clientX; }, { passive: true });
  viewerImg.addEventListener("touchend", (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 40 && state.open.photos.length > 1) showPhoto(state.photoIndex + (dx < 0 ? 1 : -1));
  });

  viewer.addEventListener("close", () => {
    history.replaceState(null, "", "life.html");
    if (state.opener) state.opener.focus();
  });

  /* ---------- Start ---------- */
  async function init() {
    try {
      const albums = await listAlbums();
      state.albums = albums.filter((a) => a.status === "published" && a.photos.length);

      // life.html#al3 → make sure that album is shown, scroll to it and open it
      const fromLink = decodeURIComponent(window.location.hash.slice(1));
      const linkedIndex = state.albums.findIndex((a) => a.id === fromLink);
      if (linkedIndex >= state.shown) state.shown = linkedIndex + 1;

      render();

      if (linkedIndex !== -1) {
        const row = document.getElementById(`album-${fromLink}`);
        row.scrollIntoView({ block: "start" });
        openAlbum(fromLink, row.querySelector(".album-row__photo"));
      }
    } catch (err) {
      console.error("Couldn't load albums:", err);
      statusEl.textContent = "Albums couldn't load. Please refresh the page.";
      statusEl.hidden = false;
    }
  }

  init();
})();