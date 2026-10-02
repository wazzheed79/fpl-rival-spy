"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PitchDuel } from '@/components/pitch/PitchDuel';
import { PitchPlayer } from '@/components/pitch/PlayerCard';
import { RivalAutopsyCard, AutopsyMetrics } from '@/components/intel/RivalAutopsyCard';
import { EOMatrixTable, EORow } from '@/components/radar/EOMatrixTable';
import { RivalReconCard } from '@/components/intel/RivalReconCard';
import { HitTaxTracker } from '@/components/transfers/HitTaxTracker';
import { LeapfrogEngine } from '@/components/transfers/LeapfrogEngine';
import { RankSwingForecast } from '@/components/radar/RankSwingForecast';
import { HeadToHeadTrendChart } from '@/components/radar/HeadToHeadTrendChart';
import { LiveMomentumFeed } from '@/components/intel/LiveMomentumFeed';
import { LeagueThreatBoard } from '@/components/league/LeagueThreatBoard';
import { PriceAlertFeed } from '@/components/transfers/PriceAlertFeed';
import { ChipWarPlanner } from '@/components/intel/ChipWarPlanner';
import { RivalTransferPredictor } from '@/components/intel/RivalTransferPredictor';
import { BanterCardStudio } from '@/components/intel/BanterCardStudio';
import { ScenarioSimulator } from '@/components/radar/ScenarioSimulator';
import { MiniLeagueEOMatrix } from '@/components/radar/MiniLeagueEOMatrix';
import { LeagueResponse, DuelResponse, ManagerSummary } from '@/types/fpl';
import { SquadPlayer, CandidatePlayer } from '@/lib/leapfrog';
import { computeRankSwingForecast, SwingPlayer } from '@/lib/rankSwing';
import { ChipPlannerSquadPlayer } from '@/lib/chipPlanner';

const SEASON_TOTAL_GWS = 38;

type TabKey = 'duel' | 'forecast' | 'simulator' | 'league' | 'market';

const sampleUserSquad = {
  managerName: 'You (Tactician)',
  teamName: 'Title Chasers FC',
  totalPoints: 68,
  players: [
    { id: 1, webName: 'Raya', position: 'GKP' as const, teamShort: 'ARS', points: 6, status: 'finished' as const },
    { id: 2, webName: 'Gabriel', position: 'DEF' as const, teamShort: 'ARS', points: 8, status: 'finished' as const },
    { id: 3, webName: 'Alexander-Arnold', position: 'DEF' as const, teamShort: 'LIV', points: 7, status: 'finished' as const },
    { id: 4, webName: 'Gvardiol', position: 'DEF' as const, teamShort: 'MCI', points: 2, status: 'finished' as const },
    { id: 5, webName: 'Palmer', position: 'MID' as const, teamShort: 'CHE', points: 12, isDifferential: true, status: 'playing' as const, liveMinutes: 72 },
    { id: 6, webName: 'Saka', position: 'MID' as const, teamShort: 'ARS', points: 9, status: 'finished' as const },
    { id: 7, webName: 'Mbeumo', position: 'MID' as const, teamShort: 'BRE', points: 8, status: 'finished' as const },
    { id: 8, webName: 'Rogers', position: 'MID' as const, teamShort: 'AVL', points: 3, status: 'finished' as const },
    { id: 9, webName: 'Haaland', position: 'FWD' as const, teamShort: 'MCI', points: 13, isCaptain: true, status: 'playing' as const, liveMinutes: 85 },
    { id: 10, webName: 'Watkins', position: 'FWD' as const, teamShort: 'AVL', points: 5, status: 'finished' as const },
    { id: 11, webName: 'Wood', position: 'FWD' as const, teamShort: 'NFO', points: 2, status: 'finished' as const }
  ]
};

const sampleRivalSquad = {
  managerName: 'Rival Leader',
  teamName: 'Lucky Punts XI',
  totalPoints: 54,
  players: [
    { id: 101, webName: 'Pickford', position: 'GKP' as const, teamShort: 'EVE', points: 3, status: 'finished' as const },
    { id: 102, webName: 'Saliba', position: 'DEF' as const, teamShort: 'ARS', points: 6, status: 'finished' as const },
    { id: 103, webName: 'Robinson', position: 'DEF' as const, teamShort: 'FUL', points: 1, status: 'finished' as const },
    { id: 104, webName: 'Pedro Porro', position: 'DEF' as const, teamShort: 'TOT', points: 4, status: 'finished' as const },
    { id: 105, webName: 'Salah', position: 'MID' as const, teamShort: 'LIV', points: 15, isCaptain: true, status: 'finished' as const },
    { id: 106, webName: 'Son', position: 'MID' as const, teamShort: 'TOT', points: 2, isDifferential: true, status: 'finished' as const },
    { id: 107, webName: 'Luis Díaz', position: 'MID' as const, teamShort: 'LIV', points: 3, status: 'finished' as const },
    { id: 108, webName: 'Smith Rowe', position: 'MID' as const, teamShort: 'FUL', points: 2, status: 'finished' as const },
    { id: 109, webName: 'Haaland', position: 'FWD' as const, teamShort: 'MCI', points: 13, isViceCaptain: true, status: 'playing' as const, liveMinutes: 85 },
    { id: 110, webName: 'Solanke', position: 'FWD' as const, teamShort: 'TOT', points: 2, status: 'finished' as const },
    { id: 111, webName: 'Isak', position: 'FWD' as const, teamShort: 'NEW', points: 3, status: 'finished' as const }
  ]
};

const sampleEoData: EORow[] = [
  { id: 1, name: 'Haaland', team: 'MCI', leagueEo: 160.0, globalEo: 142.5, userOwned: true },
  { id: 2, name: 'Salah', team: 'LIV', leagueEo: 88.5, globalEo: 65.2, userOwned: false },
  { id: 3, name: 'Palmer', team: 'CHE', leagueEo: 25.0, globalEo: 52.0, userOwned: true },
  { id: 4, name: 'Saka', team: 'ARS', leagueEo: 75.0, globalEo: 68.0, userOwned: true },
  { id: 5, name: 'Son', team: 'TOT', leagueEo: 50.0, globalEo: 22.0, userOwned: false }
];

const sampleAutopsy: AutopsyMetrics = {
  rivalName: 'Lucky Punts XI',
  gameweek: 7,
  pointsOnBench: 14,
  benchedTopScorer: 'Aina (9 pts)',
  captainPointsLost: 6,
  transferCostTax: 4,
  transferredOutScored: 8,
  transferredInScored: 2
};

function toTeamSquad(summary: ManagerSummary, isUser: boolean) {
  const posMap: Record<number, 'GKP' | 'DEF' | 'MID' | 'FWD'> = {
    1: 'GKP',
    2: 'DEF',
    3: 'MID',
    4: 'FWD',
  };

  const startingPicks = summary.picks.filter((p) => p.isStarter);

  const players: PitchPlayer[] = startingPicks.map((p) => {
    let status: 'playing' | 'benched' | 'finished' | 'upcoming' = 'upcoming';
    if (p.hasFinishedMatch) {
      status = 'finished';
    } else if (p.stats.minutes > 0) {
      status = 'playing';
    }

    return {
      id: p.id,
      webName: p.webName,
      position: posMap[p.elementType] || 'MID',
      teamShort: p.teamShort,
      points: p.effectivePoints,
      isCaptain: p.isCaptain,
      isViceCaptain: p.isViceCaptain,
      isDifferential: p.category === (isUser ? 'WEAPON' : 'DANGER'),
      status,
      liveMinutes: p.stats.minutes,
      bonusPoints: p.provisionalBonus,
    };
  });

  return {
    managerName: summary.managerName,
    teamName: summary.teamName,
    totalPoints: summary.totalPoints,
    players,
  };
}

function toAutopsyMetrics(duel: DuelResponse): AutopsyMetrics {
  const bench = duel.rival.picks.filter((p) => !p.isStarter);
  const pointsOnBench = bench.reduce((sum, p) => sum + p.rawLivePoints, 0);
  const topBenched = bench.slice().sort((a, b) => b.rawLivePoints - a.rawLivePoints)[0];
  const benchedTopScorer = topBenched ? `${topBenched.webName} (${topBenched.rawLivePoints} pts)` : 'None';

  const starters = duel.rival.picks.filter((p) => p.isStarter);
  const captainPick = starters.find((p) => p.isCaptain);
  const bestStarter = starters.slice().sort((a, b) => b.rawLivePoints - a.rawLivePoints)[0];
  const captainPointsLost =
    bestStarter && captainPick ? Math.max(0, bestStarter.rawLivePoints - captainPick.rawLivePoints) : 0;

  return {
    rivalName: duel.rival.managerName,
    gameweek: duel.gameweek,
    pointsOnBench,
    benchedTopScorer,
    captainPointsLost,
    transferCostTax: duel.rival.eventTransfersCost,
    transferredOutScored: 0,
    transferredInScored: 0,
  };
}

export default function FplDashboardPage() {
  const [leagueIdInput, setLeagueIdInput] = useState<string>('314');
  const [leagueData, setLeagueData] = useState<LeagueResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRivalId, setSelectedRivalId] = useState<number | null>(null);
  const [duelData, setDuelData] = useState<DuelResponse | null>(null);
  const [isLoadingLeague, setIsLoadingLeague] = useState<boolean>(false);
  const [isLoadingDuel, setIsLoadingDuel] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabKey>('duel');
  const [rawPlayerPool, setRawPlayerPool] = useState<CandidatePlayer[]>([]);

  // Load initial settings from URL params or localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paramLeague = urlParams.get('league');
    const paramUser = urlParams.get('user');
    const paramRival = urlParams.get('rival');

    const savedLeague = paramLeague || localStorage.getItem('fpl_spy_league') || '314';
    const savedUser = paramUser ? Number(paramUser) : Number(localStorage.getItem('fpl_spy_user')) || null;
    const savedRival = paramRival ? Number(paramRival) : Number(localStorage.getItem('fpl_spy_rival')) || null;

    setLeagueIdInput(savedLeague);
    handleFetchLeague(savedLeague, savedUser, savedRival);
  }, []);

  // Sync state to URL and localStorage whenever IDs change
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (leagueData?.leagueId) {
      localStorage.setItem('fpl_spy_league', leagueData.leagueId.toString());
    }
    if (selectedUserId) {
      localStorage.setItem('fpl_spy_user', selectedUserId.toString());
    }
    if (selectedRivalId) {
      localStorage.setItem('fpl_spy_rival', selectedRivalId.toString());
    }

    if (leagueData?.leagueId && selectedUserId && selectedRivalId) {
      const url = new URL(window.location.href);
      url.searchParams.set('league', leagueData.leagueId.toString());
      url.searchParams.set('user', selectedUserId.toString());
      url.searchParams.set('rival', selectedRivalId.toString());
      window.history.replaceState({}, '', url.toString());
    }
  }, [leagueData?.leagueId, selectedUserId, selectedRivalId]);

  const handleCopyShareLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFetchLeague = async (
    idToFetch: string,
    initialUserId: number | null = null,
    initialRivalId: number | null = null
  ) => {
    if (!idToFetch.trim()) return;
    setIsLoadingLeague(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/league?leagueId=${idToFetch.trim()}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to load mini-league');
      }

      const data: LeagueResponse = await res.json();
      setLeagueData(data);

      const userExists = data.standings.some((c) => c.entry === initialUserId);
      const rivalExists = data.standings.some((c) => c.entry === initialRivalId);

      if (initialUserId && userExists && initialRivalId && rivalExists) {
        setSelectedUserId(initialUserId);
        setSelectedRivalId(initialRivalId);
      } else if (data.standings.length >= 2) {
        setSelectedUserId(data.standings[1].entry);
        setSelectedRivalId(data.standings[0].entry);
      } else if (data.standings.length === 1) {
        setSelectedUserId(data.standings[0].entry);
        setSelectedRivalId(data.standings[0].entry);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error syncing mini-league');
      setLeagueData(null);
    } finally {
      setIsLoadingLeague(false);
    }
  };

  useEffect(() => {
    if (!selectedUserId || !selectedRivalId) return;

    let isSubscribed = true;
    setIsLoadingDuel(true);
    setErrorMessage(null);

    fetch(`/api/manager?userId=${selectedUserId}&rivalId=${selectedRivalId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch head-to-head match data');
        return res.json();
      })
      .then((data: DuelResponse) => {
        if (!isSubscribed) return;
        setDuelData(data);
        fetchMarketPool(data);
      })
      .catch((err) => {
        if (isSubscribed) setErrorMessage(err.message);
      })
      .finally(() => {
        if (isSubscribed) setIsLoadingDuel(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedUserId, selectedRivalId]);

  const fetchMarketPool = async (currentDuel: DuelResponse) => {
    const rivalIds = currentDuel.rival.picks.map((p) => p.id);
    const squadIds = currentDuel.user.picks.map((p) => p.id);
    const forceIds = [...squadIds, ...rivalIds];

    try {
      const res = await fetch(
        `/api/differentials?rivalIds=${rivalIds.join(',')}&forceIds=${forceIds.join(',')}`
      );
      if (!res.ok) throw new Error('Failed to fetch differential market pool');
      const data: CandidatePlayer[] = await res.json();
      setRawPlayerPool(data);
    } catch {
      setRawPlayerPool([]);
    }
  };

  const leapfrogSquad: SquadPlayer[] = useMemo(() => {
    if (!duelData) return [];
    const poolById = new Map(rawPlayerPool.map((c) => [c.id, c]));

    return duelData.user.picks.map((p) => {
      const real = poolById.get(p.id);
      return {
        id: p.id,
        webName: p.webName,
        teamShort: p.teamShort,
        teamCode: p.teamCode,
        photoCode: p.photoCode,
        elementType: p.elementType,
        cost: real?.cost ?? 5.0,
        sellingPrice: real?.cost ?? 5.0,
        form: real?.form ?? 2.5,
        xgi: real?.xgi ?? 0,
        fdrNext3Avg: real?.fdrNext3Avg ?? 3.0,
        localOwnershipPct: p.category === 'SHIELD' ? 100 : 0,
        chanceOfPlaying: real?.chanceOfPlaying ?? 100,
      };
    });
  }, [duelData, rawPlayerPool]);

  const marketPool: CandidatePlayer[] = useMemo(() => {
    if (!duelData) return [];
    const userPlayerIds = new Set(duelData.user.picks.map((p) => p.id));
    return rawPlayerPool.filter((c) => !userPlayerIds.has(c.id));
  }, [duelData, rawPlayerPool]);

  const rivalPickIds = useMemo(() => {
    return duelData ? duelData.rival.picks.map((p) => p.id) : [];
  }, [duelData]);

  const toSwingSquad = (picks: DuelResponse['user']['picks']): SwingPlayer[] => {
    const poolById = new Map(rawPlayerPool.map((c) => [c.id, c]));
    return picks.map((p) => {
      const real = poolById.get(p.id);
      return {
        id: p.id,
        webName: p.webName,
        isStarter: p.isStarter,
        multiplier: p.multiplier,
        form: real?.form ?? 2.5,
        fdrNext3Avg: real?.fdrNext3Avg ?? 3.0,
      };
    });
  };

  const userSwingSquad: SwingPlayer[] = useMemo(
    () => (duelData ? toSwingSquad(duelData.user.picks) : []),
    [duelData, rawPlayerPool]
  );
  const rivalSwingSquad: SwingPlayer[] = useMemo(
    () => (duelData ? toSwingSquad(duelData.rival.picks) : []),
    [duelData, rawPlayerPool]
  );

  const rankSwingForecast = useMemo(() => {
    if (!duelData || userSwingSquad.length === 0) return null;
    const currentMargin = duelData.user.totalPoints - duelData.rival.totalPoints;
    const remainingGws = Math.max(0, SEASON_TOTAL_GWS - duelData.gameweek);
    return computeRankSwingForecast(userSwingSquad, rivalSwingSquad, currentMargin, remainingGws);
  }, [duelData, userSwingSquad, rivalSwingSquad]);

  const chipSquad: ChipPlannerSquadPlayer[] = useMemo(() => {
    if (!duelData) return [];
    const poolById = new Map(rawPlayerPool.map((c) => [c.id, c]));
    return duelData.user.picks.map((p) => ({
      id: p.id,
      webName: p.webName,
      teamShort: p.teamShort,
      elementType: p.elementType,
      form: poolById.get(p.id)?.form ?? 2.5,
      isStarter: p.isStarter,
    }));
  }, [duelData, rawPlayerPool]);

  const effectiveUserSquad = useMemo(() => {
    if (duelData) return toTeamSquad(duelData.user, true);
    return sampleUserSquad;
  }, [duelData]);

  const effectiveRivalSquad = useMemo(() => {
    if (duelData) return toTeamSquad(duelData.rival, false);
    return sampleRivalSquad;
  }, [duelData]);

  const effectiveAutopsy = useMemo(() => {
    if (duelData) return toAutopsyMetrics(duelData);
    return sampleAutopsy;
  }, [duelData]);

  const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'duel', label: 'Duel', icon: '⚔️' },
    { key: 'forecast', label: 'Forecast', icon: '📡' },
    { key: 'simulator', label: 'Simulator', icon: '🎛️' },
    { key: 'league', label: 'League', icon: '🏆' },
    { key: 'market', label: 'Market & Spy', icon: '💹' },
  ];

  return (
    <main className="min-h-screen bg-[#07090e] text-zinc-100 p-4 md:p-8 space-y-8">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_#34d399]" />
            <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">
              FPL Rival Spy <span className="text-emerald-400">Terminal</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time mini-league espionage, tactical duels, and leapfrog analytics.
          </p>
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Mini-League ID"
            value={leagueIdInput}
            onChange={(e) => setLeagueIdInput(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono w-32"
          />
          <button
            onClick={() => handleFetchLeague(leagueIdInput)}
            disabled={isLoadingLeague}
            className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)] disabled:opacity-50"
          >
            {isLoadingLeague ? 'Loading...' : 'Analyze'}
          </button>

          {duelData && (
            <button
              type="button"
              onClick={handleCopyShareLink}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all shadow-sm ${
                linkCopied
                  ? 'bg-emerald-500 text-black'
                  : 'bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              title="Copy shareable link to this duel"
            >
              {linkCopied ? '✓ Link Copied' : '🔗 Share Duel'}
            </button>
          )}
        </div>
      </header>

      {/* Mini-league Manager Selectors */}
      {leagueData && (
        <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-4 backdrop-blur-md">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400">
                Mini-League Active
              </span>
              <h2 className="text-base font-bold text-white">{leagueData.leagueName}</h2>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-zinc-400">Logged in as:</label>
                <select
                  value={selectedUserId || ''}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none"
                >
                  {leagueData.standings.map((c) => (
                    <option key={c.entry} value={c.entry}>
                      {c.playerName} ({c.entryName}) - #{c.rank}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-zinc-400">Target Rival:</label>
                <select
                  value={selectedRivalId || ''}
                  onChange={(e) => setSelectedRivalId(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                >
                  {leagueData.standings.map((c) => (
                    <option key={c.entry} value={c.entry}>
                      {c.playerName} ({c.entryName}) - #{c.rank}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/40 p-4 text-xs text-rose-300">
          {errorMessage}
        </div>
      )}

      {isLoadingDuel && (
        <div className="flex items-center justify-center p-8">
          <span className="text-sm text-zinc-400 animate-pulse font-mono">
            📡 Syncing tactical head-to-head match telemetry...
          </span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-emerald-500 text-black shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'bg-zinc-900/60 text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      {activeTab === 'duel' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              <PitchDuel userSquad={effectiveUserSquad} rivalSquad={effectiveRivalSquad} />
            </div>
            <div className="space-y-6">
              <RivalAutopsyCard metrics={effectiveAutopsy} />
              {duelData && <BanterCardStudio data={duelData} />}
            </div>
          </div>

          {duelData && (
            <div className="space-y-6">
              <RivalReconCard user={duelData.user} rival={duelData.rival} currentGw={duelData.gameweek} />
              <HitTaxTracker
                userId={duelData.user.teamId}
                rivalId={duelData.rival.teamId}
                userName={duelData.user.managerName}
                rivalName={duelData.rival.managerName}
                currentGw={duelData.gameweek}
              />
            </div>
          )}
        </div>
      )}

      {activeTab === 'forecast' && (
        <div className="space-y-8">
          {rankSwingForecast && duelData ? (
            <RankSwingForecast
              forecast={rankSwingForecast}
              userName={duelData.user.managerName}
              rivalName={duelData.rival.managerName}
              remainingGws={Math.max(0, SEASON_TOTAL_GWS - duelData.gameweek)}
            />
          ) : (
            <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
              Load a mini-league match above to calculate the predictive rank swing trajectory.
            </div>
          )}

          {duelData && (
            <HeadToHeadTrendChart
              userId={duelData.user.teamId}
              rivalId={duelData.rival.teamId}
              userName={duelData.user.managerName}
              rivalName={duelData.rival.managerName}
            />
          )}

          {duelData && (
            <LiveMomentumFeed
              userId={duelData.user.teamId}
              rivalId={duelData.rival.teamId}
              currentGw={duelData.gameweek}
            />
          )}
        </div>
      )}

      {activeTab === 'simulator' && (
        <div className="space-y-8">
          {duelData ? (
            <ScenarioSimulator data={duelData} />
          ) : (
            <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-6 text-center text-xs text-zinc-400">
              Load a mini-league match above to run interactive captain and differential simulations.
            </div>
          )}
        </div>
      )}

      {activeTab === 'league' && (
        <div className="space-y-8">
          {leagueData && selectedUserId && selectedRivalId && (
            <MiniLeagueEOMatrix
              leagueId={leagueData.leagueId}
              userId={selectedUserId}
              rivalId={selectedRivalId}
              userName={leagueData.standings.find((c) => c.entry === selectedUserId)?.playerName || 'You'}
              rivalName={leagueData.standings.find((c) => c.entry === selectedRivalId)?.playerName || 'Rival'}
            />
          )}

          <EOMatrixTable data={sampleEoData} />

          {leagueData && (
            <LeagueThreatBoard
              leagueId={leagueData.leagueId}
              highlightUserId={selectedUserId}
              highlightRivalId={selectedRivalId}
            />
          )}
        </div>
      )}

      {activeTab === 'market' && (
        <div className="space-y-8">
          {duelData && (
            <RivalTransferPredictor
              rival={duelData.rival}
              user={duelData.user}
              marketPool={marketPool}
              currentGw={duelData.gameweek}
            />
          )}

          {duelData && (
            <LeapfrogEngine
              squad={leapfrogSquad}
              playerPool={marketPool}
              bank={duelData.user.bank}
              userTotalPoints={duelData.user.totalPoints}
              rivalTotalPoints={duelData.rival.totalPoints}
              currentGw={duelData.gameweek}
              rivalPicksIds={rivalPickIds}
            />
          )}

          {duelData && <PriceAlertFeed rivalIds={rivalPickIds} />}

          {duelData && <ChipWarPlanner squad={chipSquad} chipsUsed={duelData.user.chipsUsed} />}
        </div>
      )}
    </main>
  );
}
