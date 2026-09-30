import { NextResponse } from 'next/server';
import { fetchFPL } from '@/lib/fpl/client';

interface StandingsResult {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  total: number;
}

interface LeagueApiResponse {
  league: {
    id: number;
    name: string;
  };
  standings: {
    results: StandingsResult[];
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');

  if (!leagueId) {
    return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });
  }

  try {
    const data = await fetchFPL<LeagueApiResponse>(
      `/leagues-classic/${leagueId}/standings/`,
      120 // Cache league table for 2 mins
    );

    const competitors = data.standings.results.map((m) => ({
      entry: m.entry,
      teamName: m.entry_name,
      managerName: m.player_name,
      rank: m.rank,
      totalPoints: m.total,
    }));

    return NextResponse.json({
      leagueId: data.league.id,
      leagueName: data.league.name,
      standings: competitors,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch league data';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
