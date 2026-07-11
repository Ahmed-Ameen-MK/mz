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

/* ---------- Profile helper ---------- */
async function mzFetchProfile(userId) {
  const { data, error } = await supabaseClient
    .from('users')
    .select('id, name, email, country, city, phone')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/* ---------- Public API used by login.html / register.html ---------- */
const mzAuth = {
  async login(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;

    let profile = null;
    try { profile = await mzFetchProfile(data.user.id); } catch { /* ignore, fall back below */ }

    mzSetStoredUser({
      id: data.user.id,
      email: data.user.email,
      name: profile?.name || data.user.email,
    });
    return data.user;
  },

  async register({ name, email, password, country, city, phone }) {
    const { data, error } = await supabaseClient.auth.signUp({ email, password });
    if (error) throw error;

    // If email confirmation is required, data.user exists but there's no session yet.
    if (data.user) {
      const { error: insertError } = await supabaseClient
        .from('users')
        .insert([{ id: data.user.id, name, email, country: country || null, city: city || null, phone: phone || null }]);
      if (insertError) throw insertError;
    }

    if (data.session) {
      mzSetStoredUser({ id: data.user.id, email: data.user.email, name });
    }

    return data;
  },

  async loginWithGoogle() {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/index.html' },
    });
    if (error) throw error;
  },

  async logout() {
    await supabaseClient.auth.signOut();
    mzClearStoredUser();
    mzRenderAuthUI();
    window.location.href = '/index.html';
  },
};

/* ---------- On every page load: sync UI + handle OAuth return ---------- */
document.addEventListener('DOMContentLoaded', async () => {
  mzRenderAuthUI();
  mzWireAccountMenu();

  // Catch the session created by a Google OAuth redirect and make sure
  // a matching row exists in public.users, then sync the header.
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session && !mzGetStoredUser()) {
    const user = session.user;
    let profile = null;
    try { profile = await mzFetchProfile(user.id); } catch { /* ignore */ }

    if (!profile) {
      const fallbackName = user.user_metadata?.full_name || user.user_metadata?.name || user.email;
      try {
        await supabaseClient.from('users').insert([{
          id: user.id,
          name: fallbackName,
          email: user.email,
          country: null,
          city: null,
          phone: null,
        }]);
        profile = { name: fallbackName };
      } catch { /* row may already exist from a race — ignore */ }
    }

    mzSetStoredUser({ id: user.id, email: user.email, name: profile?.name || user.email });
    mzRenderAuthUI();
  }
});
