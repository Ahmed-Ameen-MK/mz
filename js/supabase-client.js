// ===========================================================
// MZ TV — Supabase client
// Uses the public "publishable" key — safe to expose in the
// browser as long as Row Level Security policies are enabled
// on every table (see SETUP.md).
// ===========================================================

const SUPABASE_URL = 'https://durogspcnreeuatpelmx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fneeld-2kjFQ8YXiGaOj2Q_qGwfp5o-';

// TheSportsDB — يغذّي شريط الأخبار العلوي فقط (زي ما هو)
const SPORTSDB_KEY = '3';
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`;

// football-data.org — يغذّي قسم "مباريات اليوم"
const FOOTBALL_DATA_KEY = '929a73e76eaa48f2bc65ef2a07b5cb6b';
const FOOTBALL_DATA_BASE = 'https://api.football-data.org/v4';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
