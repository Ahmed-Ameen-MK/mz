// ===========================================================
// MZ TV — details.html: يقرأ ?match= من الرابط، ويولّد محتوى
// المباراة (نبذة، لاعبين، تحليل) عبر Groq API مباشرة.
// ===========================================================
//
// ⚠️ تنبيه أمني: مفتاح Groq موضوع هنا مباشرة بدون حماية بناءً
// على طلب صريح للتجربة فقط. يجب حذف/تدوير هذا المفتاح (reset)
// قبل النشر الفعلي للموقع، ثم تمريره لاحقًا عبر باك-إند/edge
// function بدل تركه ظاهرًا في كود الواجهة الأمامية — أي زائر
// للموقع يقدر يفتح DevTools ويشوف المفتاح ويستخدمه بنفسه.
// ===========================================================

const GROQ_API_KEY = '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';
const GROQ_API_URL  = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL    = 'openai/gpt-oss-120b';

const SYSTEM_PROMPT =
  'أنت بوت داخل برنامج، مهمتك الوحيدة هي الإجابة المباشرة على السؤال المُرسل إليك. ' +
  'لا تبدأ بأي تحية، ولا ترحيب، ولا تعليق تمهيدي، ولا تطرح أي سؤال على المستخدم، ' +
  'ولا تطلب توضيحًا. أجب بإجابة واضحة ومباشرة ومختصرة بالعربية الفصحى، ' +
  'في شكل فقرات أو نقاط قصيرة بدون مقدمات.';

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const channelParam = params.get('channel');
  const matchParam = params.get('match');

  const matchSectionsEl = document.getElementById('matchDetailSections');
  const channelSectionsEl = document.getElementById('channelDetailSections');

  if (channelParam) {
    if (matchSectionsEl) matchSectionsEl.style.display = 'none';
    if (channelSectionsEl) channelSectionsEl.style.display = '';
    initChannelDetails(channelParam);
  } else {
    if (channelSectionsEl) channelSectionsEl.style.display = 'none';
    initMatchDetails(matchParam);
  }
});

function initMatchDetails(raw) {
  const titleEl = document.getElementById('matchTitle');
  const overviewEl = document.getElementById('sectionOverview');
  const homeSquadEl = document.getElementById('sectionHomeSquad');
  const awaySquadEl = document.getElementById('sectionAwaySquad');
  const predictionEl = document.getElementById('sectionPrediction');
  const homeSquadTitleEl = document.getElementById('homeSquadTitle');
  const awaySquadTitleEl = document.getElementById('awaySquadTitle');

  if (!raw) {
    titleEl.textContent = 'لم يتم تحديد مباراة';
    [overviewEl, homeSquadEl, awaySquadEl, predictionEl].forEach(el => {
      el.innerHTML = '<p class="ai-error">الرابط لا يحتوي على مباراة صالحة. ارجع لصفحة مواعيد المباريات واختر مباراة.</p>';
    });
    return;
  }

  // "?match=فرنسا-اسبانيا" -> يفصل عند أول "-" فقط، عشان أسماء الفرق
  // اللي فيها أكتر من كلمة (متفصولة بمسافة %20 مش شرطة) تفضل سليمة
  const sepIndex = raw.indexOf('-');
  const homeRaw = sepIndex === -1 ? raw : raw.slice(0, sepIndex);
  const awayRaw = sepIndex === -1 ? '' : raw.slice(sepIndex + 1);

  const home = decodeURIComponent(homeRaw).trim();
  const away = decodeURIComponent(awayRaw).trim();

  const matchLabel = away ? `${home} ضد ${away}` : home;
  titleEl.textContent = matchLabel;
  document.title = `${matchLabel} — MZ TV`;
  homeSquadTitleEl.textContent = `أبرز لاعبي ${home || 'الفريق الأول'}`;
  awaySquadTitleEl.textContent = `أبرز لاعبي ${away || 'الفريق الثاني'}`;

  /* ---------- init ---------- */
  loadSection(
    overviewEl,
    `اكتب نبذة سريعة عن مباراة كرة قدم بين ${home} و${away}: أهمية المباراة، والسياق الحالي لكل فريق.`
  );

  loadSection(
    homeSquadEl,
    `اذكر أبرز لاعبي ${home} حاليًا في كرة القدم، كل لاعب في سطر مع مركزه.`
  );

  loadSection(
    awaySquadEl,
    `اذكر أبرز لاعبي ${away} حاليًا في كرة القدم، كل لاعب في سطر مع مركزه.`
  );

  loadSection(
    predictionEl,
    `حلل مباراة كرة القدم بين ${home} و${away} وأعطِ توقعًا مختصرًا للنتيجة المحتملة مع سبب واحد أو اثنين.`
  );
}

/* ---------- Groq call (shared by match-mode and channel-mode) ---------- */
async function askGroq(userPrompt) {
  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      temperature: 0.5,
      max_tokens: 600,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content
    : '';
  if (!text) throw new Error('empty response');
  return text.trim();
}

/* ---------- helpers ---------- */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function textToHtml(text) {
  // نحول الأسطر لفقرات، ونحافظ على القوائم النقطية البسيطة (- أو •)
  return text
    .split(/\n{1,}/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

async function loadSection(el, prompt) {
  try {
    const answer = await askGroq(prompt);
    el.innerHTML = `<div class="ai-answer">${textToHtml(answer)}</div>`;
  } catch (err) {
    el.innerHTML = '<p class="ai-error">تعذّر توليد هذا القسم حاليًا. حاول تحديث الصفحة بعد قليل.</p>';
  }
}

// ===========================================================
// وضع تفاصيل القناة (details.html?channel=bein-sports)
// يقرأ صف القناة من Supabase (مطابقة الاسم بعد تحويله لصيغة رابط)،
// ثم يولّد نبذة + ترددات عبر Groq، ويجهّز زر "مشاهدة" الذي يعرض
// بث 1 (stream1) وبث 2 (iframe) حسب المتاح، بالإضافة لزر "الانتقال"
// المباشر لرابط الموقع (url) — أي عمود قيمته NULL لا يظهر زره.
// ===========================================================

function dtSlugify(name) {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function initChannelDetails(channelSlug) {
  const titleEl = document.getElementById('matchTitle');
  const overviewEl = document.getElementById('sectionChannelOverview');
  const freqEl = document.getElementById('sectionChannelFrequencies');
  const watchBtn = document.getElementById('channelWatchBtn');
  const gotoBtn = document.getElementById('channelGotoBtn');
  const switchWrap = document.getElementById('channelStreamSwitch');
  const playerWrap = document.getElementById('channelDetailPlayer');

  titleEl.textContent = 'جارِ تحميل بيانات القناة…';

  let channel = null;
  try {
    const { data, error } = await supabaseClient.from('channels').select('*');
    if (error) throw error;
    channel = (data || []).find(c => dtSlugify(c.channel) === channelSlug) || null;
  } catch (err) {
    console.error('Channel details load error:', err);
  }

  if (!channel) {
    titleEl.textContent = 'لم يتم العثور على القناة';
    document.title = 'القناة غير موجودة — MZ TV';
    [overviewEl, freqEl].forEach(el => {
      el.innerHTML = '<p class="ai-error">تعذّر العثور على هذه القناة. ارجع لصفحة القنوات الرياضية واختر قناة.</p>';
    });
    if (watchBtn) watchBtn.style.display = 'none';
    return;
  }

  titleEl.textContent = channel.channel;
  document.title = `${channel.channel} — MZ TV`;

  loadSection(
    overviewEl,
    `اكتب نبذة موجزة عن قناة رياضية اسمها "${channel.channel}" من قسم "${channel.type || ''}": نوع المحتوى الذي تقدمه عادة وأبرز البطولات التي تبثها.`
  );

  loadSection(
    freqEl,
    `اذكر ترددات قناة "${channel.channel}" الرياضية على أشهر الأقمار الصناعية (مثل نايل سات وعرب سات وهوت بيرد إن وُجد)، كل تردد في سطر منفصل بصيغة: اسم القمر — التردد — الاستقطاب — معدل الترميز إن أمكن.`
  );

  /* ---------- زر المشاهدة: بث 1 = stream1 / بث 2 = iframe ---------- */
  const sources = [];
  if (channel.stream1) sources.push({ label: 'بث 1', type: 'url', value: channel.stream1 });
  if (channel.iframe) sources.push({ label: 'بث 2', type: 'iframe', value: channel.iframe });

  if (channel.url) {
    gotoBtn.href = channel.url;
    gotoBtn.style.display = '';
  } else {
    gotoBtn.style.display = 'none';
  }

  if (!sources.length) {
    watchBtn.disabled = true;
    watchBtn.textContent = 'لا يوجد بث متاح حاليًا';
    return;
  }

  function playSource(s) {
    playerWrap.style.display = 'block';
    if (s.type === 'url') {
      playerWrap.innerHTML = `<iframe src="${escapeHtml(s.value)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    } else {
      // "iframe" هنا كود تضمين كامل تم لصقه من صفحة الأدمن مباشرة
      playerWrap.innerHTML = s.value;
    }
  }

  watchBtn.addEventListener('click', () => {
    playSource(sources[0]);
    watchBtn.style.display = 'none';

    if (sources.length > 1) {
      switchWrap.style.display = 'flex';
      switchWrap.innerHTML = sources.map((s, i) =>
        `<button type="button" class="stream-switch__btn ${i === 0 ? 'is-active' : ''}" data-i="${i}">${escapeHtml(s.label)}</button>`
      ).join('');

      switchWrap.querySelectorAll('.stream-switch__btn').forEach(btn => {
        btn.addEventListener('click', () => {
          switchWrap.querySelectorAll('.stream-switch__btn').forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          playSource(sources[Number(btn.dataset.i)]);
        });
      });
    }
  }, { once: true });
}
