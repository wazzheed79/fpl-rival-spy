import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchFpl<T>(endpoint: string, revalidateSeconds: number = 60, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${FPL_BASE_URL}${endpoint}`, {
      headers: {
        'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
    });

    if (!res.ok) {
      throw new Error(`FPL API error [${endpoint}]: HTTP ${res.status} ${res.statusText}`);
    }

    return (await res.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface TransferEventAudit {
  time: string;
  elementIn: {
    id: number;
    name: string;
    team: string;
    livePoints: number;
  };
  elementOut: {
    id: number;
    name: string;
    team: string;
    livePoints: number;
  };
  cost: number;
  netSwing: number;
  status: 'PROFIT' | 'EVEN' | 'LOSS';
}

export interface ManagerHitTaxResponse {
  teamId: number;
  gameweek: number;
  totalTransfersCost: number;
  totalTransfersCount: number;
  transfers: TransferEventAudit[];
  overallNetProfit: number;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const rivalId = searchParams.get('rivalId');
  const gwParam = searchParams.get('gw');

  if (!userId || !rivalId) {
    return NextResponse.json(
      { error: 'Missing required parameters: userId and rivalId' },
      { status: 400 }
    );
  }

  try {
    const bootstrap = await fetchFpl<{
      events: Array<{ id: number; is_current: boolean; is_next: boolean }>;
      elements: Array<{ id: number; web_name: string; team: number }>;
      teams: Array<{ id: number; short_name: string }>;
    }>('/bootstrap-static/', 300);

    const currentEvent = bootstrap.events.find((e) => e.is_current) || bootstrap.events.find((e) => e.is_next);
    const targetGw = gwParam ? parseInt(gwParam, 10) : (currentEvent?.id ?? 1);

    const teamMap = new Map<number, string>(bootstrap.teams.map((t) => [t.id, t.short_name]));
    const playerMap = new Map<number, { name: string; team: string }>(
      bootstrap.elements.map((p) => [
        p.id,
        { name: p.web_name, team: teamMap.get(p.team) || 'UNK' },
      ])
    );

    const [liveData, userTransfers, rivalTransfers, userHistory, rivalHistory] = await Promise.all([
      fetchFpl<{ elements: Array<{ id: number; stats: { total_points: number } }> }>(
        `/event/${targetGw}/live/`,
        30
      ),
      fetchFpl<Array<{ element_in: number; element_out: number; event: number; time: string }>>(
        `/entry/${userId}/transfers/`
      ),
      fetchFpl<Array<{ element_in: number; element_out: number; event: number; time: string }>>(
        `/entry/${rivalId}/transfers/`
      ),
      fetchFpl<{ current: Array<{ event: number; event_transfers_cost: number }> }>(
        `/entry/${userId}/history/`
      ),
      fetchFpl<{ current: Array<{ event: number; event_transfers_cost: number }> }>(
        `/entry/${rivalId}/history/`
      ),
    ]);

    const livePointsMap = new Map<number, number>(
      liveData.elements.map((el) => [el.id, el.stats.total_points ?? 0])
    );

    const processTransfers = (
      rawTransfers: typeof userTransfers,
      history: typeof userHistory,
      teamId: number
    ): ManagerHitTaxResponse => {
      const gwTransfers = rawTransfers.filter((t) => t.event === targetGw);
      const gwHistory = history.current.find((h) => h.event === targetGw);
      const totalCost = gwHistory?.event_transfers_cost ?? 0;
      const count = gwTransfers.length;

      const costPerTransfer = count > 0 ? totalCost / count : 0;
      let overallNetProfit = -totalCost;

      const processed: TransferEventAudit[] = gwTransfers.map((t) => {
        const inMeta = playerMap.get(t.element_in) || { name: 'Unknown', team: 'UNK' };
        const outMeta = playerMap.get(t.element_out) || { name: 'Unknown', team: 'UNK' };

        const inPoints = livePointsMap.get(t.element_in) ?? 0;
        const outPoints = livePointsMap.get(t.element_out) ?? 0;

        const netSwing = Number(((inPoints - costPerTransfer) - outPoints).toFixed(1));
        overallNetProfit += (inPoints - outPoints);

        let status: 'PROFIT' | 'EVEN' | 'LOSS' = 'EVEN';
        if (netSwing > 0) status = 'PROFIT';
        else if (netSwing < 0) status = 'LOSS';

        return {
          time: t.time,
          elementIn: {
            id: t.element_in,
            name: inMeta.name,
            team: inMeta.team,
            livePoints: inPoints,
          },
          elementOut: {
            id: t.element_out,
            name: outMeta.name,
            team: outMeta.team,
            livePoints: outPoints,
          },
          cost: costPerTransfer,
          netSwing,
          status,
        };
      });

      return {
        teamId,
        gameweek: targetGw,
        totalTransfersCost: totalCost,
        totalTransfersCount: count,
        transfers: processed,
        overallNetProfit: Number(overallNetProfit.toFixed(1)),
      };
    };

    return NextResponse.json({
      gameweek: targetGw,
      user: processTransfers(userTransfers, userHistory, parseInt(userId, 10)),
      rival: processTransfers(rivalTransfers, rivalHistory, parseInt(rivalId, 10)),
    });
  } catch (error: any) {
    console.error('Error in /api/transfers route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
