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

/* ---------- Profile helpers ---------- */
async function mzFetchProfile(userId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('id, name, email, country, city, phone')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
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
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + mzRootPath() + 'auth/callback.html' },
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
