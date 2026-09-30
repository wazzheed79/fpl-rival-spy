import { NextRequest, NextResponse } from 'next/server';
import { TacticalCategory, EnrichedPlayer, ManagerSummary, DuelResponse, SubStatus } from '@/types/fpl';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

async function fetchFpl<T>(endpoint: string, revalidateSeconds: number = 60): Promise<T> {
  const res = await fetch(`${FPL_BASE_URL}${endpoint}`, {
    headers: {
      'User-Agent': 'FPL-Rival-Spy/1.0 (+https://fpl-rival-spy.local)',
    },
    next: { revalidate: revalidateSeconds },
  });

  if (!res.ok) {
    throw new Error(`FPL API error [${endpoint}]: HTTP ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
}

// Check if an outfield formation satisfies FPL legal limits: min 3 DEF, 2 MID, 1 FWD
function isLegalOutfieldFormation(starters: EnrichedPlayer[]): boolean {
  const def = starters.filter((p) => p.elementType === 2).length;
  const mid = starters.filter((p) => p.elementType === 3).length;
  const fwd = starters.filter((p) => p.elementType === 4).length;
  return def >= 3 && mid >= 2 && fwd >= 1;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const rivalId = searchParams.get('rivalId');
  const gwParam = searchParams.get('gw');

  if (!userId || !rivalId) {
    return NextResponse.json(
      { error: 'Missing required query parameters: "userId" and "rivalId"' },
      { status: 400 }
    );
  }

  try {
    const bootstrap = await fetchFpl<{
      events: Array<{ id: number; is_current: boolean; is_next: boolean }>;
      elements: Array<{ id: number; web_name: string; element_type: number; team: number; photo: string }>;
      teams: Array<{ id: number; code: number; short_name: string }>;
    }>('/bootstrap-static/', 300);

    const currentEvent = bootstrap.events.find((e) => e.is_current) || bootstrap.events.find((e) => e.is_next);
    const targetGw = gwParam ? parseInt(gwParam, 10) : (currentEvent?.id ?? 1);

    const teamMetaMap = new Map<number, { shortName: string; code: number }>(
      bootstrap.teams.map((t) => [t.id, { shortName: t.short_name, code: t.code }])
    );

    const playerStaticMap = new Map<
      number,
      { webName: string; elementType: number; teamShort: string; teamCode: number; photoCode: string }
    >(
      bootstrap.elements.map((p) => {
        const team = teamMetaMap.get(p.team) || { shortName: 'UNK', code: 0 };
        return [
          p.id,
          {
            webName: p.web_name,
            elementType: p.element_type,
            teamShort: team.shortName,
            teamCode: team.code,
            photoCode: p.photo.replace(/\.[^/.]+$/, ''),
          },
        ];
      })
    );

    // Fetch fixtures for current GW to detect match completion & provisional BPS
    const [
      fixturesData,
      liveData,
      userEntry,
      rivalEntry,
      userHistory,
      rivalHistory,
      userPicksData,
      rivalPicksData,
    ] = await Promise.all([
      fetchFpl<Array<{ id: number; finished: boolean; finished_provisional: boolean; team_a: number; team_h: number; stats: Array<{ identifier: string; h: Array<{ value: number; element: number }>; a: Array<{ value: number; element: number }> }> }>>(
        `/fixtures/?event=${targetGw}`,
        30
      ),
      fetchFpl<{ elements: Array<{ id: number; stats: Record<string, number>; explain: any }> }>(
        `/event/${targetGw}/live/`,
        30
      ),
      fetchFpl<{ id: number; name: string; player_first_name: string; player_last_name: string; summary_overall_points: number }>(
        `/entry/${userId}/`
      ),
      fetchFpl<{ id: number; name: string; player_first_name: string; player_last_name: string; summary_overall_points: number }>(
        `/entry/${rivalId}/`
      ),
      fetchFpl<{
        chips: Array<{ name: string; time: string; event: number }>;
        current: Array<{ event: number; value: number; bank: number; event_transfers_cost: number }>;
      }>(`/entry/${userId}/history/`),
      fetchFpl<{
        chips: Array<{ name: string; time: string; event: number }>;
        current: Array<{ event: number; value: number; bank: number; event_transfers_cost: number }>;
      }>(`/entry/${rivalId}/history/`),
      fetchFpl<{
        active_chip: string | null;
        entry_history: { event_transfers_cost: number; value: number; bank: number };
        picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean; is_vice_captain: boolean }>;
      }>(`/entry/${userId}/event/${targetGw}/picks/`),
      fetchFpl<{
        active_chip: string | null;
        entry_history: { event_transfers_cost: number; value: number; bank: number };
        picks: Array<{ element: number; position: number; multiplier: number; is_captain: boolean; is_vice_captain: boolean }>;
      }>(`/entry/${rivalId}/event/${targetGw}/picks/`),
    ]);

    // Build map of player finished fixture state & calculate provisional bonus points
    const playerFinishedMap = new Map<number, boolean>();
    const provisionalBonusMap = new Map<number, number>();

    fixturesData.forEach((fixture) => {
      const isFinished = fixture.finished || fixture.finished_provisional;
      const bpsStat = fixture.stats.find((s) => s.identifier === 'bps');

      if (bpsStat) {
        const allBps = [...bpsStat.h, ...bpsStat.a].sort((a, b) => b.value - a.value);
        allBps.forEach((item) => playerFinishedMap.set(item.element, isFinished));

        // Award provisional BPS (3, 2, 1) handling standard ties
        if (allBps.length > 0) {
          const top = allBps[0].value;
          allBps.filter((x) => x.value === top).forEach((x) => provisionalBonusMap.set(x.element, 3));

          const secondTier = allBps.filter((x) => x.value < top);
          if (secondTier.length > 0) {
            const second = secondTier[0].value;
            const pointsToAward = allBps.filter((x) => x.value === top).length > 1 ? 1 : 2;
            secondTier.filter((x) => x.value === second).forEach((x) => provisionalBonusMap.set(x.element, pointsToAward));
          }
        }
      }
    });

    const liveStatsMap = new Map<number, { points: number; stats: any }>(
      liveData.elements.map((el) => [
        el.id,
        {
          points: el.stats.total_points ?? 0,
          stats: {
            minutes: el.stats.minutes ?? 0,
            goals: el.stats.goals_scored ?? 0,
            assists: el.stats.assists ?? 0,
            cleanSheets: el.stats.clean_sheets ?? 0,
            bonus: el.stats.bonus ?? 0,
            bps: el.stats.bps ?? 0,
          },
        },
      ])
    );

    const userStarterIds = new Set(userPicksData.picks.filter((p) => p.position <= 11).map((p) => p.element));
    const rivalStarterIds = new Set(rivalPicksData.picks.filter((p) => p.position <= 11).map((p) => p.element));

    // Enrich players with live stats and categories
    const enrichPicksInitial = (picks: typeof userPicksData.picks, isUser: boolean): EnrichedPlayer[] => {
      return picks.map((pick) => {
        const staticMeta = playerStaticMap.get(pick.element) || {
          webName: 'Unknown',
          elementType: 1,
          teamShort: 'UNK',
          teamCode: 0,
          photoCode: '',
        };
        const live = liveStatsMap.get(pick.element) || {
          points: 0,
          stats: { minutes: 0, goals: 0, assists: 0, cleanSheets: 0, bonus: 0, bps: 0 },
        };

        const isStarter = pick.position <= 11;
        let category: TacticalCategory;

        if (isUser) {
          category = rivalStarterIds.has(pick.element) ? 'SHIELD' : 'WEAPON';
        } else {
          category = userStarterIds.has(pick.element) ? 'SHIELD' : 'DANGER';
        }

        const provBonus = provisionalBonusMap.get(pick.element) ?? 0;
        const officialBonus = live.stats.bonus ?? 0;
        const bonusDelta = Math.max(0, provBonus - officialBonus);

        return {
          id: pick.element,
          webName: staticMeta.webName,
          teamShort: staticMeta.teamShort,
          teamCode: staticMeta.teamCode,
          photoCode: staticMeta.photoCode,
          elementType: staticMeta.elementType,
          position: pick.position,
          isStarter,
          multiplier: pick.multiplier,
          isCaptain: pick.is_captain,
          isViceCaptain: pick.is_vice_captain,
          category,
          rawLivePoints: live.points + bonusDelta,
          provisionalBonus: provBonus,
          effectivePoints: (live.points + bonusDelta) * pick.multiplier,
          subStatus: isStarter ? 'ACTIVE' : 'BENCHED',
          hasFinishedMatch: playerFinishedMap.get(pick.element) ?? false,
          stats: live.stats,
        };
      });
    };

    // ==========================================
    // AUTOSUBSTITUTION & VICE-CAPTAIN ALGORITHM
    // ==========================================
    const applyAutosubsAndCaptaincy = (picks: EnrichedPlayer[], activeChip: string | null) => {
      const isBenchBoost = activeChip === 'bboost';
      let enriched = picks.map((p) => ({ ...p }));

      // 1. Bench Boost: All 15 players play
      if (isBenchBoost) {
        enriched = enriched.map((p) => ({
          ...p,
          isStarter: true,
          multiplier: p.multiplier === 0 ? 1 : p.multiplier,
          subStatus: 'ACTIVE',
        }));
      } else {
        // 2. GK Autosub Check
        const startingGk = enriched.find((p) => p.position === 1);
        const benchGk = enriched.find((p) => p.position === 12);

        if (
          startingGk &&
          benchGk &&
          startingGk.hasFinishedMatch &&
          startingGk.stats.minutes === 0 &&
          benchGk.stats.minutes > 0
        ) {
          startingGk.isStarter = false;
          startingGk.multiplier = 0;
          startingGk.subStatus = 'SUBBED_OFF';

          benchGk.isStarter = true;
          benchGk.multiplier = 1;
          benchGk.subStatus = 'SUBBED_ON';
        }

        // 3. Outfield Autosub Check (Positions 2-11 vs Bench 13, 14, 15)
        const outfieldStarters = enriched.filter((p) => p.position >= 2 && p.position <= 11);
        const outfieldBench = enriched.filter((p) => p.position >= 13 && p.position <= 15);

        for (const starter of outfieldStarters) {
          if (starter.hasFinishedMatch && starter.stats.minutes === 0) {
            // Find first available bench player that maintains a legal formation
            for (const sub of outfieldBench) {
              if (sub.subStatus === 'BENCHED' && (sub.stats.minutes > 0 || !sub.hasFinishedMatch)) {
                // Test formation with this sub replacing this starter
                const simulatedStarters = outfieldStarters
                  .filter((p) => p.id !== starter.id && p.subStatus !== 'SUBBED_OFF')
                  .concat([sub]);

                if (isLegalOutfieldFormation(simulatedStarters)) {
                  starter.isStarter = false;
                  starter.multiplier = 0;
                  starter.subStatus = 'SUBBED_OFF';

                  sub.isStarter = true;
                  sub.multiplier = 1;
                  sub.subStatus = 'SUBBED_ON';
                  break;
                }
              }
            }
          }
        }
      }

      // 4. Vice-Captain Promotion Check
      let viceInherited = false;
      const captain = enriched.find((p) => p.isCaptain);
      const viceCaptain = enriched.find((p) => p.isViceCaptain);

      if (
        captain &&
        viceCaptain &&
        captain.hasFinishedMatch &&
        captain.stats.minutes === 0 &&
        (viceCaptain.stats.minutes > 0 || !viceCaptain.hasFinishedMatch)
      ) {
        const savedMultiplier = captain.multiplier;
        captain.multiplier = 0;
        viceCaptain.multiplier = savedMultiplier;
        viceInherited = true;
      }

      // Recalculate effective points post-autosub
      enriched = enriched.map((p) => ({
        ...p,
        effectivePoints: p.rawLivePoints * p.multiplier,
      }));

      return { enriched, viceInherited };
    };

    const userProcessed = applyAutosubsAndCaptaincy(
      enrichPicksInitial(userPicksData.picks, true),
      userPicksData.active_chip
    );
    const rivalProcessed = applyAutosubsAndCaptaincy(
      enrichPicksInitial(rivalPicksData.picks, false),
      rivalPicksData.active_chip
    );

    const calcLiveScore = (picks: EnrichedPlayer[]) =>
      picks.reduce((sum, p) => sum + (p.isStarter ? p.effectivePoints : 0), 0);

    const userLiveStarterPoints = calcLiveScore(userProcessed.enriched);
    const rivalLiveStarterPoints = calcLiveScore(rivalProcessed.enriched);

    const userCost = userPicksData.entry_history?.event_transfers_cost ?? 0;
    const rivalCost = rivalPicksData.entry_history?.event_transfers_cost ?? 0;

    const userNetScore = userLiveStarterPoints - userCost;
    const rivalNetScore = rivalLiveStarterPoints - rivalCost;

    const userCapPick = userProcessed.enriched.find((p) => p.multiplier >= 2);
    const rivalCapPick = rivalProcessed.enriched.find((p) => p.multiplier >= 2);

    const userLastHistory = userHistory.current[userHistory.current.length - 1];
    const rivalLastHistory = rivalHistory.current[rivalHistory.current.length - 1];

    const userSummary: ManagerSummary = {
      teamId: parseInt(userId, 10),
      managerName: `${userEntry.player_first_name} ${userEntry.player_last_name}`.trim(),
      teamName: userEntry.name,
      bank: (userPicksData.entry_history?.bank ?? userLastHistory?.bank ?? 0) / 10,
      squadValue: (userPicksData.entry_history?.value ?? userLastHistory?.value ?? 0) / 10,
      totalPoints: userEntry.summary_overall_points,
      eventTransfersCost: userCost,
      activeChip: userPicksData.active_chip,
      chipsUsed: userHistory.chips,
      captain: userCapPick
        ? {
            id: userCapPick.id,
            name: userCapPick.webName,
            multiplier: userCapPick.multiplier,
            isInheritedVice: userProcessed.viceInherited,
          }
        : null,
      liveStartingPoints: userLiveStarterPoints,
      liveNetPoints: userNetScore,
      picks: userProcessed.enriched,
    };

    const rivalSummary: ManagerSummary = {
      teamId: parseInt(rivalId, 10),
      managerName: `${rivalEntry.player_first_name} ${rivalEntry.player_last_name}`.trim(),
      teamName: rivalEntry.name,
      bank: (rivalPicksData.entry_history?.bank ?? rivalLastHistory?.bank ?? 0) / 10,
      squadValue: (rivalPicksData.entry_history?.value ?? rivalLastHistory?.value ?? 0) / 10,
      totalPoints: rivalEntry.summary_overall_points,
      eventTransfersCost: rivalCost,
      activeChip: rivalPicksData.active_chip,
      chipsUsed: rivalHistory.chips,
      captain: rivalCapPick
        ? {
            id: rivalCapPick.id,
            name: rivalCapPick.webName,
            multiplier: rivalCapPick.multiplier,
            isInheritedVice: rivalProcessed.viceInherited,
          }
        : null,
      liveStartingPoints: rivalLiveStarterPoints,
      liveNetPoints: rivalNetScore,
      picks: rivalProcessed.enriched,
    };

    const sharedShieldsCount = [...userStarterIds].filter((id) => rivalStarterIds.has(id)).length;

    const responsePayload: DuelResponse = {
      gameweek: targetGw,
      armbandClash: {
        isNeutralized: !!userCapPick && !!rivalCapPick && userCapPick.id === rivalCapPick.id,
        userCaptain: userCapPick ? userCapPick.webName : 'None',
        rivalCaptain: rivalCapPick ? rivalCapPick.webName : 'None',
        userViceInherited: userProcessed.viceInherited,
        rivalViceInherited: rivalProcessed.viceInherited,
      },
      metrics: {
        sharedShieldsCount,
        userWeaponsCount: userStarterIds.size - sharedShieldsCount,
        rivalDangersCount: rivalStarterIds.size - sharedShieldsCount,
        netScoreSwing: userNetScore - rivalNetScore,
      },
      user: userSummary,
      rival: rivalSummary,
    };

    return NextResponse.json(responsePayload, { status: 200 });
  } catch (error: any) {
    console.error('Error in /api/manager handler:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
