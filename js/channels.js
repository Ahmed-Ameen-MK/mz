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
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="#2a1f47"/><text x="50%" y="54%" font-size="18" fill="#c084fc" text-anchor="middle" dominant-baseline="middle" font-family="sans-serif" font-weight="700">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

let chAllChannels = [];
let chActiveType = 'all';

function chEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

// يحوّل اسم القناة لصيغة رابط بسيطة (بث details.html?channel=bein-sports)
function chSlugify(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
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
      <img src="${chEsc(c.avatar_url) || chEsc(c.onerror) || chDefaultAvatar(c.channel)}" alt="${chEsc(c.channel)}" loading="lazy" onerror="chImgFallback(this, '${chEsc(c.onerror)}', '${chEsc(chDefaultAvatar(c.channel))}')">
      <span class="ch-card__name">${chEsc(c.channel)}</span>
      <span class="ch-card__type">${chEsc(c.type)}</span>
    </button>
  `).join('');

  // ⚠️ هذه القنوات بتتحقن في الـ DOM بعد ما main.js يكون خلص إعداد
  // IntersectionObserver (لأن تحميل القنوات من Supabase غير متزامن)،
  // فمعناها إنها أبدًا مش هتتراقب من الـ observer وهتفضل عالقة عند
  // opacity:0 / scale(.82) بتاعة .reveal-scale — وده سبب اختفاء
  // الأيقونات والأسماء رغم إنها موجودة فعليًا (تقدر تحددها بالماوس).
  // نظهرها يدويًا فور الحقن بدل الاعتماد على السكرول.
  requestAnimationFrame(() => {
    grid.querySelectorAll('.reveal-scale').forEach(el => el.classList.add('is-visible'));
  });

  grid.querySelectorAll('.ch-card').forEach(card => {
    card.addEventListener('click', () => chGoToChannel(card.dataset.id));
  });
}

// الضغط على أي قناة يودّي لصفحة تفاصيلها الخاصة بدل تشغيلها هنا
function chGoToChannel(id) {
  const ch = chAllChannels.find(c => String(c.id) === String(id));
  if (!ch) return;
  window.location.href = `../details.html?channel=${encodeURIComponent(chSlugify(ch.channel))}`;
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

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('channelsGrid')) chLoadChannels();
});
