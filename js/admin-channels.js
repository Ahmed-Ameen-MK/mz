// ===========================================================
// MZ TV — لوحة تحكم القنوات الرياضية (admin/sports-channels.html)
// نشر / تعديل / حذف صفوف جدول channels في Supabase
// الأعمدة: channel, type, stream1, stream2, stream3, youtube_code, avatar_url
// ===========================================================

const ADMIN_CH_PRESET_TYPES = ['دوريات كبرى', 'مصري', 'إماراتي', 'قطري', 'سعودي'];
const ADMIN_CH_DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" fill="%2316131b"/><text x="50%25" y="58%25" font-size="16" fill="%23a79fb3" text-anchor="middle" font-family="sans-serif">📡</text></svg>';

let adminChChannels = [];
let adminChEditingId = null;

function adminChEsc(s) {
  return String(s ?? '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

function adminChSetMsg(text, kind) {
  const el = document.getElementById('channelFormMsg');
  if (!el) return;
  el.textContent = text || '';
  el.className = 'form-msg' + (kind ? ` form-msg--${kind}` : '');
}

function adminChBuildTypeOptions(selected) {
  const select = document.getElementById('channelTypeSelect');
  if (!select) return;

  const existingTypes = [...new Set(adminChChannels.map(c => c.type).filter(Boolean))];
  const types = [...new Set([...ADMIN_CH_PRESET_TYPES, ...existingTypes])];

  select.innerHTML = types.map(t => `<option value="${adminChEsc(t)}">${adminChEsc(t)}</option>`).join('')
    + `<option value="__new__">+ إضافة قسم جديد</option>`;

  const newTypeInput = document.getElementById('channelTypeNew');

  if (selected && types.includes(selected)) {
    select.value = selected;
  } else if (selected) {
    // نوع مخصص غير موجود بعد بالقائمة (مثلاً عند تعديل قناة بقسم جديد)
    select.value = '__new__';
    if (newTypeInput) newTypeInput.value = selected;
  } else {
    select.value = types[0] || '__new__';
  }

  adminChToggleNewTypeRow();
}

function adminChToggleNewTypeRow() {
  const select = document.getElementById('channelTypeSelect');
  const row = document.getElementById('newTypeRow');
  const input = document.getElementById('channelTypeNew');
  if (!select || !row) return;
  const isNew = select.value === '__new__';
  row.style.display = isNew ? 'flex' : 'none';
  if (input) input.required = isNew;
}

// يبني شارات صغيرة توضّح مصادر البث المتاحة لكل قناة في الجدول
function adminChSourcesBadges(c) {
  const badges = [];
  if (c.stream1) badges.push('بث 1');
  if (c.stream2) badges.push('بث 2');
  if (c.stream3) badges.push('بث 3');
  if (c.youtube_code) badges.push('يوتيوب');
  if (!badges.length) return '<span style="color:var(--text-faint); font-size:.8rem;">لا يوجد</span>';
  return badges.map(b => `<span class="badge" style="margin-inline-end:.35rem;">${b}</span>`).join('');
}

async function adminChLoad() {
  const tbody = document.getElementById('channelsTableBody');
  try {
    const { data, error } = await supabaseClient
      .from('channels')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;

    adminChChannels = data || [];
    adminChRenderTable();
  } catch (err) {
    console.error('Admin channels load error:', err);
    if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="matches__loading">تعذّر تحميل القنوات</td></tr>';
  }
}

function adminChRenderTable() {
  const tbody = document.getElementById('channelsTableBody');
  if (!tbody) return;

  if (!adminChChannels.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="matches__loading">لا توجد قنوات مضافة بعد</td></tr>';
    return;
  }

  tbody.innerHTML = adminChChannels.map(c => `
    <tr>
      <td><img class="admin-table__avatar" src="${adminChEsc(c.avatar_url) || ADMIN_CH_DEFAULT_AVATAR}" alt="${adminChEsc(c.channel)}" onerror="this.src='${ADMIN_CH_DEFAULT_AVATAR}'"></td>
      <td>${adminChEsc(c.channel)}</td>
      <td><span class="badge">${adminChEsc(c.type)}</span></td>
      <td>${adminChSourcesBadges(c)}</td>
      <td class="admin-table__actions">
        <button type="button" class="btn btn--ghost btn--sm" data-edit="${c.id}">تعديل</button>
        <button type="button" class="btn btn--danger btn--sm" data-delete="${c.id}">حذف</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => adminChStartEdit(btn.dataset.edit));
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => adminChDelete(btn.dataset.delete));
  });
}

function adminChStartEdit(id) {
  const ch = adminChChannels.find(c => String(c.id) === String(id));
  if (!ch) return;

  adminChEditingId = ch.id;
  document.getElementById('channelId').value = ch.id;
  document.getElementById('channelName').value = ch.channel;
  document.getElementById('channelStream1').value = ch.stream1 || '';
  document.getElementById('channelStream2').value = ch.stream2 || '';
  document.getElementById('channelStream3').value = ch.stream3 || '';
  document.getElementById('channelYoutubeCode').value = ch.youtube_code || '';
  document.getElementById('channelAvatarUrl').value = ch.avatar_url || '';
  adminChBuildTypeOptions(ch.type);

  document.getElementById('channelFormTitle').textContent = `تعديل قناة: ${ch.channel}`;
  document.getElementById('channelSubmitBtn').textContent = 'حفظ التعديلات';
  document.getElementById('channelCancelEditBtn').style.display = 'inline-flex';
  adminChSetMsg('', null);
  document.getElementById('channelForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function adminChResetForm() {
  adminChEditingId = null;
  document.getElementById('channelForm')?.reset();
  document.getElementById('channelId').value = '';
  adminChBuildTypeOptions();
  document.getElementById('channelFormTitle').textContent = 'نشر قناة جديدة';
  document.getElementById('channelSubmitBtn').textContent = 'نشر القناة';
  document.getElementById('channelCancelEditBtn').style.display = 'none';
  adminChSetMsg('', null);
}

async function adminChDelete(id) {
  const ch = adminChChannels.find(c => String(c.id) === String(id));
  if (!ch) return;
  if (!confirm(`هل تريد حذف قناة "${ch.channel}"؟`)) return;

  try {
    const { error } = await supabaseClient.from('channels').delete().eq('id', id);
    if (error) throw error;
    if (adminChEditingId && String(adminChEditingId) === String(id)) adminChResetForm();
    await adminChLoad();
  } catch (err) {
    console.error('Admin channel delete error:', err);
    alert('تعذّر حذف القناة، حاول مرة أخرى');
  }
}

async function adminChSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('channelName').value.trim();
  const select = document.getElementById('channelTypeSelect');
  const newTypeInput = document.getElementById('channelTypeNew');
  const type = select.value === '__new__' ? newTypeInput.value.trim() : select.value;

  const stream1 = document.getElementById('channelStream1').value.trim();
  const stream2 = document.getElementById('channelStream2').value.trim();
  const stream3 = document.getElementById('channelStream3').value.trim();
  const youtubeCode = document.getElementById('channelYoutubeCode').value.trim();
  const avatarUrl = document.getElementById('channelAvatarUrl').value.trim();

  if (!name || !type) {
    adminChSetMsg('من فضلك املأ اسم القناة والقسم', 'error');
    return;
  }

  if (!stream1 && !stream2 && !stream3 && !youtubeCode) {
    adminChSetMsg('لازم تدخل رابط بث واحد على الأقل (بث 1 / بث 2 / بث 3) أو رمز تضمين يوتيوب', 'error');
    return;
  }

  const payload = {
    channel: name,
    type,
    stream1: stream1 || null,
    stream2: stream2 || null,
    stream3: stream3 || null,
    youtube_code: youtubeCode || null,
    avatar_url: avatarUrl || null,
  };

  const submitBtn = document.getElementById('channelSubmitBtn');
  submitBtn.disabled = true;

  try {
    if (adminChEditingId) {
      const { error } = await supabaseClient.from('channels').update(payload).eq('id', adminChEditingId);
      if (error) throw error;
      adminChSetMsg('تم حفظ التعديلات بنجاح', 'success');
    } else {
      const { error } = await supabaseClient.from('channels').insert(payload);
      if (error) throw error;
      adminChSetMsg('تم نشر القناة بنجاح', 'success');
    }
    await adminChLoad();
    adminChResetForm();
  } catch (err) {
    console.error('Admin channel save error:', err);
    adminChSetMsg('حدث خطأ أثناء الحفظ، تأكد من صحة البيانات وحاول مرة أخرى', 'error');
  } finally {
    submitBtn.disabled = false;
  }
}

async function adminChInit() {
  adminChBuildTypeOptions();
  await adminChLoad();
  adminChBuildTypeOptions(); // إعادة بناء القائمة بعد تحميل الأقسام الفعلية من القاعدة

  document.getElementById('channelForm')?.addEventListener('submit', adminChSubmit);
  document.getElementById('channelTypeSelect')?.addEventListener('change', adminChToggleNewTypeRow);
  document.getElementById('channelCancelEditBtn')?.addEventListener('click', adminChResetForm);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('channelForm')) adminChInit();
});
