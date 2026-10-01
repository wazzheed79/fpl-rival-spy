'use client';

import React, { useEffect, useState } from 'react';
import { PriceAlertPlayer, PriceAlertResponse } from '@/types/fpl';

interface PriceAlertFeedProps {
  rivalIds: number[];
}

const CONFIDENCE_STYLES: Record<PriceAlertPlayer['confidence'], string> = {
  IMMINENT: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  LIKELY: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  WATCH: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
};

const PillRow: React.FC<{ player: PriceAlertPlayer }> = ({ player }) => (
  <div
    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 ${
      player.direction === 'RISING' ? 'border-emerald-900/60 bg-emerald-950/30' : 'border-rose-900/60 bg-rose-950/30'
    }`}
  >
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-sm font-bold text-white truncate">{player.webName}</span>
      <span className="text-[10px] text-slate-500 font-semibold">{player.teamShort}</span>
      {player.isOwnedByRival && (
        <span className="text-[9px] font-bold uppercase tracking-wide text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded px-1.5 py-0.5">
          Rival owns
        </span>
      )}
    </div>
    <div className="flex items-center gap-2 shrink-0">
      <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full border px-2 py-0.5 ${CONFIDENCE_STYLES[player.confidence]}`}>
        {player.confidence}
      </span>
      <span className={`text-sm font-black tabular-nums ${player.direction === 'RISING' ? 'text-emerald-400' : 'text-rose-400'}`}>
        £{player.cost.toFixed(1)}
      </span>
    </div>
  </div>
);

// Feature 6: price-change alerts, flagged as "estimated" since FPL's real algorithm is private.
export const PriceAlertFeed: React.FC<PriceAlertFeedProps> = ({ rivalIds }) => {
  const [data, setData] = useState<PriceAlertResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    const qs = rivalIds.length ? `?rivalIds=${rivalIds.join(',')}` : '';
    fetch(`/api/price-alerts${qs}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rivalIds.join(',')]);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-black tracking-tight text-white">💰 Price-Change Radar</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Estimated from transfer momentum — not official FPL data. Watch for rival-owned risers before they lock in.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-slate-500 text-center py-6">Scanning transfer market...</p>
      ) : !data || (data.risers.length === 0 && data.fallers.length === 0) ? (
        <p className="text-xs text-slate-500 text-center py-6">No imminent price changes detected right now.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">Rising ↑</h3>
            {data.risers.length === 0 && <p className="text-xs text-slate-600">None flagged.</p>}
            {data.risers.map((p) => (
              <PillRow key={p.id} player={p} />
            ))}
          </div>
          <div className="space-y-2">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-rose-400">Falling ↓</h3>
            {data.fallers.length === 0 && <p className="text-xs text-slate-600">None flagged.</p>}
            {data.fallers.map((p) => (
              <PillRow key={p.id} player={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
