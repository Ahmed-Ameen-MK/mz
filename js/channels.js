// ===========================================================
// MZ TV — القنوات الرياضية (صفحة العرض العامة)
// يقرأ من جدول channels في Supabase ويعرضها كأزرار أقسام + شبكة
// قنوات. شاشة البث تظهر فقط بعد اختيار قناة، وتعرض أزرار تبديل
// بين المصادر المتاحة (بث 1 / بث 2 / بث 3 / بث يوتيوب).
// ===========================================================

// أيقونة افتراضية بأول حرف من اسم القناة، بخلفية بنفسجية واضحة
// (encodeURIComponent يضمن التوافق مع الأحرف العربية في كل المتصفحات)
function chDefaultAvatar(name) {
  const letter = (name || '?').trim().charAt(0).toUpperCase() || '?';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><text x="50%" y="54%" font-size="20" fill="#7c3aed" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="700">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

let chAllChannels = [];
let chActiveType = 'all';
let chActivePlayingId = null;

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
    <button type="button" class="ch-card reveal-scale ${chActivePlayingId === String(c.id) ? 'is-playing' : ''}" style="--i:${i % 8}" data-id="${c.id}">
      <img src="${chEsc(c.avatar_url) || chEsc(c.onerror) || chDefaultAvatar(c.channel)}" alt="${chEsc(c.channel)}" loading="lazy" referrerpolicy="no-referrer" onerror="chImgFallback(this, '${chEsc(c.onerror)}', '${chEsc(chDefaultAvatar(c.channel))}')">
      <span class="ch-card__name">${chEsc(c.channel)}</span>
      <span class="ch-card__type">${chEsc(c.type)}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.ch-card').forEach(card => {
    card.addEventListener('click', () => chPlayChannel(card.dataset.id));
  });
}

// يبني قائمة مصادر البث المتاحة للقناة بالترتيب: بث1، بث2، بث3، ثم يوتيوب
// youtube_code هنا رابط embed كامل جاهز (اتحفظ كده من صفحة الأدمن)
function chBuildSources(ch) {
  const sources = [];
  if (ch.stream1) sources.push({ label: 'بث 1', url: ch.stream1 });
  if (ch.stream2) sources.push({ label: 'بث 2', url: ch.stream2 });
  if (ch.stream3) sources.push({ label: 'بث 3', url: ch.stream3 });
  if (ch.youtube_code) sources.push({ label: 'بث', url: ch.youtube_code });
  return sources;
}

// أيقونة القناة الأساسية → عمود onerror الاحتياطي → أيقونة الحرف الافتراضية
function chImgFallback(imgEl, fallbackUrl, defaultUrl) {
  if (fallbackUrl && imgEl.src !== fallbackUrl) {
    imgEl.onerror = () => { imgEl.onerror = null; imgEl.src = defaultUrl; };
    imgEl.src = fallbackUrl;
  } else {
    imgEl.onerror = null;
    imgEl.src = defaultUrl;
  }
}

function chSetPlayerSource(url) {
  const playerWrap = document.getElementById('channelPlayer');
  if (!playerWrap) return;
  playerWrap.innerHTML = `<iframe src="${chEsc(url)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
}

function chPlayChannel(id) {
  const ch = chAllChannels.find(c => String(c.id) === String(id));
  if (!ch) return;

  chActivePlayingId = String(id);
  document.querySelectorAll('.ch-card').forEach(c => c.classList.toggle('is-playing', c.dataset.id === chActivePlayingId));

  const section = document.getElementById('channelPlayerSection');
  const nameEl = document.getElementById('channelPlayerName');
  const typeEl = document.getElementById('channelPlayerType');
  const switchWrap = document.getElementById('streamSwitch');
  const playerWrap = document.getElementById('channelPlayer');

  const sources = chBuildSources(ch);

  if (!sources.length) {
    if (playerWrap) playerWrap.innerHTML = '<div class="channel-player__placeholder"><p>لا يوجد رابط بث متاح لهذه القناة حاليًا</p></div>';
    if (switchWrap) switchWrap.innerHTML = '';
  } else {
    chSetPlayerSource(sources[0].url);
    if (switchWrap) {
      switchWrap.innerHTML = sources.map((s, i) =>
        `<button type="button" class="stream-switch__btn ${i === 0 ? 'is-active' : ''}" data-url="${chEsc(s.url)}">${chEsc(s.label)}</button>`
      ).join('');

      switchWrap.querySelectorAll('.stream-switch__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switchWrap.querySelectorAll('.stream-switch__btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          chSetPlayerSource(btn.dataset.url);
        });
      });
    }
  }

  if (nameEl) nameEl.textContent = ch.channel;
  if (typeEl) typeEl.textContent = ch.type;

  section?.classList.add('is-active');
  section?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('channelsGrid')) chLoadChannels();
});
