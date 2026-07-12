// ===========================================================
// MZ TV — القنوات الرياضية (صفحة العرض العامة)
// يقرأ من جدول channels في Supabase ويعرضها كأزرار أقسام + شبكة
// قنوات، وعند اختيار قناة يشغّلها داخل iframe مباشرةً.
// ===========================================================

const CH_DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%2316131b"/><text x="50%25" y="58%25" font-size="16" fill="%23a79fb3" text-anchor="middle" font-family="sans-serif">📡</text></svg>';

let chAllChannels = [];
let chActiveType = 'all';

function chEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

async function chLoadChannels() {
  const grid = document.getElementById('channelsGrid');
  try {
    const { data, error } = await supabaseClient
      .from('channels')
      .select('*')
      .order('channel', { ascending: true });
    if (error) throw error;

    chAllChannels = data || [];
    chRenderFilters();
    chRenderGrid();
  } catch (err) {
    console.error('MZ TV channels error:', err);
    if (grid) grid.innerHTML = '<p class="matches__loading">تعذّر تحميل القنوات، حاول لاحقًا</p>';
  }
}

function chRenderFilters() {
  const filters = document.getElementById('channelsFilters');
  if (!filters) return;

  const types = [...new Set(chAllChannels.map(c => c.type).filter(Boolean))];

  const buttons = [
    `<button type="button" class="ch-filter ${chActiveType === 'all' ? 'is-active' : ''}" data-type="all">كل القنوات</button>`,
    ...types.map(t => `<button type="button" class="ch-filter ${chActiveType === t ? 'is-active' : ''}" data-type="${chEsc(t)}">${chEsc(t)}</button>`),
  ];

  filters.innerHTML = `<span class="ch-filters__label">◆ الأقسام</span>` + buttons.join('');

  filters.querySelectorAll('.ch-filter').forEach(btn => {
    btn.addEventListener('click', () => {
      chActiveType = btn.dataset.type;
      chRenderFilters();
      chRenderGrid();
    });
  });
}

function chRenderGrid() {
  const grid = document.getElementById('channelsGrid');
  if (!grid) return;

  const list = chActiveType === 'all' ? chAllChannels : chAllChannels.filter(c => c.type === chActiveType);

  if (!list.length) {
    grid.innerHTML = '<p class="matches__loading">لا توجد قنوات في هذا القسم حاليًا</p>';
    return;
  }

  grid.innerHTML = list.map((c, i) => `
    <button type="button" class="ch-card reveal-scale" style="--i:${i % 8}" data-id="${c.id}">
      <img src="${chEsc(c.avatar_url) || CH_DEFAULT_AVATAR}" alt="${chEsc(c.channel)}" loading="lazy" onerror="this.src='${CH_DEFAULT_AVATAR}'">
      <span class="ch-card__name">${chEsc(c.channel)}</span>
      <span class="ch-card__type">${chEsc(c.type)}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.ch-card').forEach(card => {
    card.addEventListener('click', () => chPlayChannel(card.dataset.id));
  });

  // keep the "now playing" highlight in sync if a channel is already active
  const current = document.querySelector('.channel-player iframe');
  if (current) {
    const playingId = current.dataset.channelId;
    grid.querySelector(`.ch-card[data-id="${CSS.escape(playingId || '')}"]`)?.classList.add('is-playing');
  }
}

function chPlayChannel(id) {
  const ch = chAllChannels.find(c => String(c.id) === String(id));
  if (!ch) return;

  document.querySelectorAll('.ch-card').forEach(c => c.classList.toggle('is-playing', c.dataset.id === String(id)));

  const playerWrap = document.getElementById('channelPlayer');
  const nameEl = document.getElementById('channelPlayerName');
  const typeEl = document.getElementById('channelPlayerType');
  if (!playerWrap) return;

  playerWrap.innerHTML = `<iframe src="${chEsc(ch.stream_url)}" data-channel-id="${chEsc(ch.id)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`;
  if (nameEl) nameEl.textContent = ch.channel;
  if (typeEl) typeEl.textContent = ch.type;

  document.getElementById('channelPlayerSection')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('channelsGrid')) chLoadChannels();
});
