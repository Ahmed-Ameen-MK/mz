// ===========================================================
// MZ TV — Supabase client
// Uses the public "publishable" key — safe to expose in the
// browser as long as Row Level Security policies are enabled
// on every table (see SETUP.md).
// ===========================================================

const SUPABASE_URL = 'https://durogspcnreeuatpelmx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fneeld-2kjFQ8YXiGaOj2Q_qGwfp5o-';

// ⚠️ TEMPORARY: calling API-Football directly from the browser so it works
// with no server/CLI step. The key below is visible to anyone who opens
// dev tools. Move this behind the Supabase Edge Function in
// supabase/functions/sports-api/ before this goes live for real users.
const API_FOOTBALL_KEY = 'a9c4073aba9f76918ebd6bd6b801ea6c';
const API_FOOTBALL_HOST = 'api-football-v1.p.rapidapi.com';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
