import React, { useState } from "react";
import Image from "next/image";
import { EnrichedPlayer } from "@/types/fpl";

interface PlayerCardProps {
  player: EnrichedPlayer;
  isRival?: boolean;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({ player, isRival }) => {
  const [imageError, setImageError] = useState(false);

  const isPlaying = !player.hasFinishedMatch && (player.stats?.minutes ?? 0) > 0;
  const isUpcoming = !player.hasFinishedMatch && (player.stats?.minutes ?? 0) === 0;

  // Clean the photo code (removes .jpg/.png if present)
  const cleanPhoto = player.photoCode ? player.photoCode.replace(/\.(jpg|png)$/i, "") : null;
  const photoUrl = cleanPhoto
    ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${cleanPhoto}.png`
    : null;

  const categoryStyles = {
    WEAPON: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
    DANGER: "bg-rose-500/20 text-rose-400 border-rose-500/40",
    SHIELD: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };

  return (
    <div className="relative group flex flex-col items-center justify-center p-1 w-20 md:w-24 transition-all duration-200 hover:scale-105 select-none">
      {/* Armband Badges */}
      {player.isCaptain && (
        <span className="absolute -top-1 left-1.5 z-20 text-[9px] font-black bg-amber-400 text-black px-1.5 py-0.5 rounded shadow-lg">
          C{player.multiplier > 2 ? "x3" : ""}
        </span>
      )}
      {player.isViceCaptain && !player.isCaptain && (
        <span className="absolute -top-1 left-1.5 z-20 text-[9px] font-black bg-zinc-300 text-black px-1 py-0.5 rounded shadow-lg">
          V
        </span>
      )}

      {/* Category Pill (WEAPON / DANGER / SHIELD) */}
      {player.category && (
        <span
          className={`absolute -top-1 right-1.5 z-20 text-[8px] font-bold px-1 py-0.2 rounded border shadow-lg ${
            categoryStyles[player.category] || "bg-zinc-800 text-zinc-300 border-white/10"
          }`}
        >
          {player.category}
        </span>
      )}

      {/* Player Photo Cutout Frame */}
      <div className="w-12 h-14 md:w-14 md:h-16 relative flex items-end justify-center drop-shadow-md">
        {photoUrl && !imageError ? (
          <Image
            src={photoUrl}
            alt={player.webName}
            width={60}
            height={70}
            className="object-contain max-h-full drop-shadow-lg"
            onError={() => setImageError(true)}
            priority={player.isStarter}
            unoptimized
          />
        ) : (
          <div className="w-11 h-13 bg-gradient-to-b from-zinc-800 to-black border border-white/20 rounded-t-lg flex flex-col items-center justify-center shadow-lg">
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase">
              {player.teamShort}
            </span>
          </div>
        )}

        {/* Provisional Bonus Badge */}
        {player.provisionalBonus > 0 && (
          <span className="absolute bottom-0 right-0 text-[8px] font-mono font-bold text-amber-400 bg-black/80 px-1 rounded-sm border border-amber-400/40">
            +{player.provisionalBonus}
          </span>
        )}
      </div>

      {/* Nameplate & Live Indicator */}
      <div className="w-full mt-1 bg-zinc-950/95 backdrop-blur-md border border-white/10 rounded-md px-1.5 py-1 text-center shadow-xl">
        <p className="text-[11px] font-bold text-zinc-100 truncate w-full">
          {player.webName}
        </p>

        <div className="flex items-center justify-between mt-0.5 text-[10px]">
          <span className="font-mono font-extrabold text-white">
            {player.effectivePoints ?? player.rawLivePoints ?? 0}
            <span className="text-[9px] font-normal text-zinc-500 ml-0.5">pts</span>
          </span>

          <span className="text-[8px] font-mono px-1 py-0.2 rounded">
            {isPlaying && (
              <span className="text-emerald-400 font-bold animate-pulse">
                {player.stats?.minutes}&apos;
              </span>
            )}
            {player.hasFinishedMatch && (
              <span className="text-zinc-500">FT</span>
            )}
            {isUpcoming && (
              <span className="text-zinc-500 font-mono">--</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};
