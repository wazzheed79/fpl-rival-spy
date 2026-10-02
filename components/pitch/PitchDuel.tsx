import React from "react";
import { DuelResponse, EnrichedPlayer, ManagerSummary } from "@/types/fpl";
import { PlayerCard } from "./PlayerCard";

interface PitchDuelProps {
  data?: DuelResponse;
}

export const PitchDuel: React.FC<PitchDuelProps> = ({ data }) => {
  if (!data || !data.user || !data.rival) {
    return (
      <div className="w-full p-8 text-center text-xs text-zinc-400 bg-zinc-950/50 rounded-2xl border border-white/10">
        Waiting for duel line-ups to load...
      </div>
    );
  }

  const { user, rival, metrics, armbandClash } = data;

  // Group starting players by position (1: GKP, 2: DEF, 3: MID, 4: FWD)
  const groupStarters = (picks: EnrichedPlayer[] = []) => {
    const starters = picks.filter((p) => p.isStarter);
    return {
      GKP: starters.filter((p) => p.elementType === 1),
      DEF: starters.filter((p) => p.elementType === 2),
      MID: starters.filter((p) => p.elementType === 3),
      FWD: starters.filter((p) => p.elementType === 4),
      bench: picks.filter((p) => !p.isStarter),
    };
  };

  const renderTacticalPitch = (manager: ManagerSummary, isRival: boolean) => {
    const lines = groupStarters(manager.picks);

    return (
      <div className="flex-1 flex flex-col items-center w-full">
        {/* Manager Header Banner */}
        <div className="w-full flex items-center justify-between mb-3 px-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isRival ? "bg-rose-500" : "bg-emerald-400"}`} />
              <h3 className="font-bold text-sm tracking-wide text-zinc-100">
                {manager.managerName}
              </h3>
            </div>
            <p className="text-xs text-zinc-400 ml-4">{manager.teamName}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-mono font-extrabold text-white">
              {manager.liveNetPoints ?? manager.liveStartingPoints ?? manager.totalPoints}
            </span>
            <span className="text-xs text-zinc-500 ml-1">pts</span>
          </div>
        </div>

        {/* Tactical Pitch Surface */}
        <div className="w-full min-h-[500px] aspect-[7/10] bg-gradient-to-b from-[#112415] via-[#142c1a] to-[#0f1f13] rounded-2xl border border-emerald-500/25 relative shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
          {/* Authentic Pitch Lines */}
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white rounded-full" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 border-b border-l border-r border-white rounded-b-md" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-48 h-20 border-t border-l border-r border-white rounded-t-md" />
          </div>

          {/* Positional Lines */}
          <div className="relative z-10 flex justify-around w-full">
            {lines.FWD.map((p) => (
              <PlayerCard key={p.id} player={p} isRival={isRival} />
            ))}
          </div>
          <div className="relative z-10 flex justify-around w-full">
            {lines.MID.map((p) => (
              <PlayerCard key={p.id} player={p} isRival={isRival} />
            ))}
          </div>
          <div className="relative z-10 flex justify-around w-full">
            {lines.DEF.map((p) => (
              <PlayerCard key={p.id} player={p} isRival={isRival} />
            ))}
          </div>
          <div className="relative z-10 flex justify-around w-full">
            {lines.GKP.map((p) => (
              <PlayerCard key={p.id} player={p} isRival={isRival} />
            ))}
          </div>
        </div>

        {/* Bench Strip */}
        <div className="w-full mt-3 bg-zinc-950/80 border border-white/[0.08] rounded-xl p-2 flex justify-around items-center">
          {lines.bench.map((p) => (
            <div key={p.id} className="opacity-60 hover:opacity-100 transition-opacity">
              <PlayerCard player={p} isRival={isRival} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full bg-[#090c10] border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            Matchday Tactical Pitch Duel
          </h2>
          <p className="text-xs text-zinc-400">Live head-to-head tracking and tactical differential analysis</p>
        </div>

        {/* Armband Status Pill */}
        {armbandClash && (
          <div className="flex items-center gap-2 text-xs font-mono bg-zinc-900 border border-white/10 px-3 py-1.5 rounded-lg">
            <span className="text-zinc-400">Armband:</span>
            {armbandClash.isNeutralized ? (
              <span className="text-cyan-400 font-bold">NEUTRALIZED ({armbandClash.userCaptain})</span>
            ) : (
              <span className="text-amber-400 font-bold">
                {armbandClash.userCaptain} vs {armbandClash.rivalCaptain}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Pitches Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderTacticalPitch(user, false)}
        {renderTacticalPitch(rival, true)}
      </div>
    </div>
  );
};
