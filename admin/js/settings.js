/* =========================================================
   ECA Admin - Settings: Google Drive and Facebook Page

   Connect / Switch account go to /api/drive/connect, which
   sends the person to Google to pick an account and allow
   Drive; Google brings them back here with ?drive=connected
   (or ?drive=error / ?drive=cancelled).
   ========================================================= */

const els = {
  status: document.getElementById("driveStatus"),
  facts: document.getElementById("driveFacts"),
  email: document.getElementById("driveEmail"),
  folder: document.getElementById("driveFolder"),
  connected: document.getElementById("driveConnected"),
  photos: document.getElementById("drivePhotos"),
  progress: document.getElementById("driveProgress"),
  connect: document.getElementById("connectButton"),
  sync: document.getElementById("syncButton"),
  switchAccount: document.getElementById("switchButton"),
  disconnect: document.getElementById("disconnectButton")
};

let current = null;
let syncing = false;

function setStatus(text, on) {
  els.status.innerHTML = `<span class="dot${on ? "" : " dot--off"}" aria-hidden="true"></span>`;
  els.status.append(text);
}

function photoText(photos) {
  const copied = photos.total - photos.remaining;
  if (!photos.total) return "No uploaded photos yet";
  return `${copied} of ${photos.total} uploaded photos${photos.remaining ? ` (${photos.remaining} waiting)` : " ✓"}`;
}

function render(status) {
  current = status;
  const on = status.connected && !status.needsReconnect;

  els.connect.hidden = status.connected;
  els.switchAccount.hidden = !status.connected;
  els.disconnect.hidden = !status.connected;
  els.sync.hidden = !on || !status.photos.remaining;
  els.facts.hidden = !status.connected;
  els.progress.hidden = !status.connected || !status.photos.total;

  if (!status.configured) {
    setStatus("Not set up yet: the server needs GOOGLE_CLIENT_SECRET (see README).", false);
    els.connect.hidden = true;
    return;
  }
  if (!status.connected) {
    setStatus("Not connected. New photos are saved on the website only.", false);
    return;
  }
  setStatus(status.needsReconnect ? "Needs reconnecting: click Switch account and sign in again." : "Connected", on);
  els.email.textContent = status.email;
  els.folder.textContent = `${status.folderName} (open in Drive)`;
  els.folder.href = status.folderUrl;
  els.connected.textContent = `${formatDate(String(status.connectedAt).slice(0, 10))}${status.connectedBy ? ` by ${status.connectedBy}` : ""}`;
  els.photos.textContent = photoText(status.photos);
  const share = status.photos.total ? (status.photos.total - status.photos.remaining) / status.photos.total : 0;
  els.progress.querySelector("span").style.width = `${Math.round(share * 100)}%`;
}

async function loadStatus() {
  try {
    render(await adminRequest("/api/drive/status"));
  } catch (err) {
    setStatus(`Couldn't load the Drive status: ${err.message}`, false);
  }
}

/* ---------- Copy photos (in small batches until done) ---------- */
els.sync.addEventListener("click", async () => {
  if (syncing) return;
  syncing = true;
  els.sync.disabled = true;
  let copiedTotal = 0;
  try {
    for (let round = 0; round < 50; round++) {
      els.sync.textContent = `Copying… (${copiedTotal} done)`;
      const result = await adminRequest("/api/drive/sync", { method: "POST", body: {} });
      copiedTotal += result.copied;
      await loadStatus();
      if (!result.remaining || (!result.copied && result.failed)) {
        if (result.failed) showToast(`${copiedTotal} copied. Some photos couldn't be copied: ${result.error || "please try again"}`, "error");
        else showToast(`Done: ${copiedTotal} photo${copiedTotal === 1 ? "" : "s"} copied to Google Drive.`);
        break;
      }
    }
  } catch (err) {
    showToast(err.message, "error");
    await loadStatus();
  } finally {
    syncing = false;
    els.sync.disabled = false;
    els.sync.textContent = "Copy photos to Drive";
  }
});

/* ---------- Disconnect ---------- */
els.disconnect.addEventListener("click", async () => {
  const choice = await confirmDialog({
    title: "Disconnect Google Drive?",
    message: `New photos will no longer be copied to ${current ? current.email : "this"} Drive. Photos already there stay in Drive, and the website keeps working.`,
    confirmText: "Disconnect",
    danger: true
  });
  if (choice !== "confirm") return;
  try {
    await adminRequest("/api/drive/disconnect", { method: "POST", body: {} });
    showToast("Google Drive was disconnected.", "info");
  } catch (err) {
    showToast(err.message, "error");
  }
  await loadStatus();
});

/* ---------- Messages after coming back from Google ---------- */
function showMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get("drive");
  if (result === "connected") {
    showToast(`Google Drive connected: ${params.get("email") || ""}. New photos will be copied there.`);
  } else if (result === "cancelled") {
    showToast("Google Drive wasn't connected (cancelled).", "info");
  } else if (result === "error") {
    showToast((params.get("message") || "Couldn't connect Google Drive.").slice(0, 300), "error");
  }
  if (result) history.replaceState(null, "", "settings.html");
}

/* =========================================================
   Facebook Page
   Connect / Switch Page go to /api/facebook/connect (Facebook
   login). Facebook brings them back with ?facebook=connected,
   ?facebook=choose (pick one of several Pages), cancelled or error.
   ========================================================= */
const fb = {
  status: document.getElementById("fbStatus"),
  choose: document.getElementById("fbChoose"),
  choices: document.getElementById("fbChoices"),
  facts: document.getElementById("fbFacts"),
  page: document.getElementById("fbPage"),
  user: document.getElementById("fbUser"),
  connected: document.getElementById("fbConnected"),
  connect: document.getElementById("fbConnectButton"),
  switchPage: document.getElementById("fbSwitchButton"),
  disconnect: document.getElementById("fbDisconnectButton")
};
let fbCurrent = null;

function setFbStatus(text, on) {
  fb.status.innerHTML = `<span class="dot${on ? "" : " dot--off"}" aria-hidden="true"></span>`;
  fb.status.append(text);
}

function renderFacebook(status) {
  fbCurrent = status;
  const choices = status.choices || [];
  fb.connect.hidden = status.connected || !status.configured || choices.length > 0;
  fb.switchPage.hidden = !status.connected;
  fb.disconnect.hidden = !status.connected;
  fb.facts.hidden = !status.connected;

  fb.choose.hidden = !choices.length;
  fb.choices.innerHTML = choices.map((page, i) => `
    <label class="checkbox"><input type="radio" name="fbPageChoice" value="${escapeHTML(page.id)}" ${i === 0 ? "checked" : ""}> ${escapeHTML(page.name)}</label>`).join("");

  if (!status.configured) {
    setFbStatus("Not set up yet: the server needs FACEBOOK_APP_ID and FACEBOOK_APP_SECRET (see README).", false);
    return;
  }
  if (!status.connected) {
    setFbStatus(choices.length ? "Almost done: pick the Page below." : "Not connected. Posts stay on the website only.", false);
    return;
  }
  setFbStatus(status.needsReconnect ? "Needs reconnecting: click Switch Page and log in again." : "Connected", !status.needsReconnect);
  fb.page.textContent = `${status.pageName} (open on Facebook)`;
  fb.page.href = status.pageUrl;
  fb.user.textContent = status.userName || "–";
  fb.connected.textContent = `${formatDate(String(status.connectedAt).slice(0, 10))}${status.connectedBy ? ` by ${status.connectedBy}` : ""}`;
}

async function loadFacebook() {
  try {
    renderFacebook(await adminRequest("/api/facebook/status"));
  } catch (err) {
    setFbStatus(`Couldn't load the Facebook status: ${err.message}`, false);
  }
}

fb.choose.addEventListener("submit", async (event) => {
  event.preventDefault();
  const picked = fb.choose.querySelector('input[name="fbPageChoice"]:checked');
  if (!picked) return;
  const button = fb.choose.querySelector("button");
  button.disabled = true;
  try {
    const result = await adminRequest("/api/facebook/select", { method: "POST", body: { pageId: picked.value } });
    showToast(`Facebook Page connected: ${result.pageName}.`);
  } catch (err) {
    showToast(err.message, "error");
  } finally {
    button.disabled = false;
  }
  await loadFacebook();
});

fb.disconnect.addEventListener("click", async () => {
  const choice = await confirmDialog({
    title: "Disconnect the Facebook Page?",
    message: `The website will stop posting to ${fbCurrent ? fbCurrent.pageName : "this Page"}. Posts already on Facebook stay there.`,
    confirmText: "Disconnect",
    danger: true
  });
  if (choice !== "confirm") return;
  try {
    await adminRequest("/api/facebook/disconnect", { method: "POST", body: {} });
    showToast("Facebook Page was disconnected.", "info");
  } catch (err) {
    showToast(err.message, "error");
  }
  await loadFacebook();
});

function showFacebookMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const result = params.get("facebook");
  if (result === "connected") showToast(`Facebook Page connected: ${params.get("page") || ""}.`);
  else if (result === "choose") showToast("You manage several Pages. Pick the one the website should post to.", "info");
  else if (result === "cancelled") showToast("Facebook wasn't connected (cancelled).", "info");
  else if (result === "error") showToast((params.get("message") || "Couldn't connect Facebook.").slice(0, 300), "error");
  if (result) history.replaceState(null, "", "settings.html");
}

showFacebookMessageFromUrl();
showMessageFromUrl();
loadStatus();
loadFacebook();
