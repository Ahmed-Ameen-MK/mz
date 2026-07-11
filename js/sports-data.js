// ===========================================================
// MZ TV — Live sports data
// Pulled from a Supabase Edge Function that proxies API-Football
// (RapidAPI key lives server-side in the function, never here).
// ===========================================================

const STATUS_LIVE = new Set(['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE']);
const STATUS_LABELS = {
  NS: 'لم تبدأ', '1H': 'الشوط الأول', HT: 'الاستراحة', '2H': 'الشوط الثاني',
  FT: 'انتهت', AET: 'انتهت (تمديد)', PEN: 'انتهت (ترجيح)', PST: 'مؤجلة', CANC: 'ملغاة',
};

function mzFormatKickoff(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
}

async function mzFetchFixtures() {
  const today = new Date().toISOString().slice(0, 10);
  const res = await fetch(`${SPORTS_API_FUNCTION_URL}?date=${today}`, {
    headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
  });
  if (!res.ok) throw new Error(`sports-api ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.fixtures || [];
}

function mzRenderTicker(fixtures) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  if (!fixtures.length) {
    track.innerHTML = '<span class="ticker__item">لا توجد مباريات مسجّلة اليوم حاليًا</span>';
    return;
  }

  const items = fixtures.map(f => {
    const isLive = STATUS_LIVE.has(f.status);
    const scoreOrTime = (f.homeGoals !== null && f.awayGoals !== null)
      ? `${f.homeGoals} - ${f.awayGoals}`
      : mzFormatKickoff(f.date);
    const label = isLive ? `مباشر الآن — ${STATUS_LABELS[f.status] || ''}` : (STATUS_LABELS[f.status] || '');
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
    const isLive = STATUS_LIVE.has(f.status);
    const scoreLine = (f.homeGoals !== null && f.awayGoals !== null)
      ? `<span class="match-card__score">${f.homeGoals} - ${f.awayGoals}</span>`
      : `<span class="match-card__score">${mzFormatKickoff(f.date)}</span>`;

    return `
      <article class="card reveal-scale" style="--i:${i}">
        ${isLive ? '<span class="live-badge"><span class="dot"></span> مباشر</span>' : ''}
        <div class="match-card__teams">
          <div class="match-card__team">
            <img src="${f.homeLogo}" alt="${f.homeTeam}" loading="lazy">
            <span>${f.homeTeam}</span>
          </div>
          ${scoreLine}
          <div class="match-card__team">
            <img src="${f.awayLogo}" alt="${f.awayTeam}" loading="lazy">
            <span>${f.awayTeam}</span>
          </div>
        </div>
        <p class="match-card__meta">${f.league} — ${isLive ? (STATUS_LABELS[f.status] || 'مباشر') : STATUS_LABELS[f.status] || ''}</p>
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
    // refresh live scores every 90s
    setInterval(mzLoadSportsData, 90000);
  }
});
