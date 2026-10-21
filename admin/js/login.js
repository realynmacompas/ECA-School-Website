/* =========================================================
   ECA Admin - Sign in page (Google only)

   1. Google's library draws the "Sign in with Google" button.
   2. The person picks their Google account in Google's popup.
      (Passwords, 2-step verification and blocking repeated
      attempts are all handled by Google, not by this site.)
   3. Google calls onGoogleCredential() with an ID token.
   4. We check the token and the staff list (auth.js), save
      the session and open the dashboard.
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

const GOOGLE_LOAD_TIMEOUT = 10000; // ms before we say the Google library didn't load
let googleStarted = false;

function showError(message) {
  els.errorText.textContent = message;
  els.error.hidden = false;
  els.notice.hidden = true;
}

function hideError() {
  els.error.hidden = true;
}

/* ---------- Messages passed in the address (?signedout=1, ?expired=1) ---------- */
function showNoticeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  let message = "";
  if (params.has("signedout")) message = "You're signed out.";
  if (params.has("expired")) message = "Your session ended. Please sign in again.";
  if (message) {
    els.noticeText.textContent = message;
    els.notice.hidden = false;
  }
  if (params.toString()) history.replaceState(null, "", "login.html"); // a refresh won't show it again
}

/* ---------- Google calls this after the person picks an account ---------- */
function onGoogleCredential(response) {
  hideError();

  let profile;
  try {
    profile = decodeGoogleCredential(response.credential);
  } catch (err) {
    showError("Google sign-in didn't work. Please try again.");
    return;
  }

  const problem = checkGoogleProfile(profile);
  if (problem) {
    showError(problem);
    return;
  }

  if (!isAllowedAdmin(profile.email, profile.hd)) {
    // Don't remember this account, so the next click lets them choose another one
    google.accounts.id.disableAutoSelect();
    showError(`${profile.email} isn't on the ECA staff list. Sign in with your school-approved Google account, or ask the website administrator to add this one.`);
    return;
  }

  try {
    saveAdminSession(profile, response.credential);
  } catch (err) {
    showError("Your browser blocked sign-in. Turn off private browsing or allow this site to save data, then try again.");
    return;
  }
  window.location.replace("dashboard.html");
}

/* ---------- Draw the Google button ---------- */
function startGoogle() {
  if (googleStarted) return;
  googleStarted = true;

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
function init() {
  // Already signed in (for example, pressed Back): go straight to the dashboard
  if (readAdminSession()) {
    window.location.replace("dashboard.html");
    return;
  }

  showNoticeFromUrl();

  if (!isGoogleConfigured()) {
    els.signin.hidden = true;
    els.setup.hidden = false;
    return;
  }

  // Google's script (loaded with async at the bottom of login.html) calls this when ready.
  // If it already loaded before this file ran, start right away.
  window.onGoogleLibraryLoad = startGoogle;
  if (window.google && google.accounts && google.accounts.id) startGoogle();

  setTimeout(() => {
    if (googleStarted) return;
    els.loading.hidden = true;
    showError("Google sign-in couldn't load. Check your internet connection, turn off any ad or script blocker for this site, then refresh the page.");
  }, GOOGLE_LOAD_TIMEOUT);
}

init();
