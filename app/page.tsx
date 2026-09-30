'use client';

import React, { useState, useEffect } from 'react';
import { PitchDuel } from '@/components/pitch/PitchDuel';
import { RivalReconCard } from '@/components/intel/RivalReconCard';
import { HitTaxTracker } from '@/components/transfers/HitTaxTracker';
import { RivalAutopsyCard } from '@/components/intel/RivalAutopsyCard';
import { LeapfrogEngine } from '@/components/transfers/LeapfrogEngine';
import { LeagueResponse, DuelResponse } from '@/types/fpl';
import { SquadPlayer, CandidatePlayer } from '@/lib/leapfrog';

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

  const handleFetchLeague = async (idToFetch: string) => {
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

      if (data.standings.length >= 2) {
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
    handleFetchLeague(leagueIdInput);
  }, []);

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
                    Your Team
                  </label>
                  <select
                    value={selectedUserId ?? ''}
                    onChange={(e) => setSelectedUserId(Number(e.target.value))}
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
                    Target Rival
                  </label>
                  <select
                    value={selectedRivalId ?? ''}
                    onChange={(e) => setSelectedRivalId(Number(e.target.value))}
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
              Intercepting gameweek picks and matchday events...
            </p>
          </div>
        )}

        {!isLoadingDuel && duelData && (
          <div className="space-y-8">
            {/* 1. Live Pitch Duel */}
            <PitchDuel data={duelData} />

            {/* 2. Rival Autopsy & Sharable Roast Card */}
            <RivalAutopsyCard data={duelData} />

            {/* 3. Rival Recon & Chip Asymmetry Arsenal */}
            <RivalReconCard
              user={duelData.user}
              rival={duelData.rival}
              currentGw={duelData.gameweek}
            />

            {/* 4. Hit Tax Break-Even Tracker */}
            <HitTaxTracker
              userId={duelData.user.teamId}
              rivalId={duelData.rival.teamId}
              userName={duelData.user.teamName}
              rivalName={duelData.rival.teamName}
              currentGw={duelData.gameweek}
            />

            {/* 5. Leapfrog Engine with Chasing vs Defending Modes */}
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
