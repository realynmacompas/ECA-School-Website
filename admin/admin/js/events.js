/* =========================================================
   ECA Admin - Events & Calendar
   List (Upcoming / Past) on the left, Add / Edit form on the right.
   ========================================================= */

const listEl = document.getElementById("eventList");
const viewButtons = document.querySelectorAll(".segmented__btn");

const form = document.getElementById("eventForm");
const fields = {
  title: document.getElementById("title"),
  start: document.getElementById("start"),
  end: document.getElementById("end"),
  type: document.getElementById("type"),
  note: document.getElementById("note")
};
const DEFAULT_EVENT_TYPE = "activity";
const formError = document.getElementById("formError");
const formHeading = document.getElementById("formHeading");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");

const state = {
  allEvents: [],
  view: "upcoming",     // "upcoming" | "past"
  editingId: null,      // id of the event in the form, or null when adding
  hasUnsavedChanges: false
};

/* ---------- Upcoming vs past ---------- */
// An event stays "upcoming" until its last day has passed (same rule as the dashboard)
function lastDay(ev) {
  return ev.end || ev.start;
}

function isUpcoming(ev) {
  return lastDay(ev) >= todayISO();
}

function getUpcoming() {
  return state.allEvents.filter(isUpcoming); // listEvents() already sorts soonest first
}

function getPast() {
  // Most recent first, so last month's events are at the top
  return state.allEvents.filter((ev) => !isUpcoming(ev))
    .sort((a, b) => lastDay(b).localeCompare(lastDay(a)));
}

// "Ongoing" for multi-day events happening now, "Today" for one-day events today
function statusPill(ev) {
  const today = todayISO();
  if (ev.start > today || lastDay(ev) < today) return "";
  const label = ev.end && ev.end !== ev.start ? "Ongoing" : "Today";
  return `<span class="pill pill--ongoing">${label}</span>`;
}

// Old events saved before "type" existed count as school activities
function eventType(ev) {
  return EVENT_TYPES[ev.type] ? ev.type : DEFAULT_EVENT_TYPE;
}

/* ---------- Rendering ---------- */
function rowHTML(ev) {
  const badge = dateBadgeParts(ev.start);
  const isEditing = ev.id === state.editingId;
  return `
    <li class="event-item${isEditing ? " is-editing" : ""}">
      <span class="date-badge"><span>${badge.month}</span><strong>${badge.day}</strong></span>
      <div class="event-item__main">
        <strong class="event-item__title">${escapeHTML(ev.title)}</strong>
        <span class="event-item__date">${formatDateRange(ev.start, ev.end)}
        <span class="type-label"><span class="type-dot type-dot--${eventType(ev)}" aria-hidden="true"></span>${EVENT_TYPES[eventType(ev)]}</span>
        </span>
        ${ev.note ? `<span class="event-item__note">${escapeHTML(ev.note)}</span>` : ""}
      </div>
      ${statusPill(ev)}
      <div class="row__actions">
        <button type="button" class="btn btn--outline btn--sm" data-edit="${escapeHTML(ev.id)}">Edit</button>
        <button type="button" class="btn btn--danger btn--sm" data-delete="${escapeHTML(ev.id)}">Delete</button>
      </div>
    </li>`;
}

function render() {
  const upcoming = getUpcoming();
  const past = getPast();
  document.getElementById("countUpcoming").textContent = upcoming.length;
  document.getElementById("countPast").textContent = past.length;

  const items = state.view === "upcoming" ? upcoming : past;
  if (items.length === 0) {
    listEl.innerHTML = state.view === "upcoming"
      ? `<li class="item-list__empty">No upcoming events. Use the form to add one.</li>`
      : `<li class="item-list__empty">No past events yet.</li>`;
    return;
  }
  listEl.innerHTML = items.map(rowHTML).join("");
}

/* ---------- Form: add / edit mode ---------- */
function clearErrors() {
  form.querySelectorAll(".field--error").forEach((f) => f.classList.remove("field--error"));
  formError.hidden = true;
}

function updateNoteCount() {
  document.getElementById("noteCount").textContent = `${fields.note.value.length} / 200 characters`;
}

function resetForm() {
  form.reset();
  fields.type.value = DEFAULT_EVENT_TYPE;
  fields.end.min = "";
  clearErrors();
  state.editingId = null;
  state.hasUnsavedChanges = false;
  formHeading.textContent = "Add an Event";
  saveButton.textContent = "Save Event";
  clearButton.textContent = "Clear";
  updateNoteCount();
  render(); // removes the "editing" highlight
}

function startEditing(ev) {
  clearErrors();
  state.editingId = ev.id;
  state.hasUnsavedChanges = false;
  fields.title.value = ev.title;
  fields.start.value = ev.start;
  fields.end.value = ev.end || "";
  fields.type.value = DEFAULT_EVENT_TYPE;
  fields.note.value = ev.note || "";
  fields.end.min = ev.start;
  formHeading.textContent = "Edit Event";
  saveButton.textContent = "Save Changes";
  clearButton.textContent = "Cancel";
  updateNoteCount();
  render();
  form.scrollIntoView({ block: "start", behavior: "smooth" });
  fields.title.focus({ preventScroll: true });
}

// Ask before throwing away what the admin typed. Returns true or false.
async function okToDiscardChanges() {
  if (!state.hasUnsavedChanges) return true;
  const choice = await confirmDialog({
    title: "Discard your changes?",
    message: "You have typed something in the event form that isn't saved yet.",
    confirmText: "Discard",
    cancelText: "Keep editing",
    danger: true
  });
  return choice === "confirm";
}

/* ---------- Validation ---------- */
function validate() {
  clearErrors();
  const errors = [];
  const fail = (input) => {
    input.closest(".field").classList.add("field--error");
    errors.push(input);
  };

  if (fields.title.value.trim() === "") fail(fields.title);
  if (fields.start.value === "") fail(fields.start);
  // Dates are "YYYY-MM-DD", so comparing them as text works
  if (fields.start.value && fields.end.value && fields.end.value < fields.start.value) fail(fields.end);

  if (errors.length) {
    formError.textContent = "Please fix the highlighted fields.";
    formError.hidden = false;
    errors[0].focus();
  }
  return errors.length === 0;
}

/* ---------- Save ---------- */
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validate()) return;

  const start = fields.start.value;
  const end = fields.end.value === start ? "" : fields.end.value; // same day = one-day event
  const item = {
    title: fields.title.value.trim(),
    start,
    end,
    type: fields.type.value,
    note: fields.note.value.trim()
  };
  const isEdit = Boolean(state.editingId);
  if (isEdit) item.id = state.editingId;

  saveButton.disabled = true;
  saveButton.textContent = "Saving…";
  try {
    await saveEvent(item);
    state.allEvents = await listEvents();
    // Switch to the tab where the saved event now appears
    state.view = isUpcoming(item) ? "upcoming" : "past";
    viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === state.view)));
    resetForm();
    showToast(isEdit ? "Changes saved." : `"${item.title}" was added to the calendar.`);
  } catch (err) {
    formError.textContent = `${err.message || "Couldn't save."} Your work is still here. Please try again.`;
    formError.hidden = false;
    saveButton.textContent = isEdit ? "Save Changes" : "Save Event";
  } finally {
    saveButton.disabled = false;
  }
});

/* ---------- Form events ---------- */
form.addEventListener("input", (event) => {
  state.hasUnsavedChanges = true;
  const field = event.target.closest(".field");
  if (field) field.classList.remove("field--error");
  if (!form.querySelector(".field--error")) formError.hidden = true;
  if (event.target === fields.note) updateNoteCount();
});

// The End date picker won't offer days before the start date
fields.start.addEventListener("change", () => {
  fields.end.min = fields.start.value;
});

clearButton.addEventListener("click", async () => {
  if (await okToDiscardChanges()) resetForm();
});

document.getElementById("addEventButton").addEventListener("click", async () => {
  if (!(await okToDiscardChanges())) return;
  resetForm();
  form.scrollIntoView({ block: "start", behavior: "smooth" });
  fields.title.focus({ preventScroll: true });
});

/* ---------- List events ---------- */
viewButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    state.view = btn.dataset.view;
    viewButtons.forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    render();
  });
});

// One listener for all Edit and Delete buttons (they are re-created on every render)
listEl.addEventListener("click", async (event) => {
  const editBtn = event.target.closest("[data-edit]");
  const deleteBtn = event.target.closest("[data-delete]");

  if (editBtn) {
    const ev = state.allEvents.find((e) => e.id === editBtn.dataset.edit);
    if (ev && (await okToDiscardChanges())) startEditing(ev);
    return;
  }

  if (!deleteBtn) return;
  const ev = state.allEvents.find((e) => e.id === deleteBtn.dataset.delete);
  if (!ev) return;

  const choice = await confirmDialog({
    title: "Delete this event?",
    message: `"${ev.title}" will be removed from the school calendar. This cannot be undone.`,
    confirmText: "Delete",
    danger: true
  });
  if (choice !== "confirm") return;

  deleteBtn.disabled = true;
  try {
    await deleteEvent(ev.id);
    state.allEvents = state.allEvents.filter((e) => e.id !== ev.id);
    if (state.editingId === ev.id) resetForm(); // don't keep editing a deleted event
    else render();
    showToast(`"${ev.title}" was deleted.`);
  } catch (err) {
    deleteBtn.disabled = false;
    showToast("Couldn't delete. Please try again.", "error");
  }
});

/* ---------- Warn before leaving with unsaved changes ---------- */
window.addEventListener("beforeunload", (event) => {
  if (state.hasUnsavedChanges) {
    event.preventDefault();
    event.returnValue = "";
  }
});

/* ---------- Start ---------- */
async function init() {
  fields.type.innerHTML = Object.entries(EVENT_TYPES)
    .map(([value, label]) => `<option value="${value}">${escapeHTML(label)}</option>`).join("");
  fields.type.value = DEFAULT_EVENT_TYPE;
  updateNoteCount();
  try {
    state.allEvents = await listEvents();
    render();
  } catch (err) {
    listEl.innerHTML = "";
    showToast("Couldn't load the events. Please refresh the page.", "error");
  }
}

init();