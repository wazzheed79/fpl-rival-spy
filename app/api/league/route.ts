import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get("leagueId");

  if (!leagueId) {
    return NextResponse.json({ error: "League ID is required" }, { status: 400 });
  }

  try {
    const bootstrapRes = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      next: { revalidate: 1800 },
    });
    if (!bootstrapRes.ok) {
      return NextResponse.json({ error: "Failed to fetch FPL bootstrap data" }, { status: 500 });
    }
    const bootstrap = await bootstrapRes.json();
    const currentEvent = bootstrap.events.find((e: any) => e.is_current || e.is_next)?.id || 1;

    const leagueRes = await fetch(`https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`, {
      next: { revalidate: 300 },
    });
    if (!leagueRes.ok) {
      return NextResponse.json({ error: "Mini-league not found or invalid ID" }, { status: 404 });
    }
    const leagueData = await leagueRes.json();
    const leagueName = leagueData.league?.name || `League #${leagueId}`;
    const rawStandings = leagueData.standings?.results || [];

    const topRivals = rawStandings.slice(0, 15);

    const rivalsWithSquads = await Promise.all(
      topRivals.map(async (r: any) => {
        let ownedPlayerIds: number[] = [];
        try {
          const picksRes = await fetch(`https://fantasy.premierleague.com/api/entry/${r.entry}/event/${currentEvent}/picks/`, {
            next: { revalidate: 300 },
          });
          if (picksRes.ok) {
            const picksData = await picksRes.json();
            if (picksData.picks && Array.isArray(picksData.picks)) {
              ownedPlayerIds = picksData.picks.map((p: any) => p.element);
            }
          }
        } catch {
          // Ignore individual pick fetch failure
        }

        return {
          entry: r.entry,
          player_name: r.player_name,
          entry_name: r.entry_name,
          rank: r.rank,
          total: r.total,
          ownedPlayerIds,
        };
      })
    );

    return NextResponse.json({
      leagueName,
      rivals: rivalsWithSquads,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch league standings from FPL" }, { status: 500 });
  }
}
