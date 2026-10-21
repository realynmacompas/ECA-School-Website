/* =========================================================
   ECA Admin - Announcement Bar
   Changes are kept on this page until "Save changes" is clicked,
   then saved all at once with saveAnnouncements().
   The order is changed with the number button on each message,
   which opens a small "Move to" menu.
   ========================================================= */

const MAX_MESSAGES = 10;

// Where a message can link to. Values starting with "#" are sections of the homepage.
const LINK_TARGETS = [
  { value: "", label: "Nothing" },
  { value: "#apply", label: "Admissions" },
  { value: "#news", label: "News & Events" },
  { value: "#calendar", label: "School Calendar" },
  { value: "#gallery", label: "Life at ECA" },
  { value: "#about", label: "About ECA" },
  { value: "#contact", label: "Contact" },
  { value: "url", label: "Another web page" }
];

const ARROW_ICON = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';

const enabledSwitch = document.getElementById("enabledSwitch");
const listEl = document.getElementById("messageList");
const saveBar = document.getElementById("saveBar");
const saveButton = document.getElementById("saveButton");

const form = document.getElementById("messageForm");
const textInput = document.getElementById("text");
const linkSelect = document.getElementById("linkTarget");
const urlField = document.getElementById("urlField");
const urlInput = document.getElementById("url");
const positionField = document.getElementById("positionField");
const positionSelect = document.getElementById("position");
const addButton = document.getElementById("addButton");
const clearButton = document.getElementById("clearButton");

const state = {
  data: { enabled: false, messages: [] },  // what is on the page now (may be unsaved)
  savedJSON: "",                           // what is saved, as text, to detect changes
  editingId: null,
  movedId: null,                           // message that was just moved (gets the "Moved to" tag)
  menuFor: null                            // message whose "Move to" menu is open
};

/* ---------- Helpers ---------- */

// Comparing the data as text is a simple way to know if anything changed
function hasUnsavedChanges() {
  return JSON.stringify(state.data) !== state.savedJSON;
}

function linkLabel(link) {
  if (!link) return "No link";
  const target = LINK_TARGETS.find((t) => t.value === link);
  if (target) return `Links to ${target.label}`;
  try {
    return `Links to ${new URL(link).hostname}`;
  } catch (err) {
    return `Links to ${link}`;
  }
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch (err) {
    return false;
  }
}

// <option>s 1..count, with `selected` on the current position
function numberOptions(count, selected) {
  let html = "";
  for (let n = 1; n <= count; n++) {
    html += `<option value="${n}"${n === selected ? " selected" : ""}>${n}</option>`;
  }
  return html;
}

/* ---------- Rendering ---------- */
function renderSwitch() {
  const on = state.data.enabled;
  enabledSwitch.setAttribute("aria-checked", String(on));
  document.getElementById("switchLabel").textContent = on ? "Showing on the website" : "Hidden from the website";
}

function renderPreview() {
  const shown = state.data.messages.filter((m) => m.visible);
  const items = shown.map((m) => `<li>${escapeHTML(m.text)}</li>`).join("");
  // Two copies so the scroll loops without a gap (same trick as the website)
  document.getElementById("previewTrack").innerHTML = items + items;

  const preview = document.getElementById("tickerPreview");
  preview.classList.toggle("is-off", !state.data.enabled || shown.length === 0);

  let note = "";
  if (!state.data.enabled) note = "The bar is turned off, so visitors won't see it. Your messages are kept.";
  else if (shown.length === 0) note = "No messages are shown, so the bar won't appear on the website.";
  document.getElementById("previewNote").textContent = note;
}

// The "Move to" menu: 1 · First ... current · Now ... last · Last
function orderMenuHTML(id, index, total) {
  const items = [];
  for (let n = 1; n <= total; n++) {
    const isCurrent = n === index + 1;
    let note = "";
    if (isCurrent) note = "Current";
    else if (n === 1) note = "First";
    else if (n === total) note = "Last";
    items.push(`
      <button type="button" role="menuitemradio" aria-checked="${isCurrent}"
        class="order-menu__item${isCurrent ? " is-current" : ""}" data-move-to="${n}" data-for="${escapeHTML(id)}">
        <b>${n}</b><span>${note}</span>
      </button>`);
  }
  return `
    <div class="order-menu" role="menu" aria-label="Move to">
      <span class="order-menu__title" aria-hidden="true">Move to</span>
      ${items.join("")}
    </div>`;
}

function messageHTML(msg, index, total) {
  const classes = ["msg"];
  if (!msg.visible) classes.push("is-hidden");
  if (msg.id === state.movedId) classes.push("is-moved");
  if (msg.id === state.editingId) classes.push("is-editing");
  const id = escapeHTML(msg.id);
  const movedTag = msg.id === state.movedId ? `<span class="msg__tag">Moved to ${index + 1}</span>` : "";
  const hiddenNote = msg.visible ? "" : " · not scrolling right now";
  const isMenuOpen = msg.id === state.menuFor;
  if (isMenuOpen) classes.push("is-menu-open");

  return `
    <li class="${classes.join(" ")}">
      <span class="order-badge${index === 0 ? " order-badge--first" : ""}">
        <button type="button" class="order-badge__btn" data-order-btn="${id}"
          aria-haspopup="menu" aria-expanded="${isMenuOpen}"
          aria-label="Order ${index + 1}. Change the order of: ${escapeHTML(msg.text.slice(0, 40))}">${index + 1}</button>
        <span class="order-badge__arrow" aria-hidden="true">${ARROW_ICON}</span>
        ${isMenuOpen ? orderMenuHTML(msg.id, index, total) : ""}
      </span>
      <div class="msg__main">
        <p class="msg__text">${escapeHTML(msg.text)}</p>
        <span class="msg__meta">${escapeHTML(linkLabel(msg.link))}${hiddenNote} ${movedTag}</span>
      </div>
      <button type="button" class="mini-switch" role="switch" aria-checked="${msg.visible}" data-toggle="${id}" aria-label="Show this message on the website">
        <span class="mini-switch__track" aria-hidden="true"><span class="mini-switch__thumb"></span></span>
        <span aria-hidden="true">${msg.visible ? "Shown" : "Hidden"}</span>
      </button>
      <div class="msg__actions">
        <button type="button" class="text-btn" data-edit="${id}">Edit</button>
        <button type="button" class="text-btn text-btn--danger" data-delete="${id}">Delete</button>
      </div>
    </li>`;
}

function renderList() {
  const messages = state.data.messages;
  const shown = messages.filter((m) => m.visible).length;
  document.getElementById("messageCount").textContent = messages.length
    ? `${shown} showing · ${messages.length - shown} hidden`
    : "";

  listEl.innerHTML = messages.length
    ? messages.map((m, i) => messageHTML(m, i, messages.length)).join("")
    : `<li class="item-list__empty">No messages yet. Use the form to add one.</li>`;

  const isFull = messages.length >= MAX_MESSAGES && !state.editingId;
  addButton.disabled = isFull;
  addButton.title = isFull ? `You can have up to ${MAX_MESSAGES} messages.` : "";

  // "Order" in the form: 1..(count + 1), last by default.
  // Hidden while editing, because the number on the message already moves it.
  const keep = Number(positionSelect.value) || messages.length + 1;
  positionSelect.innerHTML = numberOptions(messages.length + 1, Math.min(keep, messages.length + 1));
  positionSelect.lastElementChild.textContent += " (last)";
  positionField.hidden = Boolean(state.editingId);
}

function renderAll() {
  renderSwitch();
  renderPreview();
  renderList();
  saveBar.hidden = !hasUnsavedChanges();
}

/* ---------- Message form (new / edit) ---------- */
function updateTextCount() {
  document.getElementById("textCount").textContent = `${textInput.value.length} / 150`;
}

function showUrlField() {
  urlField.hidden = linkSelect.value !== "url";
}

function resetForm() {
  form.reset();
  form.querySelectorAll(".field--error").forEach((f) => f.classList.remove("field--error"));
  state.editingId = null;
  document.getElementById("formHeading").textContent = "New message";
  addButton.textContent = "Add message";
  clearButton.textContent = "Clear";
  updateTextCount();
  showUrlField();
  positionSelect.value = "";   // back to "last" on the next render
  renderList();
}

function startEditing(msg) {
  resetForm();
  state.editingId = msg.id;
  textInput.value = msg.text;
  const isSection = LINK_TARGETS.some((t) => t.value === msg.link && t.value !== "url");
  linkSelect.value = isSection ? msg.link : "url";
  urlInput.value = isSection ? "" : msg.link;
  document.getElementById("formHeading").textContent = "Edit message";
  addButton.textContent = "Update message";
  clearButton.textContent = "Cancel";
  updateTextCount();
  showUrlField();
  renderList();
  form.scrollIntoView({ block: "start", behavior: "smooth" });
  textInput.focus({ preventScroll: true });
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.querySelectorAll(".field--error").forEach((f) => f.classList.remove("field--error"));

  const text = textInput.value.trim();
  const link = linkSelect.value === "url" ? urlInput.value.trim() : linkSelect.value;
  let firstError = null;
  if (!text) {
    textInput.closest(".field").classList.add("field--error");
    firstError = textInput;
  }
  if (linkSelect.value === "url" && !isValidUrl(link)) {
    urlField.classList.add("field--error");
    firstError = firstError || urlInput;
  }
  if (firstError) {
    firstError.focus();
    return;
  }

  if (state.editingId) {
    const msg = state.data.messages.find((m) => m.id === state.editingId);
    if (msg) Object.assign(msg, { text, link });
  } else {
    if (state.data.messages.length >= MAX_MESSAGES) return;
    const at = Number(positionSelect.value) - 1;  // order 1 = index 0
    state.data.messages.splice(at, 0, { id: newId("a"), text, link, visible: true });
    state.movedId = null;  // numbers shift, so the old "Moved to" tag would be wrong
  }
  resetForm();
  renderAll();
});

form.addEventListener("input", (event) => {
  const field = event.target.closest(".field");
  if (field) field.classList.remove("field--error");
  if (event.target === textInput) updateTextCount();
});
linkSelect.addEventListener("change", showUrlField);
clearButton.addEventListener("click", resetForm);

/* ---------- Switch and list ---------- */
enabledSwitch.addEventListener("click", () => {
  state.data.enabled = !state.data.enabled;
  renderAll();
});

// Show/Hide, Edit and Delete (one listener for the whole list)
listEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  const messages = state.data.messages;
  const id = button.dataset.toggle || button.dataset.edit || button.dataset.delete;
  const index = messages.findIndex((m) => m.id === id);
  if (index === -1) return;

  if (button.dataset.toggle) {
    messages[index].visible = !messages[index].visible;
    renderAll();
    listEl.querySelector(`[data-toggle="${CSS.escape(id)}"]`).focus();
  } else if (button.dataset.edit) {
    startEditing(messages[index]);
  } else if (button.dataset.delete) {
    // Not saved until "Save changes", and "Discard" brings it back
    messages.splice(index, 1);
    if (state.editingId === id) resetForm();
    renderAll();
  }
});

/* ---------- Changing the order ---------- */

// Moves a message to a new position (1 = first); the others shift to make room
function moveMessage(id, position) {
  const messages = state.data.messages;
  const from = messages.findIndex((m) => m.id === id);
  const to = position - 1;
  state.menuFor = null;
  if (from !== -1 && from !== to) {
    const [moved] = messages.splice(from, 1);  // take it out…
    messages.splice(to, 0, moved);             // …and put it back in at the new position
    state.movedId = moved.id;
  }
  renderAll();
  // Keep focus on the same message's number so keyboard users don't lose their place
  listEl.querySelector(`[data-order-btn="${CSS.escape(id)}"]`)?.focus();
}

function openMenu(id) {
  state.menuFor = id;
  renderList();
  const menu = listEl.querySelector(".order-menu");
  // Open upwards when there isn't enough room below
  const room = window.innerHeight - menu.parentElement.getBoundingClientRect().bottom;
  menu.classList.toggle("order-menu--up", room < menu.offsetHeight + 40);
  (menu.querySelector(".is-current") || menu.querySelector("[data-move-to]")).focus();
}

function closeMenu(returnFocus) {
  if (!state.menuFor) return;
  const id = state.menuFor;
  state.menuFor = null;
  renderList();
  if (returnFocus) listEl.querySelector(`[data-order-btn="${CSS.escape(id)}"]`)?.focus();
}

// Number button opens/closes the menu; a menu item moves the message
listEl.addEventListener("click", (event) => {
  const orderBtn = event.target.closest("[data-order-btn]");
  const item = event.target.closest("[data-move-to]");
  if (orderBtn) {
    if (state.menuFor === orderBtn.dataset.orderBtn) closeMenu(true);
    else openMenu(orderBtn.dataset.orderBtn);
  } else if (item) {
    moveMessage(item.dataset.for, Number(item.dataset.moveTo));
  }
});

// Keyboard inside the menu: ↑ ↓ to choose, Enter to move, Esc to close
listEl.addEventListener("keydown", (event) => {
  if (!event.target.closest(".order-menu")) return;
  const items = [...listEl.querySelectorAll(".order-menu [data-move-to]")];
  const i = items.indexOf(document.activeElement);
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const next = event.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next].focus();
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    items[event.key === "Home" ? 0 : items.length - 1].focus();
  } else if (event.key === "Escape") {
    event.preventDefault();
    closeMenu(true);
  } else if (event.key === "Tab") {
    closeMenu(false);
  }
});

// Clicking anywhere else closes the menu
document.addEventListener("click", (event) => {
  if (state.menuFor && !event.target.closest(".order-badge")) closeMenu(false);
});

/* ---------- Save / discard ---------- */
saveButton.addEventListener("click", async () => {
  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  try {
    await saveAnnouncements(state.data);
    state.savedJSON = JSON.stringify(state.data);
    state.movedId = null;
    renderAll();
    showToast("Saved. The announcement bar on the website is updated.");
  } catch (err) {
    showToast(`${err.message || "Couldn't save."} Your changes are still here. Please try again.`, "error");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Save changes";
  }
});

document.getElementById("discardButton").addEventListener("click", async () => {
  const choice = await confirmDialog({
    title: "Discard your changes?",
    message: "Everything you changed since you last saved will be undone.",
    confirmText: "Discard",
    cancelText: "Keep editing",
    danger: true
  });
  if (choice !== "confirm") return;
  state.data = JSON.parse(state.savedJSON);
  state.movedId = null;
  state.menuFor = null;
  resetForm();
  renderAll();
  showToast("Changes discarded.");
});

window.addEventListener("beforeunload", (event) => {
  if (hasUnsavedChanges() || textInput.value.trim()) {
    event.preventDefault();
    event.returnValue = "";
  }
});

/* ---------- Start ---------- */
async function init() {
  linkSelect.innerHTML = LINK_TARGETS
    .map((t) => `<option value="${escapeHTML(t.value)}">${escapeHTML(t.label)}</option>`).join("");
  updateTextCount();

  try {
    state.data = await getAnnouncements();
    state.savedJSON = JSON.stringify(state.data);
    enabledSwitch.disabled = false;
    renderAll();
  } catch (err) {
    listEl.innerHTML = "";
    showToast("Couldn't load the announcements. Please refresh the page.", "error");
  }
}

init();