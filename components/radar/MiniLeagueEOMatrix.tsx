'use client';

import React, { useEffect, useState } from 'react';

export interface MiniLeagueEOPlayer {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number;
  ownershipCount: number;
  ownershipPct: number;
  captainCount: number;
  captainPct: number;
  effectiveOwnershipPct: number;
  isOwnedByUser: boolean;
  isOwnedByRival: boolean;
}

interface MiniLeagueEOMatrixProps {
  leagueId: number;
  userId: number;
  rivalId: number;
  userName: string;
  rivalName: string;
}

const POSITION_NAMES: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export const MiniLeagueEOMatrix: React.FC<MiniLeagueEOMatrixProps> = ({
  leagueId,
  userId,
  rivalId,
  userName,
  rivalName,
}) => {
  const [players, setPlayers] = useState<MiniLeagueEOPlayer[]>([]);
  const [sampleSize, setSampleSize] = useState<number>(0);
  const [filterPos, setFilterPos] = useState<number | 'ALL'>('ALL');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch(`/api/league/eo?leagueId=${leagueId}&userId=${userId}&rivalId=${rivalId}&sample=15`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setPlayers(data.players || []);
          setSampleSize(data.sampleSize || 0);
        }
      })
      .catch(() => {
        if (!cancelled) setPlayers([]);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [leagueId, userId, rivalId]);

  const filtered = players.filter((p) => {
    if (filterPos === 'ALL') return true;
    return p.elementType === filterPos;
  });

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Localized Mini-League EO Matrix
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real Effective Ownership calculated exclusively across the top {sampleSize || 15} managers in your league.
          </p>
        </div>

        {/* Position filters */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {(['ALL', 1, 2, 3, 4] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => setFilterPos(pos)}
              className={`px-3 py-1 font-bold rounded-lg transition-all ${
                filterPos === pos
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {pos === 'ALL' ? 'ALL' : POSITION_NAMES[pos]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500 text-center py-10">
          Calculating local ownership and captaincy stakes across mini-league squads...
        </p>
      ) : players.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-10">
          No live mini-league data available.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="text-left py-2 pr-2">Player</th>
                <th className="text-left py-2 pr-2">Pos</th>
                <th className="text-right py-2 pr-3">Mini-League EO</th>
                <th className="text-right py-2 pr-3">Cap %</th>
                <th className="text-right py-2 pr-3">Ownership</th>
                <th className="text-center py-2 pr-2">You</th>
                <th className="text-center py-2">Rival</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const isEoHigh = p.effectiveOwnershipPct >= 100;
                const isEoMedium = p.effectiveOwnershipPct >= 50 && p.effectiveOwnershipPct < 100;

                return (
                  <tr key={p.id} className="border-b border-slate-900 hover:bg-slate-900/40">
                    <td className="py-2.5 pr-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {p.webName}
                        <span className="text-[10px] text-slate-500 font-mono font-normal">
                          ({p.teamShort})
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-2 text-slate-400 font-mono text-[11px]">
                      {POSITION_NAMES[p.elementType]}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono font-bold">
                      <span
                        className={
                          isEoHigh
                            ? 'text-rose-400 font-black'
                            : isEoMedium
                            ? 'text-amber-400'
                            : 'text-slate-300'
                        }
                      >
                        {p.effectiveOwnershipPct}%
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-slate-400">
                      {p.captainPct > 0 ? (
                        <span className="text-cyan-400 font-semibold">{p.captainPct}%</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono text-slate-400">
                      {p.ownershipPct}% ({p.ownershipCount}/{sampleSize})
                    </td>
                    <td className="py-2.5 pr-2 text-center">
                      {p.isOwnedByUser ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                          OWNED
                        </span>
                      ) : (
                        <span className="text-slate-700 font-mono">—</span>
                      )}
                    </td>
                    <td className="py-2.5 text-center">
                      {p.isOwnedByRival ? (
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                          OWNED
                        </span>
                      ) : (
                        <span className="text-slate-700 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
