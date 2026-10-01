import { NextRequest, NextResponse } from 'next/server';
import { LeagueThreatBoardResponse, LeagueThreatEntry } from '@/types/fpl';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId') || '314';
  const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10) || 50, 50);

  try {
    const res = await fetch(`${FPL_BASE_URL}/leagues-classic/${leagueId}/standings/`, {
      headers: {
        'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
        Accept: 'application/json',
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `League ${leagueId} could not be found (FPL API returned HTTP ${res.status}).` },
        { status: res.status === 404 ? 404 : 502 }
      );
    }

    const data = await res.json();
    const results = (data.standings?.results ?? []).slice(0, limit);

    // Sorted by overall rank (as returned by FPL) for gap-to-rank-above/below calculations.
    const byOverallRank = [...results].sort((a: any, b: any) => a.rank - b.rank);

    const entries: LeagueThreatEntry[] = byOverallRank.map((r: any, idx: number) => {
      const above = byOverallRank[idx - 1];
      const below = byOverallRank[idx + 1];

      return {
        entry: r.entry,
        entryName: r.entry_name,
        playerName: r.player_name,
        rank: r.rank,
        lastRank: r.last_rank,
        rankDelta: (r.last_rank ?? r.rank) - r.rank,
        total: r.total,
        eventTotal: r.event_total,
        gapToRankAbove: above ? above.total - r.total : 0,
        cushionToRankBelow: below ? r.total - below.total : null,
      };
    });

    // A second ranking purely by this gameweek's live score - "who's winning the race right now",
    // independent of cumulative standing. Surfaces dark-horse threats climbing fast this week.
    const liveGwLeaderboard = [...entries]
      .sort((a, b) => b.eventTotal - a.eventTotal)
      .map((e, idx) => ({ ...e, liveGwRank: idx + 1 }));

    const payload: LeagueThreatBoardResponse = {
      leagueId: parseInt(leagueId, 10),
      leagueName: data.league?.name ?? 'Classic League',
      entries,
      liveGwLeaderboard,
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to build league threat board' },
      { status: 500 }
    );
  }
}
