/* =========================================================
   ECA Admin - Google sign-in settings

   GOOGLE_CLIENT_ID
     Google Cloud Console > Credentials > the "Web application"
     OAuth client > Client ID. It is NOT a secret; it is meant
     to be in front-end code. Never put the Client SECRET here.
     The back end needs the same value in its GOOGLE_CLIENT_ID
     setting (Vercel environment variables / .env.local).

   Who may sign in is no longer listed here. The staff list is
   in the database (admins table), checked by the server:
     npm run admin:add -- name@gmail.com
     npm run admin:list
   ========================================================= */

const GOOGLE_CLIENT_ID = "34130276888-2p8b807h1k6pf25v9nu10ik8sjndqr9u.apps.googleusercontent.com";
