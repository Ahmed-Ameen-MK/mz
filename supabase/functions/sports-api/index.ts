// ===========================================================
// MZ TV — sports-api Edge Function
// Proxies API-Football (via RapidAPI) so the RapidAPI key never
// ships to the browser. Deploy with:
//   supabase functions deploy sports-api --no-verify-jwt
// and set the secret with:
//   supabase secrets set RAPIDAPI_KEY=your_key_here
// ===========================================================

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const RAPIDAPI_HOST = "api-football-v1.p.rapidapi.com";
const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");

// Leagues surfaced first (Saudi Pro League, Champions League, Premier League,
// Egyptian Premier League, La Liga, Europa League, Ligue 1, Serie A, Bundesliga)
const PRIORITY_LEAGUES = [307, 2, 39, 233, 140, 3, 61, 135, 78];

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!RAPIDAPI_KEY) {
    return new Response(
      JSON.stringify({ error: "RAPIDAPI_KEY secret is not set on this function" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

    const apiRes = await fetch(`https://${RAPIDAPI_HOST}/v3/fixtures?date=${date}`, {
      headers: {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST,
      },
    });

    if (!apiRes.ok) {
      throw new Error(`API-Football responded with ${apiRes.status}`);
    }

    const data = await apiRes.json();

    const fixtures = (data.response || [])
      .sort((a: any, b: any) => {
        const aRank = PRIORITY_LEAGUES.indexOf(a.league.id);
        const bRank = PRIORITY_LEAGUES.indexOf(b.league.id);
        return (aRank === -1 ? 999 : aRank) - (bRank === -1 ? 999 : bRank);
      })
      .slice(0, 15)
      .map((f: any) => ({
        id: f.fixture.id,
        date: f.fixture.date,
        status: f.fixture.status.short,
        elapsed: f.fixture.status.elapsed,
        league: f.league.name,
        homeTeam: f.teams.home.name,
        homeLogo: f.teams.home.logo,
        awayTeam: f.teams.away.name,
        awayLogo: f.teams.away.logo,
        homeGoals: f.goals.home,
        awayGoals: f.goals.away,
      }));

    return new Response(JSON.stringify({ fixtures }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
