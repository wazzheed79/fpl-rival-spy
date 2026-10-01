'use client';

import React, { useEffect, useState } from 'react';
import { LeagueThreatBoardResponse } from '@/types/fpl';

interface LeagueThreatBoardProps {
  leagueId: number;
  highlightUserId?: number | null;
  highlightRivalId?: number | null;
}

export const LeagueThreatBoard: React.FC<LeagueThreatBoardProps> = ({
  leagueId,
  highlightUserId,
  highlightRivalId,
}) => {
  const [data, setData] = useState<LeagueThreatBoardResponse | null>(null);
  const [view, setView] = useState<'overall' | 'live'>('overall');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/league/live?leagueId=${leagueId}`)
      .then((res) => res.json())
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leagueId]);

  const rows = data ? (view === 'overall' ? data.entries : data.liveGwLeaderboard) : [];

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <h2 className="text-xl font-black tracking-tight text-white">🛰️ League Threat Board</h2>
        <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
          <button
            onClick={() => setView('overall')}
            className={`rounded px-3 py-1 font-bold transition-all ${
              view === 'overall' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            Overall Standings
          </button>
          <button
            onClick={() => setView('live')}
            className={`rounded px-3 py-1 font-bold transition-all ${
              view === 'live' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔴 Live GW Race
          </button>
        </div>
      </div>

      {isLoading && <p className="text-xs text-slate-500 text-center py-6">Scanning every rival in the mini-league...</p>}

      {!isLoading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <th className="text-left py-2 pr-2">#</th>
                <th className="text-left py-2 pr-2">Manager</th>
                <th className="text-right py-2 pr-2">GW Pts</th>
                <th className="text-right py-2 pr-2">Total</th>
                <th className="text-right py-2 pr-2">Rank Δ</th>
                <th className="text-right py-2">Gap Above</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const isUser = r.entry === highlightUserId;
                const isRival = r.entry === highlightRivalId;
                return (
                  <tr
                    key={r.entry}
                    className={`border-b border-slate-900 ${
                      isUser ? 'bg-cyan-950/20' : isRival ? 'bg-rose-950/20' : ''
                    }`}
                  >
                    <td className="py-2 pr-2 font-mono text-slate-400">
                      {view === 'overall' ? r.rank : (r as any).liveGwRank}
                    </td>
                    <td className="py-2 pr-2">
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {r.entryName}
                        {isUser && <span className="text-[9px] text-cyan-400 font-black uppercase">You</span>}
                        {isRival && <span className="text-[9px] text-rose-400 font-black uppercase">Rival</span>}
                      </div>
                      <div className="text-slate-500">{r.playerName}</div>
                    </td>
                    <td className="py-2 pr-2 text-right font-mono font-bold text-emerald-400">{r.eventTotal}</td>
                    <td className="py-2 pr-2 text-right font-mono text-slate-300">{r.total}</td>
                    <td className="py-2 pr-2 text-right font-mono">
                      <span
                        className={
                          r.rankDelta > 0 ? 'text-emerald-400' : r.rankDelta < 0 ? 'text-rose-400' : 'text-slate-500'
                        }
                      >
                        {r.rankDelta > 0 ? `▲${r.rankDelta}` : r.rankDelta < 0 ? `▼${Math.abs(r.rankDelta)}` : '—'}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-slate-400">
                      {idx === 0 ? '👑' : `-${r.gapToRankAbove}`}
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
