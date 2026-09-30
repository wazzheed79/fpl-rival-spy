'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface PlayerEOMetric {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number;
  cost: number;
  form: number;
  totalPoints: number;
  livePoints: number;
  rawStartsCount: number;
  rawCaptainCount: number;
  rawTripleCapCount: number;
  rawBenchCount: number;
  leoPercentage: number;
  threatTier: 'CRITICAL_SHIELD' | 'MODERATE_RISK' | 'DIFFERENTIAL' | 'PURE_LEVERAGE';
  owners: string[];
}

interface LeagueEOResponse {
  leagueId: number;
  leagueName: string;
  gameweek: number;
  competitorsSampled: number;
  matrix: PlayerEOMetric[];
}

interface EOMatrixTableProps {
  leagueId: number;
  currentGw: number;
}

const POSITION_MAP: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export const EOMatrixTable: React.FC<EOMatrixTableProps> = ({ leagueId, currentGw }) => {
  const [data, setData] = useState<LeagueEOResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [posFilter, setPosFilter] = useState<number>(0); // 0 = all
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedPlayerId, setExpandedPlayerId] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/league-eo?leagueId=${leagueId}&gw=${currentGw}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load local EO matrix');
        return res.json();
      })
      .then((payload: LeagueEOResponse) => {
        if (isMounted) setData(payload);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [leagueId, currentGw]);

  const filteredMatrix = useMemo(() => {
    if (!data) return [];
    return data.matrix.filter((player) => {
      const matchesTier = tierFilter === 'ALL' || player.threatTier === tierFilter;
      const matchesPos = posFilter === 0 || player.elementType === posFilter;
      const matchesSearch =
        player.webName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        player.teamShort.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTier && matchesPos && matchesSearch;
    });
  }, [data, tierFilter, posFilter, searchQuery]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500 animate-pulse">
        Sampling mini-league starting XIs & calculating localized effective ownership...
      </div>
    );
  }

  if (!data || data.matrix.length === 0) return null;

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      {/* Title & Section Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📡</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Localized EO Matrix & Threat Radar
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Effective Ownership (EO) computed strictly across the top {data.competitorsSampled} managers in{' '}
            <b className="text-cyan-400">{data.leagueName}</b>.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <input
            type="text"
            placeholder="Search player or team..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />

          <select
            value={posFilter}
            onChange={(e) => setPosFilter(Number(e.target.value))}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-white outline-none focus:border-cyan-500 font-bold"
          >
            <option value={0}>All Positions</option>
            <option value={1}>GKP</option>
            <option value={2}>DEF</option>
            <option value={3}>MID</option>
            <option value={4}>FWD</option>
          </select>

          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value)}
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-white outline-none focus:border-cyan-500 font-bold"
          >
            <option value="ALL">All Threat Tiers</option>
            <option value="CRITICAL_SHIELD">🛡️ Critical Shields (≥75%)</option>
            <option value="MODERATE_RISK">⚠️ Moderate Risk (35-74%)</option>
            <option value="DIFFERENTIAL">🎯 Differentials (&lt;35%)</option>
          </select>
        </div>
      </div>

      {/* Threat Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="rounded-xl border border-rose-900/40 bg-rose-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-rose-400">Critical Shields (≥75%)</span>
          <div className="mt-1 text-lg font-black text-white">
            {data.matrix.filter((p) => p.threatTier === 'CRITICAL_SHIELD').length} Players
          </div>
        </div>
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-amber-400">Moderate Threat (35-74%)</span>
          <div className="mt-1 text-lg font-black text-white">
            {data.matrix.filter((p) => p.threatTier === 'MODERATE_RISK').length} Players
          </div>
        </div>
        <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-3">
          <span className="text-[10px] font-bold uppercase text-cyan-400">Weapons (&lt;35%)</span>
          <div className="mt-1 text-lg font-black text-white">
            {data.matrix.filter((p) => p.threatTier === 'DIFFERENTIAL').length} Players
          </div>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-3">
          <span className="text-[10px] font-bold uppercase text-slate-400">Sampled Managers</span>
          <div className="mt-1 text-lg font-black text-white">{data.competitorsSampled} Rivals</div>
        </div>
      </div>

      {/* Main Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-4">Player</th>
              <th className="py-3 px-3">Pos</th>
              <th className="py-3 px-3">Price</th>
              <th className="py-3 px-3">Form</th>
              <th className="py-3 px-4 text-center">Starts / Caps</th>
              <th className="py-3 px-4">Local EO (LEO)</th>
              <th className="py-3 px-4">Threat Level</th>
              <th className="py-3 px-4 text-right">Match Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredMatrix.map((player) => (
              <React.Fragment key={player.id}>
                <tr
                  onClick={() => setExpandedPlayerId(expandedPlayerId === player.id ? null : player.id)}
                  className="hover:bg-slate-800/30 cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                    <span>{player.webName}</span>
                    <span className="font-mono text-[10px] text-slate-400">({player.teamShort})</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-400">{POSITION_MAP[player.elementType]}</td>
                  <td className="py-3 px-3 font-mono text-slate-300">£{player.cost.toFixed(1)}m</td>
                  <td className="py-3 px-3 font-mono font-bold text-cyan-400">{player.form}</td>
                  <td className="py-3 px-4 text-center font-mono text-[11px] text-slate-300">
                    <span>{player.rawStartsCount} starts</span>
                    {player.rawCaptainCount > 0 && (
                      <span className="ml-1.5 font-bold text-amber-400">({player.rawCaptainCount}C)</span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            player.leoPercentage >= 75
                              ? 'bg-rose-500'
                              : player.leoPercentage >= 35
                              ? 'bg-amber-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, player.leoPercentage)}%` }}
                        />
                      </div>
                      <span className="font-mono font-black text-white">{player.leoPercentage}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                        player.threatTier === 'CRITICAL_SHIELD'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : player.threatTier === 'MODERATE_RISK'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                      }`}
                    >
                      {player.threatTier === 'CRITICAL_SHIELD'
                        ? '🛡️ Must Shield'
                        : player.threatTier === 'MODERATE_RISK'
                        ? '⚠️ Danger'
                        : '⚡ Weapon'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-black text-amber-300">
                    {player.livePoints}
                  </td>
                </tr>

                {/* Expanded Row: Shows exact competitors who own this asset */}
                {expandedPlayerId === player.id && (
                  <tr className="bg-slate-950/80">
                    <td colSpan={8} className="py-3 px-6 text-xs text-slate-400 border-b border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-300">Active Owners in League:</span>
                        {player.owners.map((owner, i) => (
                          <span
                            key={i}
                            className="rounded bg-slate-900 border border-slate-800 px-2 py-0.5 text-[11px] text-cyan-300"
                          >
                            {owner}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
