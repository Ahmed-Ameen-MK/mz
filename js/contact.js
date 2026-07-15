// ===========================================================
// MZ TV — نموذج "تواصل معنا": يُدرج رسالة في جدول public.contact
// يعمل على أي صفحة فيها عنصر بمعرّف contactFormWrap
// (index.html و contact-us.html)
// ===========================================================

document.addEventListener('DOMContentLoaded', () => {
  const wrap = document.getElementById('contactFormWrap');
  if (!wrap) return;

  function renderGuard() {
    const root = typeof mzRootPath === 'function' ? mzRootPath() : '';
    wrap.innerHTML = `
      <div class="contact-guard">
        <p>سجّل الدخول أولًا لإرسال رسالة إلى فريق MZ TV.</p>
        <p style="margin-top:.8rem;">
          <a href="${root}auth/login.html">تسجيل الدخول</a> ·
          <a href="${root}auth/register.html">إنشاء حساب</a>
        </p>
      </div>`;
  }

  function renderForm(user) {
    wrap.innerHTML = `
      <form id="mzContactForm">
        <div class="form-field" style="margin-bottom:1.1rem;">
          <label>تقييمك (اختياري)</label>
          <div class="star-rating" id="mzStarRating">
            ${[1, 2, 3, 4, 5].map(n => `<button type="button" data-value="${n}" aria-label="${n} نجوم">★</button>`).join('')}
          </div>
        </div>
        <div class="form-field" style="margin-bottom:1.1rem;">
          <label for="mzContactContent">رسالتك</label>
          <textarea id="mzContactContent" rows="4" required
            style="width:100%; background:var(--bg-elevated); border:1px solid var(--border); color:var(--text); padding:.8rem .9rem; font-size:.9rem; font-family:inherit;"
            placeholder="اكتب رسالتك هنا..."></textarea>
        </div>
        <p class="form-msg" id="mzContactMsg"></p>
        <button type="submit" class="btn btn--primary" id="mzContactSubmit">إرسال الرسالة</button>
      </form>`;

    let selectedRate = 0;
    const stars = wrap.querySelectorAll('#mzStarRating button');
    stars.forEach(star => {
      star.addEventListener('click', () => {
        selectedRate = Number(star.dataset.value);
        stars.forEach(s => s.classList.toggle('is-active', Number(s.dataset.value) <= selectedRate));
      });
    });

    const form = document.getElementById('mzContactForm');
    const msgEl = document.getElementById('mzContactMsg');
    const submitBtn = document.getElementById('mzContactSubmit');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const content = document.getElementById('mzContactContent').value.trim();
      if (!content) {
        msgEl.textContent = 'الرجاء كتابة رسالتك أولًا';
        msgEl.className = 'form-msg form-msg--error';
        return;
      }
      submitBtn.disabled = true;
      msgEl.textContent = '';
      try {
        // from_id يحتاج عمود اختياري في جدول contact — راجع
        // supabase-setup.sql. من غيره، الرد المباشر من الأدمن
        // على مستخدم معيّن مش هيشتغل.
        const { error } = await supabaseClient.from('contact').insert({
          sender_name: user.name || user.email,
          rate: selectedRate || null,
          content,
          to: 'admin',
          read: 'no',
          from_id: user.id,
        });
        if (error) throw error;
        msgEl.textContent = 'تم إرسال رسالتك بنجاح، شكرًا لك!';
        msgEl.className = 'form-msg form-msg--success';
        form.reset();
        stars.forEach(s => s.classList.remove('is-active'));
        selectedRate = 0;
      } catch (err) {
        msgEl.textContent = typeof mzFriendlyDbError === 'function' ? mzFriendlyDbError(err) : 'تعذّر إرسال الرسالة، حاول مرة أخرى';
        msgEl.className = 'form-msg form-msg--error';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  const user = typeof mzGetStoredUser === 'function' ? mzGetStoredUser() : null;
  if (user) renderForm(user);
  else renderGuard();
});
