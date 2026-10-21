/* =========================================================
   ECA Admin - New / Edit Album
   - New:  album-form.html
   - Edit: album-form.html?id=al1
   ========================================================= */

const form = document.getElementById("albumForm");
const fields = {
  title: document.getElementById("title"),
  date: document.getElementById("date"),
  caption: document.getElementById("caption"),
  featured: document.getElementById("featured"),
  shareToFacebook: document.getElementById("shareToFacebook")
};
const photoInput = document.getElementById("photoInput");
const photoGrid = document.getElementById("photoGrid");
const photosField = document.getElementById("photosField");
const formError = document.getElementById("formError");
const draftButton = document.getElementById("draftButton");
const publishButton = document.getElementById("publishButton");

const editId = new URLSearchParams(window.location.search).get("id");

const state = {
  existingAlbum: null,   // the album being edited (null when creating)
  photos: [],            // saved paths ("assets/…") or new photos as data URLs; [0] is the cover
  isAdding: false,       // true while new photos are being resized
  otherPinned: 0,        // published albums pinned to the homepage, not counting this one
  hasUnsavedChanges: false
};

/* =========================================================
   Photo grid: add, reorder, remove
   ========================================================= */
function renderPhotos() {
  const slots = state.photos.map((src, i) => `
    <li class="photo-slot">
      <img src="${escapeHTML(assetUrl(src))}" alt="Photo ${i + 1}${i === 0 ? " (cover)" : ""}">
      ${i === 0 ? `<span class="photo-slot__cover">Cover</span>` : ""}
      <div class="photo-slot__tools">
        <button type="button" class="photo-slot__btn" data-move="-1" data-index="${i}"
          aria-label="Move photo ${i + 1} left" ${i === 0 ? "disabled" : ""}>←</button>
        <button type="button" class="photo-slot__btn" data-move="1" data-index="${i}"
          aria-label="Move photo ${i + 1} right" ${i === state.photos.length - 1 ? "disabled" : ""}>→</button>
        <button type="button" class="photo-slot__btn photo-slot__btn--remove" data-remove="${i}"
          aria-label="Remove photo ${i + 1}">Remove</button>
      </div>
    </li>`);

  const room = MAX_ALBUM_PHOTOS - state.photos.length;
  if (room > 0) {
    slots.push(`
      <li>
        <label for="photoInput" class="photo-add${state.isAdding ? " is-loading" : ""}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>
          <strong>${state.isAdding ? "Adding…" : "Add photos"}</strong>
          <span>${room} of ${MAX_ALBUM_PHOTOS} left · or drag here</span>
        </label>
      </li>`);
  }
  photoGrid.innerHTML = slots.join("");
  updatePreview();
}

function showPhotosError(message) {
  document.getElementById("photosError").textContent = message;
  photosField.classList.add("field--error");
}

async function addPhotoFiles(fileList) {
  const files = Array.from(fileList);
  if (!files.length || state.isAdding) return;
  photosField.classList.remove("field--error");

  const room = MAX_ALBUM_PHOTOS - state.photos.length;
  const problems = [];
  if (files.length > room) {
    problems.push(`An album can have ${MAX_ALBUM_PHOTOS} photos. ${files.length - room} photo(s) were not added.`);
  }

  state.isAdding = true;
  renderPhotos();
  for (const file of files.slice(0, room)) {
    const problem = checkImageFile(file);
    if (problem) {
      problems.push(`${file.name}: ${problem}`);
      continue;
    }
    try {
      state.photos.push(await resizeImage(file));
      state.hasUnsavedChanges = true;
    } catch (err) {
      problems.push(`${file.name}: ${err.message}`);
    }
  }
  state.isAdding = false;
  photoInput.value = ""; // allows choosing the same file again
  renderPhotos();
  if (problems.length) showPhotosError(problems.join(" "));
}

photoInput.addEventListener("change", () => addPhotoFiles(photoInput.files));

// Move and Remove buttons (one listener for the whole grid)
photoGrid.addEventListener("click", (event) => {
  const moveBtn = event.target.closest("[data-move]");
  const removeBtn = event.target.closest("[data-remove]");

  if (moveBtn) {
    const from = Number(moveBtn.dataset.index);
    const to = from + Number(moveBtn.dataset.move);
    [state.photos[from], state.photos[to]] = [state.photos[to], state.photos[from]]; // swap
    state.hasUnsavedChanges = true;
    renderPhotos();
    // Keep keyboard focus on the same arrow so it can be pressed again
    const sameButton = photoGrid.querySelector(`[data-move="${moveBtn.dataset.move}"][data-index="${to}"]`);
    (sameButton && !sameButton.disabled ? sameButton : photoGrid.querySelector(`[data-index="${to}"]`)).focus();
  }

  if (removeBtn) {
    state.photos.splice(Number(removeBtn.dataset.remove), 1);
    state.hasUnsavedChanges = true;
    renderPhotos();
    (photoGrid.querySelector("button:not(:disabled)") || photoInput).focus();
  }
});

// Drag and drop photos onto the grid
photoGrid.addEventListener("dragover", (event) => {
  event.preventDefault();
  photoGrid.querySelector(".photo-add")?.classList.add("is-dragover");
});
photoGrid.addEventListener("dragleave", () => {
  photoGrid.querySelector(".photo-add")?.classList.remove("is-dragover");
});
photoGrid.addEventListener("drop", (event) => {
  event.preventDefault();
  addPhotoFiles(event.dataTransfer.files);
});

/* =========================================================
   Preview, homepage pin, and live updates
   ========================================================= */
function updatePreview() {
  const media = document.getElementById("previewMedia");
  const cover = state.photos[0];
  const more = state.photos.length - 1;
  media.innerHTML = cover
    ? `<img src="${escapeHTML(assetUrl(cover))}" alt="">${more > 0 ? `<span class="album-preview__more">+${more} more</span>` : ""}`
    : `<span class="news-preview__empty">Cover photo will appear here</span>`;

  document.getElementById("previewTitle").textContent = fields.title.value.trim() || "Album title";
  document.getElementById("previewCaption").textContent = fields.caption.value.trim();
}

function updatePinHint() {
  const hint = document.getElementById("featuredHint");
  const isFull = state.otherPinned >= HOMEPAGE_ALBUM_SPOTS;

  // Can't pin a 5th album, but an album that is already pinned can always be unpinned
  fields.featured.disabled = isFull && !fields.featured.checked;

  if (fields.featured.disabled) {
    hint.textContent = `All ${HOMEPAGE_ALBUM_SPOTS} homepage spots are pinned. Unpin another album first.`;
    return;
  }
  const used = state.otherPinned + (fields.featured.checked ? 1 : 0);
  hint.textContent = `${used} of ${HOMEPAGE_ALBUM_SPOTS} spots pinned. Spots that aren't pinned show the newest albums.`;
}

form.addEventListener("input", (event) => {
  state.hasUnsavedChanges = true;
  const field = event.target.closest(".field");
  if (field) field.classList.remove("field--error");
  if (!form.querySelector(".field--error")) formError.hidden = true;
  updatePreview();
});
fields.featured.addEventListener("change", updatePinHint);

/* =========================================================
   Validation
   ========================================================= */
// Drafts only need a title. Publishing needs everything required.
function validate(status) {
  form.querySelectorAll(".field--error").forEach((f) => f.classList.remove("field--error"));
  const errors = [];
  const check = (condition, input) => {
    if (condition) return;
    input.closest(".field").classList.add("field--error");
    errors.push(input);
  };

  check(fields.title.value.trim() !== "", fields.title);
  if (status === "published") {
    check(fields.date.value !== "", fields.date);
    if (state.photos.length === 0) {
      showPhotosError("Please add at least one photo.");
      errors.push(photoInput); // hidden input; the "Add photos" box shows its focus ring
    }
  }

  if (errors.length) {
    formError.textContent = "Please fix the highlighted fields.";
    formError.hidden = false;
    errors[0].focus();
    errors[0].closest(".field").scrollIntoView({ block: "center", behavior: "smooth" });
  } else {
    formError.hidden = true;
  }
  return errors.length === 0;
}

/* =========================================================
   Save
   ========================================================= */
function setButtonLabels() {
  const isPublished = state.existingAlbum && state.existingAlbum.status === "published";
  publishButton.textContent = isPublished ? "Update" : "Publish";
  draftButton.textContent = isPublished ? "Move to Drafts" : "Save as Draft";
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (state.isAdding) return; // wait until photos finish processing
  const status = event.submitter ? event.submitter.dataset.status : "draft";
  if (!validate(status)) return;

  const album = {
    title: fields.title.value.trim(),
    date: fields.date.value || todayISO(),
    caption: fields.caption.value.trim(),
    photos: [...state.photos],
    featured: fields.featured.checked,
    shareToFacebook: fields.shareToFacebook.checked, // used by the backend later
    status
  };
  if (state.existingAlbum) album.id = state.existingAlbum.id;

  draftButton.disabled = true;
  publishButton.disabled = true;
  (status === "draft" ? draftButton : publishButton).textContent = "Saving…";
  try {
    await saveAlbum(album);
    state.hasUnsavedChanges = false;
    const message = status === "draft" ? "draft" : (state.existingAlbum ? "updated" : "published");
    window.location.href = `albums.html?saved=${message}`;
  } catch (err) {
    formError.textContent = `${err.message || "Couldn't save."} Your work is still here. Please try again.`;
    formError.hidden = false;
    formError.scrollIntoView({ block: "center" });
    draftButton.disabled = false;
    publishButton.disabled = false;
    setButtonLabels();
  }
});

/* =========================================================
   Warn before leaving with unsaved changes
   ========================================================= */
window.addEventListener("beforeunload", (event) => {
  if (state.hasUnsavedChanges) {
    event.preventDefault();
    event.returnValue = "";
  }
});

/* =========================================================
   Start: fill the form (New or Edit)
   ========================================================= */
async function init() {
  let allAlbums = [];
  try {
    allAlbums = await listAlbums();
  } catch (err) {
    formError.textContent = "Couldn't load the albums. Please refresh the page.";
    formError.hidden = false;
  }
  state.otherPinned = allAlbums.filter((a) =>
    a.featured && a.status === "published" && a.id !== editId).length;

  if (editId) {
    state.existingAlbum = allAlbums.find((a) => a.id === editId) || null;
    if (!state.existingAlbum) {
      formError.innerHTML = 'This album could not be found. It may have been deleted. <a href="albums.html">Back to Albums</a>';
      formError.hidden = false;
      form.hidden = true;
      return;
    }

    const album = state.existingAlbum;
    document.title = "Edit Album | ECA Website Admin";
    document.getElementById("formTitle").textContent = "Edit Album";
    document.getElementById("crumbCurrent").textContent = "Edit Album";

    fields.title.value = album.title;
    fields.date.value = album.date;
    fields.caption.value = album.caption || "";
    fields.featured.checked = Boolean(album.featured);
    state.photos = [...album.photos];

    document.getElementById("statusText").innerHTML = album.status === "published"
      ? '<span class="pill pill--published">Published</span> Visible on the website.'
      : '<span class="pill pill--draft">Draft</span> Only admins can see it.';
  } else {
    fields.date.value = todayISO();
  }

  setButtonLabels();
  updatePinHint();
  renderPhotos();
}

init();