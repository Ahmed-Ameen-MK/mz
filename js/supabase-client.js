// ===========================================================
// MZ TV — Supabase client
// Uses the public "publishable" key — safe to expose in the
// browser as long as Row Level Security policies are enabled
// on every table (see SETUP.md).
// ===========================================================

const SUPABASE_URL = 'https://durogspcnreeuatpelmx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fneeld-2kjFQ8YXiGaOj2Q_qGwfp5o-';

// TheSportsDB — API مجاني حقيقي، بيشتغل مباشرة من المتصفح بدون سيرفر
// وسيط ومن غير تسجيل (المفتاح "3" هو مفتاح تجربة عام ومسموح بيه).
const SPORTSDB_KEY = '3';
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
