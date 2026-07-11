// ===========================================================
// MZ TV — Live sports data
// - شريط الأخبار العلوي: TheSportsDB (زي ما كان)
// - قسم "مباريات اليوم": football-data.org
// كل الاتنين بيتناديين مباشرة من المتصفح، مفيش سيرفر وسيط.
// ===========================================================

const DEFAULT_BADGE = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%2316131b"/><text x="50%25" y="58%25" font-size="18" fill="%23a79fb3" text-anchor="middle" font-family="sans-serif">⚽</text></svg>';

/* ============ Helpers مشتركة ============ */
function mzCleanField(v) {
  return (v && v !== 'null') ? v : null;
}

/* ============ شريط الأخبار — TheSportsDB ============ */
const SDB_STATUS_LIVE_HINTS = ['1H', '2H', 'HT', 'LIVE', 'ET'];
const SDB_STATUS_LABELS = {
  NS: 'لم تبدأ', '1H': 'الشوط الأول', HT: 'الاستراحة', '2H': 'الشوط الثاني',
  FT: 'انتهت', 'MATCH FINISHED': 'انتهت', 'NOT STARTED': 'لم تبدأ',
};

function mzSdbStatusLabel(rawStatus) {
  if (!rawStatus) return '';
  const key = rawStatus.trim().toUpperCase();
  return SDB_STATUS_LABELS[key] || rawStatus;
}

function mzSdbIsLive(rawStatus) {
  if (!rawStatus) return false;
  const key = rawStatus.trim().toUpperCase();
  return SDB_STATUS_LIVE_HINTS.includes(key) || key.includes('LIVE');
}

function mzFormatKickoffFromParts(dateStr, timeStr) {
  if (!timeStr) return '';
  const d = new Date(`${dateStr}T${timeStr}`);
  if (isNaN(d.getTime())) return timeStr.slice(0, 5);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

async function mzFetchTickerEvents() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${SPORTSDB_BASE}/eventsday.php?d=${today}&s=Soccer`);
  if (!res.ok) throw new Error(`TheSportsDB ${res.status}`);
  const data = await res.json();
  const events = data.events || [];

  return events.slice(0, 15).map(e => ({
    dateEvent: e.dateEvent,
    time: mzCleanField(e.strTime),
    status: mzCleanField(e.strStatus),
    homeTeam: e.strHomeTeam,
    awayTeam: e.strAwayTeam,
    homeGoals: e.intHomeScore !== null && e.intHomeScore !== undefined ? Number(e.intHomeScore) : null,
    awayGoals: e.intAwayScore !== null && e.intAwayScore !== undefined ? Number(e.intAwayScore) : null,
  }));
}

function mzRenderTicker(events) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  if (!events.length) {
    track.innerHTML = '<span class="ticker__item">لا توجد مباريات مسجّلة اليوم حاليًا</span>';
    return;
  }

  const items = events.map(f => {
    const isLive = mzSdbIsLive(f.status);
    const scoreOrTime = (f.homeGoals !== null && f.awayGoals !== null)
      ? `${f.homeGoals} - ${f.awayGoals}`
      : mzFormatKickoffFromParts(f.dateEvent, f.time);
    const label = isLive ? `مباشر الآن — ${mzSdbStatusLabel(f.status)}` : mzSdbStatusLabel(f.status);
    return `<span class="ticker__item"><span class="ticker__dot"></span> ${f.homeTeam} ${scoreOrTime} ${f.awayTeam} — ${label}</span>`;
  });

  // duplicate the list so the CSS marquee loop (-50%) stays seamless
  track.innerHTML = items.join('') + items.join('');
}

/* ============ مباريات اليوم — football-data.org ============ */
const FD_STATUS_LIVE = ['LIVE', 'IN_PLAY', 'PAUSED'];
const FD_STATUS_LABELS = {
  SCHEDULED: 'لم تبدأ', TIMED: 'لم تبدأ', IN_PLAY: 'مباشر الآن', PAUSED: 'استراحة',
  FINISHED: 'انتهت', POSTPONED: 'مؤجلة', SUSPENDED: 'مؤجلة', CANCELLED: 'ملغاة', AWARDED: 'انتهت',
};

function mzFdStatusLabel(status) {
  return FD_STATUS_LABELS[status] || status || '';
}

function mzFdIsLive(status) {
  return FD_STATUS_LIVE.includes(status);
}

function mzFormatKickoffISO(utcDate) {
  const d = new Date(utcDate);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

async function mzFetchTodayMatches() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${FOOTBALL_DATA_BASE}/matches?dateFrom=${today}&dateTo=${today}`, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY },
  });
  if (!res.ok) {
    let apiMessage = '';
    try {
      const errBody = await res.json();
      apiMessage = errBody.message || errBody.error || '';
    } catch { /* body wasn't JSON, ignore */ }
    throw new Error(`HTTP ${res.status}${apiMessage ? ' — ' + apiMessage : ''}`);
  }
  const data = await res.json();
  const matches = data.matches || [];

  return matches.slice(0, 15).map(m => ({
    id: m.id,
    utcDate: m.utcDate,
    status: m.status,
    league: m.competition ? m.competition.name : '',
    homeTeam: m.homeTeam ? m.homeTeam.name : '',
    homeLogo: m.homeTeam ? m.homeTeam.crest : null,
    awayTeam: m.awayTeam ? m.awayTeam.name : '',
    awayLogo: m.awayTeam ? m.awayTeam.crest : null,
    homeGoals: m.score && m.score.fullTime ? m.score.fullTime.home : null,
    awayGoals: m.score && m.score.fullTime ? m.score.fullTime.away : null,
  }));
}

function mzRenderMatches(matches) {
  const grid = document.getElementById('matchesGrid');
  if (!grid) return;

  if (!matches.length) {
    grid.innerHTML = '<p class="matches__loading">لا توجد مباريات مسجّلة اليوم حاليًا</p>';
    return;
  }

  const top = matches.slice(0, 6);
  grid.innerHTML = top.map((f, i) => {
    const isLive = mzFdIsLive(f.status);
    const scoreLine = (f.homeGoals !== null && f.awayGoals !== null)
      ? `<span class="match-card__score">${f.homeGoals} - ${f.awayGoals}</span>`
      : `<span class="match-card__score">${mzFormatKickoffISO(f.utcDate)}</span>`;

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
        <p class="match-card__meta">${f.league} — ${mzFdStatusLabel(f.status)}</p>
      </article>`;
  }).join('');
}

/* ============ تحميل الاتنين مع بعض ============ */
async function mzLoadTicker() {
  try {
    const events = await mzFetchTickerEvents();
    mzRenderTicker(events);
  } catch (err) {
    console.error('MZ TV ticker error:', err);
    const track = document.getElementById('tickerTrack');
    if (track) track.innerHTML = '<span class="ticker__item">تعذّر تحميل الشريط الإخباري حاليًا</span>';
  }
}

async function mzLoadMatches() {
  try {
    const matches = await mzFetchTodayMatches();
    mzRenderMatches(matches);
  } catch (err) {
    console.error('MZ TV matches error:', err);
    const grid = document.getElementById('matchesGrid');
    if (grid) {
      const isNetworkError = err instanceof TypeError; // fetch throws TypeError on CORS/network block
      const detail = isNetworkError
        ? 'الطلب اتمنع قبل ما يوصل (على الأغلب CORS أو مفيش إنترنت)'
        : `تفاصيل الخطأ: ${err.message}`;
      grid.innerHTML = `<p class="matches__loading">تعذّر تحميل مباريات اليوم<br><span style="font-size:.75rem; color:var(--text-faint);">${detail}</span></p>`;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('tickerTrack')) {
    mzLoadTicker();
    setInterval(mzLoadTicker, 90000);
  }
  if (document.getElementById('matchesGrid')) {
    mzLoadMatches();
    setInterval(mzLoadMatches, 90000);
  }
});
