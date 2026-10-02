import { NextRequest, NextResponse } from 'next/server';
import { PriceAlertPlayer, PriceAlertResponse } from '@/types/fpl';

export const dynamic = 'force-dynamic';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

// FPL does not publish its real price-change algorithm. This uses the well-known community
// proxy: net transfers for the day as a percentage of the total manager pool. Thresholds are
// tuned heuristics, not guarantees - labelled "estimated" wherever surfaced in the UI.
const IMMINENT_PCT = 1.2;
const LIKELY_PCT = 0.6;
const WATCH_PCT = 0.25;

function classify(netPct: number): 'WATCH' | 'LIKELY' | 'IMMINENT' | null {
  const abs = Math.abs(netPct);
  if (abs >= IMMINENT_PCT) return 'IMMINENT';
  if (abs >= LIKELY_PCT) return 'LIKELY';
  if (abs >= WATCH_PCT) return 'WATCH';
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const rivalIds = new Set(
    (searchParams.get('rivalIds') || '')
      .split(',')
      .map((s) => parseInt(s, 10))
      .filter((n) => !Number.isNaN(n))
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 7000);

  try {
    const res = await fetch(`${FPL_BASE_URL}/bootstrap-static/`, {
      headers: {
        'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
        'Accept': 'application/json',
      },
      signal: controller.signal,
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json({ asOfEvent: 1, risers: [], fallers: [], error: `FPL bootstrap request failed (${res.status})` }, { status: 200 });
    }

    const bootstrap = await res.json();
    const totalPlayers: number = bootstrap.total_players || 1;
    const currentEvent = bootstrap.events.find((e: any) => e.is_current) || bootstrap.events.find((e: any) => e.is_next);

    const teamMap = new Map<number, string>(bootstrap.teams.map((t: any) => [t.id, t.short_name]));

    const risers: PriceAlertPlayer[] = [];
    const fallers: PriceAlertPlayer[] = [];

    for (const p of bootstrap.elements as any[]) {
      // Already moved today - not an upcoming alert, skip.
      if (p.cost_change_event !== 0) continue;

      const net = (p.transfers_in_event || 0) - (p.transfers_out_event || 0);
      const netPct = (net / totalPlayers) * 100;
      const confidence = classify(netPct);
      if (!confidence) continue;

      const entry: PriceAlertPlayer = {
        id: p.id,
        webName: p.web_name,
        teamShort: teamMap.get(p.team) || 'PL',
        elementType: p.element_type,
        cost: p.now_cost / 10,
        ownershipPct: parseFloat(p.selected_by_percent) || 0,
        netTransfersEvent: net,
        costChangeEvent: p.cost_change_event / 10,
        costChangeStart: p.cost_change_start / 10,
        direction: net >= 0 ? 'RISING' : 'FALLING',
        confidence,
        isOwnedByRival: rivalIds.has(p.id),
      };

      if (entry.direction === 'RISING') risers.push(entry);
      else fallers.push(entry);
    }

    const rankOrder = { IMMINENT: 0, LIKELY: 1, WATCH: 2 } as const;
    const byConfidence = (a: PriceAlertPlayer, b: PriceAlertPlayer) =>
      rankOrder[a.confidence] - rankOrder[b.confidence] || Math.abs(b.netTransfersEvent) - Math.abs(a.netTransfersEvent);

    const payload: PriceAlertResponse = {
      asOfEvent: currentEvent?.id ?? 1,
      risers: risers.sort(byConfidence).slice(0, 20),
      fallers: fallers.sort(byConfidence).slice(0, 20),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ asOfEvent: 1, risers: [], fallers: [], error: error.message || 'Failed to compute price alerts' }, { status: 200 });
  } finally {
    clearTimeout(timeoutId);
  }
}
