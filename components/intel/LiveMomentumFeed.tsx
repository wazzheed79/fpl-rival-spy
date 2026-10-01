'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DuelResponse, EnrichedPlayer } from '@/types/fpl';

interface LiveMomentumFeedProps {
  userId: number;
  rivalId: number;
  currentGw: number;
  pollIntervalMs?: number;
}

interface MomentumEvent {
  id: string;
  timestamp: number;
  side: 'user' | 'rival';
  icon: string;
  message: string;
  isPositiveForUser: boolean;
}

function snapshotKey(p: EnrichedPlayer) {
  return `${p.id}:${p.stats.goals}:${p.stats.assists}:${p.provisionalBonus}:${p.multiplier}`;
}

function diffPlayers(
  side: 'user' | 'rival',
  teamName: string,
  prev: EnrichedPlayer[],
  next: EnrichedPlayer[]
): MomentumEvent[] {
  const events: MomentumEvent[] = [];
  const prevById = new Map(prev.map((p) => [p.id, p]));

  for (const p of next) {
    const before = prevById.get(p.id);
    if (!before) continue;

    const goalDelta = p.stats.goals - before.stats.goals;
    const assistDelta = p.stats.assists - before.stats.assists;
    const bonusDelta = p.provisionalBonus - before.provisionalBonus;

    if (goalDelta > 0) {
      events.push({
        id: `${p.id}-goal-${Date.now()}`,
        timestamp: Date.now(),
        side,
        icon: '⚽',
        message: `${p.webName} (${teamName}) scored! ${goalDelta > 1 ? `+${goalDelta} goals` : ''}`.trim(),
        isPositiveForUser: side === 'user' ? p.multiplier > 0 : p.multiplier === 0,
      });
    }
    if (assistDelta > 0) {
      events.push({
        id: `${p.id}-assist-${Date.now()}`,
        timestamp: Date.now(),
        side,
        icon: '🅰️',
        message: `${p.webName} (${teamName}) picked up an assist.`,
        isPositiveForUser: side === 'user' ? p.multiplier > 0 : p.multiplier === 0,
      });
    }
    if (bonusDelta > 0) {
      events.push({
        id: `${p.id}-bonus-${Date.now()}`,
        timestamp: Date.now(),
        side,
        icon: '⭐',
        message: `${p.webName} (${teamName}) moved into the provisional bonus points.`,
        isPositiveForUser: side === 'user' ? p.multiplier > 0 : p.multiplier === 0,
      });
    }
    if (p.isCaptain && p.hasFinishedMatch && !before.hasFinishedMatch && p.rawLivePoints <= 1 && p.stats.minutes > 0) {
      events.push({
        id: `${p.id}-capblank-${Date.now()}`,
        timestamp: Date.now(),
        side,
        icon: '😬',
        message: `${p.webName}'s (${teamName}) captaincy blanked - full time, ${p.rawLivePoints} raw pts.`,
        isPositiveForUser: side !== 'user',
      });
    }
  }

  return events;
}

// Client-side polling hook: re-fetches the duel endpoint on an interval and diffs the previous
// snapshot against the new one to surface goal/assist/bonus/captain-blank momentum events.
export const LiveMomentumFeed: React.FC<LiveMomentumFeedProps> = ({
  userId,
  rivalId,
  currentGw,
  pollIntervalMs = 45000,
}) => {
  const [events, setEvents] = useState<MomentumEvent[]>([]);
  const [isLive, setIsLive] = useState(true);
  const prevDataRef = useRef<DuelResponse | null>(null);

  useEffect(() => {
    if (!isLive) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/manager?userId=${userId}&rivalId=${rivalId}&gw=${currentGw}`);
        if (!res.ok || cancelled) return;
        const data: DuelResponse = await res.json();

        const prev = prevDataRef.current;
        if (prev) {
          const userEvents = diffPlayers('user', data.user.teamName, prev.user.picks, data.user.picks);
          const rivalEvents = diffPlayers('rival', data.rival.teamName, prev.rival.picks, data.rival.picks);
          const newEvents = [...userEvents, ...rivalEvents];
          if (newEvents.length > 0) {
            setEvents((existing) => [...newEvents, ...existing].slice(0, 25));
          }
        }
        prevDataRef.current = data;
      } catch {
        // Silent - a missed poll just waits for the next interval.
      }
    };

    poll();
    const interval = setInterval(poll, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [userId, rivalId, currentGw, pollIntervalMs, isLive]);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className={`flex h-2.5 w-2.5 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
          <h2 className="text-xl font-black tracking-tight text-white">Live Momentum Feed</h2>
        </div>
        <button
          onClick={() => setIsLive((v) => !v)}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300 hover:border-slate-700"
        >
          {isLive ? '⏸ Pause' : '▶ Resume'}
        </button>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-6 text-center">
          <p className="text-xs text-slate-500">
            Watching for goals, assists, bonus-point shifts and captain blanks... Updates every {Math.round(pollIntervalMs / 1000)}s while matches are live.
          </p>
        </div>
      ) : (
        <ul className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {events.map((e) => (
            <li
              key={e.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-xs ${
                e.isPositiveForUser
                  ? 'border-emerald-900/40 bg-emerald-950/20'
                  : 'border-rose-900/40 bg-rose-950/20'
              }`}
            >
              <span className="text-base">{e.icon}</span>
              <span className="flex-1 text-slate-200">{e.message}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  e.side === 'user' ? 'text-cyan-400 bg-cyan-950/40' : 'text-rose-400 bg-rose-950/40'
                }`}
              >
                {e.side}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
