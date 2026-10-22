/* =========================================================
   ECA Admin - "Also post to the school's Facebook page"
   Used by the News and Album forms.

   - Turns the checkbox on when a Facebook Page is connected
     (Settings > Facebook Page).
   - Items already posted show a link instead (each item is
     posted once; later edits don't change the Facebook post).
   - After saving, facebookResultParams() passes the result to
     the list page, which shows it as a message.
   ========================================================= */

async function setupFacebookShare(checkbox, hint, item) {
  checkbox.checked = false;
  checkbox.disabled = true;

  if (item && item.facebookPosted) {
    checkbox.closest(".checkbox").hidden = true;
    hint.innerHTML = item.facebookUrl
      ? `Already posted on Facebook. <a href="${escapeHTML(item.facebookUrl)}" target="_blank" rel="noopener">View the post</a>. Changes here don't update the Facebook post.`
      : "Already posted on Facebook. Changes here don't update the Facebook post.";
    return;
  }

  let status;
  try {
    status = await adminRequest("/api/facebook/status");
  } catch (err) {
    hint.textContent = "Couldn't check the Facebook connection. Refresh the page to try again.";
    return;
  }

  if (!status.connected || status.needsReconnect) {
    hint.innerHTML = 'Connect a Facebook Page first in <a href="settings.html">Settings</a>.';
    return;
  }
  checkbox.disabled = false;
  hint.textContent = `Posts to "${status.pageName}" when you click Publish (not when saving a draft).`;
}

// Extra address parts for the list page, e.g. "&facebook=posted"
function facebookResultParams(saved) {
  const result = saved && saved.facebook;
  if (!result || result.already) return "";
  if (result.posted) return "&facebook=posted";
  return `&facebook=failed&fbError=${encodeURIComponent(String(result.error || "").slice(0, 200))}`;
}

// On the list pages: show the Facebook result passed from the form
function showFacebookResultFromUrl(params) {
  const result = params.get("facebook");
  if (result === "posted") showToast("Also posted on the Facebook page.");
  if (result === "failed") {
    showToast(`Saved on the website, but not posted on Facebook: ${params.get("fbError") || "please try again later."}`, "error");
  }
}
