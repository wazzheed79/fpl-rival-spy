import React from "react";
import { PlayerCard, PitchPlayer } from "./PlayerCard";

interface TeamSquad {
  managerName: string;
  teamName: string;
  totalPoints: number;
  players: PitchPlayer[];
}

interface PitchDuelProps {
  userSquad: TeamSquad;
  rivalSquad: TeamSquad;
}

export const PitchDuel: React.FC<PitchDuelProps> = ({ userSquad, rivalSquad }) => {
  const groupByPosition = (players: PitchPlayer[]) => ({
    GKP: players.filter((p) => p.position === "GKP"),
    DEF: players.filter((p) => p.position === "DEF"),
    MID: players.filter((p) => p.position === "MID"),
    FWD: players.filter((p) => p.position === "FWD"),
  });

  const renderTacticalPitch = (squad: TeamSquad, isRival: boolean) => {
    const lines = groupByPosition(squad.players);

    return (
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-3 px-3">
          <div>
            <h3 className="font-bold text-sm tracking-wide text-zinc-200">
              {squad.managerName}
            </h3>
            <p className="text-xs text-zinc-400">{squad.teamName}</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-mono font-extrabold text-white">
              {squad.totalPoints}
            </span>
            <span className="text-xs text-zinc-500 ml-1">pts</span>
          </div>
        </div>

        <div className="w-full aspect-[7/10] bg-gradient-to-b from-[#14301a] via-[#1b3d22] to-[#14301a] rounded-xl border border-emerald-500/20 relative shadow-2xl p-4 flex flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 pointer-events-none opacity-20">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-white" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-white rounded-full" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-44 h-20 border-b border-l border-r border-white rounded-b-sm" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-44 h-20 border-t border-l border-r border-white rounded-t-sm" />
          </div>

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
      </div>
    );
  };

  return (
    <div className="w-full bg-[#0c1017] border border-white/[0.08] rounded-2xl p-4 md:p-6 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Live Pitch Duel
          </h2>
          <p className="text-xs text-zinc-400">Head-to-head matchday line-up comparison</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderTacticalPitch(userSquad, false)}
        {renderTacticalPitch(rivalSquad, true)}
      </div>
    </div>
  );
};
