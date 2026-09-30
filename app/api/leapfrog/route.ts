import { NextResponse } from 'next/server';
import { fetchFPL } from '@/lib/fpl/client';
import { BootstrapStatic, ManagerPicksResponse } from '@/lib/fpl/types';

interface TransferRecommendation {
  sellPlayer: {
    id: number;
    name: string;
    cost: number;
    form: number;
    type: number;
  };
  buyPlayer: {
    id: number;
    name: string;
    team: string;
    cost: number;
    form: number;
    type: number;
    selectedBy: string;
  };
  formDelta: number;
  costDelta: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const myId = searchParams.get('myId');
  let gw = searchParams.get('gw');

  if (!myId) {
    return NextResponse.json({ error: 'myId parameter is required' }, { status: 400 });
  }

  try {
    const staticData = await fetchFPL<BootstrapStatic>('/bootstrap-static/', 900);

    if (!gw) {
      const activeEvent = staticData.events.find((e) => e.is_current) || staticData.events.find((e) => e.is_next);
      gw = activeEvent ? String(activeEvent.id) : '1';
    }

    const myPicks = await fetchFPL<ManagerPicksResponse>(`/entry/${myId}/event/${gw}/picks/`, 60);

    const playerMap = new Map(staticData.elements.map((p) => [p.id, p]));
    const teamMap = new Map(staticData.teams.map((t) => [t.id, t.short_name]));
    const bank = (myPicks.entry_history.bank || 0) / 10;

    const mySquadIds = new Set(myPicks.picks.map((p) => p.element));

    // Find squad underperformers (form < 3.8)
    const squadMeta = myPicks.picks.map((p) => {
      const meta = playerMap.get(p.element);
      return {
        id: p.element,
        name: meta?.web_name ?? 'Unknown',
        type: meta?.element_type ?? 0,
        cost: (meta?.now_cost ?? 0) / 10,
        form: parseFloat(meta?.form ?? '0.0'),
      };
    });

    const candidatesToSell = squadMeta.filter((p) => p.form <= 4.0);

    const recommendations: TransferRecommendation[] = [];

    // Filter potential buys: form >= 4.5, not in current squad
    const viableBuys = staticData.elements
      .filter((p) => !mySquadIds.has(p.id) && parseFloat(p.form) >= 4.5)
      .map((p) => ({
        id: p.id,
        name: p.web_name,
        team: teamMap.get(p.team) || 'PL',
        cost: p.now_cost / 10,
        form: parseFloat(p.form),
        type: p.element_type,
        selectedBy: p.selected_by_percent,
      }));

    // Match affordable replacements of same position
    for (const sell of candidatesToSell) {
      const maxBudget = sell.cost + bank;

      const matchingBuys = viableBuys
        .filter((b) => b.type === sell.type && b.cost <= maxBudget && b.form > sell.form)
        .sort((a, b) => b.form - a.form);

      if (matchingBuys.length > 0) {
        const bestBuy = matchingBuys[0];
        recommendations.push({
          sellPlayer: sell,
          buyPlayer: bestBuy,
          formDelta: parseFloat((bestBuy.form - sell.form).toFixed(1)),
          costDelta: parseFloat((sell.cost - bestBuy.cost).toFixed(1)),
        });
      }

      if (recommendations.length >= 3) break;
    }

    return NextResponse.json({
      bank,
      recommendations,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error generating transfer picks';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
