/* =========================================================
   News & Events page (news.html)
   1. News list with a category filter and "Show more"
   2. Article view: news.html#n3 shows that post
   3. School calendar (month grid + all dates)
   Uses escapeHTML/parseDate/linkAttributes from main.js and
   listNews/listEvents/NEWS_CATEGORIES/EVENT_TYPES from store.js.
   The "Upcoming Dates" box is filled by main.js, like on the homepage.
   ========================================================= */

(function initNewsPage() {
  const grid = document.getElementById("newsGrid");
  if (!grid) return;

  const PAGE_SIZE = 9;
  const RECENT_COUNT = 4;

  const els = {
    listHero: document.getElementById("listHero"),
    articleBar: document.getElementById("articleBar"),
    articleCrumb: document.getElementById("articleCrumb"),
    layout: document.getElementById("newsLayout"),
    listView: document.getElementById("listView"),
    articleView: document.getElementById("articleView"),
    category: document.getElementById("newsCategory"),
    search: document.getElementById("newsSearch"),
    status: document.getElementById("newsStatus"),
    more: document.getElementById("moreNews"),
    recentBox: document.getElementById("recentBox"),
    recentList: document.getElementById("recentList")
  };

  const state = {
    posts: [],     // published posts, newest first
    category: "",  // "" = all
    query: "",     // text typed in the search box
    shown: PAGE_SIZE
  }

  const pageTitle = document.title;

  function formatDate(iso, month = "long") {
    return parseDate(iso).toLocaleDateString("en-US", { month, day: "numeric", year: "numeric" });
  }

  function postLink(post) {
    return `#${encodeURIComponent(post.id)}`;
  }

  // Posters are shown whole (contain) over a blurred copy; photos fill the frame
  function mediaHTML(post, altText) {
    if (!post.image) return `<span class="news-card__placeholder" aria-hidden="true">ECA News</span>`;
    const src = escapeHTML(post.image);
    return `
      ${post.isPoster ? `<img class="news-card__backdrop" src="${src}" alt="" aria-hidden="true">` : ""}
      <img class="news-card__img${post.isPoster ? " news-card__img--contain" : ""}" src="${src}" alt="${escapeHTML(altText)}" loading="lazy">`;
  }

  /* =========================================================
     1. News list
     ========================================================= */
  // Category dropdown: only categories that have posts, with how many
  function renderCategories() {
    const used = NEWS_CATEGORIES.filter((c) => state.posts.some((p) => p.category === c));
    els.category.innerHTML = `<option value="">All categories (${state.posts.length})</option>` +
      used.map((c) => {
        const count = state.posts.filter((p) => p.category === c).length;
        return `<option value="${escapeHTML(c)}">${escapeHTML(c)} (${count})</option>`;
      }).join("");
  }

  els.category.addEventListener("change", () => {
    state.category = els.category.value;
    state.shown = PAGE_SIZE;
    renderGrid();
  });

  els.search.addEventListener("input", () => {
    state.query = els.search.value.trim().toLowerCase();
    state.shown = PAGE_SIZE;
    renderGrid();
  });

  // Search looks in the title, category, short description and article text
  function matchesSearch(post) {
    if (!state.query) return true;
    const text = [post.title, post.category, post.summary, post.body].join(" ").toLowerCase();
    return state.query.split(/\s+/).every((word) => text.includes(word));
  }

  function cardHTML(post) {
    const date = parseDate(post.date);
    return `
      <li class="news-card">
        <div class="news-card__media">
          ${mediaHTML(post, post.title)}
          <time class="news-card__date" datetime="${escapeHTML(post.date)}" title="${formatDate(post.date)}">
            <strong>${date.getDate()}</strong><span>${date.toLocaleDateString("en-US", { month: "short" })}</span>
          </time>
        </div>
        <div class="news-card__body">
          <span class="news-card__tag">${escapeHTML(post.category)}</span>
          <h3 class="news-card__title"><a href="${postLink(post)}">${escapeHTML(post.title)}</a></h3>
          <a class="link-arrow news-card__more" href="${postLink(post)}" tabindex="-1" aria-hidden="true">Read more</a>
        </div>
      </li>`;
  }

  function renderGrid() {
    if (!state.posts.length) {
      els.status.textContent = "No news yet. Follow us on Facebook for the latest updates.";
      grid.innerHTML = "";
      els.more.hidden = true;
      return;
    }
    const matching = state.posts.filter((p) =>
      (!state.category || p.category === state.category) && matchesSearch(p));
    const visible = matching.slice(0, state.shown);

    if (!matching.length) {
      els.status.textContent = state.query
        ? `No posts match "${els.search.value.trim()}". Try another word or choose "All categories".`
        : "No posts in this category yet.";
    } else {
      els.status.textContent = `${matching.length} post${matching.length === 1 ? "" : "s"}${state.query ? ` found for "${els.search.value.trim()}"` : ""}`;
    }
    grid.innerHTML = visible.map(cardHTML).join("");
    els.more.hidden = matching.length <= state.shown;
  }

  els.more.addEventListener("click", () => {
    const firstNew = state.shown;
    state.shown += PAGE_SIZE;
    renderGrid();
    // Move keyboard focus to the first newly shown post
    const link = grid.children[firstNew] && grid.children[firstNew].querySelector(".news-card__title a");
    if (link) link.focus();
  });

  /* =========================================================
     2. Article view
     ========================================================= */
  function shareHTML() {
    const pageUrl = encodeURIComponent(window.location.href);
    return `
      <div class="share">
        <span class="share__label">Share</span>
        <a class="share__btn" href="https://www.facebook.com/sharer/sharer.php?u=${pageUrl}" target="_blank" rel="noopener" aria-label="Share on Facebook"><svg aria-hidden="true"><use href="#i-fb"></use></svg></a>
        <button type="button" class="share__btn" data-copy-link aria-label="Copy link to this post"><svg aria-hidden="true"><use href="#i-link"></use></svg></button>
        <span class="share__done" role="status"></span>
      </div>`;
  }

  function postNavHTML(index) {
    const newer = state.posts[index - 1];
    const older = state.posts[index + 1];
    if (!newer && !older) return "";
    return `
      <nav class="post-nav" aria-label="More posts">
        ${newer ? `<a class="post-nav__link" href="${postLink(newer)}"><span>&larr; Newer post</span><strong>${escapeHTML(newer.title)}</strong></a>` : "<span></span>"}
        ${older ? `<a class="post-nav__link post-nav__link--older" href="${postLink(older)}"><span>Older post &rarr;</span><strong>${escapeHTML(older.title)}</strong></a>` : ""}
      </nav>`;
  }

  function renderArticle(post) {
    const index = state.posts.indexOf(post);
    // The body is shown exactly as typed; line breaks are kept by CSS (white-space: pre-line)
    const text = post.body || post.summary || "";
    const fbAttrs = linkAttributes(post.facebookUrl);

    els.articleView.innerHTML = `
      ${post.image ? `<div class="article__media">${mediaHTML(post, post.title)}</div>` : ""}
      <div class="article__meta">
        <span class="news-card__tag">${escapeHTML(post.category)}</span>
        <time datetime="${escapeHTML(post.date)}">${formatDate(post.date)}</time>
      </div>
      <h1 class="article__title" id="articleTitle" tabindex="-1">${escapeHTML(post.title)}</h1>
      <div class="article__byline">
        ${post.author ? `<span>Posted by <strong>${escapeHTML(post.author)}</strong></span>` : "<span></span>"}
        ${shareHTML()}
      </div>
      <p class="article__body"></p>
      <div class="article__foot">
        ${fbAttrs ? `<a class="btn btn--outline-dark btn--sm" ${fbAttrs}><svg aria-hidden="true"><use href="#i-fb"></use></svg>View the original post on Facebook</a>` : "<span></span>"}
        ${shareHTML()}
      </div>
      ${postNavHTML(index)}`;
    els.articleView.querySelector(".article__body").textContent = text; // textContent: no HTML from the post is run

    els.articleCrumb.textContent = post.category;
    document.title = `${post.title} | Elim Christian Academy, Inc.`;
    renderRecent(post);
  }

  function renderRecent(current) {
    const recent = state.posts.filter((p) => p !== current).slice(0, RECENT_COUNT);
    els.recentBox.hidden = !recent.length;
    els.recentList.innerHTML = recent.map((post) => `
      <li>
        <a class="recent__item" href="${postLink(post)}">
          <span class="recent__thumb">${mediaHTML(post, "")}</span>
          <span class="recent__text">
            <strong>${escapeHTML(post.title)}</strong>
            <span class="recent__meta"><span class="news-card__tag">${escapeHTML(post.category)}</span>${formatDate(post.date, "short")}</span>
          </span>
        </a>
      </li>`).join("");
  }

  // Copy link buttons (there are two in each article)
  els.articleView.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-copy-link]");
    if (!button) return;
    const done = button.parentElement.querySelector(".share__done");
    try {
      await navigator.clipboard.writeText(window.location.href);
      done.textContent = "Link copied";
    } catch (err) {
      done.textContent = "Couldn't copy. Copy the address from the address bar.";
    }
    setTimeout(() => { done.textContent = ""; }, 3000);
  });

  /* ---------- Which view to show (from the # in the address) ---------- */
  function showView() {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const post = state.posts.find((p) => p.id === id);

    els.listHero.hidden = Boolean(post);
    els.articleBar.hidden = !post;
    els.listView.hidden = Boolean(post);
    els.articleView.hidden = !post;
    els.layout.classList.toggle("is-article", Boolean(post));

    if (post) {
      renderArticle(post);
      window.scrollTo(0, 0);
      document.getElementById("articleTitle").focus({ preventScroll: true });
      return;
    }

    els.recentBox.hidden = true;
    document.title = pageTitle;
    // #news or #calendar: scroll there now that the content has its full height
    const target = id && document.getElementById(id);
    if (target) target.scrollIntoView();
  }

  window.addEventListener("hashchange", showView);

  /* =========================================================
     3. School calendar
     ========================================================= */
  const cal = {
    events: [],
    month: new Date() // any day in the month being shown
  };
  cal.month.setDate(1);

  const calEls = {
    title: document.getElementById("calTitle"),
    grid: document.getElementById("calGrid"),
    legend: document.getElementById("calLegend"),
    list: document.getElementById("calList")
  };

  function startOfToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function addDays(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function eventType(ev) {
    return EVENT_TYPES[ev.type] ? ev.type : "activity";
  }

  function eventRange(ev) {
    const start = parseDate(ev.start);
    if (!ev.end || ev.end === ev.start) return formatDate(ev.start, "short");
    const end = parseDate(ev.end);
    const sameYear = start.getFullYear() === end.getFullYear();
    const startText = start.toLocaleDateString("en-US", sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" });
    return `${startText} \u2013 ${formatDate(ev.end, "short")}`;
  }

  // Put each event of one week into a "lane" (row) so bars never overlap
  function weekBars(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    const lanes = []; // each lane holds the last column used
    const bars = [];

    cal.events.forEach((ev) => {
      const start = parseDate(ev.start);
      const end = parseDate(ev.end || ev.start);
      if (end < weekStart || start > weekEnd) return;

      const from = start < weekStart ? 0 : start.getDay();
      const to = end > weekEnd ? 6 : end.getDay();
      let lane = lanes.findIndex((lastCol) => lastCol < from);
      if (lane === -1) {
        lane = lanes.length;
        lanes.push(to);
      } else {
        lanes[lane] = to;
      }
      bars.push({ ev, from, to, lane, continues: start < weekStart });
    });
    return { bars, laneCount: lanes.length };
  }

  function renderCalendar() {
    const year = cal.month.getFullYear();
    const month = cal.month.getMonth();
    const today = startOfToday();
    calEls.title.textContent = cal.month.toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const firstDay = new Date(year, month, 1);
    let weekStart = addDays(firstDay, -firstDay.getDay()); // Sunday on or before the 1st
    const lastDay = new Date(year, month + 1, 0);

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    let html = `<div class="cal__head" aria-hidden="true">${dayNames.map((d) => `<span>${d}</span>`).join("")}</div>`;

    while (weekStart <= lastDay) {
      const { bars, laneCount } = weekBars(weekStart);
      const rowSpan = laneCount + 2; // day number row + lanes + filler row

      let cells = "";
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const classes = ["cal__day"];
        if (day.getMonth() !== month) classes.push("is-outside");
        if (day.getTime() === today.getTime()) classes.push("is-today");
        cells += `<div class="${classes.join(" ")}" style="grid-column: ${i + 1}; grid-row: 1 / span ${rowSpan}"><span class="cal__num">${day.getDate()}</span></div>`;
      }

      const barHTML = bars.map((b) => {
        const label = `${b.ev.title}${b.continues ? " (cont.)" : ""}`;
        return `<span class="cal__bar cal__bar--${eventType(b.ev)}" style="grid-column: ${b.from + 1} / ${b.to + 2}; grid-row: ${b.lane + 2}" title="${escapeHTML(b.ev.title)}: ${eventRange(b.ev)}">${escapeHTML(label)}</span>`;
      }).join("");

      html += `<div class="cal__week">${cells}${barHTML}</div>`;
      weekStart = addDays(weekStart, 7);
    }
    calEls.grid.innerHTML = html;
  }

  function renderLegend() {
    const used = Object.keys(EVENT_TYPES).filter((t) => cal.events.some((ev) => eventType(ev) === t));
    calEls.legend.innerHTML = used.map((t) =>
      `<li><span class="cal-legend__swatch cal__bar--${t}"></span>${escapeHTML(EVENT_TYPES[t])}</li>`).join("") +
      `<li><span class="cal-legend__today"></span>Today</li>`;
  }

  // Every date of the school year, grouped by month. Past dates are greyed out.
  function renderDateList() {
    if (!cal.events.length) {
      calEls.list.innerHTML = `<li class="cal-list__empty">No dates posted yet.</li>`;
      return;
    }
    const today = startOfToday();
    let currentGroup = "";
    calEls.list.innerHTML = cal.events.map((ev) => {
      const start = parseDate(ev.start);
      const end = parseDate(ev.end || ev.start);
      const group = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      const heading = group !== currentGroup ? `<li class="cal-list__group">${group}</li>` : "";
      currentGroup = group;

      let state = "";
      if (end < today) state = "past";
      else if (start <= today) state = "now";

      const badge = state === "now" ? ' <em class="event__badge">Ongoing</em>'
        : state === "past" ? ' <em class="cal-list__done">Done</em>' : "";
      return `${heading}
        <li class="cal-list__item${state === "past" ? " is-past" : ""}">
          <span class="cal-list__dot cal__bar--${eventType(ev)}" aria-hidden="true"></span>
          <div>
            <strong>${escapeHTML(ev.title)}${badge}</strong>
            <span>${eventRange(ev)}</span>
          </div>
        </li>`;
    }).join("");
  }

  function changeMonth(step) {
    cal.month = new Date(cal.month.getFullYear(), cal.month.getMonth() + step, 1);
    renderCalendar();
  }

  document.getElementById("calPrev").addEventListener("click", () => changeMonth(-1));
  document.getElementById("calNext").addEventListener("click", () => changeMonth(1));
  document.getElementById("calToday").addEventListener("click", () => {
    const now = new Date();
    cal.month = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
  });

  /* ---------- Start ---------- */
  async function init() {
    try {
      const [news, events] = await Promise.all([listNews(), listEvents()]);
      state.posts = news.filter((p) => p.status === "published");
      cal.events = events;
      renderCategories();
      renderGrid();
      renderCalendar();
      renderLegend();
      renderDateList();
      showView();
    } catch (err) {
      console.error("Couldn't load news and events:", err);
      els.status.textContent = "News couldn't load. Please refresh the page or visit our Facebook page.";
    }
  }

  init();
})();