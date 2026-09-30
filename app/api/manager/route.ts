import { NextResponse } from 'next/server';
import { fetchFPL } from '@/lib/fpl/client';
import { BootstrapStatic, ManagerPicksResponse, EnrichedPick } from '@/lib/fpl/types';

interface LiveEventResponse {
  elements: Array<{
    id: number;
    stats: {
      total_points: number;
      minutes: number;
      goals_scored: number;
      assists: number;
      clean_sheets: number;
      bonus: number;
    };
  }>;
}

interface ManagerHistoryResponse {
  chips: Array<{
    name: string;
    time: string;
    event: number;
  }>;
}

export interface EnrichedLivePick extends EnrichedPick {
  livePoints: number;
  effectivePoints: number;
  minutes: number;
}

export interface ChipStatus {
  name: string;
  key: string;
  playedEvent: number | null;
  isAvailable: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const myId = searchParams.get('myId');
  const rivalId = searchParams.get('rivalId');
  let gw = searchParams.get('gw');

  if (!myId || !rivalId) {
    return NextResponse.json({ error: 'myId and rivalId are required query parameters' }, { status: 400 });
  }

  try {
    const staticData = await fetchFPL<BootstrapStatic>('/bootstrap-static/', 900);

    if (!gw) {
      const activeEvent = staticData.events.find((e) => e.is_current) || staticData.events.find((e) => e.is_next);
      gw = activeEvent ? String(activeEvent.id) : '1';
    }

    const [myPicks, rivalPicks, myHistory, rivalHistory, liveData] = await Promise.all([
      fetchFPL<ManagerPicksResponse>(`/entry/${myId}/event/${gw}/picks/`, 60),
      fetchFPL<ManagerPicksResponse>(`/entry/${rivalId}/event/${gw}/picks/`, 60),
      fetchFPL<ManagerHistoryResponse>(`/entry/${myId}/history/`, 300).catch(() => ({ chips: [] })),
      fetchFPL<ManagerHistoryResponse>(`/entry/${rivalId}/history/`, 300).catch(() => ({ chips: [] })),
      fetchFPL<LiveEventResponse>(`/event/${gw}/live/`, 30).catch(() => ({ elements: [] })),
    ]);

    const playerMap = new Map(staticData.elements.map((p) => [p.id, p]));
    const liveStatsMap = new Map(liveData.elements.map((el) => [el.id, el.stats]));

    const myStarterIds = new Set(myPicks.picks.filter((p) => p.position <= 11).map((p) => p.element));
    const rivalStarterIds = new Set(rivalPicks.picks.filter((p) => p.position <= 11).map((p) => p.element));

    const classify = (elementId: number, isMyTeam: boolean): 'SHIELD' | 'WEAPON' | 'RIVAL_DANGER' => {
      const isShared = myStarterIds.has(elementId) && rivalStarterIds.has(elementId);
      if (isShared) return 'SHIELD';
      return isMyTeam ? 'WEAPON' : 'RIVAL_DANGER';
    };

    const enrich = (picks: ManagerPicksResponse['picks'], isMyTeam: boolean): EnrichedLivePick[] =>
      picks.map((pick) => {
        const meta = playerMap.get(pick.element);
        const stats = liveStatsMap.get(pick.element);
        const rawPoints = stats?.total_points ?? 0;
        const multiplier = pick.multiplier;
        
        return {
          ...pick,
          name: meta?.web_name ?? 'Unknown',
          type: meta?.element_type ?? 0,
          cost: (meta?.now_cost ?? 0) / 10,
          form: meta?.form ?? '0.0',
          duelRole: classify(pick.element, isMyTeam),
          livePoints: rawPoints,
          effectivePoints: rawPoints * multiplier,
          minutes: stats?.minutes ?? 0,
        };
      });

    const enrichedMyPicks = enrich(myPicks.picks, true);
    const enrichedRivalPicks = enrich(rivalPicks.picks, false);

    const calculateTotal = (picks: EnrichedLivePick[], chip: string | null) => {
      return picks.reduce((acc, p) => {
        if (p.position <= 11 || chip === 'bboost') {
          return acc + p.effectivePoints;
        }
        return acc;
      }, 0);
    };

    const myLiveTotal = calculateTotal(enrichedMyPicks, myPicks.active_chip);
    const rivalLiveTotal = calculateTotal(enrichedRivalPicks, rivalPicks.active_chip);

    // Audit Standard Chips
    const standardChips = [
      { name: 'Wildcard 1', key: 'wildcard' },
      { name: 'Free Hit', key: 'freehit' },
      { name: 'Triple Captain', key: '3xc' },
      { name: 'Bench Boost', key: 'bboost' },
    ];

    const auditChips = (history: ManagerHistoryResponse): ChipStatus[] => {
      return standardChips.map((chip) => {
        const used = history.chips.find((c) => c.name === chip.key);
        return {
          name: chip.name,
          key: chip.key,
          playedEvent: used ? used.event : null,
          isAvailable: !used,
        };
      });
    };

    return NextResponse.json({
      gameweek: Number(gw),
      netDelta: myLiveTotal - rivalLiveTotal,
      myTeam: {
        picks: enrichedMyPicks,
        chip: myPicks.active_chip,
        bank: myPicks.entry_history.bank / 10,
        liveTotal: myLiveTotal,
        chipsInventory: auditChips(myHistory),
      },
      rivalTeam: {
        picks: enrichedRivalPicks,
        chip: rivalPicks.active_chip,
        bank: rivalPicks.entry_history.bank / 10,
        liveTotal: rivalLiveTotal,
        chipsInventory: auditChips(rivalHistory),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
