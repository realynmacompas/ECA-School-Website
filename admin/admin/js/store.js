/* =========================================================
   ECA Admin - data store

   Every admin page reads and saves content ONLY through the
   functions at the bottom of this file (listNews, saveNews, ...).

   DEMO MODE: data is kept in this browser's localStorage, so it
   survives page reloads but is only visible on THIS computer.
   When we connect Supabase, we rewrite the inside of these
   functions. The pages that call them will not need to change.
   ========================================================= */

const STORE_KEY = "ecaAdminData";
const HOMEPAGE_ALBUM_SPOTS = 6;   // Life at ECA on the homepage shows 4 albums
const MAX_ALBUM_PHOTOS = 4;       // photos allowed in one album
// Categories staff can choose from on the News form (edit this list to add more)
const NEWS_CATEGORIES = ["Achievement", "Admissions", "Alumni", "Announcement", "Careers", "Event", "Seminar", "Spiritual Life"];
// Categories for Life at ECA albums
const ALBUM_CATEGORIES = ["Academics", "Campus", "Celebrations", "Community", "Spiritual Life", "Sports"];
// Event types (decide the colour on the public calendar). Events without a type count as "activity".
const EVENT_TYPES = { classes: "Classes", activity: "School activity", holiday: "Holiday / No classes" };

/* ---------- Starting (sample) content ----------
   Taken from the school's Facebook posts. Dates marked "sample"
   are placeholders until we have the real post dates. */
const SEED_DATA = {
  news: [
    { id: "n1", title: "Congratulations, James Marcus L. Arbues!", category: "Alumni", date: "2026-09-22", // sample date
      summary: "ECA Class of 2018 alumnus, for passing the Criminology Licensure Examination.",
      image: "assets/images/news/alumni-arbues.jpg", isPoster: true, facebookUrl: "", status: "published" },
    { id: "n2", title: "Congratulations, Gorg Elbert N. Flores!", category: "Alumni", date: "2026-09-20", // sample date
      summary: "ECA Class of 2018, Bachelor of Arts in Film and Visual Effects, Cum Laude.",
      image: "assets/images/news/alumni-flores.jpg", isPoster: true, facebookUrl: "", status: "published" },
    { id: "n3", title: "On-going Registration: Nursery to Senior High School", category: "Admissions", date: "2026-09-18", // sample date
      summary: "Enroll now. Office hours: Monday to Friday, 8:00 AM to 5:00 PM.",
      author: "Registrar's Office",
      body: "ON-GOING REGISTRATION!\n\nBe an ELIMNIAN, where academic excellence meets values formation. Enrollment is now open for learners from Nursery to Senior High School.\n\nWhy choose ECA\n• PEAC-accredited school\n• ESC grantees are accepted\n• Christ-centered education in Trece Martires City since 1993\n\nWhat to bring\n• PSA Birth Certificate\n• Report Card (SF9)\n• Certificate of Good Moral Character\n• Two 2x2 ID pictures\n• Learner Reference Number (LRN)\nTransferees may need additional documents.\n\nOffice hours: Monday to Friday, 8:00 AM to 5:00 PM\nQuestions? Message us on our Facebook page, call 0939 909 8717 or (046) 419 1668, or email elim.educ@gmail.com.",
      image: "assets/images/news/enrollment-poster.jpg", isPoster: true, facebookUrl: "", status: "published" },
    { id: "n4", title: "We Are Hiring: High School Teachers", category: "Careers", date: "2026-09-15", // sample date
      summary: "Major in Science and BTLE (NC II holders preferred). Send your CV to elim.educ@gmail.com.",
      image: "assets/images/news/hiring.jpg", isPoster: true, facebookUrl: "", status: "published" },
    { id: "n5", title: "Learning Session with Mr. Vincent G. Oczon, LPT", category: "Seminar", date: "2026-09-12", // sample date
      summary: "", image: "assets/images/news/seminar.jpg", isPoster: false, facebookUrl: "", status: "draft" },
    { id: "n6", title: "Children's Retreat 2025: Shield Squad", category: "Spiritual Life", date: "2026-08-30", // sample date
      summary: "Secure in God's protection.", image: "assets/images/news/childrens-retreat.jpg", isPoster: false, facebookUrl: "", status: "draft" },
    { id: "n7", title: "33rd Founding Anniversary: Alumni Games", category: "Event", date: "2026-02-20",
      summary: "Basketball and volleyball games for alumni on February 26, 2026.",
      image: "assets/images/news/founding-anniversary.jpg", isPoster: true, facebookUrl: "", status: "published" }
  ],

  // From the DepEd School Calendar SY 2026-2027
  events: [
        { id: "e1", title: "Opening of Classes", start: "2026-06-08", end: "", note: "", type: "classes" },
    { id: "e2", title: "End-of-Term 1 Activities", start: "2026-09-02", end: "2026-09-15", note: "", type: "activity" },
    { id: "e3", title: "Term 2 Classes", start: "2026-09-16", end: "2026-12-04", note: "", type: "classes" },
    { id: "e4", title: "End-of-Term 2 Activities", start: "2026-12-07", end: "2026-12-18", note: "", type: "activity" },
    { id: "e5", title: "Term 3 Classes Begin", start: "2027-01-04", end: "", note: "", type: "classes" },
    { id: "e6", title: "Final Assessments and Closing Activities", start: "2027-03-24", end: "2027-04-08", note: "", type: "activity" }
  ],

    // Life at ECA albums (sample dates). photos[0] is the cover.
  // featured: true = pinned to the homepage. Empty spots are filled by the newest albums.
  albums: [
    { id: "al1", title: "Flag Ceremony", caption: "Starting the week together", category: "Campus", date: "2026-09-21",
      photos: ["assets/images/gallery/flag-ceremony.jpg"], featured: false, status: "published" },
    { id: "al2", title: "Seminars & Talks", caption: "Learning beyond the classroom", category: "Academics", date: "2026-08-28",
      photos: ["assets/images/gallery/seminar.jpg"], featured: false, status: "published" },
    { id: "al3", title: "Our Students", caption: "Proudly ECA", category: "Campus", date: "2026-07-10",
      photos: ["assets/images/gallery/students.jpg"], featured: true, status: "published" },
    { id: "al4", title: "Faculty & Staff", caption: "The people behind ECA", category: "Community", date: "2026-06-05",
      photos: ["assets/images/gallery/faculty.jpg"], featured: false, status: "published" },
    { id: "al5", title: "Children's Retreat", caption: "Shield Squad 2025", category: "Spiritual Life", date: "2026-05-16",
      photos: ["assets/images/gallery/childrens-retreat.jpg"], featured: true, status: "published" },
    { id: "al6", title: "School Programs", caption: "Gatherings and celebrations", category: "Celebrations", date: "2026-02-20",
      photos: ["assets/images/gallery/school-program.jpg"], featured: false, status: "published" }
  ],

  announcements: {
    enabled: true,
    messages: [
      { id: "a1", text: "On-going registration for Early Childhood, Elementary, Junior High, and Senior High School!", link: "#apply", visible: true },
      { id: "a2", text: "Congratulations, James Marcus L. Arbues (Class of 2018), Criminology Licensure Examination passer!", link: "#news", visible: true },
      { id: "a3", text: "Congratulations, Gorg Elbert N. Flores (Class of 2018), BA Film and Visual Effects, Cum Laude!", link: "#news", visible: true },
      { id: "a4", text: "We are hiring High School Teachers major in Science and BTLE. Send your CV to elim.educ@gmail.com.", link: "#news", visible: true },
      { id: "a5", text: "Office hours: Monday to Friday, 8:00 AM to 5:00 PM.", link: "#contact", visible: true }
    ]
  }
};

/* ---------- Low-level load/save (localStorage) ---------- */
let memoryCopy = null; // used if the browser blocks localStorage

function cloneData(data) {
  return JSON.parse(JSON.stringify(data));
}

function loadAll() {
  try {
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) return upgradeOldData(JSON.parse(saved));
  } catch (err) { /* blocked or corrupted: fall back below */ }
  if (!memoryCopy) memoryCopy = cloneData(SEED_DATA);
  return cloneData(memoryCopy);
}

// Data saved before Step 6 has single "photos" instead of "albums".
// Swap in the sample albums so older demo data keeps working.
function upgradeOldData(data) {
  if (!data.albums) {
    data.albums = cloneData(SEED_DATA.albums);
    delete data.photos;
  }
  return data;
}

function saveAll(data) {
  memoryCopy = cloneData(data);
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(data));
  } catch (err) {
    // Most likely the storage is full (large photos). Let the page show an error.
    throw new Error("Couldn't save. The browser storage may be full.");
  }
}

function newId(prefix) {
  if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

// Short delay so the pages already handle "loading" like a real server
function delay(ms = 150) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* =========================================================
   Public functions: the ONLY way pages touch the data
   ========================================================= */

/* ---------- News ---------- */
async function listNews() {
  await delay();
  return loadAll().news.sort((a, b) => b.date.localeCompare(a.date)); // newest first
}

async function getNews(id) {
  await delay();
  return loadAll().news.find((item) => item.id === id) || null;
}

async function saveNews(item) {
  await delay();
  const data = loadAll();
  if (item.id) {
    const index = data.news.findIndex((n) => n.id === item.id);
    if (index === -1) throw new Error("This news post no longer exists.");
    data.news[index] = { ...data.news[index], ...item };
  } else {
    item = { ...item, id: newId("n") };
    data.news.push(item);
  }
  saveAll(data);
  return item;
}

async function deleteNews(id) {
  await delay();
  const data = loadAll();
  data.news = data.news.filter((n) => n.id !== id);
  saveAll(data);
}

/* ---------- Events ---------- */
async function listEvents() {
  await delay();
  return loadAll().events.sort((a, b) => a.start.localeCompare(b.start)); // soonest first
}

async function saveEvent(item) {
  await delay();
  const data = loadAll();
  if (item.id) {
    const index = data.events.findIndex((e) => e.id === item.id);
    if (index === -1) throw new Error("This event no longer exists.");
    data.events[index] = { ...data.events[index], ...item };
  } else {
    item = { ...item, id: newId("e") };
    data.events.push(item);
  }
  saveAll(data);
  return item;
}

async function deleteEvent(id) {
  await delay();
  const data = loadAll();
  data.events = data.events.filter((e) => e.id !== id);
  saveAll(data);
}

/* ---------- Life at ECA albums ---------- */

// Which published albums the homepage shows: pinned (featured) first, then the newest.
// Albums must already be sorted newest first (listAlbums does this).
function pickHomepageAlbums(albums) {
  const published = albums.filter((a) => a.status === "published");
  const pinned = published.filter((a) => a.featured);
  const others = published.filter((a) => !a.featured);
  return [...pinned, ...others].slice(0, HOMEPAGE_ALBUM_SPOTS);
}

async function listAlbums() {
  await delay();
  return loadAll().albums.sort((a, b) => b.date.localeCompare(a.date)); // newest first
}

async function getAlbum(id) {
  await delay();
  return loadAll().albums.find((a) => a.id === id) || null;
}

async function saveAlbum(item) {
  await delay();
  const data = loadAll();

  // Same limit the form checks, repeated here because the server must never trust the page
  if (item.featured && item.status === "published") {
    const otherPinned = data.albums.filter((a) => a.featured && a.status === "published" && a.id !== item.id);
    if (otherPinned.length >= HOMEPAGE_ALBUM_SPOTS) {
      throw new Error(`Only ${HOMEPAGE_ALBUM_SPOTS} albums can be pinned to the homepage.`);
    }
  }

  if (item.id) {
    const index = data.albums.findIndex((a) => a.id === item.id);
    if (index === -1) throw new Error("This album no longer exists.");
    data.albums[index] = { ...data.albums[index], ...item };
    item = data.albums[index];
  } else {
    item = { featured: false, ...item, id: newId("al") };
    data.albums.push(item);
  }
  saveAll(data);
  return item;
}

async function deleteAlbum(id) {
  await delay();
  const data = loadAll();
  data.albums = data.albums.filter((a) => a.id !== id);
  saveAll(data);
}

/* ---------- Announcement bar ---------- */
async function getAnnouncements() {
  await delay();
  return loadAll().announcements;
}

async function saveAnnouncements(announcements) {
  await delay();
  const data = loadAll();
  data.announcements = announcements;
  saveAll(data);
  return announcements;
}

/* ---------- Demo helper ---------- */
function resetDemoData() {
  try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignore */ }
  memoryCopy = null;
}