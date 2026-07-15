// ===========================================================
// MZ TV — admin/messages.html: رسائل المستخدمين + الرد عليها
// ===========================================================
//
// ⚠️ التحقق من صلاحية الأدمن هنا بسيط (مقارنة UID) لأغراض
// التجربة والحماية الأولية في الواجهة فقط. الحماية الحقيقية
// لازم تكون عبر Row Level Security على جدول contact في Supabase
// (اسمح بالقراءة/الإضافة/التعديل فقط لصاحب هذا الـ UID) —
// راجع ملف supabase-setup.sql المرفق.
// ===========================================================

const MZ_ADMIN_UID = '1feff681-f812-40b3-ac24-63e5649b7f08'; // AHMED 
const MZ_ADMIN_UID_2 = 'b9013780-182e-4646-8034-b6c3eac54ece'; // MOHAMED
const MZ_ADMIN_UID_3 = '5b53be9c-d98e-4ddc-8441-0ec18edef807'; // MOHAMED

document.addEventListener('DOMContentLoaded', async () => {
  const listEl = document.getElementById('adminMsgList');
  const gateEl = document.getElementById('adminGate');
  const shellEl = document.getElementById('adminShell');
  if (!listEl) return;

  const { data: { session } } = await supabaseClient.auth.getSession();
  const uid = session && session.user ? session.user.id : null;

  if (!uid || uid !== MZ_ADMIN_UID ) {
    gateEl.style.display = 'block';
    shellEl.style.display = 'none';
    return;
  }
  gateEl.style.display = 'none';
  shellEl.style.display = 'block';

  function formatDate(iso) {
    return new Date(iso).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function starsText(rate) {
    if (!rate) return '';
    return '★'.repeat(rate) + '☆'.repeat(5 - rate);
  }

  function render(messages) {
    if (!messages.length) {
      listEl.innerHTML = `<p class="msg-empty">لا توجد رسائل من المستخدمين بعد.</p>`;
      return;
    }
    listEl.innerHTML = messages.map(m => `
      <div class="msg-item ${m.read === 'no' ? 'is-unread' : ''}" data-id="${m.id}" data-from="${m.from_id || ''}">
        <div class="msg-item__head">
          <span class="msg-item__name">${m.sender_name || 'مستخدم'}</span>
          <span class="msg-item__date">${formatDate(m.created_at)}</span>
        </div>
        ${m.rate ? `<div class="msg-item__stars">${starsText(m.rate)}</div>` : ''}
        <div class="msg-item__content">${(m.content || '').replace(/</g, '&lt;')}</div>
        <div class="reply-box" style="display:none;">
          ${m.from_id
            ? `<textarea placeholder="اكتب ردك هنا..."></textarea>
               <button type="button" class="btn btn--primary btn--sm">إرسال الرد</button>`
            : `<p class="ai-error">لا يمكن الرد تلقائيًا على هذه الرسالة — لا يوجد معرّف للمرسل (رسالة قديمة قبل إضافة عمود from_id).</p>`}
          <p class="form-msg"></p>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.msg-item').forEach(item => {
      const id = item.dataset.id;
      const fromId = item.dataset.from;

      item.querySelector('.msg-item__content').addEventListener('click', async () => {
        const box = item.querySelector('.reply-box');
        box.style.display = box.style.display === 'none' ? 'block' : 'none';
        if (item.classList.contains('is-unread')) {
          item.classList.remove('is-unread');
          await supabaseClient.from('contact').update({ read: 'done' }).eq('id', id);
        }
      });

      const sendBtn = item.querySelector('.reply-box .btn');
      if (sendBtn) {
        sendBtn.addEventListener('click', async () => {
          const textarea = item.querySelector('.reply-box textarea');
          const msgEl = item.querySelector('.reply-box .form-msg');
          const text = textarea.value.trim();
          if (!text) return;
          sendBtn.disabled = true;
          try {
            const { error } = await supabaseClient.from('contact').insert({
              sender_name: 'admin',
              content: text,
              to: fromId,
              read: 'no',
            });
            if (error) throw error;
            msgEl.textContent = 'تم إرسال الرد بنجاح';
            msgEl.className = 'form-msg form-msg--success';
            textarea.value = '';
          } catch (err) {
            msgEl.textContent = 'تعذّر إرسال الرد: ' + err.message;
            msgEl.className = 'form-msg form-msg--error';
          } finally {
            sendBtn.disabled = false;
          }
        });
      }
    });
  }

  async function loadMessages() {
    listEl.innerHTML = `<p class="matches__loading">جارِ تحميل الرسائل…</p>`;
    const { data, error } = await supabaseClient
      .from('contact')
      .select('id, sender_name, rate, content, created_at, read, from_id')
      .eq('to', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      listEl.innerHTML = `<p class="matches__error">تعذّر تحميل الرسائل. (${error.message})</p>`;
      return;
    }
    render(data || []);
  }

  loadMessages();
});
