'use client';

import React, { useState } from 'react';
import { DuelResponse, EnrichedPlayer } from '@/types/fpl';
import { PlayerCard } from './PlayerCard';

interface PitchDuelProps {
  data: DuelResponse;
}

export const PitchDuel: React.FC<PitchDuelProps> = ({ data }) => {
  const { user, rival, armbandClash, metrics, gameweek } = data;

  const [viewMode, setViewMode] = useState<'pitch' | 'list'>('pitch');
  const [userPicks, setUserPicks] = useState<EnrichedPlayer[]>(user.picks);

  // Dragging and Tap State
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [draggedPlayerId, setDraggedPlayerId] = useState<number | null>(null);
  const [dragOverPlayerId, setDragOverPlayerId] = useState<number | null>(null);

  // Sync if manager or rival changes
  React.useEffect(() => {
    setUserPicks(user.picks);
    setSelectedPlayerId(null);
    setDraggedPlayerId(null);
  }, [user.picks]);

  // Check if current user lineup deviates from official FPL picks
  const hasModifiedLineup = React.useMemo(() => {
    return userPicks.some((current) => {
      const original = user.picks.find((p) => p.id === current.id);
      return original && original.isStarter !== current.isStarter;
    });
  }, [userPicks, user.picks]);

  const handleResetLineup = () => {
    setUserPicks(user.picks);
    setSelectedPlayerId(null);
    setDraggedPlayerId(null);
    setDragOverPlayerId(null);
  };

  const partitionFormation = (picks: EnrichedPlayer[]) => {
    const starters = picks.filter((p) => p.isStarter);
    const bench = picks.filter((p) => !p.isStarter);

    const gkp = starters.filter((p) => p.elementType === 1);
    const def = starters.filter((p) => p.elementType === 2);
    const mid = starters.filter((p) => p.elementType === 3);
    const fwd = starters.filter((p) => p.elementType === 4);

    return {
      gkp,
      def,
      mid,
      fwd,
      bench,
      formation: `${def.length}-${mid.length}-${fwd.length}`,
      startersCount: starters.length,
    };
  };

  const isValidFormation = (starters: EnrichedPlayer[]) => {
    const gkp = starters.filter((p) => p.elementType === 1).length;
    const def = starters.filter((p) => p.elementType === 2).length;
    const mid = starters.filter((p) => p.elementType === 3).length;
    const fwd = starters.filter((p) => p.elementType === 4).length;
    return gkp === 1 && def >= 3 && mid >= 2 && fwd >= 1 && starters.length === 11;
  };

  const executeSwap = (sourceId: number, targetId: number) => {
    if (sourceId === targetId) return;

    const source = userPicks.find((p) => p.id === sourceId);
    const target = userPicks.find((p) => p.id === targetId);

    if (!source || !target) return;

    if ((source.elementType === 1 || target.elementType === 1) && source.elementType !== target.elementType) {
      alert('Goalkeepers can only be swapped with the bench Goalkeeper.');
      return;
    }

    const nextPicks = userPicks.map((p) => {
      if (p.id === source.id) {
        return {
          ...p,
          isStarter: target.isStarter,
          multiplier: target.isStarter ? (p.isCaptain ? 2 : 1) : 0,
          position: target.position,
        };
      }
      if (p.id === target.id) {
        return {
          ...p,
          isStarter: source.isStarter,
          multiplier: source.isStarter ? (p.isCaptain ? 2 : 1) : 0,
          position: source.position,
        };
      }
      return p;
    });

    const nextStarters = nextPicks.filter((p) => p.isStarter);

    if (isValidFormation(nextStarters)) {
      setUserPicks(nextPicks);
    } else {
      alert('Invalid FPL Formation! Lineup must have 1 GKP, at least 3 DEF, 2 MID, and 1 FWD.');
    }

    setSelectedPlayerId(null);
    setDraggedPlayerId(null);
    setDragOverPlayerId(null);
  };

  const handleDragStart = (player: EnrichedPlayer) => {
    setDraggedPlayerId(player.id);
  };

  const handleDragOver = (e: React.DragEvent, player: EnrichedPlayer) => {
    e.preventDefault();
    if (draggedPlayerId && draggedPlayerId !== player.id) {
      setDragOverPlayerId(player.id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetPlayer: EnrichedPlayer) => {
    e.preventDefault();
    if (draggedPlayerId) {
      executeSwap(draggedPlayerId, targetPlayer.id);
    }
  };

  const handlePlayerClick = (clickedPlayer: EnrichedPlayer) => {
    if (!selectedPlayerId) {
      setSelectedPlayerId(clickedPlayer.id);
    } else {
      executeSwap(selectedPlayerId, clickedPlayer.id);
    }
  };

  const userLines = partitionFormation(userPicks);
  const rivalLines = partitionFormation(rival.picks);

  // Recalculate dynamic user score based on experimental swap
  const currentUserLiveScore = userPicks.reduce(
    (sum, p) => sum + (p.isStarter ? p.effectivePoints : 0),
    0
  ) - user.eventTransfersCost;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl items-center">
        <div className="flex flex-col border-r border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Gameweek {gameweek}
          </span>
          <span className="text-xl font-bold text-white">Live Duel</span>
        </div>

        <div className="flex flex-col border-r border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Armband
          </span>
          {armbandClash.isNeutralized ? (
            <span className="text-xs font-semibold text-emerald-400">
              🛡️ {armbandClash.userCaptain}
            </span>
          ) : (
            <span className="text-xs font-semibold text-rose-400">
              ⚔️ {armbandClash.userCaptain} vs {armbandClash.rivalCaptain}
            </span>
          )}
        </div>

        <div className="flex flex-col border-r border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Tactical Balance
          </span>
          <div className="flex gap-2 text-xs font-semibold mt-1">
            <span className="text-emerald-400">🛡️ {metrics.sharedShieldsCount}</span>
            <span className="text-cyan-400">⚡ {metrics.userWeaponsCount}</span>
            <span className="text-rose-400">⚠️ {metrics.rivalDangersCount}</span>
          </div>
        </div>

        <div className="flex flex-col border-r border-slate-800">
          <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Net Score Swing
          </span>
          <span
            className={`text-xl font-black ${
              metrics.netScoreSwing > 0
                ? 'text-emerald-400'
                : metrics.netScoreSwing < 0
                ? 'text-rose-400'
                : 'text-slate-300'
            }`}
          >
            {metrics.netScoreSwing > 0 ? `+${metrics.netScoreSwing}` : metrics.netScoreSwing} pts
          </span>
        </div>

        <div className="col-span-2 md:col-span-1 flex justify-end">
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-950 p-1">
            <button
              onClick={() => setViewMode('pitch')}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                viewMode === 'pitch'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Pitch
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`rounded px-3 py-1 text-xs font-bold transition-all ${
                viewMode === 'list'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Helper Bar with Reset Lineup Trigger */}
      {viewMode === 'pitch' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-xs text-slate-400 shadow-inner">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>
              <b>Drag & drop</b> (or tap two cards) to swap starters. Active Formation:{' '}
              <b className="text-cyan-400 font-mono">{userLines.formation}</b>
            </span>
            {hasModifiedLineup && (
              <span className="rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                Experimental
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasModifiedLineup && (
              <button
                onClick={handleResetLineup}
                className="flex items-center gap-1.5 rounded-md bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 text-[11px] font-bold text-rose-300 hover:bg-rose-500/30 transition-colors shadow-sm"
              >
                <span>↺</span>
                <span>Reset to Official Lineup</span>
              </button>
            )}
            {selectedPlayerId && (
              <button
                onClick={() => setSelectedPlayerId(null)}
                className="text-slate-400 hover:text-white text-[11px] font-semibold"
              >
                Cancel Selection
              </button>
            )}
          </div>
        </div>
      )}

      {/* Views */}
      {viewMode === 'pitch' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PitchContainer
            title={user.teamName}
            managerSubtitle={user.managerName}
            formation={userLines.formation}
            liveScore={currentUserLiveScore}
            transferCost={user.eventTransfersCost}
            isRival={false}
            lines={userLines}
            selectedPlayerId={selectedPlayerId}
            draggedPlayerId={draggedPlayerId}
            dragOverPlayerId={dragOverPlayerId}
            onPlayerClick={handlePlayerClick}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />

          <PitchContainer
            title={rival.teamName}
            managerSubtitle={rival.managerName}
            formation={rivalLines.formation}
            liveScore={rival.liveNetPoints}
            transferCost={rival.eventTransfersCost}
            isRival={true}
            lines={rivalLines}
            selectedPlayerId={null}
            draggedPlayerId={null}
            dragOverPlayerId={null}
            onPlayerClick={() => {}}
            onDragStart={() => {}}
            onDragOver={() => {}}
            onDrop={() => {}}
          />
        </div>
      ) : (
        <SquadListView userPicks={userPicks} rivalPicks={rival.picks} />
      )}
    </div>
  );
};

interface PitchContainerProps {
  title: string;
  managerSubtitle: string;
  formation: string;
  liveScore: number;
  transferCost: number;
  isRival: boolean;
  selectedPlayerId: number | null;
  draggedPlayerId: number | null;
  dragOverPlayerId: number | null;
  onPlayerClick: (p: EnrichedPlayer) => void;
  onDragStart: (p: EnrichedPlayer) => void;
  onDragOver: (e: React.DragEvent, p: EnrichedPlayer) => void;
  onDrop: (e: React.DragEvent, p: EnrichedPlayer) => void;
  lines: {
    gkp: EnrichedPlayer[];
    def: EnrichedPlayer[];
    mid: EnrichedPlayer[];
    fwd: EnrichedPlayer[];
    bench: EnrichedPlayer[];
  };
}

const PitchContainer: React.FC<PitchContainerProps> = ({
  title,
  managerSubtitle,
  formation,
  liveScore,
  transferCost,
  isRival,
  lines,
  selectedPlayerId,
  draggedPlayerId,
  dragOverPlayerId,
  onPlayerClick,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                isRival ? 'bg-rose-500' : 'bg-cyan-500'
              }`}
            />
            <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
          </div>
          <p className="text-xs text-slate-400">{managerSubtitle} ({formation})</p>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black text-amber-400">{liveScore} pts</div>
          {transferCost > 0 && (
            <span className="text-[10px] font-semibold text-rose-400">
              (-{transferCost} hit)
            </span>
          )}
        </div>
      </div>

      <div className="relative flex flex-col justify-between p-4 min-h-[560px] bg-gradient-to-b from-emerald-900/40 via-emerald-950/20 to-slate-950/80 border-b border-slate-800">
        <div className="pointer-events-none absolute inset-0 flex flex-col justify-between border border-emerald-500/20 m-3 rounded">
          <div className="w-full border-b border-emerald-500/20 absolute top-1/2 -translate-y-1/2" />
          <div className="h-28 w-28 rounded-full border border-emerald-500/20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        </div>

        <div className="relative z-10 flex flex-col gap-6 justify-between flex-grow py-2">
          <div className="flex justify-around items-center">
            {lines.gkp.map((player) => (
              <div key={player.id} onClick={() => onPlayerClick(player)}>
                <PlayerCard
                  player={player}
                  isRival={isRival}
                  isDragging={draggedPlayerId === player.id}
                  isDragTarget={dragOverPlayerId === player.id}
                  onDragStart={() => onDragStart(player)}
                  onDragOver={(e) => onDragOver(e, player)}
                  onDrop={(e) => onDrop(e, player)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-around items-center">
            {lines.def.map((player) => (
              <div key={player.id} onClick={() => onPlayerClick(player)}>
                <PlayerCard
                  player={player}
                  isRival={isRival}
                  isDragging={draggedPlayerId === player.id}
                  isDragTarget={dragOverPlayerId === player.id}
                  onDragStart={() => onDragStart(player)}
                  onDragOver={(e) => onDragOver(e, player)}
                  onDrop={(e) => onDrop(e, player)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-around items-center">
            {lines.mid.map((player) => (
              <div key={player.id} onClick={() => onPlayerClick(player)}>
                <PlayerCard
                  player={player}
                  isRival={isRival}
                  isDragging={draggedPlayerId === player.id}
                  isDragTarget={dragOverPlayerId === player.id}
                  onDragStart={() => onDragStart(player)}
                  onDragOver={(e) => onDragOver(e, player)}
                  onDrop={(e) => onDrop(e, player)}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-around items-center">
            {lines.fwd.map((player) => (
              <div key={player.id} onClick={() => onPlayerClick(player)}>
                <PlayerCard
                  player={player}
                  isRival={isRival}
                  isDragging={draggedPlayerId === player.id}
                  isDragTarget={dragOverPlayerId === player.id}
                  onDragStart={() => onDragStart(player)}
                  onDragOver={(e) => onDragOver(e, player)}
                  onDrop={(e) => onDrop(e, player)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/90 p-3">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
          Substitutes Bench
        </span>
        <div className="grid grid-cols-4 gap-2">
          {lines.bench.map((player) => (
            <div key={player.id} onClick={() => onPlayerClick(player)}>
              <PlayerCard
                player={player}
                isRival={isRival}
                isDragging={draggedPlayerId === player.id}
                isDragTarget={dragOverPlayerId === player.id}
                onDragStart={() => onDragStart(player)}
                onDragOver={(e) => onDragOver(e, player)}
                onDrop={(e) => onDrop(e, player)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const SquadListView: React.FC<{
  userPicks: EnrichedPlayer[];
  rivalPicks: EnrichedPlayer[];
}> = ({ userPicks, rivalPicks }) => {
  const POSITION_MAP: Record<number, string> = { 1: 'GKP', 2: 'DEF', 3: 'MID', 4: 'FWD' };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl overflow-x-auto">
        <h4 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider">
          Your Squad Breakdown (15 Players)
        </h4>
        <table className="w-full text-left text-xs font-medium text-slate-300">
          <thead className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
            <tr>
              <th className="py-2">Pos</th>
              <th className="py-2">Player</th>
              <th className="py-2">Team</th>
              <th className="py-2">Role</th>
              <th className="py-2">Category</th>
              <th className="py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {userPicks.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-400">{POSITION_MAP[p.elementType]}</td>
                <td className="py-2 font-sans font-bold text-white flex items-center gap-1.5">
                  {p.webName}
                  {p.multiplier > 1 && (
                    <span className="rounded bg-amber-400 px-1 text-[9px] font-black text-black">
                      {p.multiplier === 3 ? 'TC' : 'C'}
                    </span>
                  )}
                </td>
                <td className="py-2 text-slate-400">{p.teamShort}</td>
                <td className="py-2">
                  <span className={p.isStarter ? 'text-emerald-400' : 'text-slate-500'}>
                    {p.isStarter ? 'Starter' : 'Bench'}
                  </span>
                </td>
                <td className="py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      p.category === 'SHIELD'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-cyan-500/20 text-cyan-400'
                    }`}
                  >
                    {p.category}
                  </span>
                </td>
                <td className="py-2 text-right font-black text-amber-300">{p.effectivePoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 shadow-xl overflow-x-auto">
        <h4 className="text-sm font-bold text-rose-400 mb-3 uppercase tracking-wider">
          Rival Squad Breakdown (15 Players)
        </h4>
        <table className="w-full text-left text-xs font-medium text-slate-300">
          <thead className="border-b border-slate-800 text-[10px] font-bold uppercase text-slate-400">
            <tr>
              <th className="py-2">Pos</th>
              <th className="py-2">Player</th>
              <th className="py-2">Team</th>
              <th className="py-2">Role</th>
              <th className="py-2">Category</th>
              <th className="py-2 text-right">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {rivalPicks.map((p) => (
              <tr key={p.id} className="hover:bg-slate-800/30">
                <td className="py-2 font-bold text-slate-400">{POSITION_MAP[p.elementType]}</td>
                <td className="py-2 font-sans font-bold text-white flex items-center gap-1.5">
                  {p.webName}
                  {p.multiplier > 1 && (
                    <span className="rounded bg-amber-400 px-1 text-[9px] font-black text-black">
                      {p.multiplier === 3 ? 'TC' : 'C'}
                    </span>
                  )}
                </td>
                <td className="py-2 text-slate-400">{p.teamShort}</td>
                <td className="py-2">
                  <span className={p.isStarter ? 'text-emerald-400' : 'text-slate-500'}>
                    {p.isStarter ? 'Starter' : 'Bench'}
                  </span>
                </td>
                <td className="py-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                      p.category === 'SHIELD'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    {p.category}
                  </span>
                </td>
                <td className="py-2 text-right font-black text-amber-300">{p.effectivePoints}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
