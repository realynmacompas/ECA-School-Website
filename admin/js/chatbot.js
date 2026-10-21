/* =========================================================
   ECA Help Desk - rule-based FAQ chat
   Matches the visitor's question against keywords below.
   No external service is used; edit the FAQ list to update answers.
   ========================================================= */

const CONTACT = {
  phone: "0939 909 8717",
  phoneLink: "tel:+639399098717",
  landline: "(046) 419 1668",
  email: "elim.educ@gmail.com",
  messenger: "https://m.me/ElimChristianAcademy"
};

/* Each entry:
   id        unique name, used by "related"
   chip      label for the topic button (only entries with a chip appear in "Popular topics")
   icon      icon name from CHAT_ICONS (for the topic button)
   title     heading of the answer card (entries without a title show as a plain message)
   keywords  words that match this answer
   answer    main text (line breaks are kept)
   list      optional checklist
   note      optional small note under the list
   link      optional { label, href }
   related   optional ids shown as follow-up chips
   NOTE: Answers marked [CONFIRM] should be checked with the school before launch. */
const faqs = [
  {
    id: "enroll",
    chip: "How to enroll",
    icon: "plus",
    title: "How to enroll",
    keywords: ["enroll", "enrol", "enrollment", "apply", "application", "admission", "register", "mag-enroll", "paano"],
    answer: "Here's how to apply:\n1. Inquire through our Facebook page, by phone, or at the registrar's office.\n2. Submit the requirements.\n3. Take the assessment and attend the interview.\n4. Settle the enrollment fees.",
    link: { label: "See the application steps", href: "#apply" },
    related: ["requirements", "tuition", "hours"]
  },
  {
    id: "requirements",
    chip: "Requirements",
    icon: "clipboard",
    title: "Enrollment requirements",
    keywords: ["requirement", "requirements", "documents", "birth certificate", "psa", "card", "sf9", "good moral", "lrn", "needed", "kailangan"],
    answer: "Please prepare these documents:",
    list: ["PSA Birth Certificate", "Report Card (SF9)", "Certificate of Good Moral Character", "Two 2x2 ID pictures", "Learner Reference Number (LRN)"],
    note: "Transferees may need additional documents.",
    link: { label: "View requirements", href: "#apply" },
    related: ["enroll", "tuition", "hours"]
  },
  {
    id: "tuition",
    chip: "Tuition fees",
    icon: "cash",
    title: "Tuition fees",
    keywords: ["tuition", "fee", "fees", "price", "cost", "how much", "magkano", "payment", "installment", "voucher", "esc"],
    answer: "Tuition and payment options depend on the grade level. For the current rates, please contact the registrar at " + CONTACT.phone + " or send us a message on Facebook.",
    related: ["enroll", "requirements", "contact"]
  },
  {
    id: "programs",
    chip: "Programs",
    icon: "cap",
    title: "Programs",
    keywords: ["program", "programs", "grade", "level", "preschool", "kinder", "nursery", "early childhood", "elementary", "grade school", "junior", "senior", "shs", "jhs", "strand", "strands", "course", "offer", "stem", "abm", "humss", "gas"],
    answer: "We offer:",
    list: ["Early Childhood Education", "Elementary School (Grades 1–6)", "Junior High School (Grades 7–10)", "Senior High School (Grades 11–12)"],
    // [CONFIRM] list of SHS strands offered this school year
    note: "For the SHS strands available this school year, please ask the registrar.",
    link: { label: "Explore programs", href: "#programs" },
    related: ["enroll", "requirements", "tuition"]
  },
  {
    id: "calendar",
    chip: "School calendar",
    icon: "calendar",
    title: "School calendar",
    keywords: ["calendar", "school year", "class start", "classes start", "opening", "term", "break", "vacation", "bakasyon", "pasukan", "end of school year"],
    answer: "SY 2026–2027 follows the DepEd three-term calendar:",
    list: ["Term 2: Sep 16 – Dec 4, 2026", "Term 3 begins: Jan 4, 2027", "End of school year: Apr 8, 2027"],
    link: { label: "See upcoming dates", href: "#calendar" },
    related: ["enroll", "hours"]
  },
  {
    id: "location",
    chip: "Location",
    icon: "pin",
    title: "Location",
    keywords: ["where", "location", "address", "located", "map", "directions", "saan", "trece", "de ocampo"],
    answer: "We're located along Tanza–Trece Martires Road, Barangay De Ocampo, Trece Martires City, Cavite.",
    link: { label: "Open the map", href: "#contact" },
    related: ["hours", "contact"]
  },
  {
    id: "contact",
    chip: "Contact us",
    icon: "phone",
    title: "Contact us",
    keywords: ["contact", "phone", "number", "call", "landline", "email", "message", "text", "reach", "messenger", "facebook"],
    answer: "You can reach us through:\nMobile: " + CONTACT.phone + "\nLandline: " + CONTACT.landline + "\nEmail: " + CONTACT.email,
    link: { label: "Message us on Messenger", href: CONTACT.messenger },
    related: ["hours", "location"]
  },
  {
    id: "hours",
    chip: "Office hours",
    icon: "clock",
    title: "Office hours",
    keywords: ["hours", "open", "office", "schedule", "time", "oras", "saturday", "sunday", "weekend"],
    answer: "Our office is open Monday to Friday, 8:00 AM to 5:00 PM.",
    related: ["location", "contact"]
  },
  {
    id: "hiring",
    title: "Careers",
    keywords: ["hiring", "hire", "job", "jobs", "vacancy", "career", "careers", "apply as teacher", "teaching position", "cv", "resume", "trabaho"],
    // Update when the hiring post changes
    answer: "We are hiring High School Teachers major in Science and BTLE (NC II holders preferred). Send your CV to " + CONTACT.email + "."
  },
  {
    id: "portal",
    keywords: ["portal", "grades", "grade report", "attendance", "login", "account", "password"],
    answer: "For grades and attendance, please coordinate with your class adviser or the registrar at " + CONTACT.phone + "."
  },
  {
    id: "christian",
    keywords: ["christian", "religion", "bible", "chapel", "worship", "catholic", "non-christian", "faith", "values"],
    answer: "ECA is a Christian school. Bible and values education are part of our program. For questions about faith and admission, please contact the registrar."
  },
  {
    id: "greeting",
    keywords: ["hi", "hello", "hey", "good morning", "good afternoon", "good evening", "kumusta", "musta"],
    answer: "Hello! How can we help you today? You can pick a topic above or type your question."
  },
  {
    id: "thanks",
    keywords: ["thank", "thanks", "salamat", "ty"],
    answer: "You're welcome! God bless, and feel free to ask if you have other questions."
  }
];

// Basic filter so the help desk stays respectful on a school website
const BLOCKED_WORDS = ["fuck", "shit", "bitch", "puta", "putang", "tangina", "gago", "ulol", "tarantado", "bobo"];
const RESPECT_REPLY = "Let's keep our conversation respectful. How can we help you with your questions about ECA?";

const FALLBACK = "Sorry, I don't have an answer for that yet. For other concerns, please call " + CONTACT.phone + " or email " + CONTACT.email + ".";

// Outline icons (fixed strings written by us, never user input)
const CHAT_ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  clipboard: '<path d="M9 4h6l1 2h3v14H5V6h3z"/><path d="m9 13 2 2 4-4"/>',
  cash: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',
  cap: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  pin: '<path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>'
};

function chatIcon(name) {
  return `<svg class="chat-icon" viewBox="0 0 24 24" aria-hidden="true">${CHAT_ICONS[name] || ""}</svg>`;
}

(function initChat() {
  const launcher = document.getElementById("chatLauncher");
  const panel = document.getElementById("chatPanel");
  const body = document.getElementById("chatBody");
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatInput");
  const closeButton = document.getElementById("chatClose");
  if (!launcher || !panel) return;

  const LOGO = "assets/images/logo.png";
  const REPLY_DELAY = 350;
  let greeted = false;

  const teaser = document.getElementById("chatTeaser");
  const teaserClose = document.getElementById("chatTeaserClose");
  const isTouch = window.matchMedia("(pointer: coarse)").matches;

  function hideTeaser() {
    teaser.hidden = true;
    try { sessionStorage.setItem("ecaChatTeaserSeen", "1"); } catch (err) { /* storage blocked */ }
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close help desk" : "Questions? Open the help desk");
    if (open) {
      hideTeaser();
      if (!greeted) {
        showWelcome();
        greeted = true;
      }
      // Avoid popping up the phone keyboard as soon as the panel opens
      if (!isTouch) input.focus();
    }
  }

  // Friendly prompt shown once per visit, a few seconds after the page loads
  let teaserSeen = false;
  try { teaserSeen = sessionStorage.getItem("ecaChatTeaserSeen") === "1"; } catch (err) { /* storage blocked */ }
  if (teaser && !teaserSeen) {
    setTimeout(() => {
      if (!panel.hidden) return;
      teaser.hidden = false;
      // Hide again after a while so it doesn't cover content for too long
      setTimeout(() => { if (!teaser.hidden) hideTeaser(); }, 12000);
    }, 4000);
    teaser.addEventListener("click", (e) => {
      if (teaserClose.contains(e.target)) return;
      setOpen(true);
    });
    teaserClose.addEventListener("click", hideTeaser);
  }

  /* ---------- Building blocks ---------- */

  // "#apply" only exists on the homepage, so point to index.html from other pages
  function makeLink(link, className) {
    const a = document.createElement("a");
    a.className = className;
    let href = link.href;
    if (href.startsWith("#") && !document.getElementById(href.slice(1))) href = "index.html" + href;
    a.href = href;
    a.textContent = link.label;
    if (/^https?:/.test(href)) {
      a.target = "_blank";
      a.rel = "noopener";
    } else if (!href.startsWith("tel:")) {
      a.addEventListener("click", () => setOpen(false));
    }
    return a;
  }

  function scrollToShow(row) {
    // Show the start of a new answer (with the question above it), even when the answer is taller than the panel
    const question = row.previousElementSibling;
    const target = question && question.classList.contains("msg--user") ? question : row;
    body.scrollTop = target.offsetTop - 12;
  }

  function addUserMessage(text) {
    const msg = document.createElement("p");
    msg.className = "msg msg--user";
    msg.textContent = text; // textContent prevents HTML injection from user input
    body.appendChild(msg);
    body.scrollTop = body.scrollHeight;
  }

  function addBotRow(content) {
    const row = document.createElement("div");
    row.className = "msg-row";
    row.innerHTML = `<span class="msg-row__avatar"><img src="${LOGO}" alt=""></span>`;
    row.appendChild(content);
    body.appendChild(row);
    return row;
  }

  function addBotText(text) {
    const msg = document.createElement("p");
    msg.className = "msg msg--bot";
    msg.textContent = text;
    return addBotRow(msg);
  }

  function buildAnswer(faq) {
    const msg = document.createElement("div");
    msg.className = faq.title ? "msg msg--bot msg--card" : "msg msg--bot";

    if (faq.title) {
      const title = document.createElement("strong");
      title.className = "msg__title";
      title.textContent = faq.title;
      msg.appendChild(title);
    }

    msg.appendChild(document.createTextNode(faq.answer));

    if (faq.list) {
      const ul = document.createElement("ul");
      ul.className = "msg__list";
      faq.list.forEach((item) => {
        const li = document.createElement("li");
        li.innerHTML = chatIcon("check");
        const span = document.createElement("span");
        span.textContent = item;
        li.appendChild(span);
        ul.appendChild(li);
      });
      msg.appendChild(ul);
    }

    if (faq.note) {
      const note = document.createElement("small");
      note.className = "msg__note";
      note.textContent = faq.note;
      msg.appendChild(note);
    }

    if (faq.link) msg.appendChild(makeLink({ label: faq.link.label + " →", href: faq.link.href }, "msg__link"));
    return msg;
  }

  // Related chips + "Still need help?" card. Only the latest answer keeps them.
  function addFollowUp(relatedIds) {
    body.querySelectorAll(".chat__followup").forEach((el) => el.remove());

    const box = document.createElement("div");
    box.className = "chat__followup";

    const related = (relatedIds || []).map((id) => faqs.find((faq) => faq.id === id)).filter(Boolean);
    if (related.length) {
      const label = document.createElement("p");
      label.className = "chat__label";
      label.textContent = "Related";
      const row = document.createElement("div");
      row.className = "chip-row";
      related.forEach((faq) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "chip";
        chip.textContent = faq.chip || faq.title;
        chip.addEventListener("click", () => askTopic(faq));
        row.appendChild(chip);
      });
      box.append(label, row);
    }

    const help = document.createElement("div");
    help.className = "help-card";
    help.innerHTML = "<strong>Still need help?</strong>";
    const actions = document.createElement("div");
    actions.className = "help-card__actions";
    const call = makeLink({ label: "Call the office", href: CONTACT.phoneLink }, "");
    const messenger = makeLink({ label: "Messenger", href: CONTACT.messenger }, "");
    call.insertAdjacentHTML("afterbegin", chatIcon("phone"));
    messenger.insertAdjacentHTML("afterbegin", chatIcon("chat"));
    actions.append(call, messenger);
    help.appendChild(actions);
    box.appendChild(help);

    body.appendChild(box);
  }

  function showAnswer(faq) {
    const row = addBotRow(buildAnswer(faq));
    if (faq.title) addFollowUp(faq.related);
    scrollToShow(row);
  }

  function showFallback(text) {
    const row = addBotText(text);
    addFollowUp([]);
    scrollToShow(row);
  }

  function askTopic(faq) {
    addUserMessage(faq.chip || faq.title);
    setTimeout(() => showAnswer(faq), REPLY_DELAY);
  }

  function showWelcome() {
    addBotText("Hi there! I can help with common questions about enrollment, fees and school life. Pick a topic or type your question.");

    const label = document.createElement("p");
    label.className = "chat__label";
    label.textContent = "Popular topics";

    const grid = document.createElement("div");
    grid.className = "topic-grid";
    faqs.filter((faq) => faq.chip).forEach((faq) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "topic-btn";
      button.innerHTML = `<span class="topic-btn__icon">${chatIcon(faq.icon)}</span>`;
      button.append(faq.chip);
      button.addEventListener("click", () => askTopic(faq));
      grid.appendChild(button);
    });

    body.append(label, grid);
  }

  /* ---------- Matching ---------- */

  function findAnswer(question) {
    const text = " " + question.toLowerCase().replace(/[^a-z0-9ñ\s-]/g, " ") + " ";
    let best = null;
    let bestScore = 0;

    faqs.forEach((faq) => {
      const score = faq.keywords.reduce((sum, keyword) => {
        // Short keywords (e.g. "hi", "ty") must match a whole word
        const hit = keyword.length <= 3 ? text.includes(` ${keyword} `) : text.includes(keyword);
        return hit ? sum + keyword.length : sum;
      }, 0);
      if (score > bestScore) {
        bestScore = score;
        best = faq;
      }
    });

    return best;
  }

  function hasBlockedWord(text) {
    const words = text.toLowerCase().split(/[^a-zñ]+/);
    return words.some((word) => BLOCKED_WORDS.some((blocked) => word.startsWith(blocked)));
  }

  function reply(question) {
    // Short delay so the reply doesn't appear instantly
    setTimeout(() => {
      if (hasBlockedWord(question)) {
        scrollToShow(addBotText(RESPECT_REPLY));
        return;
      }
      const faq = findAnswer(question);
      if (faq) showAnswer(faq);
      else showFallback(FALLBACK);
    }, REPLY_DELAY);
  }

  /* ---------- Events ---------- */

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const question = input.value.trim();
    if (!question) return;
    addUserMessage(question);
    input.value = "";
    reply(question);
  });

  launcher.addEventListener("click", () => setOpen(panel.hidden));

  closeButton.addEventListener("click", () => {
    setOpen(false);
    launcher.focus();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      setOpen(false);
      launcher.focus();
    }
  });
})();