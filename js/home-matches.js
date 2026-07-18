// ===========================================================
// MZ TV — index.html: "مباريات اليوم" — أهم 1-3 مباريات
// نفس فكرة matches-api.js (API-Football v3) لكن بعدد محدود
// من المباريات مُرتّبة بالأهمية بدل عرضها كلها.
// ===========================================================
//
// ⚠️ تنبيه أمني: نفس مفتاح API-Football المستخدم في matches.html،
// موضوع هنا مباشرة بدون حماية بناءً على طلب صريح للتجربة فقط.
// يجب تدوير هذا المفتاح ونقله خلف باك-إند/edge function قبل
// النشر الفعلي للموقع.
// ===========================================================

const MZ_HOME_API_KEY  = 'a9c4073aba9f76918ebd6bd6b801ea6c';
const MZ_HOME_API_BASE = 'https://v3.football.api-sports.io';
const MZ_HOME_TIMEZONE = 'Africa/Cairo';

const HOME_LIVE_STATUSES      = ['1H', '2H', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
const HOME_HALFTIME_STATUSES  = ['HT'];
const HOME_FINISHED_STATUSES  = ['FT', 'AET', 'PEN', 'AWD', 'WO'];
const HOME_POSTPONED_STATUSES = ['PST', 'CANC', 'ABD'];

// نفس أولويات الدوريات الكبرى المستخدمة في matches.html —
// رقم أقل = أهم
const HOME_MAJOR_LEAGUES = {
  1: 0, 2: 1, 4: 2, 9: 3, 39: 4, 140: 5, 135: 6, 78: 7, 61: 8, 307: 9, 233: 10,
};

document.addEventListener('DOMContentLoaded', () => {
  const gridEl = document.getElementById('matchesGrid');
  if (!gridEl) return;

  /* ---------- date + fetch ---------- */
  function todayStr() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  async function fetchTodayFixtures() {
    const url = `${MZ_HOME_API_BASE}/fixtures?date=${todayStr()}&timezone=${encodeURIComponent(MZ_HOME_TIMEZONE)}`;
    const res = await fetch(url, { headers: { 'x-apisports-key': MZ_HOME_API_KEY } });
    if (!res.ok) throw new Error('network');
    const data = await res.json();
    if (data.errors && Object.keys(data.errors).length) {
      throw new Error(Object.values(data.errors).join(' | '));
    }
    return data.response || [];
  }

  /* ---------- helpers (نفس منطق matches-api.js) ---------- */
  function statusInfo(fixture) {
    const short = fixture.fixture.status.short;
    const elapsed = fixture.fixture.status.elapsed;
    if (HOME_LIVE_STATUSES.includes(short)) return { kind: 'live', minute: elapsed };
    if (HOME_HALFTIME_STATUSES.includes(short)) return { kind: 'halftime' };
    if (HOME_FINISHED_STATUSES.includes(short)) return { kind: 'finished' };
    if (HOME_POSTPONED_STATUSES.includes(short)) {
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
    if (info.kind === 'halftime') return `<span class="status-badge">استراحة</span>`;
    if (info.kind === 'finished') return `<span class="status-badge status-badge--finished">انتهت المباراة</span>`;
    if (info.kind === 'postponed') return `<span class="status-badge status-badge--postponed">${info.label}</span>`;
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
    // details.html?match=فرنسا-اسبانيا (نفس فكرة matches-api.js)
    const home = fixture.teams.home.name;
    const away = fixture.teams.away.name;
    return `details.html?match=${encodeURIComponent(home)}-${encodeURIComponent(away)}`;
  }

  function matchCard(fixture) {
    const home = fixture.teams.home;
    const away = fixture.teams.away;
    const round = fixture.league.round || '';
    return `
      <a class="card match-card reveal is-visible" href="${matchHref(fixture)}">
        <div class="match-card__status">${renderStatusBlock(fixture)}</div>
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

  /* ---------- اختيار أهم 1-3 مباريات ----------
     الأقل رقمًا = أهم: المباريات المباشرة أولًا، ثم الدوريات
     الكبرى حسب أولويتها، ثم الباقي — وبين المتساويين، الأقرب
     ميعادًا يظهر أولًا. */
  function importanceScore(fixture) {
    const info = statusInfo(fixture);
    const isMajor = HOME_MAJOR_LEAGUES[fixture.league.id] !== undefined;
    const majorRank = isMajor ? HOME_MAJOR_LEAGUES[fixture.league.id] : 50;
    let statusRank;
    if (info.kind === 'live' || info.kind === 'halftime') statusRank = 0;
    else if (info.kind === 'scheduled') statusRank = 1;
    else if (info.kind === 'finished') statusRank = 2;
    else statusRank = 3; // postponed
    return statusRank * 1000 + majorRank;
  }

  function pickTopMatches(fixtures, max = 3) {
    return fixtures
      .slice()
      .sort((a, b) => {
        const diff = importanceScore(a) - importanceScore(b);
        if (diff !== 0) return diff;
        return new Date(a.fixture.date) - new Date(b.fixture.date);
      })
      .slice(0, max);
  }

  /* ---------- rendering ---------- */
  function render(fixtures) {
    if (!fixtures.length) {
      gridEl.innerHTML = `<p class="matches__empty">لا توجد مباريات اليوم.</p>`;
      return;
    }
    const top = pickTopMatches(fixtures, 3);
    gridEl.innerHTML = top.map(matchCard).join('');
    Array.from(gridEl.children).forEach((child, i) => child.style.setProperty('--i', i));
  }

  function renderError() {
    gridEl.innerHTML = `<p class="matches__error">تعذّر تحميل مباريات اليوم حاليًا.</p>`;
  }

  function tickMinutes() {
    gridEl.querySelectorAll('.minute[data-fetched-at]').forEach(el => {
      const fetchedAt = Number(el.dataset.fetchedAt);
      const base = Number(el.dataset.baseMinute);
      if (Number.isNaN(fetchedAt) || Number.isNaN(base)) return;
      const extra = Math.floor((Date.now() - fetchedAt) / 60000);
      el.textContent = `${base + extra}'`;
    });
  }

  /* ---------- init ---------- */
  fetchTodayFixtures().then(render).catch(renderError);
  setInterval(tickMinutes, 15000);
});
