import React, { useState } from "react";
import Image from "next/image";
import { EnrichedPlayer } from "@/types/fpl";

interface PlayerCardProps {
  player: EnrichedPlayer;
  isRival?: boolean;
  cleanView?: boolean;
  isDraggable?: boolean;
  dragTargetStatus?: "valid" | "invalid" | null;
  isSelected?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isRival,
  cleanView = false,
  isDraggable = false,
  dragTargetStatus = null,
  isSelected = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onClick,
}) => {
  const [imageError, setImageError] = useState(false);

  const isPlaying = !player.hasFinishedMatch && (player.stats?.minutes ?? 0) > 0;
  const isUpcoming = !player.hasFinishedMatch && (player.stats?.minutes ?? 0) === 0;

  // Clean the photo code (removes .jpg/.png if present)
  const cleanPhoto = player.photoCode ? player.photoCode.replace(/\.(jpg|png)$/i, "") : null;
  const photoUrl = cleanPhoto
    ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${cleanPhoto}.png`
    : null;

  const categoryStyles = {
    WEAPON: "bg-[#00ff87]/20 text-[#00ff87] border-[#00ff87]/40 shadow-[0_0_8px_rgba(0,255,135,0.3)]",
    DANGER: "bg-[#e90052]/20 text-[#e90052] border-[#e90052]/40 shadow-[0_0_8px_rgba(233,0,82,0.3)]",
    SHIELD: "bg-[#04f5ff]/20 text-[#04f5ff] border-[#04f5ff]/40 shadow-[0_0_8px_rgba(4,245,255,0.3)]",
  };

  // FDR color indicator
  const getFdrStyle = (fdr: number = 3) => {
    if (fdr <= 2) return "bg-[#00ff87]/20 text-[#00ff87] border-[#00ff87]/40";
    if (fdr === 3) return "bg-zinc-800 text-zinc-300 border-zinc-700";
    return "bg-[#e90052]/20 text-[#e90052] border-[#e90052]/40";
  };

  // Dynamic drag border/glow styles
  let slotFeedbackClasses = "border border-white/10 hover:border-white/25";
  if (dragTargetStatus === "valid") {
    slotFeedbackClasses = "border-2 border-[#00ff87] shadow-[0_0_18px_#00ff87] ring-4 ring-[#00ff87]/40 scale-105 z-30 animate-pulse";
  } else if (dragTargetStatus === "invalid") {
    slotFeedbackClasses = "border-2 border-[#e90052] shadow-[0_0_18px_#e90052] ring-4 ring-[#e90052]/40 scale-95 opacity-60";
  } else if (isSelected) {
    slotFeedbackClasses = "border-2 border-[#04f5ff] shadow-[0_0_15px_#04f5ff] ring-4 ring-[#04f5ff]/50 scale-105 z-30";
  }

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      className={`relative group flex flex-col items-center justify-center p-1 w-20 md:w-24 transition-all duration-200 select-none rounded-xl ${
        isDraggable ? "cursor-grab active:cursor-grabbing hover:scale-105" : "hover:scale-102"
      } ${slotFeedbackClasses}`}
    >
      {/* Subbed On/Off Badge */}
      {player.subStatus === "SUBBED_ON" && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 text-[8px] font-black uppercase tracking-wider bg-[#00ff87] text-[#150018] px-1.5 py-0.2 rounded-full shadow-md animate-bounce">
          ▲ SUB
        </span>
      )}
      {player.subStatus === "SUBBED_OFF" && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 z-30 text-[8px] font-black uppercase tracking-wider bg-[#e90052] text-white px-1.5 py-0.2 rounded-full shadow-md">
          ▼ BENCH
        </span>
      )}

      {/* Armband Badges */}
      {player.isCaptain && (
        <span className="absolute -top-1 left-1 z-20 text-[9px] font-black bg-gradient-to-r from-[#ffd700] to-[#e8a838] text-black px-1.5 py-0.5 rounded shadow-[0_0_8px_rgba(232,168,56,0.5)] border border-[#ffd700]">
          C{player.multiplier > 2 ? "x3" : ""}
        </span>
      )}
      {player.isViceCaptain && !player.isCaptain && (
        <span className="absolute -top-1 left-1 z-20 text-[9px] font-black bg-zinc-200 text-black px-1 py-0.5 rounded shadow-md border border-zinc-400">
          V
        </span>
      )}

      {/* Category Pill (Shown ONLY in Detailed View) */}
      {!cleanView && player.category && (
        <span
          className={`absolute -top-1 right-1 z-20 text-[7px] font-mono font-black uppercase px-1 py-0.2 rounded border shadow-lg ${
            categoryStyles[player.category] || "bg-zinc-800 text-zinc-300 border-white/10"
          }`}
        >
          {player.category}
        </span>
      )}

      {/* Extra Stat Pill - FDR & Form (Shown ONLY in Detailed View) */}
      {!cleanView && (
        <div className="absolute top-4 right-0 z-20 flex flex-col items-end gap-0.5 pointer-events-none">
          {player.form !== undefined && player.form > 0 && (
            <span className="text-[7px] font-mono font-bold px-1 rounded bg-[#38003c]/90 text-zinc-200 border border-purple-500/30">
              F:{player.form.toFixed(1)}
            </span>
          )}
          {player.fdr !== undefined && (
            <span
              className={`text-[7px] font-mono font-bold px-1 rounded border ${getFdrStyle(
                player.fdr
              )}`}
            >
              FDR {player.fdr}
            </span>
          )}
        </div>
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
          <div className="w-11 h-13 bg-gradient-to-b from-[#240026] to-[#0f0014] border border-[#38003c] rounded-t-lg flex flex-col items-center justify-center shadow-lg">
            <span className="text-[10px] font-mono font-bold text-zinc-300 uppercase">
              {player.teamShort}
            </span>
          </div>
        )}

        {/* Provisional Bonus Badge */}
        {player.provisionalBonus > 0 && (
          <span className="absolute bottom-0 right-0 text-[8px] font-mono font-bold text-[#e8a838] bg-black/85 px-1 rounded-sm border border-[#e8a838]/40 shadow-sm">
            +{player.provisionalBonus}
          </span>
        )}
      </div>

      {/* Nameplate & Live Indicator */}
      <div className="w-full mt-1 bg-[#1a0020]/95 backdrop-blur-md border border-white/10 rounded-md px-1.5 py-1 text-center shadow-xl">
        <p className="text-[11px] font-bold text-zinc-100 truncate w-full tracking-tight">
          {player.webName}
        </p>

        <div className="flex items-center justify-between mt-0.5 text-[10px]">
          <span className="font-mono font-extrabold text-white flex items-baseline">
            {player.effectivePoints ?? player.rawLivePoints ?? 0}
            <span className="text-[8px] font-normal text-zinc-400 ml-0.5">pts</span>
          </span>

          <span className="text-[8px] font-mono px-1 py-0.2 rounded">
            {isPlaying && (
              <span className="text-[#00ff87] font-bold animate-pulse">
                {player.stats?.minutes}&apos;
              </span>
            )}
            {player.hasFinishedMatch && (
              <span className="text-zinc-400 font-bold">FT</span>
            )}
            {isUpcoming && (
              <span className="text-zinc-500 font-mono">--</span>
            )}
          </span>
        </div>

        {/* Ownership line in Detailed View */}
        {!cleanView && player.ownership !== undefined && (
          <div className="mt-0.5 pt-0.5 border-t border-white/5 text-[7px] font-mono text-zinc-400 truncate">
            Own: {typeof player.ownership === "number" ? `${player.ownership.toFixed(0)}%` : player.ownership}
          </div>
        )}
      </div>
    </div>
  );
};
