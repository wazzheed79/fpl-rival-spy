import React, { useState, useEffect, useMemo } from "react";
import { DuelResponse, EnrichedPlayer, ManagerSummary } from "@/types/fpl";
import { PlayerCard } from "./PlayerCard";

interface PitchDuelProps {
  data?: DuelResponse;
}

export const PitchDuel: React.FC<PitchDuelProps> = ({ data }) => {
  if (!data || !data.user || !data.rival) {
    return (
      <div className="w-full p-8 text-center text-xs text-zinc-400 bg-[#16001a]/60 rounded-2xl border border-white/10">
        Waiting for duel line-ups to load...
      </div>
    );
  }

  const { user, rival, metrics, armbandClash } = data;

  // Local state for interactive tactical substitutions & clean view
  const [userPicks, setUserPicks] = useState<EnrichedPlayer[]>(user.picks);
  const [cleanView, setCleanView] = useState<boolean>(false);
  const [draggedPlayer, setDraggedPlayer] = useState<EnrichedPlayer | null>(null);
  const [selectedForSwap, setSelectedForSwap] = useState<EnrichedPlayer | null>(null);
  const [subCount, setSubCount] = useState<number>(0);

  // Sync state if props update from server
  useEffect(() => {
    setUserPicks(user.picks);
    setSubCount(0);
    setDraggedPlayer(null);
    setSelectedForSwap(null);
  }, [user.picks]);

  // Check if a swap between two players is legal under official FPL rules
  const checkSwapValidity = (
    playerA: EnrichedPlayer,
    playerB: EnrichedPlayer,
    currentPicks: EnrichedPlayer[]
  ): boolean => {
    if (playerA.id === playerB.id) return false;

    // Tactical substitution must be between a starter and a bench player
    if (playerA.isStarter === playerB.isStarter) {
      // Reordering bench or swapping starters directly
      return false;
    }

    const starterOut = playerA.isStarter ? playerA : playerB;
    const benchIn = playerA.isStarter ? playerB : playerA;

    // GKP rule: GKP can ONLY be swapped for GKP
    if (starterOut.elementType === 1 || benchIn.elementType === 1) {
      return starterOut.elementType === 1 && benchIn.elementType === 1;
    }

    // Outfield formation validation (DEF, MID, FWD)
    const currentStarters = currentPicks.filter((p) => p.isStarter);

    const newDefCount =
      currentStarters.filter((p) => p.elementType === 2 && p.id !== starterOut.id).length +
      (benchIn.elementType === 2 ? 1 : 0);

    const newMidCount =
      currentStarters.filter((p) => p.elementType === 3 && p.id !== starterOut.id).length +
      (benchIn.elementType === 3 ? 1 : 0);

    const newFwdCount =
      currentStarters.filter((p) => p.elementType === 4 && p.id !== starterOut.id).length +
      (benchIn.elementType === 4 ? 1 : 0);

    return (
      newDefCount >= 3 &&
      newDefCount <= 5 &&
      newMidCount >= 2 &&
      newMidCount <= 5 &&
      newFwdCount >= 1 &&
      newFwdCount <= 3 &&
      newDefCount + newMidCount + newFwdCount === 10
    );
  };

  // Perform tactical substitution
  const handleExecuteSwap = (playerA: EnrichedPlayer, playerB: EnrichedPlayer) => {
    if (!checkSwapValidity(playerA, playerB, userPicks)) {
      return;
    }

    const starterOut = playerA.isStarter ? playerA : playerB;
    const benchIn = playerA.isStarter ? playerB : playerA;

    const updatedPicks = userPicks.map((p) => {
      if (p.id === starterOut.id) {
        return {
          ...p,
          isStarter: false,
          subStatus: "SUBBED_OFF" as const,
          multiplier: 0,
          isCaptain: false,
          isViceCaptain: false,
          effectivePoints: 0,
        };
      }
      if (p.id === benchIn.id) {
        // Inherit captaincy or set to starter multiplier
        const isCapt = starterOut.isCaptain;
        const isVice = starterOut.isViceCaptain;
        const newMultiplier = isCapt ? (starterOut.multiplier >= 2 ? starterOut.multiplier : 2) : 1;

        return {
          ...p,
          isStarter: true,
          subStatus: "SUBBED_ON" as const,
          isCaptain: isCapt,
          isViceCaptain: isVice,
          multiplier: newMultiplier,
          effectivePoints: p.rawLivePoints * newMultiplier,
        };
      }
      return p;
    });

    setUserPicks(updatedPicks);
    setSubCount((prev) => prev + 1);
    setDraggedPlayer(null);
    setSelectedForSwap(null);
  };

  const handleResetLineup = () => {
    setUserPicks(user.picks);
    setSubCount(0);
    setDraggedPlayer(null);
    setSelectedForSwap(null);
  };

  // Calculate live user points with live modifications
  const liveUserPoints = useMemo(() => {
    const rawSum = userPicks.reduce(
      (sum, p) => sum + (p.isStarter ? (p.effectivePoints ?? p.rawLivePoints * p.multiplier) : 0),
      0
    );
    const cost = user.eventTransfersCost || 0;
    return {
      startingPoints: rawSum,
      netPoints: rawSum - cost,
    };
  }, [userPicks, user.eventTransfersCost]);

  // Current formation string (e.g. 3-4-3)
  const userFormation = useMemo(() => {
    const starters = userPicks.filter((p) => p.isStarter);
    const def = starters.filter((p) => p.elementType === 2).length;
    const mid = starters.filter((p) => p.elementType === 3).length;
    const fwd = starters.filter((p) => p.elementType === 4).length;
    return `${def}-${mid}-${fwd}`;
  }, [userPicks]);

  const rivalFormation = useMemo(() => {
    const starters = rival.picks.filter((p) => p.isStarter);
    const def = starters.filter((p) => p.elementType === 2).length;
    const mid = starters.filter((p) => p.elementType === 3).length;
    const fwd = starters.filter((p) => p.elementType === 4).length;
    return `${def}-${mid}-${fwd}`;
  }, [rival.picks]);

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

  // Render tactical pitch for a manager
  const renderTacticalPitch = (
    picksList: EnrichedPlayer[],
    managerName: string,
    teamName: string,
    score: number,
    formation: string,
    isRival: boolean
  ) => {
    const lines = groupStarters(picksList);
    const activeDragSource = draggedPlayer || selectedForSwap;

    const getStatusForPlayer = (target: EnrichedPlayer) => {
      if (isRival || !activeDragSource) return null;
      if (target.id === activeDragSource.id) return null;
      return checkSwapValidity(activeDragSource, target, userPicks) ? "valid" : "invalid";
    };

    const handlePlayerClick = (p: EnrichedPlayer) => {
      if (isRival) return;
      if (!selectedForSwap) {
        setSelectedForSwap(p);
      } else if (selectedForSwap.id === p.id) {
        setSelectedForSwap(null);
      } else {
        if (checkSwapValidity(selectedForSwap, p, userPicks)) {
          handleExecuteSwap(selectedForSwap, p);
        } else {
          setSelectedForSwap(p);
        }
      }
    };

    return (
      <div className="flex-1 flex flex-col items-center w-full">
        {/* Manager Header Banner */}
        <div className="w-full flex items-center justify-between mb-3 px-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isRival
                    ? "bg-[#e90052] shadow-[0_0_8px_#e90052]"
                    : "bg-[#00ff87] shadow-[0_0_8px_#00ff87]"
                }`}
              />
              <h3 className="font-black text-sm tracking-wide text-white uppercase">
                {managerName}
              </h3>
              <span className="font-mono text-[10px] bg-white/10 text-zinc-300 px-1.5 py-0.5 rounded border border-white/10 font-bold">
                {formation}
              </span>
            </div>
            <p className="text-xs text-zinc-400 ml-4">{teamName}</p>
          </div>

          <div className="text-right flex items-baseline gap-1">
            <span className="text-2xl font-mono font-black text-white tracking-tight">
              {score}
            </span>
            <span className="text-[10px] font-mono text-zinc-400 uppercase">pts</span>
          </div>
        </div>

        {/* Tactical Pitch Surface */}
        <div className="w-full min-h-[520px] aspect-[7/10] pl-pitch-stripes rounded-2xl border-2 border-[#00ff87]/30 relative shadow-[0_0_30px_rgba(0,0,0,0.8)] p-3 md:p-4 flex flex-col justify-between overflow-hidden">
          {/* Authentic Premier League Pitch Markings */}
          <div className="absolute inset-0 pointer-events-none opacity-30">
            {/* Halfway Line */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white" />
            {/* Center Circle & Spot */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 border-2 border-white rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full" />
            {/* Top Penalty Box & Arc */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-56 h-24 border-b-2 border-l-2 border-r-2 border-white rounded-b-md" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-10 border-b-2 border-l-2 border-r-2 border-white" />
            {/* Bottom Penalty Box & Arc */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-56 h-24 border-t-2 border-l-2 border-r-2 border-white rounded-t-md" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-10 border-t-2 border-l-2 border-r-2 border-white" />
            {/* Corner Arcs */}
            <div className="absolute top-0 left-0 w-6 h-6 border-b border-r border-white rounded-br-full" />
            <div className="absolute top-0 right-0 w-6 h-6 border-b border-l border-white rounded-bl-full" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-t border-r border-white rounded-tr-full" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-t border-l border-white rounded-tl-full" />
          </div>

          {/* Positional Lines: FWD -> MID -> DEF -> GKP */}
          <div className="relative z-10 flex justify-around w-full items-center">
            {lines.FWD.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isRival={isRival}
                cleanView={cleanView}
                isDraggable={!isRival}
                dragTargetStatus={getStatusForPlayer(p)}
                isSelected={selectedForSwap?.id === p.id}
                onDragStart={() => !isRival && setDraggedPlayer(p)}
                onDragEnd={() => !isRival && setDraggedPlayer(null)}
                onDragOver={(e) => {
                  if (!isRival) e.preventDefault();
                }}
                onDrop={() => {
                  if (!isRival && draggedPlayer) {
                    handleExecuteSwap(draggedPlayer, p);
                  }
                }}
                onClick={() => handlePlayerClick(p)}
              />
            ))}
          </div>

          <div className="relative z-10 flex justify-around w-full items-center">
            {lines.MID.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isRival={isRival}
                cleanView={cleanView}
                isDraggable={!isRival}
                dragTargetStatus={getStatusForPlayer(p)}
                isSelected={selectedForSwap?.id === p.id}
                onDragStart={() => !isRival && setDraggedPlayer(p)}
                onDragEnd={() => !isRival && setDraggedPlayer(null)}
                onDragOver={(e) => {
                  if (!isRival) e.preventDefault();
                }}
                onDrop={() => {
                  if (!isRival && draggedPlayer) {
                    handleExecuteSwap(draggedPlayer, p);
                  }
                }}
                onClick={() => handlePlayerClick(p)}
              />
            ))}
          </div>

          <div className="relative z-10 flex justify-around w-full items-center">
            {lines.DEF.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isRival={isRival}
                cleanView={cleanView}
                isDraggable={!isRival}
                dragTargetStatus={getStatusForPlayer(p)}
                isSelected={selectedForSwap?.id === p.id}
                onDragStart={() => !isRival && setDraggedPlayer(p)}
                onDragEnd={() => !isRival && setDraggedPlayer(null)}
                onDragOver={(e) => {
                  if (!isRival) e.preventDefault();
                }}
                onDrop={() => {
                  if (!isRival && draggedPlayer) {
                    handleExecuteSwap(draggedPlayer, p);
                  }
                }}
                onClick={() => handlePlayerClick(p)}
              />
            ))}
          </div>

          <div className="relative z-10 flex justify-around w-full items-center">
            {lines.GKP.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isRival={isRival}
                cleanView={cleanView}
                isDraggable={!isRival}
                dragTargetStatus={getStatusForPlayer(p)}
                isSelected={selectedForSwap?.id === p.id}
                onDragStart={() => !isRival && setDraggedPlayer(p)}
                onDragEnd={() => !isRival && setDraggedPlayer(null)}
                onDragOver={(e) => {
                  if (!isRival) e.preventDefault();
                }}
                onDrop={() => {
                  if (!isRival && draggedPlayer) {
                    handleExecuteSwap(draggedPlayer, p);
                  }
                }}
                onClick={() => handlePlayerClick(p)}
              />
            ))}
          </div>
        </div>

        {/* Bench Strip */}
        <div className="w-full mt-3 bg-[#17001c]/90 border border-white/10 rounded-xl p-2.5 flex flex-col gap-1.5 shadow-xl">
          <div className="flex items-center justify-between px-1 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
            <span>Tactical Bench {!isRival && "(Drag to Sub)"}</span>
            <span className="text-zinc-500">Sub 1-4</span>
          </div>
          <div className="flex justify-around items-center">
            {lines.bench.map((p) => (
              <PlayerCard
                key={p.id}
                player={p}
                isRival={isRival}
                cleanView={cleanView}
                isDraggable={!isRival}
                dragTargetStatus={getStatusForPlayer(p)}
                isSelected={selectedForSwap?.id === p.id}
                onDragStart={() => !isRival && setDraggedPlayer(p)}
                onDragEnd={() => !isRival && setDraggedPlayer(null)}
                onDragOver={(e) => {
                  if (!isRival) e.preventDefault();
                }}
                onDrop={() => {
                  if (!isRival && draggedPlayer) {
                    handleExecuteSwap(draggedPlayer, p);
                  }
                }}
                onClick={() => handlePlayerClick(p)}
              />
            ))}
          </div>
        </div>
      </div>
    );
  };

  const currentCap = userPicks.find((p) => p.multiplier >= 2);
  const rivalCap = rival.picks.find((p) => p.multiplier >= 2);

  return (
    <div className="w-full pl-glass rounded-2xl p-4 md:p-6 shadow-2xl space-y-6 relative overflow-hidden">
      {/* Background Premier League Broadcast Accent Glow */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#38003c]/40 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#00ff87]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Control Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div>
          <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2 uppercase">
            <span className="w-3 h-3 rounded-full bg-[#00ff87] animate-pulse shadow-[0_0_10px_#00ff87]" />
            Matchday Tactical Pitch Duel
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Simulate tactical autosubs and substitutions in real-time by dragging benched players onto the pitch.
          </p>
        </div>

        {/* Tactical Controls: Clean View Toggle, Reset Lineup, Armband Clash */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reset Lineup Button */}
          {subCount > 0 && (
            <button
              onClick={handleResetLineup}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#e90052]/20 border border-[#e90052]/50 text-[#e90052] font-mono text-xs font-bold hover:bg-[#e90052]/30 shadow-[0_0_10px_rgba(233,0,82,0.3)] transition-all"
            >
              <span>↺ Reset Lineup ({subCount} {subCount === 1 ? "swap" : "swaps"})</span>
            </button>
          )}

          {/* Clean View / Compact View Toggle */}
          <button
            onClick={() => setCleanView((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-bold border transition-all ${
              cleanView
                ? "bg-[#00ff87]/20 border-[#00ff87]/50 text-[#00ff87] shadow-[0_0_12px_rgba(0,255,135,0.25)]"
                : "bg-white/10 border-white/20 text-zinc-300 hover:bg-white/15"
            }`}
          >
            <span>{cleanView ? "✨ Clean View (Active)" : "📊 Detailed View"}</span>
          </button>

          {/* Armband Status Pill */}
          <div className="flex items-center gap-2 text-xs font-mono bg-[#17001c]/90 border border-white/10 px-3 py-1.5 rounded-lg shadow-md">
            <span className="text-zinc-400">Armband:</span>
            {currentCap?.id === rivalCap?.id ? (
              <span className="text-[#04f5ff] font-bold">
                NEUTRALIZED ({currentCap?.webName ?? "None"})
              </span>
            ) : (
              <span className="text-[#ffd700] font-bold">
                {currentCap?.webName ?? "None"} vs {rivalCap?.webName ?? "None"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Sub Helper Advisory Banner */}
      {selectedForSwap && (
        <div className="flex items-center justify-between rounded-xl border border-[#04f5ff]/40 bg-[#04f5ff]/10 px-4 py-2 text-xs text-[#04f5ff] relative z-10 animate-fade-in">
          <span>
            Selected <b>{selectedForSwap.webName}</b> ({selectedForSwap.isStarter ? "Starter" : "Bench"}).
            Click or drop onto any highlighted green slot to complete tactical swap!
          </span>
          <button
            onClick={() => setSelectedForSwap(null)}
            className="text-white hover:underline text-[11px] font-mono uppercase ml-2"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Pitches Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {renderTacticalPitch(
          userPicks,
          user.managerName,
          user.teamName,
          liveUserPoints.netPoints,
          userFormation,
          false
        )}
        {renderTacticalPitch(
          rival.picks,
          rival.managerName,
          rival.teamName,
          rival.liveNetPoints ?? rival.liveStartingPoints ?? rival.totalPoints,
          rivalFormation,
          true
        )}
      </div>
    </div>
  );
};
