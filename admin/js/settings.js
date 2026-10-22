/* =========================================================
   ECA Admin - Settings: Google Drive connection

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

showMessageFromUrl();
loadStatus();
