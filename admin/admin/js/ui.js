/* =========================================================
   ECA Admin - shared UI: confirmation dialog + toast messages
   Replaces the browser's confirm() popup and the old #flash box.
   ========================================================= */

/* ---------- Confirmation dialog ----------
   Uses the built-in <dialog> element: showModal() keeps keyboard focus
   inside the dialog, blocks the page behind it, and Esc closes it.

   Usage:
     const choice = await confirmDialog({
       title: "Delete this post?",
       message: "It will be removed from the website.",
       confirmText: "Delete",
       danger: true,
       altText: "Move to Drafts"          // optional middle button
     });
     // choice is "confirm", "alt", or "cancel"
*/
function confirmDialog({ title, message, confirmText = "OK", cancelText = "Cancel", altText = "", danger = false }) {
  const dialog = document.createElement("dialog");
  dialog.className = "dialog";
  dialog.setAttribute("aria-labelledby", "dialogTitle");
  dialog.setAttribute("aria-describedby", "dialogMessage");
  dialog.innerHTML = `
    <form method="dialog" class="dialog__box">
      <h2 class="dialog__title" id="dialogTitle">${escapeHTML(title)}</h2>
      <p class="dialog__message" id="dialogMessage">${escapeHTML(message)}</p>
      <div class="dialog__actions">
        <button class="btn btn--outline" value="cancel">${escapeHTML(cancelText)}</button>
        ${altText ? `<button class="btn btn--outline" value="alt">${escapeHTML(altText)}</button>` : ""}
        <button class="btn ${danger ? "btn--danger-solid" : "btn--primary"}" value="confirm">${escapeHTML(confirmText)}</button>
      </div>
    </form>`;
  document.body.appendChild(dialog);

  return new Promise((resolve) => {
    // A <form method="dialog"> closes the dialog and puts the clicked button's value in returnValue.
    // Esc closes it with an empty returnValue, which we treat as "cancel".
    dialog.addEventListener("close", () => {
      resolve(dialog.returnValue || "cancel");
      dialog.remove();
    });
    // Clicking the dark area outside the box also cancels
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close("cancel");
    });
    dialog.showModal();
    // Start on the safe choice so pressing Enter by accident doesn't delete anything
    dialog.querySelector('[value="cancel"]').focus();
  });
}

/* ---------- Toast messages ----------
   type: "success" (green), "info" (gold, e.g. saved as draft), "error" (red).
   Success and info disappear after 5 seconds. Errors stay until closed,
   because the admin may need time to read them. */
function showToast(message, type = "success") {
  let region = document.getElementById("toasts");
  if (!region) {
    region = document.createElement("div");
    region.id = "toasts";
    region.className = "toasts";
    region.setAttribute("role", "status");   // screen readers announce new toasts
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  toast.innerHTML = `
    <span class="toast__text">${escapeHTML(message)}</span>
    <button type="button" class="toast__close" aria-label="Close message">×</button>`;
  region.appendChild(toast);

  const close = () => toast.remove();
  toast.querySelector(".toast__close").addEventListener("click", close);
  if (type !== "error") setTimeout(close, 5000);
}