'use client';

import React, { useState } from 'react';
import { DuelResponse } from '@/types/fpl';

interface ScenarioSimulatorProps {
  data: DuelResponse;
}

export const ScenarioSimulator: React.FC<ScenarioSimulatorProps> = ({ data }) => {
  const { user, rival, armbandClash } = data;

  const [userCapScore, setUserCapScore] = useState<number>(user.captain ? 10 : 8);
  const [rivalCapScore, setRivalCapScore] = useState<number>(rival.captain ? 2 : 2);
  const [userDiffBonus, setUserDiffBonus] = useState<number>(6);
  const [rivalDiffBonus, setRivalDiffBonus] = useState<number>(0);

  // Simulated points calculation
  // Real captain baseline points in liveNetPoints
  const baseUserCapEffective = user.captain
    ? (user.picks.find((p) => p.id === user.captain?.id)?.effectivePoints ?? 0)
    : 0;

  const baseRivalCapEffective = rival.captain
    ? (rival.picks.find((p) => p.id === rival.captain?.id)?.effectivePoints ?? 0)
    : 0;

  const userMultiplier = user.captain?.multiplier || 2;
  const rivalMultiplier = rival.captain?.multiplier || 2;

  // New simulated total calculation
  const simUserPoints =
    user.liveNetPoints - baseUserCapEffective + userCapScore * userMultiplier + userDiffBonus;

  const simRivalPoints =
    rival.liveNetPoints - baseRivalCapEffective + rivalCapScore * rivalMultiplier + rivalDiffBonus;

  const simSwing = simUserPoints - simRivalPoints;
  const originalSwing = user.liveNetPoints - rival.liveNetPoints;
  const swingDelta = simSwing - originalSwing;

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎛️</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Interactive Scenario & Swing Simulator
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Test live &quot;What if?&quot; match hypotheses: tweak captain hauls and differential returns to see the exact rank impact.
          </p>
        </div>

        <button
          onClick={() => {
            setUserCapScore(12);
            setRivalCapScore(2);
            setUserDiffBonus(8);
            setRivalDiffBonus(0);
          }}
          className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-bold text-cyan-400 hover:bg-slate-800"
        >
          ⚡ Load Dream Scenario
        </button>
      </div>

      {/* Outcome Banner */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/60 to-slate-950 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Simulated Margin
            </span>
            <span
              className={`text-2xl font-black font-mono ${
                simSwing > 0 ? 'text-emerald-400' : simSwing < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {simSwing > 0 ? `+${simSwing}` : simSwing} pts
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Shift from Actual
            </span>
            <span
              className={`text-sm font-bold font-mono ${
                swingDelta >= 0 ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {swingDelta >= 0 ? `+${swingDelta}` : swingDelta} pts swing
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="text-right">
            <span className="text-slate-500 block text-[10px]">Your Simulated Pts</span>
            <span className="font-bold text-cyan-400 text-base">{simUserPoints}</span>
          </div>
          <span className="text-slate-600 font-bold">vs</span>
          <div className="text-left">
            <span className="text-slate-500 block text-[10px]">Rival Simulated Pts</span>
            <span className="font-bold text-rose-400 text-base">{simRivalPoints}</span>
          </div>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Your variables */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Your Team Hypotheses
            </h3>
            <span className="text-xs text-slate-400 font-bold">{user.teamName}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Captain ({armbandClash.userCaptain}) Raw Points:
              </span>
              <span className="font-mono font-bold text-cyan-400">
                {userCapScore} pts (x{userMultiplier} = {userCapScore * userMultiplier})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={userCapScore}
              onChange={(e) => setUserCapScore(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Your Differential Returns (e.g. Cleansheets/Goals):</span>
              <span className="font-mono font-bold text-emerald-400">+{userDiffBonus} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={userDiffBonus}
              onChange={(e) => setUserDiffBonus(Number(e.target.value))}
              className="w-full accent-emerald-400 cursor-pointer"
            />
          </div>
        </div>

        {/* Rival variables */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Rival Team Hypotheses
            </h3>
            <span className="text-xs text-slate-400 font-bold">{rival.teamName}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">
                Captain ({armbandClash.rivalCaptain}) Raw Points:
              </span>
              <span className="font-mono font-bold text-rose-400">
                {rivalCapScore} pts (x{rivalMultiplier} = {rivalCapScore * rivalMultiplier})
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              value={rivalCapScore}
              onChange={(e) => setRivalCapScore(Number(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Rival Differential Swings:</span>
              <span className="font-mono font-bold text-rose-400">+{rivalDiffBonus} pts</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={rivalDiffBonus}
              onChange={(e) => setRivalDiffBonus(Number(e.target.value))}
              className="w-full accent-rose-400 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
