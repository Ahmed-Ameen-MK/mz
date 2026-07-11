// ===========================================================
// MZ TV — Supabase client
// Uses the public "publishable" key — safe to expose in the
// browser as long as Row Level Security policies are enabled
// on every table (see SETUP.md).
// ===========================================================

const SUPABASE_URL = 'https://durogspcnreeuatpelmx.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_fneeld-2kjFQ8YXiGaOj2Q_qGwfp5o-';

// Base URL for our Edge Function that proxies API-Football
// (the RapidAPI key stays server-side inside the function, never here)
const SPORTS_API_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/sports-api`;

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
