'use client';

import React, { useState, useEffect } from 'react';
import { PitchDuel } from '@/components/pitch/PitchDuel';
import { RivalReconCard } from '@/components/intel/RivalReconCard';
import { HitTaxTracker } from '@/components/transfers/HitTaxTracker';
import { RivalAutopsyCard } from '@/components/intel/RivalAutopsyCard';
import { EOMatrixTable } from '@/components/radar/EOMatrixTable';
import { LeapfrogEngine } from '@/components/transfers/LeapfrogEngine';
import { LeagueResponse, DuelResponse } from '@/types/fpl';
import { SquadPlayer, CandidatePlayer } from '@/lib/leapfrog';

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
  const [marketPool, setMarketPool] = useState<CandidatePlayer[]>([]);
  const [isLoadingLeague, setIsLoadingLeague] = useState<boolean>(false);
  const [isLoadingDuel, setIsLoadingDuel] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isClientLoaded, setIsClientLoaded] = useState<boolean>(false);

  // 1. Initial Load: Read localStorage on client mount
  useEffect(() => {
    setIsClientLoaded(true);
    const savedLeagueId = localStorage.getItem(STORAGE_KEYS.LEAGUE_ID) || '314';
    const savedUserId = localStorage.getItem(STORAGE_KEYS.USER_ID);
    const savedRivalId = localStorage.getItem(STORAGE_KEYS.RIVAL_ID);

    setLeagueIdInput(savedLeagueId);
    if (savedUserId) setSelectedUserId(Number(savedUserId));
    if (savedRivalId) setSelectedRivalId(Number(savedRivalId));

    handleFetchLeague(savedLeagueId, Number(savedUserId), Number(savedRivalId));
  }, []);

  // 2. Fetch Classic Mini-League Standings with saved target restoration
  const handleFetchLeague = async (
    idToFetch: string,
    restoredUserId?: number,
    restoredRivalId?: number
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

  // 3. Selection change handlers that persist immediately
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

  // 4. Fetch duel when selected pair updates
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
        generateCandidateMarketPool(data);
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

  const leapfrogSquad: SquadPlayer[] = React.useMemo(() => {
    if (!duelData) return [];
    return duelData.user.picks.map((p) => ({
      id: p.id,
      webName: p.webName,
      teamShort: p.teamShort,
      teamCode: p.teamCode,
      photoCode: p.photoCode,
      elementType: p.elementType,
      cost: 6.0,
      sellingPrice: 6.0,
      form: p.effectivePoints > 0 ? Number((p.effectivePoints * 0.8).toFixed(1)) : 2.5,
      xgi: 0.35,
      fdrNext3Avg: p.category === 'WEAPON' ? 2.3 : 3.8,
      localOwnershipPct: p.category === 'SHIELD' ? 80 : 10,
      chanceOfPlaying: 100,
    }));
  }, [duelData]);

  const generateCandidateMarketPool = (currentDuel: DuelResponse) => {
    const userPlayerIds = new Set(currentDuel.user.picks.map((p) => p.id));

    const candidates: CandidatePlayer[] = [
      ...currentDuel.rival.picks.map((rp) => ({
        id: rp.id,
        webName: rp.webName,
        teamShort: rp.teamShort,
        elementType: rp.elementType,
        cost: 6.5,
        form: Number(Math.max(3.5, rp.effectivePoints * 0.9).toFixed(1)),
        xgi: 0.55,
        fdrNext3Avg: 2.3,
        localOwnershipPct: 15,
        chanceOfPlaying: 100,
        isOwnedByRival: true,
      })),
      { id: 901, webName: 'Semenyo', teamShort: 'BOU', elementType: 3, cost: 5.7, form: 5.8, xgi: 0.68, fdrNext3Avg: 2.3, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 902, webName: 'Minteh', teamShort: 'BHA', elementType: 3, cost: 5.5, form: 5.2, xgi: 0.54, fdrNext3Avg: 2.3, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 903, webName: 'Wood', teamShort: 'NFO', elementType: 4, cost: 6.4, form: 6.2, xgi: 0.72, fdrNext3Avg: 2.0, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 904, webName: 'Delap', teamShort: 'IPS', elementType: 4, cost: 5.6, form: 4.8, xgi: 0.49, fdrNext3Avg: 2.6, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 905, webName: 'Aït-Nouri', teamShort: 'WOL', elementType: 2, cost: 4.7, form: 4.5, xgi: 0.38, fdrNext3Avg: 2.3, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 906, webName: 'Lewis', teamShort: 'MCI', elementType: 2, cost: 4.8, form: 4.2, xgi: 0.31, fdrNext3Avg: 2.6, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 907, webName: 'Verbruggen', teamShort: 'BHA', elementType: 1, cost: 4.5, form: 4.0, xgi: 0.0, fdrNext3Avg: 2.3, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
      { id: 908, webName: 'Sels', teamShort: 'NFO', elementType: 1, cost: 4.6, form: 4.6, xgi: 0.0, fdrNext3Avg: 2.0, localOwnershipPct: 0, chanceOfPlaying: 100, isOwnedByRival: false },
    ];

    setMarketPool(candidates.filter((c) => !userPlayerIds.has(c.id)));
  };

  const rivalPickIds = React.useMemo(() => {
    return duelData ? duelData.rival.picks.map((p) => p.id) : [];
  }, [duelData]);

  if (!isClientLoaded) {
    return null; // Prevents SSR hydration mismatch
  }

  return (
    <main className="min-h-screen bg-[#18001f] text-slate-100 selection:bg-[#00ff87] selection:text-black relative">
      {/* Ambient stadium lighting */}
      <div className="fixed top-0 left-1/4 w-[600px] h-[300px] bg-[#38003c]/60 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-1/4 w-[500px] h-[300px] bg-[#00ff87]/5 rounded-full blur-[140px] pointer-events-none -z-10" />

      {/* Broadcast Top Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#240026]/90 backdrop-blur-xl shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#00ff87] to-[#04f5ff] text-xl font-black text-[#18001f] shadow-[0_0_15px_rgba(0,255,135,0.4)]">
              🦁
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-wider text-white uppercase sm:text-lg">
                  FPL Rival Spy
                </h1>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest bg-[#00ff87]/20 border border-[#00ff87]/40 text-[#00ff87] px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(0,255,135,0.2)]">
                  MATCHDAY LIVE
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-medium hidden sm:block">
                Premier League mini-league tactical differential intelligence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {duelData && (
              <div className="hidden md:flex items-center gap-2 rounded-xl bg-[#17001c]/90 border border-white/10 px-3 py-1.5 text-xs shadow-md">
                <span className="text-zinc-400 font-medium">Logged in:</span>
                <span className="font-bold text-[#00ff87]">{duelData.user.teamName}</span>
                <button
                  onClick={handleClearSavedSession}
                  className="ml-1 text-[10px] text-zinc-500 hover:text-[#e90052] underline transition-colors"
                  title="Forget saved team and reset"
                >
                  Switch
                </button>
              </div>
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
                className="w-28 sm:w-36 rounded-xl border border-white/15 bg-[#17001c]/90 px-3 py-1.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-[#00ff87] focus:ring-1 focus:ring-[#00ff87] transition-all font-mono"
              />
              <button
                type="submit"
                disabled={isLoadingLeague}
                className="rounded-xl bg-[#00ff87] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[#18001f] hover:bg-[#00e67a] active:scale-95 disabled:opacity-50 transition-all shadow-[0_0_12px_rgba(0,255,135,0.3)]"
              >
                {isLoadingLeague ? 'Syncing...' : 'Sync'}
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-8">
        {errorMessage && (
          <div className="rounded-xl border border-[#e90052]/60 bg-[#e90052]/10 p-4 text-xs font-semibold text-[#ff6699] flex items-center gap-2 shadow-[0_0_15px_rgba(233,0,82,0.2)]">
            <span className="text-base">⚠</span> {errorMessage}
          </div>
        )}

        {leagueData && (
          <section className="pl-glass rounded-2xl p-5 border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#00ff87]">
                  Active Classic Mini-League
                </span>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-0.5 uppercase tracking-tight">
                  <span className="text-lg">🏆</span> {leagueData.leagueName}{' '}
                  <span className="font-mono text-xs text-zinc-400 font-normal">
                    (ID: {leagueData.leagueId})
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-[#00ff87] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00ff87]" />
                    Your Team (Auto-Saved)
                  </label>
                  <select
                    value={selectedUserId ?? ''}
                    onChange={(e) => handleUserSelect(Number(e.target.value))}
                    className="rounded-xl border border-[#00ff87]/30 bg-[#17001c] px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-[#00ff87] shadow-inner"
                  >
                    {leagueData.standings.map((c) => (
                      <option key={`user-${c.entry}`} value={c.entry}>
                        #{c.rank} {c.playerName} ({c.entryName}) - {c.total} pts
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs font-black text-zinc-500 mt-4 hidden sm:block">VS</span>

                <div className="flex flex-col">
                  <label className="text-[10px] font-black text-[#e90052] uppercase tracking-wider mb-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e90052]" />
                    Target Rival (Auto-Saved)
                  </label>
                  <select
                    value={selectedRivalId ?? ''}
                    onChange={(e) => handleRivalSelect(Number(e.target.value))}
                    className="rounded-xl border border-[#e90052]/30 bg-[#17001c] px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-[#e90052] shadow-inner"
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
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-[#00ff87] border-t-transparent shadow-[0_0_15px_rgba(0,255,135,0.4)]" />
            <p className="text-xs font-bold text-zinc-300 font-mono tracking-wide uppercase">
              Restoring saved duel session & matchday stats...
            </p>
          </div>
        )}

        {!isLoadingDuel && duelData && leagueData && (
          <div className="space-y-8">
            <PitchDuel data={duelData} />

            <RivalAutopsyCard data={duelData} />

            <RivalReconCard
              user={duelData.user}
              rival={duelData.rival}
              currentGw={duelData.gameweek}
            />

            <EOMatrixTable
              leagueId={leagueData.leagueId}
              currentGw={duelData.gameweek}
            />

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
      </div>
    </main>
  );
}
