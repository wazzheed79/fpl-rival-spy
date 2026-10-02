import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    let leagueData: any = null;
    try {
      const leagueRes = await fetch(
        `https://fantasy.premierleague.com/api/leagues-classic/${leagueId}/standings/`,
        {
          headers: {
            'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
            'Accept': 'application/json',
          },
          signal: controller.signal,
          next: { revalidate: 120 },
        }
      );
      if (leagueRes.ok) {
        leagueData = await leagueRes.json();
      }
    } catch {
      // Fallback if league request fails or times out
    } finally {
      clearTimeout(timeoutId);
    }

    const standings = leagueData?.standings?.results || [];

    if (!standings.length) {
      return NextResponse.json({ gameweek, totalManagers: 0, leagueEo: [] });
    }

    // Limit sample size to top 15 managers to prevent Vercel 504 timeouts and FPL 429 rate limiting
    const sampleManagers = standings.slice(0, 15);
    const totalManagers = sampleManagers.length;
    const eoCounts: Record<number, { count: number; effectivePointsMultiplier: number }> = {};

    await Promise.all(
      sampleManagers.map(async (manager: { entry: number }) => {
        const pickController = new AbortController();
        const pickTimeout = setTimeout(() => pickController.abort(), 4000);
        try {
          const picksRes = await fetch(
            `https://fantasy.premierleague.com/api/entry/${manager.entry}/event/${gameweek}/picks/`,
            {
              headers: {
                'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
                'Accept': 'application/json',
              },
              signal: pickController.signal,
              next: { revalidate: 120 },
            }
          );
          if (picksRes.ok) {
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
          }
        } catch {
          // Skip on failed or timed out manager fetch
        } finally {
          clearTimeout(pickTimeout);
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
    return NextResponse.json({ gameweek: 1, totalManagers: 0, leagueEo: [] });
  }
}
