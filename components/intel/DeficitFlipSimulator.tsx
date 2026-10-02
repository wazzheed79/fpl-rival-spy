'use client';

import React, { useState, useMemo } from 'react';
import { DuelResponse } from '@/types/fpl';
import {
  MatchEventType,
  SimulatedEvent,
  DifferentialPlayer,
  EVENT_METADATA,
  createSimulatedEvent,
  extractDifferentials,
  calculateDeficitSimulation,
  generateQuickScenarios,
  getBaseEventPoints,
} from '@/lib/deficitFlip';

interface DeficitFlipSimulatorProps {
  duel: DuelResponse;
}

const POSITION_NAMES: Record<number, string> = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD',
};

export const DeficitFlipSimulator: React.FC<DeficitFlipSimulatorProps> = ({ duel }) => {
  const [activeEvents, setActiveEvents] = useState<SimulatedEvent[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);
  const [filterOwner, setFilterOwner] = useState<'ALL' | 'USER' | 'RIVAL'>('ALL');
  const [copiedStatus, setCopiedStatus] = useState<boolean>(false);

  // Extract differentials taking captaincy multipliers into account
  const { userWeapons, rivalThreats, allDifferentials } = useMemo(() => {
    return extractDifferentials(duel);
  }, [duel]);

  // Set default selected player if not set
  const activeSelectedPlayer = useMemo(() => {
    if (selectedPlayerId) {
      const found = allDifferentials.find((p) => p.id === selectedPlayerId);
      if (found) return found;
    }
    return userWeapons[0] || rivalThreats[0] || null;
  }, [selectedPlayerId, allDifferentials, userWeapons, rivalThreats]);

  // Calculate live simulation results
  const simulation = useMemo(() => {
    return calculateDeficitSimulation(duel, activeEvents);
  }, [duel, activeEvents]);

  // Generate automated quick scenarios
  const quickScenarios = useMemo(() => {
    return generateQuickScenarios(duel, userWeapons, rivalThreats);
  }, [duel, userWeapons, rivalThreats]);

  // Event handlers
  const handleAddEvent = (player: DifferentialPlayer, eventType: MatchEventType) => {
    const newEvent = createSimulatedEvent(player, eventType);
    setActiveEvents((prev) => [newEvent, ...prev]);
  };

  const handleRemoveEvent = (eventId: string) => {
    setActiveEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleApplyQuickScenario = (events: SimulatedEvent[]) => {
    setActiveEvents([...events]);
  };

  const handleResetSimulation = () => {
    setActiveEvents([]);
  };

  const handleCopyBanter = () => {
    const marginText =
      simulation.simulatedMargin > 0
        ? `Lead: +${simulation.simulatedMargin} pts (FLIPPED!)`
        : simulation.simulatedMargin === 0
        ? 'Tied scores!'
        : `Deficit: ${Math.abs(simulation.simulatedMargin)} pts`;

    const text = `🎯 FPL DEFICIT FLIP SIMULATOR (GW${duel.gameweek})
⚔️ ${duel.user.teamName} vs ${duel.rival.teamName}
📊 Baseline Margin: ${
      simulation.currentMargin >= 0
        ? `+${simulation.currentMargin} pts lead`
        : `-${simulation.currentDeficit} pts deficit`
    }
⚡ Net Simulated Swing: ${
      simulation.netSwing >= 0 ? `+${simulation.netSwing}` : `${simulation.netSwing}`
    } pts
🔥 Projected Outcome: ${marginText}
🎮 Simulated Events (${activeEvents.length}):
${
  activeEvents.length > 0
    ? activeEvents.slice(0, 5).map((e) => `• ${e.label}`).join('\n')
    : '• Live match baseline (no events added)'
}
#FPLRivalSpy #FPL`;

    navigator.clipboard.writeText(text);
    setCopiedStatus(true);
    setTimeout(() => setCopiedStatus(false), 2200);
  };

  const displayedDifferentials = useMemo(() => {
    if (filterOwner === 'USER') return userWeapons;
    if (filterOwner === 'RIVAL') return rivalThreats;
    return allDifferentials;
  }, [filterOwner, userWeapons, rivalThreats, allDifferentials]);

  // Primary event actions for quick tapping
  const primaryEventTypes: MatchEventType[] = [
    'GOAL',
    'ASSIST',
    'CLEAN_SHEET',
    'BONUS_3',
    'BONUS_2',
    'BONUS_1',
    'CONCEDED_2',
    'YELLOW_CARD',
    'RED_CARD',
  ];

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#070b12] p-4 sm:p-6 shadow-2xl backdrop-blur-xl space-y-6">
      {/* Background Cyber Glow Accent */}
      <div
        className={`absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          simulation.isFlipped
            ? 'bg-emerald-500/20'
            : simulation.currentMargin >= 0
            ? 'bg-cyan-500/15'
            : 'bg-rose-500/15'
        }`}
      />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className={`flex h-2.5 w-2.5 rounded-full ${
                simulation.isFlipped
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]'
                  : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
              }`}
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/50">
              Real-Time Scenario Engine
            </span>
          </div>
          <h2 className="mt-1 text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
            Live Deficit Flip Simulator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Model live differential events (goals, clean sheets, captaincy hauls) to project real-time margin swings.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeEvents.length > 0 && (
            <button
              onClick={handleResetSimulation}
              className="rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-rose-500/50 hover:text-rose-400 transition-colors flex items-center gap-1.5 shadow-sm"
              title="Reset to actual live scorelines"
            >
              <span>↺</span> Revert to Live
            </button>
          )}

          <button
            onClick={handleCopyBanter}
            className="rounded-lg border border-cyan-500/30 bg-cyan-950/40 px-3 py-1.5 text-xs font-bold text-cyan-300 hover:bg-cyan-900/50 transition-colors flex items-center gap-1.5"
          >
            {copiedStatus ? (
              <span className="text-emerald-400 font-semibold">✓ Copied Summary!</span>
            ) : (
              <span>📋 Copy Intel</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Scoreboard / Margin Flip Banner */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Actual Live Baseline */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase text-[10px] tracking-wider text-slate-500">Live Baseline</span>
            <span className="font-mono text-[11px] text-slate-400">GW{duel.gameweek} Actual</span>
          </div>
          <div className="my-3 flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-bold text-slate-300 truncate max-w-[110px]">
                {duel.user.teamName}
              </p>
              <p className="text-2xl font-black font-mono text-white">
                {duel.user.liveNetPoints ?? duel.user.liveStartingPoints ?? duel.user.totalPoints}
              </p>
            </div>
            <div className="text-center font-mono text-xs font-bold text-slate-600">VS</div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-300 truncate max-w-[110px]">
                {duel.rival.teamName}
              </p>
              <p className="text-2xl font-black font-mono text-slate-300">
                {duel.rival.liveNetPoints ?? duel.rival.liveStartingPoints ?? duel.rival.totalPoints}
              </p>
            </div>
          </div>
          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Actual Margin:</span>
            <span
              className={`font-mono font-bold ${
                simulation.currentMargin > 0
                  ? 'text-cyan-400'
                  : simulation.currentMargin < 0
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }`}
            >
              {simulation.currentMargin > 0
                ? `+${simulation.currentMargin} pts (Lead)`
                : simulation.currentMargin < 0
                ? `-${simulation.currentDeficit} pts (Deficit)`
                : 'All Level (0 pts)'}
            </span>
          </div>
        </div>

        {/* Dynamic Margin Status Card */}
        <div
          className={`rounded-xl border p-4 flex flex-col justify-between transition-all duration-500 ${
            simulation.isFlipped
              ? 'border-emerald-500/60 bg-emerald-950/30 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
              : simulation.isLeadExtended
              ? 'border-cyan-500/60 bg-cyan-950/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
              : simulation.isDeficitReduced
              ? 'border-amber-500/50 bg-amber-950/25'
              : simulation.isDeficitWidened
              ? 'border-rose-500/50 bg-rose-950/25'
              : 'border-slate-800 bg-slate-900/70'
          }`}
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono uppercase text-[10px] tracking-wider text-slate-400">
              Simulation Status
            </span>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-black/40 border border-white/10">
              {activeEvents.length} {activeEvents.length === 1 ? 'event' : 'events'} applied
            </span>
          </div>

          <div className="my-2 text-center">
            {simulation.isFlipped ? (
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 uppercase animate-bounce">
                  ⚡ DEFICIT FLIPPED! ⚡
                </span>
                <p className="text-3xl font-black font-mono text-emerald-400">
                  +{simulation.simulatedMargin}{' '}
                  <span className="text-sm font-sans font-bold text-emerald-200">PTS LEAD</span>
                </p>
                <p className="text-[11px] text-emerald-300/90 font-medium">
                  Reversed {simulation.currentDeficit} pt deficit into a {simulation.simulatedMargin} pt advantage!
                </p>
              </div>
            ) : simulation.isLeadExtended ? (
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase">
                  🛡️ LEAD EXPANDED
                </span>
                <p className="text-3xl font-black font-mono text-cyan-300">
                  +{simulation.simulatedMargin}{' '}
                  <span className="text-sm font-sans font-bold text-cyan-100">PTS LEAD</span>
                </p>
                <p className="text-[11px] text-cyan-300/90 font-medium">
                  Extended lead by +{simulation.netSwing} points over rival!
                </p>
              </div>
            ) : simulation.isDeficitReduced ? (
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                  ⏳ DEFICIT CLOSING
                </span>
                <p className="text-3xl font-black font-mono text-amber-400">
                  {simulation.simulatedMargin}{' '}
                  <span className="text-sm font-sans font-bold text-amber-200">PTS</span>
                </p>
                <p className="text-[11px] text-amber-300/90 font-medium">
                  Gap cut from -{simulation.currentDeficit} pts down to {Math.abs(simulation.simulatedMargin)} pts!
                </p>
              </div>
            ) : simulation.isDeficitWidened ? (
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-rose-500/20 text-rose-300 border border-rose-500/40 uppercase">
                  ⚠️ GAP WIDENING
                </span>
                <p className="text-3xl font-black font-mono text-rose-400">
                  {simulation.simulatedMargin}{' '}
                  <span className="text-sm font-sans font-bold text-rose-200">PTS</span>
                </p>
                <p className="text-[11px] text-rose-300/90 font-medium">
                  Rival differentials adding points to their cushion.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-widest bg-slate-800 text-slate-300 uppercase">
                  READY TO SIMULATE
                </span>
                <p className="text-2xl font-black font-mono text-white">
                  {simulation.currentMargin >= 0 ? `+${simulation.currentMargin}` : simulation.currentMargin}{' '}
                  <span className="text-sm font-sans font-bold text-slate-400">PTS MARGIN</span>
                </p>
                <p className="text-[11px] text-slate-400">
                  Tap quick scenarios below or choose differential players to test live swings.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">Simulated Net Swing:</span>
            <span
              className={`font-mono font-extrabold ${
                simulation.netSwing > 0
                  ? 'text-emerald-400'
                  : simulation.netSwing < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {simulation.netSwing > 0 ? `+${simulation.netSwing}` : simulation.netSwing} pts
            </span>
          </div>
        </div>

        {/* Projected Simulated Standings */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-mono uppercase text-[10px] tracking-wider text-slate-500">Projected Totals</span>
            <span className="font-mono text-[11px] text-cyan-400">With Events</span>
          </div>
          <div className="my-3 flex items-center justify-between">
            <div className="text-left">
              <p className="text-xs font-bold text-emerald-400 truncate max-w-[110px]">
                {duel.user.teamName}
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-black font-mono text-emerald-400">
                  {simulation.simulatedUserPoints}
                </p>
                {simulation.simulatedUserPoints !==
                  (duel.user.liveNetPoints ?? duel.user.liveStartingPoints ?? duel.user.totalPoints) && (
                  <span className="text-[10px] font-mono font-bold text-emerald-500">
                    (+
                    {simulation.simulatedUserPoints -
                      (duel.user.liveNetPoints ?? duel.user.liveStartingPoints ?? duel.user.totalPoints)}
                    )
                  </span>
                )}
              </div>
            </div>
            <div className="text-center font-mono text-xs font-bold text-slate-600">VS</div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-300 truncate max-w-[110px]">
                {duel.rival.teamName}
              </p>
              <div className="flex items-baseline justify-end gap-1.5">
                <p className="text-2xl font-black font-mono text-slate-200">
                  {simulation.simulatedRivalPoints}
                </p>
                {simulation.simulatedRivalPoints !==
                  (duel.rival.liveNetPoints ?? duel.rival.liveStartingPoints ?? duel.rival.totalPoints) && (
                  <span className="text-[10px] font-mono font-bold text-rose-400">
                    (+
                    {simulation.simulatedRivalPoints -
                      (duel.rival.liveNetPoints ?? duel.rival.liveStartingPoints ?? duel.rival.totalPoints)}
                    )
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="border-t border-slate-800/80 pt-2 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Projected Leader:</span>
            <span
              className={`font-semibold ${
                simulation.simulatedMargin > 0
                  ? 'text-emerald-400'
                  : simulation.simulatedMargin < 0
                  ? 'text-rose-400'
                  : 'text-slate-400'
              }`}
            >
              {simulation.simulatedMargin > 0
                ? `${duel.user.managerName} (+${simulation.simulatedMargin})`
                : simulation.simulatedMargin < 0
                ? `${duel.rival.managerName} (+${Math.abs(simulation.simulatedMargin)})`
                : 'Dead Heat Tie'}
            </span>
          </div>
        </div>
      </div>

      {/* Quick 1-Click Flip Scenarios */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 font-mono">
            <span>⚡</span> Quick Flip Presets
          </h3>
          <span className="text-[11px] text-slate-500">1-click automated matchday scenarios</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickScenarios.map((scen) => (
            <div
              key={scen.id}
              className="rounded-xl border border-slate-800 bg-slate-900/80 p-3.5 flex flex-col justify-between hover:border-cyan-500/40 hover:bg-slate-900 transition-all group shadow-md"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xl">{scen.icon}</span>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded text-cyan-300 border border-slate-700">
                    {scen.badge}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                  {scen.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {scen.description}
                </p>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] font-mono font-extrabold text-emerald-400">
                  {scen.projectedNetSwing >= 0 ? `+${scen.projectedNetSwing}` : scen.projectedNetSwing} pts net
                </span>
                <button
                  onClick={() => handleApplyQuickScenario(scen.events)}
                  className="text-[11px] font-bold px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500 hover:text-slate-950 transition-all shadow-sm"
                >
                  Apply ⚡
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Custom Event Builder */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>🎮</span> Custom Event Builder
            </h3>
            <p className="text-xs text-slate-400">
              Select an active differential player and tap events to trigger custom live swings.
            </p>
          </div>

          {/* Differential Filter Filter */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setFilterOwner('ALL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterOwner === 'ALL' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({allDifferentials.length})
            </button>
            <button
              onClick={() => setFilterOwner('USER')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterOwner === 'USER'
                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Weapons ({userWeapons.length})
            </button>
            <button
              onClick={() => setFilterOwner('RIVAL')}
              className={`px-2.5 py-1 rounded transition-colors ${
                filterOwner === 'RIVAL'
                  ? 'bg-rose-950/80 text-rose-300 border border-rose-500/30'
                  : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Threats ({rivalThreats.length})
            </button>
          </div>
        </div>

        {/* Differential Player Selector Grid */}
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            Step 1: Select Active Differential
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {displayedDifferentials.map((player) => {
              const isSelected = activeSelectedPlayer?.id === player.id;
              const isWeapon = player.owner === 'user';

              return (
                <button
                  key={player.id}
                  onClick={() => setSelectedPlayerId(player.id)}
                  className={`rounded-lg p-2.5 text-left border transition-all relative ${
                    isSelected
                      ? isWeapon
                        ? 'border-emerald-400 bg-emerald-950/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'border-rose-400 bg-rose-950/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                      : 'border-slate-800 bg-slate-950/80 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span
                      className={`font-mono font-bold px-1 rounded ${
                        isWeapon
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {POSITION_NAMES[player.elementType]}
                    </span>
                    <span className="font-mono text-slate-400">{player.teamShort}</span>
                  </div>

                  <p className="font-bold text-xs text-white truncate mt-1">{player.webName}</p>

                  <div className="mt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">{player.currentPoints} pts</span>
                    {player.isCaptain ? (
                      <span className="font-mono font-extrabold text-amber-400 bg-amber-950/60 px-1 rounded border border-amber-500/40">
                        {player.userMultiplier > 1 || player.rivalMultiplier > 1 ? 'C (2x)' : 'C'}
                      </span>
                    ) : (
                      <span className="font-mono text-slate-500">
                        {isWeapon ? `+${player.userMultiplier}x` : `-${player.rivalMultiplier}x`}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Player Event Action Panel */}
        {activeSelectedPlayer && (
          <div className="rounded-xl border border-slate-800/90 bg-slate-950/90 p-3 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    activeSelectedPlayer.owner === 'user' ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                />
                <span className="font-bold text-sm text-white">{activeSelectedPlayer.webName}</span>
                <span className="text-xs text-slate-400">({activeSelectedPlayer.teamShort})</span>
                <span className="text-xs font-mono text-slate-500">
                  {POSITION_NAMES[activeSelectedPlayer.elementType]} •{' '}
                  {activeSelectedPlayer.owner === 'user' ? 'Your Weapon' : 'Rival Threat'}
                </span>
                {activeSelectedPlayer.isCaptain && (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                    Captain Multiplier Active
                  </span>
                )}
              </div>

              <span className="text-xs font-mono text-slate-400">
                Effective Swing Multiplier:{' '}
                <strong className={activeSelectedPlayer.owner === 'user' ? 'text-emerald-400' : 'text-rose-400'}>
                  {activeSelectedPlayer.effectiveMultiplierDiff > 0
                    ? `+${activeSelectedPlayer.effectiveMultiplierDiff}x`
                    : `${activeSelectedPlayer.effectiveMultiplierDiff}x`}
                </strong>
              </span>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block mb-2">
                Step 2: Tap Event to Trigger Live Points Swing
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                {primaryEventTypes.map((type) => {
                  const meta = EVENT_METADATA[type];
                  const basePts = getBaseEventPoints(type, activeSelectedPlayer.elementType);
                  const netDelta = basePts * activeSelectedPlayer.effectiveMultiplierDiff;

                  return (
                    <button
                      key={type}
                      onClick={() => handleAddEvent(activeSelectedPlayer, type)}
                      className="group flex flex-col items-center justify-center p-2 rounded-lg border border-slate-800 bg-slate-900/80 hover:border-cyan-400 hover:bg-slate-900 transition-all text-center shadow-sm"
                    >
                      <span className="text-base group-hover:scale-110 transition-transform">
                        {meta.icon}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-200 mt-1 truncate w-full">
                        {meta.shortCode}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold mt-0.5 ${
                          netDelta > 0
                            ? 'text-emerald-400'
                            : netDelta < 0
                            ? 'text-rose-400'
                            : 'text-slate-500'
                        }`}
                      >
                        {netDelta >= 0 ? `+${netDelta}` : netDelta} pts
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Applied Events Log Feed */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center gap-2">
            <span>📝</span> Applied Event Timeline ({activeEvents.length})
          </h3>
          {activeEvents.length > 0 && (
            <button
              onClick={handleResetSimulation}
              className="text-[11px] text-rose-400 hover:text-rose-300 font-medium underline"
            >
              Clear all events
            </button>
          )}
        </div>

        {activeEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center">
            <p className="text-xs text-slate-400">
              No simulated events applied yet. Tap a quick scenario preset above or use the event builder to simulate live match swings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
            {activeEvents.map((evt) => {
              const meta = EVENT_METADATA[evt.eventType];

              return (
                <div
                  key={evt.id}
                  className="rounded-lg border border-slate-800 bg-slate-900/90 p-2.5 flex items-center justify-between text-xs hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-base">{meta.icon}</span>
                    <div className="truncate">
                      <p className="font-bold text-white truncate">
                        {evt.playerName}{' '}
                        <span className="text-[10px] font-normal text-slate-400">
                          ({evt.teamShort})
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {meta.label} ({evt.basePoints >= 0 ? `+${evt.basePoints}` : evt.basePoints} base)
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={`font-mono text-xs font-extrabold px-1.5 py-0.5 rounded ${
                        evt.netSwingToUser > 0
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : evt.netSwingToUser < 0
                          ? 'bg-rose-950 text-rose-400 border border-rose-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {evt.netSwingToUser >= 0 ? `+${evt.netSwingToUser}` : evt.netSwingToUser} pts
                    </span>
                    <button
                      onClick={() => handleRemoveEvent(evt.id)}
                      className="text-slate-500 hover:text-rose-400 font-bold px-1 transition-colors"
                      title="Remove event"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
