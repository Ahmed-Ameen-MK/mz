// ===========================================================
// MZ TV — Live sports data
// من TheSportsDB مباشرة — API مجاني حقيقي بيدعم النداء من
// المتصفح مباشرة (CORS متاح)، مفيش سيرفر وسيط ولا مفتاح مدفوع.
// ===========================================================

const STATUS_LIVE_HINTS = ['1H', '2H', 'HT', 'LIVE', 'ET'];
const STATUS_LABELS = {
  NS: 'لم تبدأ', '1H': 'الشوط الأول', HT: 'الاستراحة', '2H': 'الشوط الثاني',
  FT: 'انتهت', 'MATCH FINISHED': 'انتهت', 'NOT STARTED': 'لم تبدأ',
};

function mzStatusLabel(rawStatus) {
  if (!rawStatus) return '';
  const key = rawStatus.trim().toUpperCase();
  return STATUS_LABELS[key] || rawStatus;
}

function mzIsLive(rawStatus) {
  if (!rawStatus) return false;
  const key = rawStatus.trim().toUpperCase();
  return STATUS_LIVE_HINTS.includes(key) || key.includes('LIVE');
}

function mzFormatKickoff(dateStr, timeStr) {
  if (!timeStr) return '';
  const iso = `${dateStr}T${timeStr}`;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return timeStr.slice(0, 5);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

function mzCleanField(v) {
  return (v && v !== 'null') ? v : null;
}

async function mzFetchFixtures() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${SPORTSDB_BASE}/eventsday.php?d=${today}&s=Soccer`);
  if (!res.ok) throw new Error(`TheSportsDB ${res.status}`);
  const data = await res.json();
  const events = data.events || [];

  return events.slice(0, 15).map(e => ({
    id: e.idEvent,
    dateEvent: e.dateEvent,
    time: mzCleanField(e.strTime),
    status: mzCleanField(e.strStatus),
    league: e.strLeague,
    homeTeam: e.strHomeTeam,
    homeLogo: mzCleanField(e.strHomeTeamBadge),
    awayTeam: e.strAwayTeam,
    awayLogo: mzCleanField(e.strAwayTeamBadge),
    homeGoals: e.intHomeScore !== null && e.intHomeScore !== undefined ? Number(e.intHomeScore) : null,
    awayGoals: e.intAwayScore !== null && e.intAwayScore !== undefined ? Number(e.intAwayScore) : null,
  }));
}

const DEFAULT_BADGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%2316131b"/><text x="50%25" y="58%25" font-size="18" fill="%23a79fb3" text-anchor="middle" font-family="sans-serif">⚽</text></svg>';

function mzRenderTicker(fixtures) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  if (!fixtures.length) {
    track.innerHTML = '<span class="ticker__item">لا توجد مباريات مسجّلة اليوم حاليًا</span>';
    return;
  }

  const items = fixtures.map(f => {
    const isLive = mzIsLive(f.status);
    const scoreOrTime = (f.homeGoals !== null && f.awayGoals !== null)
      ? `${f.homeGoals} - ${f.awayGoals}`
      : mzFormatKickoff(f.dateEvent, f.time);
    const label = isLive ? `مباشر الآن — ${mzStatusLabel(f.status)}` : mzStatusLabel(f.status);
    return `<span class="ticker__item"><span class="ticker__dot"></span> ${f.homeTeam} ${scoreOrTime} ${f.awayTeam} — ${label}</span>`;
  });

  // duplicate the list so the CSS marquee loop (-50%) stays seamless
  track.innerHTML = items.join('') + items.join('');
}

function mzRenderMatches(fixtures) {
  const grid = document.getElementById('matchesGrid');
  if (!grid) return;

  if (!fixtures.length) {
    grid.innerHTML = '<p class="matches__loading">لا توجد مباريات مسجّلة اليوم حاليًا</p>';
    return;
  }

  const top = fixtures.slice(0, 6);
  grid.innerHTML = top.map((f, i) => {
    const isLive = mzIsLive(f.status);
    const scoreLine = (f.homeGoals !== null && f.awayGoals !== null)
      ? `<span class="match-card__score">${f.homeGoals} - ${f.awayGoals}</span>`
      : `<span class="match-card__score">${mzFormatKickoff(f.dateEvent, f.time)}</span>`;

    return `
      <article class="card reveal-scale" style="--i:${i}">
        ${isLive ? '<span class="live-badge"><span class="dot"></span> مباشر</span>' : ''}
        <div class="match-card__teams">
          <div class="match-card__team">
            <img src="${f.homeLogo || DEFAULT_BADGE}" alt="${f.homeTeam}" loading="lazy" onerror="this.src='${DEFAULT_BADGE}'">
            <span>${f.homeTeam}</span>
          </div>
          ${scoreLine}
          <div class="match-card__team">
            <img src="${f.awayLogo || DEFAULT_BADGE}" alt="${f.awayTeam}" loading="lazy" onerror="this.src='${DEFAULT_BADGE}'">
            <span>${f.awayTeam}</span>
          </div>
        </div>
        <p class="match-card__meta">${f.league} — ${isLive ? (mzStatusLabel(f.status) || 'مباشر') : mzStatusLabel(f.status)}</p>
      </article>`;
  }).join('');
}

async function mzLoadSportsData() {
  try {
    const fixtures = await mzFetchFixtures();
    mzRenderTicker(fixtures);
    mzRenderMatches(fixtures);
  } catch (err) {
    console.error('MZ TV sports data error:', err);
    const track = document.getElementById('tickerTrack');
    if (track) track.innerHTML = '<span class="ticker__item">تعذّر تحميل البيانات الحية حاليًا</span>';
    const grid = document.getElementById('matchesGrid');
    if (grid) grid.innerHTML = '<p class="matches__loading">تعذّر تحميل مباريات اليوم، حاول لاحقًا</p>';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tickerTrack') || document.getElementById('matchesGrid')) {
    mzLoadSportsData();
    // refresh every 90s
    setInterval(mzLoadSportsData, 90000);
  }
});
