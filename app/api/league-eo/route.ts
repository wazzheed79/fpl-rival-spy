import { NextResponse } from "next/server";

interface ManagerPick {
  element: number;
  multiplier: number;
  is_captain: boolean;
}

export async function POST(req: Request) {
  try {
    const { leagueId, gameweek } = await req.json();

    if (!leagueId || !gameweek) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const leagueRes = await fetch(
      `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`
    );
    const leagueData = await leagueRes.json();
    const standings = leagueData?.standings?.results || [];

    if (!standings.length) {
      return NextResponse.json({ elements: [] });
    }

    const totalManagers = standings.length;
    const eoCounts: Record<number, { count: number; effectivePointsMultiplier: number }> = {};

    await Promise.all(
      standings.map(async (manager: { entry: number }) => {
        try {
          const picksRes = await fetch(
            `https://fantasy.premierleague.com/api/entry/${manager.entry}/event/${gameweek}/picks/`
          );
          const picksData = await picksRes.json();
          const picks: ManagerPick[] = picksData.picks || [];

          picks.forEach((pick) => {
            if (!eoCounts[pick.element]) {
              eoCounts[pick.element] = { count: 0, effectivePointsMultiplier: 0 };
            }
            if (pick.multiplier > 0) {
              eoCounts[pick.element].count += 1;
              eoCounts[pick.element].effectivePointsMultiplier += pick.multiplier;
            }
          });
        } catch {
          // Skip on failed manager fetch
        }
      })
    );

    const eoResults = Object.entries(eoCounts).map(([elementId, data]) => {
      return {
        id: Number(elementId),
        ownershipPercentage: Number(((data.count / totalManagers) * 100).toFixed(1)),
        effectiveOwnership: Number(
          ((data.effectivePointsMultiplier / totalManagers) * 100).toFixed(1)
        ),
      };
    });

    return NextResponse.json({
      gameweek,
      totalManagers,
      leagueEo: eoResults.sort((a, b) => b.effectiveOwnership - a.effectiveOwnership),
    });
  } catch {
    return NextResponse.json({ error: "Failed to calculate League EO" }, { status: 500 });
  }
}
