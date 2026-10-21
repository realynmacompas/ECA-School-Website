/* =========================================================
   ECA Admin - Google sign-in settings   << EDIT THIS FILE >>

   1. GOOGLE_CLIENT_ID
      Google Cloud Console > APIs & Services > Credentials >
      your "Web application" OAuth client > Client ID.
      The Client ID is NOT a secret; it is meant to be in
      front-end code. Never put the Client SECRET here.

   2. ALLOWED_ADMIN_EMAILS
      The Google accounts that may open the admin dashboard.
      Anyone else who signs in with Google sees
      "not on the ECA staff list" and gets nothing.
   ========================================================= */

const GOOGLE_CLIENT_ID = "34130276888-2p8b807h1k6pf25v9nu10ik8sjndqr9u.apps.googleusercontent.com";

// One email per line, in quotes, followed by a comma.
const ALLOWED_ADMIN_EMAILS = [

   "aaronjohnparonda@gmail.com",
   "realynmacompas@gmail.com",
  // "registrar.eca@gmail.com",
  // "it.eca@gmail.com",
];

// Optional: allow EVERY account of a Google Workspace domain the school owns,
// for example ["elimchristianacademy.edu.ph"]. Leave empty to use only the list above.
// (Plain @gmail.com can never be allowed this way.)
const ALLOWED_ADMIN_DOMAINS = [];

// How long a sign-in lasts before staff must sign in again.
// Closing the browser tab also signs them out.
const ADMIN_SESSION_HOURS = 8;
