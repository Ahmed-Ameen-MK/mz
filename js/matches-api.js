// ===========================================================
// MZ TV — matches.html: live fixtures from API-Football (v3)
// ===========================================================
//
// ⚠️ تنبيه أمني: مفتاح API موضوع هنا مباشرة بدون حماية بناءً على
// طلب صريح للتجربة فقط. يجب حذف/تدوير هذا المفتاح (reset) قبل
// النشر الفعلي للموقع، ثم تمريره لاحقًا عبر باك-إند/edge function
// بدل تركه ظاهرًا في كود الواجهة الأمامية.
// ===========================================================

const MZ_API_KEY  = 'a9c4073aba9f76918ebd6bd6b801ea6c';
const MZ_API_BASE  = 'https://v3.football.api-sports.io';
const MZ_TIMEZONE  = 'Africa/Cairo';

// statuses considered "live" (match clock running)
const LIVE_STATUSES     = ['1H', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
const HALFTIME_STATUSES = ['HT'];
const FINISHED_STATUSES = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
const POSTPONED_STATUSES = ['PST', 'CANC', 'ABD'];

// الدوريات الكبرى / كاس العالم — رقم أقل = أولوية أعلى (تظهر أولًا)
const MAJOR_LEAGUES = {
  1: 0,    // كاس العالم
  2: 1,    // دوري أبطال أوروبا
  4: 2,    // كاس الأمم الأوروبية
  9: 3,    // كوبا أمريكا
  39: 4,   // الدوري الإنجليزي الممتاز
  140: 5,  // الليجا الإسبانية
  135: 6,  // الدوري الإيطالي
  78: 7,   // الدوري الألماني
  61: 8,   // الدوري الفرنسي
  307: 9,  // الدوري السعودي للمحترفين
  233: 10, // الدوري المصري الممتاز
};

document.addEventListener('DOMContentLoaded', () => {
  const tabsEl    = document.getElementById('dayTabs');
  const contentEl = document.getElementById('matchesContent');
  if (!tabsEl || !contentEl) return;

  const cache = {};      // { 'yesterday'|'today'|'tomorrow': fixtures[] }
  let currentDay = 'today';
  let refreshTimer = null;
  let tickTimer = null;

  /* ---------- date helpers ---------- */
  function dateForDay(day) {
    const d = new Date();
    if (day === 'yesterday') d.setDate(d.getDate() - 1);
    if (day === 'tomorrow') d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  /* ---------- fetch ---------- */
  async function fetchFixtures(day) {
    const dateStr = dateForDay(day);
    const url = `${MZ_API_BASE}/fixtures?date=${dateStr}&timezone=${encodeURIComponent(MZ_TIMEZONE)}`;
    const res = await fetch(url, {
      headers: { 'x-apisports-key': MZ_API_KEY }
    });
    if (!res.ok) throw new Error('network');
    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length) {
      throw new Error(Object.values(data.errors).join(' | '));
    }
    return data.response || [];
  }

  /* ---------- rendering ---------- */
  function statusInfo(fixture) {
    const short = fixture.fixture.status.short;
    const elapsed = fixture.fixture.status.elapsed;

    if (LIVE_STATUSES.includes(short)) {
      return { kind: 'live', minute: elapsed };
    }
    if (HALFTIME_STATUSES.includes(short)) {
      return { kind: 'halftime' };
    }
    if (FINISHED_STATUSES.includes(short)) {
      return { kind: 'finished' };
    }
    if (POSTPONED_STATUSES.includes(short)) {
      const labels = { PST: 'مؤجلة', CANC: 'ملغاة', ABD: 'موقوفة' };
      return { kind: 'postponed', label: labels[short] || 'غير محددة' };
    }
    return { kind: 'scheduled' };
  }

  function formatTime(iso) {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  function isStartingSoon(iso) {
    const diffMin = (new Date(iso).getTime() - Date.now()) / 60000;
    return diffMin > 0 && diffMin <= 60;
  }

  function renderStatusBlock(fixture) {
    const info = statusInfo(fixture);
    const kickoff = fixture.fixture.date;

    if (info.kind === 'live') {
      const minuteText = info.minute != null ? `${info.minute}'` : '';
      return `
        <span class="live-badge">
          <span class="dot"></span> مباشر
          ${minuteText ? `· <span class="minute" data-fetched-at="${Date.now()}" data-base-minute="${info.minute}">${minuteText}</span>` : ''}
        </span>`;
    }
    if (info.kind === 'halftime') {
      return `<span class="status-badge">استراحة</span>`;
    }
    if (info.kind === 'finished') {
      return `<span class="status-badge status-badge--finished">انتهت المباراة</span>`;
    }
    if (info.kind === 'postponed') {
      return `<span class="status-badge status-badge--postponed">${info.label}</span>`;
    }
    // scheduled
    return `
      <span class="match-card__time">
        ${formatTime(kickoff)}
        ${isStartingSoon(kickoff) ? `<span class="soon-badge">بعد قليل</span>` : ''}
      </span>`;
  }

  function scoreText(fixture) {
    const home = fixture.goals.home;
    const away = fixture.goals.away;
    if (home == null && away == null) return 'vs';
    return `${home ?? 0} - ${away ?? 0}`;
  }

  function matchHref(fixture) {
    // details.html?match=فرنسا-اسبانيا
    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    return `details.html?match=${encodeURIComponent(home)}-${encodeURIComponent(away)}`;
  }

  function matchCard(fixture) {
    const home = fixture.teams.home;
    const away = fixture.teams.away;
    const round = fixture.league.round || '';
    const isMajor = MAJOR_LEAGUES[fixture.league.id] !== undefined;

    return `
      <a class="card match-card reveal${isMajor ? ' match-card--featured' : ''}" href="${matchHref(fixture)}">
        <div class="match-card__status">
          ${renderStatusBlock(fixture)}
        </div>
        <div class="match-card__teams">
          <div class="match-card__team">
            <img src="${home.logo}" alt="${home.name}" loading="lazy">
            <span>${home.name}</span>
          </div>
          <div class="match-card__score">${scoreText(fixture)}</div>
          <div class="match-card__team">
            <img src="${away.logo}" alt="${away.name}" loading="lazy">
            <span>${away.name}</span>
          </div>
        </div>
        ${round ? `<div class="match-card__round">${round}</div>` : ''}
      </a>`;
  }

  function groupByLeague(fixtures) {
    const groups = new Map();
    fixtures.forEach(fx => {
      const id = fx.league.id;
      if (!groups.has(id)) {
        const isMajor = MAJOR_LEAGUES[id] !== undefined;
        groups.set(id, {
          name: fx.league.name,
          country: fx.league.country,
          logo: fx.league.logo,
          isMajor,
          priority: isMajor ? MAJOR_LEAGUES[id] : 999,
          hasLive: false,
          fixtures: []
        });
      }
      const g = groups.get(id);
      g.fixtures.push(fx);
      if (LIVE_STATUSES.includes(fx.fixture.status.short)) g.hasLive = true;
    });

    return Array.from(groups.values()).sort((a, b) => {
      // 1) الدوريات الكبرى / كاس العالم دايمًا في الأول
      if (a.isMajor !== b.isMajor) return a.isMajor ? -1 : 1;
      // 2) بين الدوريات الكبرى نفسها: كاس العالم ثم أبطال أوروبا... حسب الأولوية المحددة
      if (a.isMajor && b.isMajor && a.priority !== b.priority) return a.priority - b.priority;
      // 3) المباريات المباشرة تظهر قبل غيرها
      if (a.hasLive !== b.hasLive) return a.hasLive ? -1 : 1;
      // 4) بعد كده الأكتر عدد مباريات
      return b.fixtures.length - a.fixtures.length;
    });
  }

  function render(fixtures) {
    if (!fixtures.length) {
      contentEl.innerHTML = `<p class="matches__empty">لا توجد مباريات في هذا اليوم.</p>`;
      return;
    }

    const leagues = groupByLeague(fixtures);
    contentEl.innerHTML = leagues.map(league => `
      <div class="league-group${league.isMajor ? ' league-group--featured' : ''}">
        <div class="league-group__head">
          <img src="${league.logo}" alt="${league.name}" class="league-group__logo" loading="lazy">
          <span class="league-group__name">${league.name}</span>
          <span class="league-group__country">${league.country || ''}</span>
        </div>
        <div class="grid ${league.isMajor ? 'grid--featured' : 'grid--3'} stagger">
          ${league.fixtures
            .sort((a, b) => new Date(a.fixture.date) - new Date(b.fixture.date))
            .map(matchCard).join('')}
        </div>
      </div>
    `).join('');

    // (re)run reveal + stagger setup from main.js if available
    document.querySelectorAll('.stagger').forEach(group => {
      Array.from(group.children).forEach((child, i) => child.style.setProperty('--i', i));
    });
    contentEl.querySelectorAll('.reveal').forEach(el => el.classList.add('is-visible'));
  }

  function renderError() {
    contentEl.innerHTML = `<p class="matches__error">تعذّر تحميل المباريات حاليًا. تأكد من الاتصال أو حاول مرة أخرى بعد قليل.</p>`;
  }

  /* ---------- local minute ticking (no extra API calls) ---------- */
  function tickMinutes() {
    contentEl.querySelectorAll('.minute[data-fetched-at]').forEach(el => {
      const fetchedAt = Number(el.dataset.fetchedAt);
      const base = Number(el.dataset.baseMinute);
      if (Number.isNaN(fetchedAt) || Number.isNaN(base)) return;
      const extra = Math.floor((Date.now() - fetchedAt) / 60000);
      el.textContent = `${base + extra}'`;
    });
  }

  /* ---------- load / switch day ---------- */
  async function loadDay(day, { silent } = {}) {
    if (!silent) contentEl.innerHTML = `<p class="matches__loading">جارِ تحميل المباريات…</p>`;
    try {
      const fixtures = cache[day] && silent ? cache[day] : await fetchFixtures(day);
      cache[day] = fixtures;
      if (currentDay === day) render(fixtures);
    } catch (err) {
      if (currentDay === day) renderError();
    }
  }

  function setActiveTab(day) {
    tabsEl.querySelectorAll('.day-tab').forEach(btn => {
      btn.classList.toggle('is-active', btn.dataset.day === day);
    });
  }

  function switchDay(day) {
    if (day === currentDay) return;
    currentDay = day;
    setActiveTab(day);
    loadDay(day);
  }

  tabsEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.day-tab');
    if (!btn) return;
    switchDay(btn.dataset.day);
  });

  /* ---------- init ---------- */
  loadDay('today');
  tickTimer = setInterval(tickMinutes, 15000);
  // refresh "today" fixtures periodically to pick up new goals/status changes
  refreshTimer = setInterval(() => {
    delete cache.today;
    if (currentDay === 'today') loadDay('today', { silent: false });
  }, 90000);
});
