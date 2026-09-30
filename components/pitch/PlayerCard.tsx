'use client';

import React, { useState } from 'react';
import { EnrichedPlayer } from '@/types/fpl';

interface PlayerCardProps {
  player: EnrichedPlayer;
  isRival?: boolean;
  isDragging?: boolean;
  isDragTarget?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  isRival = false,
  isDragging = false,
  isDragTarget = false,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const [imgErrorLevel, setImgErrorLevel] = useState<number>(0);

  const playerPhotoUrl = player.photoCode
    ? `https://resources.premierleague.com/premierleague/photos/players/110x140/p${player.photoCode}.png`
    : null;

  const teamBadgeUrl = player.teamCode
    ? `https://resources.premierleague.com/premierleague/badges/70/t${player.teamCode}.png`
    : null;

  const getBadgeStyle = () => {
    switch (player.category) {
      case 'SHIELD':
        return {
          border: 'border-emerald-500/60 hover:border-emerald-400',
          bg: 'bg-emerald-950/40',
          badgeBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
          label: 'Shield',
        };
      case 'WEAPON':
        return {
          border: 'border-cyan-500/60 hover:border-cyan-400',
          bg: 'bg-cyan-950/40',
          badgeBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
          label: 'Weapon',
        };
      case 'DANGER':
        return {
          border: 'border-rose-500/60 hover:border-rose-400',
          bg: 'bg-rose-950/40',
          badgeBg: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
          label: 'Danger',
        };
    }
  };

  const style = getBadgeStyle();

  return (
    <div
      draggable={!isRival}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative flex flex-col items-center justify-between rounded-lg border p-1.5 backdrop-blur-md transition-all duration-150 w-20 sm:w-24 shadow-md select-none ${         !isRival ? 'cursor-grab active:cursor-grabbing' : ''       } ${style.border} ${style.bg}${
        player.subStatus === 'SUBBED_OFF' ? 'opacity-40 grayscale' : ''
      } ${isDragging ? 'opacity-30 scale-95 border-dashed border-cyan-400' : ''} ${
        isDragTarget ? 'ring-2 ring-cyan-400 scale-105 shadow-cyan-500/50' : ''
      }`}
    >
      {/* Captain / Multiplier Indicator */}
      {player.multiplier > 1 && (
        <span className="absolute -top-2 -right-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-black shadow-sm ring-2 ring-slate-900">
          {player.multiplier === 3 ? 'TC' : 'C'}
        </span>
      )}
      {player.isViceCaptain && player.multiplier === 1 && (
        <span className="absolute -top-2 -right-2 z-10 flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[9px] font-bold text-black ring-1 ring-slate-900">
          V
        </span>
      )}

      {/* Autosub Status Badges */}
      {player.subStatus === 'SUBBED_ON' && (
        <span className="absolute -top-2 -left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] text-white shadow-sm ring-2 ring-slate-900" title="Autosubbed On">
          ⬆
        </span>
      )}
      {player.subStatus === 'SUBBED_OFF' && (
        <span className="absolute -top-2 -left-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] text-white shadow-sm ring-2 ring-slate-900" title="Autosubbed Off (0 Mins)">
          ⬇
        </span>
      )}

      {/* Mini Tactical Category Pill */}
      <span
        className={`px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wider border mb-1 ${style.badgeBg}`}
      >
        {style.label}
      </span>

      {/* Visual Avatar */}
      <div className="relative mb-1 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center overflow-hidden rounded-full border border-slate-700 bg-slate-900/90 shadow-inner pointer-events-none">
        {imgErrorLevel === 0 && playerPhotoUrl ? (
          <img
            src={playerPhotoUrl}
            alt={player.webName}
            onError={() => setImgErrorLevel(1)}
            className="h-full w-full object-cover object-top"
            loading="lazy"
          />
        ) : imgErrorLevel <= 1 && teamBadgeUrl ? (
          <img
            src={teamBadgeUrl}
            alt={player.teamShort}
            onError={() => setImgErrorLevel(2)}
            className="h-7 w-7 sm:h-8 sm:w-8 object-contain"
            loading="lazy"
          />
        ) : (
          <span className="font-mono text-xs font-black text-slate-400">
            {player.teamShort}
          </span>
        )}
      </div>

      {/* Player Web Name & Club */}
      <p className="truncate w-full text-center text-xs font-bold text-white tracking-tight pointer-events-none">
        {player.webName}
      </p>
      <span className="text-[9px] text-slate-400 font-medium pointer-events-none">{player.teamShort}</span>

      {/* Live Matchday Points & Provisional BPS */}
      <div className="mt-1 flex items-center justify-center w-full rounded bg-slate-900/80 py-0.5 px-1 border border-slate-700/50 pointer-events-none">
        <span className="text-xs font-black text-amber-300">
          {player.effectivePoints}
        </span>
        {player.multiplier > 1 && (
          <span className="ml-1 text-[9px] text-slate-400">
            ({player.rawLivePoints}×{player.multiplier})
          </span>
        )}
        {player.provisionalBonus > 0 && (
          <span className="ml-1 text-[8px] font-bold text-cyan-400" title="Provisional Bonus">
            +{player.provisionalBonus}b
          </span>
        )}
      </div>
    </div>
  );
};
