// ===========================================================
// MZ TV — messages.html: صندوق رسائل المستخدم
// يعرض الرسائل الموجهة له (contact.to = uid المستخدم الحالي)
// ===========================================================

document.addEventListener('DOMContentLoaded', () => {
  const listEl = document.getElementById('msgList');
  if (!listEl) return;

  const user = mzGetStoredUser();
  if (!user) return; // auth.js (data-require-auth) هيحوّل الزائر لصفحة الدخول أصلًا

  function formatDate(iso) {
    return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  }

  function starsText(rate) {
    if (!rate) return '';
    return '★'.repeat(rate) + '☆'.repeat(5 - rate);
  }

  function render(messages) {
    if (!messages.length) {
      listEl.innerHTML = `<p class="msg-empty">لا توجد رسائل بعد.</p>`;
      return;
    }
    listEl.innerHTML = messages.map(m => `
      <div class="msg-item ${m.read === 'no' ? 'is-unread' : ''}" data-id="${m.id}">
        <div class="msg-item__head">
          <span class="msg-item__name">${m.sender_name || 'فريق MZ TV'}</span>
          <span class="msg-item__date">${formatDate(m.created_at)}</span>
        </div>
        ${m.rate ? `<div class="msg-item__stars">${starsText(m.rate)}</div>` : ''}
        <div class="msg-item__content is-collapsed">${(m.content || '').replace(/</g, '&lt;')}</div>
      </div>
    `).join('');

    listEl.querySelectorAll('.msg-item').forEach(item => {
      item.addEventListener('click', async () => {
        item.querySelector('.msg-item__content').classList.toggle('is-collapsed');
        if (item.classList.contains('is-unread')) {
          item.classList.remove('is-unread');
          const id = item.dataset.id;
          await supabaseClient.from('contact').update({ read: 'done' }).eq('id', id);
          const badge = document.getElementById('navMsgBadge');
          if (badge) {
            const remaining = listEl.querySelectorAll('.msg-item.is-unread').length;
            if (remaining > 0) badge.textContent = remaining > 9 ? '9+' : String(remaining);
            else badge.style.display = 'none';
          }
        }
      });
    });
  }

  async function loadMessages() {
    listEl.innerHTML = `<p class="matches__loading">جارِ تحميل الرسائل…</p>`;
    const { data, error } = await supabaseClient
      .from('contact')
      .select('id, sender_name, rate, content, created_at, read')
      .eq('to', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = `<p class="matches__error">تعذّر تحميل الرسائل حاليًا.</p>`;
      return;
    }
    render(data || []);
  }

  loadMessages();
});
