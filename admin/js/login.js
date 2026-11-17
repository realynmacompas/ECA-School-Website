/* =========================================================
   ECA Admin - Sign in page (Google only)

   1. Google's library draws the "Sign in with Google" button.
   2. The person picks their Google account in Google's popup.
      (Passwords, 2-step verification and blocking repeated
      attempts are all handled by Google, not by this site.)
   3. Google calls onGoogleCredential() with an ID token.
   4. adminSignIn() (auth.js) sends it to the server, which
      checks it with Google and the admins table, then sets
      the session cookie. Then we open the dashboard.
   ========================================================= */

const els = {
  button: document.getElementById("googleButton"),
  loading: document.getElementById("googleLoading"),
  signin: document.getElementById("googleSignin"),
  setup: document.getElementById("setupNotice"),
  error: document.getElementById("loginError"),
  errorText: document.getElementById("loginErrorText"),
  notice: document.getElementById("loginNotice"),
  noticeText: document.getElementById("loginNoticeText")
};

const GOOGLE_LOAD_TIMEOUT = 15000; // ms before we say the Google library didn't load
let googleStarted = false;
let busy = false;
let loadErrorShown = false;  // the "couldn't load" message, hidden again if Google loads late

function showError(message) {
  els.errorText.textContent = message;
  els.error.hidden = false;
  els.notice.hidden = true;
}

function hideError() {
  els.error.hidden = true;
}

function setBusy(isBusy) {
  busy = isBusy;
  els.loading.textContent = "Signing in…";
  els.loading.hidden = !isBusy;
  els.button.style.visibility = isBusy ? "hidden" : "";
}

/* ---------- Messages passed in the address (?signedout=1, ?expired=1, ?error=…) ---------- */
function showMessageFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let message = "";
  if (params.has("signedout")) message = "You're signed out.";
  if (params.has("expired")) message = "Please sign in to continue.";
  if (message) {
    els.noticeText.textContent = message;
    els.notice.hidden = false;
  }
  if (params.get("error")) showError(params.get("error").slice(0, 300));
  if (params.toString()) history.replaceState(null, "", "login.html"); // a refresh won't show it again
}

/* ---------- Google calls this after the person picks an account ---------- */
async function onGoogleCredential(response) {
  if (busy) return;
  hideError();
  setBusy(true);
  try {
    await adminSignIn(response.credential);
    window.location.replace("dashboard.html");
  } catch (err) {
    if (err.code === "NOT_ADMIN") {
      // Don't remember this account, so the next click lets them choose another one
      google.accounts.id.disableAutoSelect();
    }
    showError(err.message);
    setBusy(false);
  }
}

/* ---------- Draw the Google button ---------- */
function startGoogle() {
  if (googleStarted) return;
  googleStarted = true;
  if (loadErrorShown) hideError(); // Google loaded after all: remove the "couldn't load" message

  google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: onGoogleCredential,
    ux_mode: "popup",      // sign in in a small Google window; this page stays open
    auto_select: false,    // always let the person choose the account
    context: "signin"
  });

  // Google needs a width in pixels (200-400)
  const width = Math.max(200, Math.min(400, Math.round(els.signin.clientWidth || 400)));
  google.accounts.id.renderButton(els.button, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "pill",
    logo_alignment: "center",
    width
  });
  els.loading.hidden = true;
}

/* ---------- Start ---------- */
async function init() {
  showMessageFromUrl();

  if (!isGoogleConfigured()) {
    els.signin.hidden = true;
    els.setup.hidden = false;
    return;
  }

  // Already signed in (for example, pressed Back): go straight to the dashboard
  try {
    if (await fetchCurrentAdmin()) {
      window.location.replace("dashboard.html");
      return;
    }
  } catch (err) {
    // Server unreachable or not set up: show why, but still draw the button
    if (els.error.hidden) showError(err.message);
  }

  // Google's script (loaded with async at the bottom of login.html) calls this when ready.
  // If it already loaded before this ran, start right away.
  window.onGoogleLibraryLoad = startGoogle;
  if (window.google && google.accounts && google.accounts.id) startGoogle();

  setTimeout(() => {
    if (googleStarted) return;
    els.loading.hidden = true;
    loadErrorShown = true;
    showError("Google sign-in couldn't load. Check your internet connection, turn off any ad or script blocker for this site, then refresh the page.");
  }, GOOGLE_LOAD_TIMEOUT);
}

init();
