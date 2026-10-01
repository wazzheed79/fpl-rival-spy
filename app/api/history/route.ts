import { NextRequest, NextResponse } from 'next/server';
import { HeadToHeadHistoryResponse, HeadToHeadPoint } from '@/types/fpl';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchHistory(entryId: string) {
  const res = await fetch(`${FPL_BASE_URL}/entry/${entryId}/history/`, {
    headers: { 'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)' },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`Failed to fetch history for entry ${entryId} (HTTP ${res.status})`);
  return res.json() as Promise<{ current: Array<{ event: number; points: number; total_points: number }> }>;
}

// Powers the historical head-to-head trend chart: GW-by-GW points for both managers, aligned
// by gameweek number (not array index) in case either entry has gaps in their history.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const rivalId = searchParams.get('rivalId');

  if (!userId || !rivalId) {
    return NextResponse.json({ error: 'Missing required query parameters: "userId" and "rivalId"' }, { status: 400 });
  }

  try {
    const [userHistory, rivalHistory] = await Promise.all([fetchHistory(userId), fetchHistory(rivalId)]);

    const rivalByEvent = new Map(rivalHistory.current.map((gw) => [gw.event, gw]));

    const points: HeadToHeadPoint[] = userHistory.current
      .filter((gw) => rivalByEvent.has(gw.event))
      .map((gw) => {
        const rivalGw = rivalByEvent.get(gw.event)!;
        return {
          event: gw.event,
          userPoints: gw.points,
          rivalPoints: rivalGw.points,
          userTotal: gw.total_points,
          rivalTotal: rivalGw.total_points,
        };
      });

    const payload: HeadToHeadHistoryResponse = { points };
    return NextResponse.json(payload);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to build head-to-head history' }, { status: 500 });
  }
}
