/* =========================================================
   ECA Admin - Add / Edit News
   - Add:  news-form.html
   - Edit: news-form.html?id=n1
   ========================================================= */

const form = document.getElementById("newsForm");
const fields = {
  title: document.getElementById("title"),
  category: document.getElementById("category"),
  date: document.getElementById("date"),
  summary: document.getElementById("summary"),
  body: document.getElementById("body"),
  author: document.getElementById("author"),
  facebookUrl: document.getElementById("facebookUrl"),
  isPoster: document.getElementById("isPoster"),
  shareToFacebook: document.getElementById("shareToFacebook")
};
const photoInput = document.getElementById("photoInput");
const dropzone = document.getElementById("dropzone");
const photoPicked = document.getElementById("photoPicked");
const formError = document.getElementById("formError");
const draftButton = document.getElementById("draftButton");
const publishButton = document.getElementById("publishButton");

const editId = new URLSearchParams(window.location.search).get("id");
let existingPost = null;   // the post being edited (null when adding)
let photo = "";            // saved path ("assets/…") or a new photo as a data URL
let photoName = "";
let hasUnsavedChanges = false;

/* =========================================================
   Photo: check, shrink, preview
   ========================================================= */

async function handlePhotoFile(file) {
  if (!file) return;
  setFieldError("photoField", false);

    const problem = checkImageFile(file);
  if (problem) {
    showPhotoError(problem);
    return;
  }

  try {
    dropzone.classList.add("is-loading");
    photo = await resizeImage(file);
    photoName = file.name;
    hasUnsavedChanges = true;
    showPhoto();
  } catch (err) {
    showPhotoError(err.message);
  } finally {
    dropzone.classList.remove("is-loading");
    photoInput.value = ""; // allows choosing the same file again
  }
}

function showPhotoError(message) {
  document.getElementById("photoError").textContent = message;
  setFieldError("photoField", true);
}

function showPhoto() {
  const hasPhoto = Boolean(photo);
  dropzone.hidden = hasPhoto;
  photoPicked.hidden = !hasPhoto;
  if (hasPhoto) {
    document.getElementById("photoThumb").src = assetUrl(photo);
    document.getElementById("photoName").textContent = photoName || "Current photo";
  }
  updatePreview();
}

photoInput.addEventListener("change", () => handlePhotoFile(photoInput.files[0]));

document.getElementById("removePhoto").addEventListener("click", () => {
  photo = "";
  photoName = "";
  hasUnsavedChanges = true;
  showPhoto();
});

// Drag and drop onto the box
["dragenter", "dragover"].forEach((type) => dropzone.addEventListener(type, (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragover");
}));
["dragleave", "drop"].forEach((type) => dropzone.addEventListener(type, () => dropzone.classList.remove("is-dragover")));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  handlePhotoFile(event.dataTransfer.files[0]);
});

/* =========================================================
   Live preview and character counter
   ========================================================= */
function updatePreview() {
  document.getElementById("previewTitle").textContent = fields.title.value.trim() || "Your title will appear here";
  document.getElementById("previewCategory").textContent = fields.category.value || "Category";

  const media = document.getElementById("previewMedia");
  if (photo) {
    const fitClass = fields.isPoster.checked ? " news-preview__img--contain" : "";
    media.innerHTML = `<img class="news-preview__img${fitClass}" src="${escapeHTML(assetUrl(photo))}" alt="">`;
  } else {
    media.innerHTML = `<span class="news-preview__empty">Photo will appear here</span>`;
  }

  document.getElementById("summaryCount").textContent = `${fields.summary.value.length} / 300 characters`;
  document.getElementById("bodyCount").textContent = `${fields.body.value.length} / 5000 characters`;
}

form.addEventListener("input", (event) => {
  hasUnsavedChanges = true;
  // Clear a field's error as soon as the user fixes it
  const field = event.target.closest(".field");
  if (field) field.classList.remove("field--error");
  if (!form.querySelector(".field--error")) formError.hidden = true;
  updatePreview();
});
form.addEventListener("change", updatePreview);

/* =========================================================
   Validation
   ========================================================= */
function setFieldError(fieldOrId, hasError) {
  const field = typeof fieldOrId === "string" ? document.getElementById(fieldOrId) : fieldOrId;
  field.classList.toggle("field--error", hasError);
}

function isValidFacebookUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && /(^|\.)facebook\.com$|(^|\.)fb\.watch$/.test(url.hostname);
  } catch (err) {
    return false;
  }
}

// Drafts only need a title. Publishing needs everything required.
function validate(status) {
  const errors = [];
  const check = (condition, fieldEl) => {
    setFieldError(fieldEl.closest(".field"), !condition);
    if (!condition) errors.push(fieldEl);
  };

  check(fields.title.value.trim().length > 0, fields.title);

  if (status === "published") {
    check(fields.category.value !== "", fields.category);
    check(fields.date.value !== "", fields.date);
    const photoOk = Boolean(photo);
    if (!photoOk) showPhotoError("Please add a photo.");
    else setFieldError("photoField", false);
    if (!photoOk) errors.push(dropzone);
  } else {
    ["category", "date"].forEach((name) => setFieldError(fields[name].closest(".field"), false));
    setFieldError("photoField", false);
  }

  const fb = fields.facebookUrl.value.trim();
  check(fb === "" || isValidFacebookUrl(fb), fields.facebookUrl);

  if (errors.length) {
    formError.textContent = "Please fix the highlighted fields.";
    formError.hidden = false;
    errors[0].focus();
    errors[0].scrollIntoView({ block: "center", behavior: "smooth" });
  } else {
    formError.hidden = true;
  }
  return errors.length === 0;
}

/* =========================================================
   Save
   ========================================================= */

// Keep the admin's line breaks, but remove spaces at line ends,
// extra empty lines (more than one in a row) and empty lines at the start/end
function cleanBody(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function setSaving(isSaving, status) {
  draftButton.disabled = isSaving;
  publishButton.disabled = isSaving;
  if (isSaving) {
    (status === "draft" ? draftButton : publishButton).textContent = "Saving…";
  } else {
    setButtonLabels();
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  // Which button was clicked: "Save as Draft" or "Publish"
  const status = event.submitter ? event.submitter.dataset.status : "draft";

  if (!validate(status)) return;

  const post = {
    title: fields.title.value.trim(),
    category: fields.category.value,
    date: fields.date.value || todayISO(),
    summary: fields.summary.value.trim(),
    body: cleanBody(fields.body.value),
    author: fields.author.value.trim(),
    facebookUrl: fields.facebookUrl.value.trim(),
    isPoster: fields.isPoster.checked,
    shareToFacebook: fields.shareToFacebook.checked, // used by the backend later
    image: photo,
    status
  };
  if (existingPost) post.id = existingPost.id;

  setSaving(true, status);
  try {
    await saveNews(post);
    hasUnsavedChanges = false;
    const message = status === "draft" ? "draft" : (existingPost ? "updated" : "published");
    window.location.href = `news.html?saved=${message}`;
  } catch (err) {
    formError.textContent = `${err.message || "Couldn't save."} Your work is still here. Please try again.`;
    formError.hidden = false;
    formError.scrollIntoView({ block: "center" });
    setSaving(false);
  }
});

/* =========================================================
   Warn before leaving with unsaved changes
   ========================================================= */
window.addEventListener("beforeunload", (event) => {
  if (hasUnsavedChanges) {
    event.preventDefault();
    event.returnValue = ""; // browser shows its own "Leave site?" message
  }
});

/* =========================================================
   Start: fill the form (Add or Edit)
   ========================================================= */
function setButtonLabels() {
  const isPublished = existingPost && existingPost.status === "published";
  publishButton.textContent = isPublished ? "Update" : "Publish";
  draftButton.textContent = isPublished ? "Move to Drafts" : "Save as Draft";
}

async function init() {
  fields.category.insertAdjacentHTML("beforeend",
    NEWS_CATEGORIES.map((c) => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join(""));

  if (!editId) {
    fields.date.value = todayISO();
    setButtonLabels();
    updatePreview();
    return;
  }

  // Edit mode
  document.title = "Edit News | ECA Website Admin";
  document.getElementById("formTitle").textContent = "Edit News";
  document.getElementById("crumbCurrent").textContent = "Edit News";

  try {
    existingPost = await getNews(editId);
  } catch (err) {
    existingPost = null;
  }

  if (!existingPost) {
    formError.innerHTML = 'This news post could not be found. It may have been deleted. <a href="news.html">Back to News</a>';
    formError.hidden = false;
    form.hidden = true;
    return;
  }

  fields.title.value = existingPost.title;
  // Keep an old category even if it was removed from NEWS_CATEGORIES
  if (existingPost.category && !NEWS_CATEGORIES.includes(existingPost.category)) {
    fields.category.insertAdjacentHTML("beforeend", `<option>${escapeHTML(existingPost.category)}</option>`);
  }
  fields.category.value = existingPost.category;
  fields.date.value = existingPost.date;
  fields.summary.value = existingPost.summary || "";
  fields.body.value = existingPost.body || "";
  fields.author.value = existingPost.author || "";
  fields.facebookUrl.value = existingPost.facebookUrl || "";
  fields.isPoster.checked = Boolean(existingPost.isPoster);
  photo = existingPost.image || "";

  const isPublished = existingPost.status === "published";
  document.getElementById("statusText").innerHTML = isPublished
    ? '<span class="pill pill--published">Published</span> Visible on the website.'
    : '<span class="pill pill--draft">Draft</span> Only admins can see it.';

  setButtonLabels();
  showPhoto();
}

init();