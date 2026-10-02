import { NextRequest, NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchFpl<T>(endpoint: string, revalidateSeconds: number = 60): Promise<T> {
  const res = await fetch(`${FPL_BASE_URL}${endpoint}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    throw new Error(`FPL API error [${endpoint}]: HTTP ${res.status}${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

export type ThreatTier = 'CRITICAL_SHIELD' | 'MODERATE_RISK' | 'DIFFERENTIAL' | 'PURE_LEVERAGE';

export interface PlayerEOMetric {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number;
  cost: number;
  form: number;
  totalPoints: number;
  livePoints: number;
  rawStartsCount: number;
  rawCaptainCount: number;
  rawTripleCapCount: number;
  rawBenchCount: number;
  leoPercentage: number;
  threatTier: ThreatTier;
  owners: string[]; // List of manager names who own/start him
}

export interface LeagueEOResponse {
  leagueId: number;
  leagueName: string;
  gameweek: number;
  competitorsSampled: number;
  matrix: PlayerEOMetric[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');
  const gwParam = searchParams.get('gw');

  if (!leagueId) {
    return NextResponse.json({ error: 'Missing required leagueId parameter' }, { status: 400 });
  }

  try {
    const bootstrap = await fetchFpl<{
      events: Array<{ id: number; is_current: boolean; is_next: boolean }>;
      elements: Array<{ id: number; web_name: string; team: number; element_type: number; now_cost: number; form: string; total_points: number }>;
      teams: Array<{ id: number; short_name: string }>;
    }>('/bootstrap-static/', 300);

    const currentEvent = bootstrap.events.find((e) => e.is_current) || bootstrap.events.find((e) => e.is_next);
    const targetGw = gwParam ? parseInt(gwParam, 10) : (currentEvent?.id ?? 1);

    const teamMap = new Map<number, string>(bootstrap.teams.map((t) => [t.id, t.short_name]));
    const playerStatic = new Map<number, { webName: string; teamShort: string; elementType: number; cost: number; form: number; totalPoints: number }>(
      bootstrap.elements.map((p) => [
        p.id,
        {
          webName: p.web_name,
          teamShort: teamMap.get(p.team) || 'UNK',
          elementType: p.element_type,
          cost: p.now_cost / 10,
          form: parseFloat(p.form) || 0,
          totalPoints: p.total_points,
        },
      ])
    );

    // Fetch league standings & live matchday points
    const [standingsData, liveData] = await Promise.all([
      fetchFpl<{
        league: { name: string };
        standings: { results: Array<{ entry: number; player_name: string; entry_name: string }> };
      }>(`/leagues-classic/${leagueId}/standings/`, 120),
      fetchFpl<{ elements: Array<{ id: number; stats: { total_points: number } }> }>(
        `/event/${targetGw}/live/`,
        30
      ),
    ]);

    const livePointsMap = new Map<number, number>(
      liveData.elements.map((el) => [el.id, el.stats.total_points ?? 0])
    );

    // Limit sampling to top 15 managers in the league to keep roundtrips fast
    const competitors = (standingsData.standings?.results ?? []).slice(0, 15);
    const totalCompetitors = competitors.length;

    if (totalCompetitors === 0) {
      return NextResponse.json({ error: 'No managers found in this league' }, { status: 404 });
    }

    // Parallel fetch of picks for all sampled competitors
    const picksPromises = competitors.map((c) =>
      fetchFpl<{
        picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean }>;
      }>(`/entry/${c.entry}/event/${targetGw}/picks/`, 60)
        .then((res) => ({ managerName: c.player_name, picks: res.picks }))
        .catch(() => ({ managerName: c.player_name, picks: [] }))
    );

    const allPicksResults = await Promise.all(picksPromises);

    // Accumulators for EO calculation
    const playerStatsAccumulator = new Map<
      number,
      { starts: number; captains: number; tripleCaps: number; bench: number; owners: string[] }
    >();

    allPicksResults.forEach(({ managerName, picks }) => {
      picks.forEach((pick) => {
        if (!playerStatsAccumulator.has(pick.element)) {
          playerStatsAccumulator.set(pick.element, {
            starts: 0,
            captains: 0,
            tripleCaps: 0,
            bench: 0,
            owners: [],
          });
        }

        const current = playerStatsAccumulator.get(pick.element)!;
        current.owners.push(managerName);

        if (pick.position <= 11) {
          current.starts += 1;
          if (pick.multiplier === 2) current.captains += 1;
          if (pick.multiplier === 3) current.tripleCaps += 1;
        } else {
          current.bench += 1;
        }
      });
    });

    // Compute localized EO for all players held in the league
    const matrix: PlayerEOMetric[] = Array.from(playerStatsAccumulator.entries()).map(([elementId, stats]) => {
      const meta = playerStatic.get(elementId) || {
        webName: 'Unknown',
        teamShort: 'UNK',
        elementType: 1,
        cost: 5.0,
        form: 0,
        totalPoints: 0,
      };

      // Localized Effective Ownership formula
      const effectiveNumerator = stats.starts + stats.captains + 2 * stats.tripleCaps;
      const leoPercentage = Number(((effectiveNumerator / totalCompetitors) * 100).toFixed(1));

      let threatTier: ThreatTier = 'DIFFERENTIAL';
      if (leoPercentage >= 75) threatTier = 'CRITICAL_SHIELD';
      else if (leoPercentage >= 35) threatTier = 'MODERATE_RISK';
      else if (leoPercentage === 0) threatTier = 'PURE_LEVERAGE';

      return {
        id: elementId,
        webName: meta.webName,
        teamShort: meta.teamShort,
        elementType: meta.elementType,
        cost: meta.cost,
        form: meta.form,
        totalPoints: meta.totalPoints,
        livePoints: livePointsMap.get(elementId) ?? 0,
        rawStartsCount: stats.starts,
        rawCaptainCount: stats.captains,
        rawTripleCapCount: stats.tripleCaps,
        rawBenchCount: stats.bench,
        leoPercentage,
        threatTier,
        owners: Array.from(new Set(stats.owners)),
      };
    });

    // Sort descending by Localized EO
    matrix.sort((a, b) => b.leoPercentage - a.leoPercentage);

    const responsePayload: LeagueEOResponse = {
      leagueId: parseInt(leagueId, 10),
      leagueName: standingsData.league?.name ?? 'Mini-League',
      gameweek: targetGw,
      competitorsSampled: totalCompetitors,
      matrix,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/league-eo route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
