// ===========================================================
// MZ TV — Authentication (Supabase Auth + public.users profile)
// Login state mirror is kept in localStorage under 'mztv_user'
// purely for fast header rendering; the real session lives in
// Supabase's own (also localStorage-based) session storage.
// ===========================================================

const MZTV_USER_KEY = 'mztv_user';

function mzGetStoredUser() {
  try {
    const raw = localStorage.getItem(MZTV_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function mzSetStoredUser(user) {
  localStorage.setItem(MZTV_USER_KEY, JSON.stringify(user));
}

function mzClearStoredUser() {
  localStorage.removeItem(MZTV_USER_KEY);
}

/* ---------- Path helpers (site can be viewed from / or /auth/) ---------- */
function mzIsIndexPage() {
  const p = window.location.pathname;
  return p === '/' || p.endsWith('/index.html');
}

function mzRootPath() {
  // when called from a page inside /auth/, we need one level up
  return window.location.pathname.includes('/auth/') ? '../' : '';
}

/* ---------- Header UI (login/register buttons <-> account name) ---------- */
function mzRenderAuthUI() {
  const authBox = document.querySelector('.nav__auth');
  const accountBox = document.getElementById('navAccount');
  if (!accountBox) return; // page doesn't have the header (shouldn't happen, but safe)

  const user = mzGetStoredUser();
  const nameEl = document.getElementById('navAccountName');
  const avatarEl = document.getElementById('navAccountAvatar');

  if (user) {
    if (authBox) authBox.style.display = 'none';
    accountBox.classList.add('is-active');
    if (nameEl) nameEl.textContent = user.name || user.email;
    if (avatarEl) avatarEl.textContent = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  } else {
    if (authBox) authBox.style.display = '';
    accountBox.classList.remove('is-active', 'is-open');
  }
}

function mzWireAccountMenu() {
  const accountBox = document.getElementById('navAccount');
  const logoutBtn = document.getElementById('navLogoutBtn');
  if (!accountBox) return;

  accountBox.addEventListener('click', (e) => {
    if (e.target === logoutBtn) return; // let logout handler run separately
    accountBox.classList.toggle('is-open');
  });
  document.addEventListener('click', (e) => {
    if (!accountBox.contains(e.target)) accountBox.classList.remove('is-open');
  });

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      await mzAuth.logout();
    });
  }
}

/* ---------- Human-readable error messages ---------- */
function mzFriendlyAuthError(err) {
  const m = (err && err.message) || '';
  if (/Invalid login credentials/i.test(m)) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
  if (/User already registered/i.test(m)) return 'هذا البريد الإلكتروني مسجّل بالفعل';
  if (/Password should be at least/i.test(m)) return 'كلمة المرور يجب ألا تقل عن 6 أحرف';
  if (/Unable to validate email address/i.test(m)) return 'صيغة البريد الإلكتروني غير صحيحة';
  if (/network/i.test(m)) return 'تعذّر الاتصال، تحقق من الإنترنت وحاول مرة أخرى';
  return 'حدث خطأ غير متوقع، حاول مرة أخرى';
}

// Covers failures from inserting/updating public.users (RLS, constraints...)
// as opposed to Supabase Auth errors above.
function mzFriendlyDbError(err) {
  const m = (err && err.message) || '';
  const code = err && err.code;
  if (code === '42501' || /row-level security/i.test(m)) {
    return 'ليس لديك صلاحية لحفظ هذه البيانات (تحقق من سياسات RLS في جدول users)';
  }
  if (code === '23505' || /duplicate key value/i.test(m)) {
    return 'هذه البيانات (البريد أو الاسم أو الهاتف) مسجّلة من قبل';
  }
  if (code === '23502' || /null value in column/i.test(m)) {
    return 'الرجاء تعبئة جميع الحقول المطلوبة';
  }
  if (code === '23503' || /foreign key constraint/i.test(m)) {
    return 'تعذّر ربط الحساب، حاول تسجيل الدخول مرة أخرى';
  }
  if (/network/i.test(m)) return 'تعذّر الاتصال، تحقق من الإنترنت وحاول مرة أخرى';
  return m ? `حدث خطأ: ${m}` : 'حدث خطأ غير متوقع، حاول مرة أخرى';
}

/* ---------- Profile helpers ---------- */
async function mzFetchProfile(userId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('id, name, email, country, city, phone')
    .eq('id', userId)
    .maybeSingle();
  // PGRST116 = "no rows found" — that's a normal case for a brand-new
  // user, not a real error, so don't throw for it.
  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

// A profile is "complete" once country/city/phone have been filled in
// via the step-2 form on auth/callback.html.
function mzProfileIsComplete(profile) {
  return !!(profile && profile.country && profile.city && profile.phone);
}

// Checks whether email / name / phone are already used by a *different*
// user row. Returns a friendly Arabic message, or null if all clear.
async function mzCheckDuplicateProfile({ email, name, phone }, excludeId) {
  const orParts = [];
  if (email) orParts.push(`email.eq.${email}`);
  if (name) orParts.push(`name.eq.${name}`);
  if (phone) orParts.push(`phone.eq.${phone}`);
  if (!orParts.length) return null;

  const { data, error } = await supabaseClient
    .from('users')
    .select('id, email, name, phone')
    .or(orParts.join(','));
  if (error) throw error;

  const conflict = (data || []).find(row => row.id !== excludeId);
  if (!conflict) return null;

  if (email && conflict.email === email) return 'هذا البريد الإلكتروني مسجّل من قبل';
  if (name && conflict.name === name) return 'هذا الاسم مسجّل من قبل، جرّب اسمًا مختلفًا';
  if (phone && conflict.phone === phone) return 'رقم الهاتف هذا مسجّل من قبل';
  return 'هذه البيانات مسجّلة من قبل';
}

/* ---------- Public API used across auth pages ---------- */
const mzAuth = {
  async loginWithGoogle() {
    // Must be an absolute, root-relative URL — window.location.origin has
    // no trailing path, so concatenating a relative '../' segment here
    // (as opposed to assigning it to location.href, which the browser
    // resolves against the current page) produces a malformed URL and
    // breaks the OAuth redirect back to auth/callback.html.
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/auth/callback.html' },
    });
    if (error) throw error;
  },

  async logout() {
    await supabaseClient.auth.signOut();
    mzClearStoredUser();
    mzRenderAuthUI();
    window.location.href = mzRootPath() + 'index.html';
  },
};

/* ---------- On every page load: sync UI + guard the homepage ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  mzRenderAuthUI();
  mzWireAccountMenu();

  // index.html is only for logged-in visitors — bounce guests to login.
  if (mzIsIndexPage()) {
    let user = mzGetStoredUser();
    if (!user) {
      const { data: { session } } = await supabaseClient.auth.getSession();
      if (!session) {
        window.location.replace('auth/login.html');
        return;
      }
    }
  }

  document.documentElement.classList.remove('mz-auth-checking');
});
