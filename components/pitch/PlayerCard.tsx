import React from "react";

export interface PitchPlayer {
  id: number;
  webName: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  teamShort: string;
  points: number;
  isCaptain?: boolean;
  isViceCaptain?: boolean;
  isDifferential?: boolean;
  status?: "playing" | "benched" | "finished" | "upcoming";
  liveMinutes?: number;
  bonusPoints?: number;
}

interface PlayerCardProps {
  player: PitchPlayer;
  isRival?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isRival }) => {
  const statusColors = {
    playing: "bg-emerald-500 animate-pulse text-black",
    benched: "bg-zinc-700 text-zinc-300",
    finished: "bg-zinc-800 text-zinc-400",
    upcoming: "bg-sky-500/20 text-sky-400 border border-sky-500/30",
  };

  return (
    <div className="relative group flex flex-col items-center justify-center p-1 w-20 md:w-24 transition-all duration-200 hover:scale-105 select-none">
      {player.isCaptain && (
        <span className="absolute -top-1 left-2 z-10 text-[10px] font-extrabold bg-amber-400 text-black px-1 rounded-sm shadow-md">
          C
        </span>
      )}
      {player.isViceCaptain && (
        <span className="absolute -top-1 left-2 z-10 text-[10px] font-extrabold bg-zinc-300 text-black px-1 rounded-sm shadow-md">
          V
        </span>
      )}

      {player.isDifferential && (
        <span
          className={`absolute -top-1 right-2 z-10 text-[9px] font-bold px-1 rounded shadow-md ${
            isRival ? "bg-rose-500 text-white" : "bg-emerald-400 text-black"
          }`}
        >
          DIFF
        </span>
      )}

      <div className="w-9 h-11 md:w-11 md:h-13 bg-gradient-to-b from-zinc-700 to-zinc-900 border border-white/20 rounded-t-md flex items-center justify-center shadow-lg relative overflow-hidden">
        <div className="absolute top-0 w-4 h-2 bg-zinc-950/60 rounded-b-full" />
        <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-tighter">
          {player.teamShort}
        </span>
      </div>

      <div className="w-full mt-1 bg-zinc-950/90 backdrop-blur-md border border-white/10 rounded px-1 py-0.5 text-center shadow-lg">
        <p className="text-[11px] font-semibold text-zinc-100 truncate w-full">
          {player.webName}
        </p>

        <div className="flex items-center justify-between mt-0.5 text-[10px] px-0.5">
          <span className="font-mono font-bold text-white">
            {player.points} pts
          </span>

          {player.status && (
            <span
              className={`text-[8px] font-mono px-1 py-0.2 rounded-sm ${
                statusColors[player.status]
              }`}
            >
              {player.status === "playing" ? `${player.liveMinutes}'` : player.status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
