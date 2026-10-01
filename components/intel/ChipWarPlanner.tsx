'use client';

import React, { useEffect, useState } from 'react';
import { computeChipRecommendations, ChipPlannerSquadPlayer, ChipUsage, ChipRecommendation } from '@/lib/chipPlanner';
import type { TeamFixtureOutlook } from '@/app/api/fixtures-outlook/route';

interface ChipWarPlannerProps {
  squad: ChipPlannerSquadPlayer[];
  chipsUsed: ChipUsage[];
}

const CHIP_ICON: Record<ChipRecommendation['chip'], string> = {
  bboost: '🪑',
  '3xc': '🎯',
};

// Feature 7: recommends the best upcoming gameweek to fire Bench Boost / Triple Captain,
// based on each squad member's real fixture outlook (not a points guarantee - advisory only).
export const ChipWarPlanner: React.FC<ChipWarPlannerProps> = ({ squad, chipsUsed }) => {
  const [teams, setTeams] = useState<Record<string, TeamFixtureOutlook[]> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/fixtures-outlook')
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setTeams(json.teams || {});
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (isLoading || !teams) {
    return (
      <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl">
        <p className="text-xs text-slate-500 text-center py-10">Scouting fixture windows...</p>
      </div>
    );
  }

  if (squad.length === 0) {
    return null;
  }

  const recommendations = computeChipRecommendations(squad, teams, chipsUsed);

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-4">
      <div className="border-b border-slate-800 pb-4">
        <h2 className="text-xl font-black tracking-tight text-white">🗓️ Chip War Planner</h2>
        <p className="text-xs text-slate-400 mt-0.5">Advisory fixture-based windows for your remaining chips.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <div
            key={rec.chip}
            className={`rounded-xl border p-4 space-y-2 ${
              rec.isAvailable ? 'border-cyan-900/60 bg-cyan-950/20' : 'border-slate-800 bg-slate-900/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <span>{CHIP_ICON[rec.chip]}</span> {rec.label}
              </span>
              {rec.isAvailable ? (
                rec.recommendedEvent ? (
                  <span className="text-xs font-black text-cyan-400">GW{rec.recommendedEvent}</span>
                ) : null
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-800 rounded px-2 py-0.5">
                  Used
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">{rec.rationale}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
