import { NextRequest, NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchFpl<T>(endpoint: string, revalidateSeconds: number = 60): Promise<T> {
  const res = await fetch(`${FPL_BASE_URL}${endpoint}`, {
    headers: {
      'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
    },
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    throw new Error(`FPL API error [${endpoint}]: HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export interface MiniLeagueEOPlayer {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number;
  ownershipCount: number;
  ownershipPct: number;
  captainCount: number;
  captainPct: number;
  effectiveOwnershipPct: number; // (starters + captain + 2*tc) / totalManagers * 100
  isOwnedByUser: boolean;
  isOwnedByRival: boolean;
}

export interface MiniLeagueEOResponse {
  leagueId: number;
  leagueName: string;
  sampleSize: number;
  players: MiniLeagueEOPlayer[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId') || '314';
  const userId = searchParams.get('userId');
  const rivalId = searchParams.get('rivalId');
  const maxSample = Math.min(parseInt(searchParams.get('sample') || '15', 10) || 15, 20);

  try {
    const [standingsData, bootstrap] = await Promise.all([
      fetchFpl<any>(`/leagues-classic/${leagueId}/standings/`, 120),
      fetchFpl<{
        events: Array<{ id: number; is_current: boolean; is_next: boolean }>;
        elements: Array<{ id: number; web_name: string; element_type: number; team: number }>;
        teams: Array<{ id: number; short_name: string }>;
      }>('/bootstrap-static/', 300),
    ]);

    const currentEvent = bootstrap.events.find((e) => e.is_current) || bootstrap.events.find((e) => e.is_next);
    const targetGw = currentEvent?.id ?? 1;

    const teamShortMap = new Map<number, string>(bootstrap.teams.map((t) => [t.id, t.short_name]));
    const elementStaticMap = new Map<number, { webName: string; elementType: number; teamShort: string }>(
      bootstrap.elements.map((p) => [
        p.id,
        {
          webName: p.web_name,
          elementType: p.element_type,
          teamShort: teamShortMap.get(p.team) || 'UNK',
        },
      ])
    );

    // Get up to `maxSample` managers in the mini-league standings
    const competitors = (standingsData.standings?.results ?? []).slice(0, maxSample);
    const totalManagers = competitors.length;

    if (totalManagers === 0) {
      return NextResponse.json({
        leagueId: parseInt(leagueId, 10),
        leagueName: standingsData.league?.name || 'Mini-League',
        sampleSize: 0,
        players: [],
      });
    }

    // Fetch picks for these competitors concurrently
    const picksResults = await Promise.all(
      competitors.map(async (c: any) => {
        try {
          const pData = await fetchFpl<{
            picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean }>;
          }>(`/entry/${c.entry}/event/${targetGw}/picks/`, 120);
          return { entry: c.entry, picks: pData.picks };
        } catch {
          return { entry: c.entry, picks: [] };
        }
      })
    );

    // Collect ownership stats
    const playerStats = new Map<
      number,
      { count: number; capCount: number; multiplierSum: number; ownedByEntries: Set<number> }
    >();

    picksResults.forEach((entryResult: { entry: number; picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean }> }) => {
      entryResult.picks.forEach((pick: { element: number; position: number; multiplier: number; is_captain: boolean }) => {
        let cur = playerStats.get(pick.element);
        if (!cur) {
          cur = { count: 0, capCount: 0, multiplierSum: 0, ownedByEntries: new Set() };
          playerStats.set(pick.element, cur);
        }
        cur.count += 1;
        if (pick.is_captain) cur.capCount += 1;
        cur.multiplierSum += pick.multiplier;
        cur.ownedByEntries.add(entryResult.entry);
      });
    });

    const parsedUserId = userId ? parseInt(userId, 10) : null;
    const parsedRivalId = rivalId ? parseInt(rivalId, 10) : null;

    const list: MiniLeagueEOPlayer[] = [];

    playerStats.forEach((stats, playerId) => {
      const meta = elementStaticMap.get(playerId);
      if (!meta) return;

      const ownershipPct = Number(((stats.count / totalManagers) * 100).toFixed(1));
      const captainPct = Number(((stats.capCount / totalManagers) * 100).toFixed(1));
      const effectiveOwnershipPct = Number(((stats.multiplierSum / totalManagers) * 100).toFixed(1));

      list.push({
        id: playerId,
        webName: meta.webName,
        teamShort: meta.teamShort,
        elementType: meta.elementType,
        ownershipCount: stats.count,
        ownershipPct,
        captainCount: stats.capCount,
        captainPct,
        effectiveOwnershipPct,
        isOwnedByUser: parsedUserId ? stats.ownedByEntries.has(parsedUserId) : false,
        isOwnedByRival: parsedRivalId ? stats.ownedByEntries.has(parsedRivalId) : false,
      });
    });

    // Sort by effective ownership descending
    list.sort((a, b) => b.effectiveOwnershipPct - a.effectiveOwnershipPct);

    return NextResponse.json({
      leagueId: parseInt(leagueId, 10),
      leagueName: standingsData.league?.name ?? 'Mini-League',
      sampleSize: totalManagers,
      players: list.slice(0, 30),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to calculate mini-league EO' },
      { status: 500 }
    );
  }
}
