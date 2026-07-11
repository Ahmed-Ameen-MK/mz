// ===========================================================
// MZ TV — sports-proxy Cloudflare Worker
// يتنشر بالكامل من المتصفح على dash.cloudflare.com (بدون CLI).
// بيحل مشكلتين مع بعض:
//  1) الـ CORS اللي بيمنع نداء API-Football مباشرة من المتصفح
//  2) إخفاء مفتاح RapidAPI عن أي حد يفتح كود الموقع
// ===========================================================

const API_HOST = "api-football-v1.p.rapidapi.com";

export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "content-type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

    try {
      const apiRes = await fetch(`https://${API_HOST}/v3/fixtures?date=${date}`, {
        headers: {
          "x-rapidapi-key": env.RAPIDAPI_KEY, // من Settings -> Variables and Secrets
          "x-rapidapi-host": API_HOST,
        },
      });

      if (!apiRes.ok) {
        return new Response(
          JSON.stringify({ error: `API-Football responded with ${apiRes.status}` }),
          { status: apiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await apiRes.json();

      // نفس ترتيب أولوية الدوريات (السعودي، أبطال أوروبا، الإنجليزي، المصري، الإسباني...)
      const PRIORITY_LEAGUES = [307, 2, 39, 233, 140, 3, 61, 135, 78];
      const fixtures = (data.response || [])
        .sort((a, b) => {
          const aRank = PRIORITY_LEAGUES.indexOf(a.league.id);
          const bRank = PRIORITY_LEAGUES.indexOf(b.league.id);
          return (aRank === -1 ? 999 : aRank) - (bRank === -1 ? 999 : bRank);
        })
        .slice(0, 15)
        .map((f) => ({
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
  },
};
