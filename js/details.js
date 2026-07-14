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
  const raw = params.get('match');

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

  /* ---------- Groq call ---------- */
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
});
