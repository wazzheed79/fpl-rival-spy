'use client';

import React, { useState, useEffect } from 'react';
import { PitchDuel } from '@/components/pitch/PitchDuel';
import { RivalReconCard } from '@/components/intel/RivalReconCard';
import { HitTaxTracker } from '@/components/transfers/HitTaxTracker';
import { RivalAutopsyCard } from '@/components/intel/RivalAutopsyCard';
import { EOMatrixTable } from '@/components/radar/EOMatrixTable';
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
import { LeagueResponse, DuelResponse } from '@/types/fpl';
import { SquadPlayer, CandidatePlayer } from '@/lib/leapfrog';
import { computeRankSwingForecast, SwingPlayer } from '@/lib/rankSwing';
import { ChipPlannerSquadPlayer } from '@/lib/chipPlanner';

const SEASON_TOTAL_GWS = 38;

type TabKey = 'duel' | 'forecast' | 'simulator' | 'league' | 'market';

const STORAGE_KEYS = {
  LEAGUE_ID: 'fpl_spy_league_id',
  USER_ID: 'fpl_spy_user_id',
  RIVAL_ID: 'fpl_spy_rival_id',
};

export default function FplDashboardPage() {
  const [leagueIdInput, setLeagueIdInput] = useState<string>('314');
  const [leagueData, setLeagueData] = useState<LeagueResponse | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRivalId, setSelectedRivalId] = useState<number | null>(null);
  const [duelData, setDuelData] = useState<DuelResponse | null>(null);
  const [isLoadingLeague, setIsLoadingLeague] = useState<boolean>(false);
  const [isLoadingDuel, setIsLoadingDuel] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);
  const [linkCopied, setLinkCopied] = useState<boolean>(false);

  // 1. Initial Load: Read URL params or localStorage on client mount
  useEffect(() => {
    setIsClientLoaded(true);
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const paramLeague = urlParams.get('league');
    const paramUser = urlParams.get('user');
    const paramRival = urlParams.get('rival');

    const savedLeagueId = paramLeague || localStorage.getItem(STORAGE_KEYS.LEAGUE_ID) || '314';
    const savedUserId = paramUser ? Number(paramUser) : Number(localStorage.getItem(STORAGE_KEYS.USER_ID)) || null;
    const savedRivalId = paramRival ? Number(paramRival) : Number(localStorage.getItem(STORAGE_KEYS.RIVAL_ID)) || null;

    setLeagueIdInput(savedLeagueId);
    if (savedUserId) setSelectedUserId(savedUserId);
    if (savedRivalId) setSelectedRivalId(savedRivalId);

    handleFetchLeague(savedLeagueId, savedUserId, savedRivalId);
  }, []);

  // 2. Sync state to URL and localStorage whenever IDs change
  useEffect(() => {
    if (typeof window === 'undefined' || !isClientLoaded) return;

    if (leagueData?.leagueId) {
      localStorage.setItem(STORAGE_KEYS.LEAGUE_ID, leagueData.leagueId.toString());
    }
    if (selectedUserId) {
      localStorage.setItem(STORAGE_KEYS.USER_ID, selectedUserId.toString());
    }
    if (selectedRivalId) {
      localStorage.setItem(STORAGE_KEYS.RIVAL_ID, selectedRivalId.toString());
    }

    if (leagueData?.leagueId && selectedUserId && selectedRivalId) {
      const url = new URL(window.location.href);
      url.searchParams.set('league', leagueData.leagueId.toString());
      url.searchParams.set('user', selectedUserId.toString());
      url.searchParams.set('rival', selectedRivalId.toString());
      window.history.replaceState({}, '', url.toString());
    }
  }, [leagueData?.leagueId, selectedUserId, selectedRivalId, isClientLoaded]);

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

  // 3. Fetch Classic Mini-League Standings with saved target restoration
  const handleFetchLeague = async (
    idToFetch: string,
    restoredUserId?: number | null,
    restoredRivalId?: number | null
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
      localStorage.setItem(STORAGE_KEYS.LEAGUE_ID, idToFetch.trim());

      // Auto-detect or restore managers
      const hasSavedUser = restoredUserId && data.standings.some((c) => c.entry === restoredUserId);
      const hasSavedRival = restoredRivalId && data.standings.some((c) => c.entry === restoredRivalId);

      let targetUser = hasSavedUser ? restoredUserId : null;
      let targetRival = hasSavedRival ? restoredRivalId : null;

      if (!targetUser) {
        // Fallback: 2nd place as user, 1st place as rival
        targetUser = data.standings.length >= 2 ? data.standings[1].entry : data.standings[0]?.entry;
      }
      if (!targetRival) {
        targetRival = data.standings[0]?.entry;
      }

      if (targetUser) {
        setSelectedUserId(targetUser);
        localStorage.setItem(STORAGE_KEYS.USER_ID, targetUser.toString());
      }
      if (targetRival) {
        setSelectedRivalId(targetRival);
        localStorage.setItem(STORAGE_KEYS.RIVAL_ID, targetRival.toString());
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error syncing mini-league');
      setLeagueData(null);
    } finally {
      setIsLoadingLeague(false);
    }
  };

  // 4. Selection change handlers that persist immediately
  const handleUserSelect = (id: number) => {
    setSelectedUserId(id);
    localStorage.setItem(STORAGE_KEYS.USER_ID, id.toString());
  };

  const handleRivalSelect = (id: number) => {
    setSelectedRivalId(id);
    localStorage.setItem(STORAGE_KEYS.RIVAL_ID, id.toString());
  };

  const handleClearSavedSession = () => {
    localStorage.removeItem(STORAGE_KEYS.LEAGUE_ID);
    localStorage.removeItem(STORAGE_KEYS.USER_ID);
    localStorage.removeItem(STORAGE_KEYS.RIVAL_ID);
    setLeagueIdInput('314');
    handleFetchLeague('314');
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

  // Real differential market pool, sourced from /api/differentials (live FPL form/FDR/xGI/ownership)
  // rather than hardcoded placeholder players.
  const [rawPlayerPool, setRawPlayerPool] = useState<CandidatePlayer[]>([]);

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
      // Non-fatal: Leapfrog Engine degrades gracefully with an empty pool.
      setRawPlayerPool([]);
    }
  };

  const leapfrogSquad: SquadPlayer[] = React.useMemo(() => {
    if (!duelData) return [];
    const poolById = new Map(rawPlayerPool.map((c) => [c.id, c]));

    return duelData.user.picks.map((p) => {
      const real = poolById.get(p.id);
      // Fall back to conservative estimates if a squad player fell outside the live data pool.
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

  const marketPool: CandidatePlayer[] = React.useMemo(() => {
    if (!duelData) return [];
    const userPlayerIds = new Set(duelData.user.picks.map((p) => p.id));
    return rawPlayerPool.filter((c) => !userPlayerIds.has(c.id));
  }, [duelData, rawPlayerPool]);

  const rivalPickIds = React.useMemo(() => {
    return duelData ? duelData.rival.picks.map((p) => p.id) : [];
  }, [duelData]);

  const [activeTab, setActiveTab] = useState<TabKey>('duel');

  // Shared derived squads for the predictive rank-swing model and chip war planner - both need
  // real form/FDR per player, sourced from the same differentials pool as the Leapfrog Engine.
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

  const userSwingSquad: SwingPlayer[] = React.useMemo(
    () => (duelData ? toSwingSquad(duelData.user.picks) : []),
    [duelData, rawPlayerPool]
  );
  const rivalSwingSquad: SwingPlayer[] = React.useMemo(
    () => (duelData ? toSwingSquad(duelData.rival.picks) : []),
    [duelData, rawPlayerPool]
  );

  const rankSwingForecast = React.useMemo(() => {
    if (!duelData || userSwingSquad.length === 0) return null;
    const currentMargin = duelData.user.totalPoints - duelData.rival.totalPoints;
    const remainingGws = Math.max(0, SEASON_TOTAL_GWS - duelData.gameweek);
    return computeRankSwingForecast(userSwingSquad, rivalSwingSquad, currentMargin, remainingGws);
  }, [duelData, userSwingSquad, rivalSwingSquad]);

  const chipSquad: ChipPlannerSquadPlayer[] = React.useMemo(() => {
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

  const TABS: Array<{ key: TabKey; label: string; icon: string }> = [
    { key: 'duel', label: 'Duel', icon: '⚔️' },
    { key: 'forecast', label: 'Forecast', icon: '📡' },
    { key: 'simulator', label: 'Simulator', icon: '🎛️' },
    { key: 'league', label: 'League', icon: '🏆' },
    { key: 'market', label: 'Market & Spy', icon: '💹' },
  ];

  if (!isClientLoaded) {
    return null; // Prevents SSR hydration mismatch
  }


  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 selection:bg-cyan-500 selection:text-black">
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 text-lg font-black text-slate-950 shadow-md">
              ⚽
            </span>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
                FPL Rival Spy <span className="text-xs font-semibold text-cyan-400">v1.0</span>
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Localized mini-league intelligence & differential leverage
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {duelData && (
              <>
                <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-900 border border-slate-800 px-3 py-1 text-xs">
                  <span className="text-slate-400">Logged in as:</span>
                  <span className="font-bold text-cyan-400">{duelData.user.teamName}</span>
                  <button
                    onClick={handleClearSavedSession}
                    className="ml-1 text-[10px] text-slate-500 hover:text-rose-400 underline transition-colors"
                    title="Forget saved team and reset"
                  >
                    Switch
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCopyShareLink}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold transition-all shadow-sm ${
                    linkCopied
                      ? 'bg-emerald-500 text-slate-950 ring-1 ring-emerald-400'
                      : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Copy shareable link to this duel"
                >
                  {linkCopied ? '✔ Copied Link!' : '🔗 Share Duel'}
                </button>
              </>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleFetchLeague(leagueIdInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={leagueIdInput}
                onChange={(e) => setLeagueIdInput(e.target.value)}
                placeholder="Mini-League ID"
                className="w-28 sm:w-36 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                type="submit"
                disabled={isLoadingLeague}
                className="rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-slate-950 hover:bg-cyan-400 disabled:opacity-50 transition-colors"
              >
                {isLoadingLeague ? 'Syncing...' : 'Sync'}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
        {errorMessage && (
          <div className="rounded-xl border border-rose-800/80 bg-rose-950/40 p-4 text-xs font-semibold text-rose-300">
            ⚠ {errorMessage}
          </div>
        )}

        {leagueData && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Active Mini-League
                </span>
                <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                  🏆 {leagueData.leagueName}{' '}
                  <span className="font-mono text-xs text-slate-500">
                    (ID: {leagueData.leagueId})
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wider mb-1">
                    Your Team (Auto-Saved)
                  </label>
                  <select
                    value={selectedUserId ?? ''}
                    onChange={(e) => handleUserSelect(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-cyan-400"
                  >
                    {leagueData.standings.map((c) => (
                      <option key={`user-${c.entry}`} value={c.entry}>
                        #{c.rank} {c.playerName} ({c.entryName}) - {c.total} pts
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-bold text-slate-600 mt-4 hidden sm:block">VS</span>

                <div className="flex flex-col">
                  <label className="text-[10px] font-semibold text-rose-400 uppercase tracking-wider mb-1">
                    Target Rival (Auto-Saved)
                  </label>
                  <select
                    value={selectedRivalId ?? ''}
                    onChange={(e) => handleRivalSelect(Number(e.target.value))}
                    className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white outline-none focus:border-rose-400"
                  >
                    {leagueData.standings.map((c) => (
                      <option key={`rival-${c.entry}`} value={c.entry}>
                        #{c.rank} {c.playerName} ({c.entryName}) - {c.total} pts
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </section>
        )}

        {isLoadingDuel && (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
            <p className="text-xs font-semibold text-slate-400">
              Restoring saved duel session & matchday stats...
            </p>
          </div>
        )}

        {!isLoadingDuel && duelData && (
          <div className="space-y-6">
            <nav className="flex items-center gap-1 rounded-2xl border border-slate-800 bg-slate-900/60 p-1.5 shadow-xl overflow-x-auto">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold whitespace-nowrap transition-all ${
                    activeTab === tab.key
                      ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 text-slate-950 shadow-lg'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <span>{tab.icon}</span> {tab.label}
                </button>
              ))}
            </nav>

            {activeTab === 'duel' && (
              <div className="space-y-8">
                <PitchDuel data={duelData} />
                <BanterCardStudio data={duelData} />
                <RivalAutopsyCard data={duelData} />
                <RivalReconCard user={duelData.user} rival={duelData.rival} currentGw={duelData.gameweek} />
                <HitTaxTracker
                  userId={duelData.user.teamId}
                  rivalId={duelData.rival.teamId}
                  userName={duelData.user.teamName}
                  rivalName={duelData.rival.teamName}
                  currentGw={duelData.gameweek}
                />
                <LeapfrogEngine
                  squad={leapfrogSquad}
                  playerPool={marketPool}
                  bank={duelData.user.bank}
                  userTotalPoints={duelData.user.totalPoints}
                  rivalTotalPoints={duelData.rival.totalPoints}
                  currentGw={duelData.gameweek}
                  rivalPicksIds={rivalPickIds}
                />
              </div>
            )}

            {activeTab === 'forecast' && (
              <div className="space-y-8">
                {rankSwingForecast && (
                  <RankSwingForecast
                    forecast={rankSwingForecast}
                    userName={duelData.user.teamName}
                    rivalName={duelData.rival.teamName}
                    remainingGws={Math.max(0, SEASON_TOTAL_GWS - duelData.gameweek)}
                  />
                )}
                <LiveMomentumFeed
                  userId={duelData.user.teamId}
                  rivalId={duelData.rival.teamId}
                  currentGw={duelData.gameweek}
                />
                <HeadToHeadTrendChart
                  userId={duelData.user.teamId}
                  rivalId={duelData.rival.teamId}
                  userName={duelData.user.teamName}
                  rivalName={duelData.rival.teamName}
                />
              </div>
            )}

            {activeTab === 'simulator' && (
              <div className="space-y-8">
                <ScenarioSimulator data={duelData} />
              </div>
            )}

            {activeTab === 'league' && leagueData && (
              <div className="space-y-8">
                <EOMatrixTable
                  leagueId={leagueData.leagueId}
                  currentGw={duelData.gameweek}
                />
                <LeagueThreatBoard
                  leagueId={leagueData.leagueId}
                  highlightUserId={selectedUserId}
                  highlightRivalId={selectedRivalId}
                />
              </div>
            )}

            {activeTab === 'market' && (
              <div className="space-y-8">
                <RivalTransferPredictor
                  rival={duelData.rival}
                  user={duelData.user}
                  marketPool={marketPool}
                  currentGw={duelData.gameweek}
                />
                <PriceAlertFeed rivalIds={rivalPickIds} />
                <ChipWarPlanner squad={chipSquad} chipsUsed={duelData.user.chipsUsed} />
              </div>
            )}

          </div>
        )}
      </div>
    </main>
  );
}
