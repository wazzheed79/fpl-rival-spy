"use client";

import React, { useState } from "react";
import { PitchDuel } from "@/components/pitch/PitchDuel";
import { EOMatrixTable, EORow } from "@/components/radar/EOMatrixTable";
import { RivalAutopsyCard, AutopsyMetrics } from "@/components/intel/RivalAutopsyCard";

export default function Home() {
  const [leagueId, setLeagueId] = useState("");
  const [rivalId, setRivalId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Mock initial state for previewing the new UI
  const sampleUserSquad = {
    managerName: "You (Tactician)",
    teamName: "Title Chasers FC",
    totalPoints: 68,
    players: [
      { id: 1, webName: "Raya", position: "GKP" as const, teamShort: "ARS", points: 6, status: "finished" as const },
      { id: 2, webName: "Gabriel", position: "DEF" as const, teamShort: "ARS", points: 8, status: "finished" as const },
      { id: 3, webName: "Alexander-Arnold", position: "DEF" as const, teamShort: "LIV", points: 7, status: "finished" as const },
      { id: 4, webName: "Gvardiol", position: "DEF" as const, teamShort: "MCI", points: 2, status: "finished" as const },
      { id: 5, webName: "Palmer", position: "MID" as const, teamShort: "CHE", points: 12, isDifferential: true, status: "playing" as const, liveMinutes: 72 },
      { id: 6, webName: "Saka", position: "MID" as const, teamShort: "ARS", points: 9, status: "finished" as const },
      { id: 7, webName: "Mbeumo", position: "MID" as const, teamShort: "BRE", points: 8, status: "finished" as const },
      { id: 8, webName: "Rogers", position: "MID" as const, teamShort: "AVL", points: 3, status: "finished" as const },
      { id: 9, webName: "Haaland", position: "FWD" as const, teamShort: "MCI", points: 13, isCaptain: true, status: "playing" as const, liveMinutes: 85 },
      { id: 10, webName: "Watkins", position: "FWD" as const, teamShort: "AVL", points: 5, status: "finished" as const },
      { id: 11, webName: "Wood", position: "FWD" as const, teamShort: "NFO", points: 2, status: "finished" as const }
    ]
  };

  const sampleRivalSquad = {
    managerName: "Rival Leader",
    teamName: "Lucky Punts XI",
    totalPoints: 54,
    players: [
      { id: 101, webName: "Pickford", position: "GKP" as const, teamShort: "EVE", points: 3, status: "finished" as const },
      { id: 102, webName: "Saliba", position: "DEF" as const, teamShort: "ARS", points: 6, status: "finished" as const },
      { id: 103, webName: "Robinson", position: "DEF" as const, teamShort: "FUL", points: 1, status: "finished" as const },
      { id: 104, webName: "Pedro Porro", position: "DEF" as const, teamShort: "TOT", points: 4, status: "finished" as const },
      { id: 105, webName: "Salah", position: "MID" as const, teamShort: "LIV", points: 15, isCaptain: true, status: "finished" as const },
      { id: 106, webName: "Son", position: "MID" as const, teamShort: "TOT", points: 2, isDifferential: true, status: "finished" as const },
      { id: 107, webName: "Luis Díaz", position: "MID" as const, teamShort: "LIV", points: 3, status: "finished" as const },
      { id: 108, webName: "Smith Rowe", position: "MID" as const, teamShort: "FUL", points: 2, status: "finished" as const },
      { id: 109, webName: "Haaland", position: "FWD" as const, teamShort: "MCI", points: 13, isViceCaptain: true, status: "playing" as const, liveMinutes: 85 },
      { id: 110, webName: "Solanke", position: "FWD" as const, teamShort: "TOT", points: 2, status: "finished" as const },
      { id: 111, webName: "Isak", position: "FWD" as const, teamShort: "NEW", points: 3, status: "finished" as const }
    ]
  };

  const sampleEoData: EORow[] = [
    { id: 1, name: "Haaland", team: "MCI", leagueEo: 160.0, globalEo: 142.5, userOwned: true },
    { id: 2, name: "Salah", team: "LIV", leagueEo: 88.5, globalEo: 65.2, userOwned: false },
    { id: 3, name: "Palmer", team: "CHE", leagueEo: 25.0, globalEo: 52.0, userOwned: true },
    { id: 4, name: "Saka", team: "ARS", leagueEo: 75.0, globalEo: 68.0, userOwned: true },
    { id: 5, name: "Son", team: "TOT", leagueEo: 50.0, globalEo: 22.0, userOwned: false }
  ];

  const sampleAutopsy: AutopsyMetrics = {
    rivalName: "Lucky Punts XI",
    gameweek: 7,
    pointsOnBench: 14,
    benchedTopScorer: "Aina (9 pts)",
    captainPointsLost: 6,
    transferCostTax: 4,
    transferredOutScored: 8,
    transferredInScored: 2
  };

  return (
    <main className="min-h-screen bg-[#07090e] text-zinc-100 p-4 md:p-8 space-y-8">
      {/* Header Bar */}
      <header className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_12px_#34d399]" />
            <h1 className="text-2xl font-black tracking-tight text-white uppercase font-mono">
              FPL Rival Spy <span className="text-emerald-400">Terminal</span>
            </h1>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Real-time mini-league espionage, tactical duels, and leapfrog analytics.
          </p>
        </div>

        {/* Inputs */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Mini-League ID"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
          <input
            type="text"
            placeholder="Rival Manager ID"
            value={rivalId}
            onChange={(e) => setRivalId(e.target.value)}
            className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
          />
          <button className="bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-1.5 rounded-lg text-xs transition-colors shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            Analyze
          </button>
        </div>
      </header>

      {/* Grid: Pitch Duel & Banter Autopsy */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <PitchDuel userSquad={sampleUserSquad} rivalSquad={sampleRivalSquad} />
        </div>
        <div className="space-y-6">
          <RivalAutopsyCard metrics={sampleAutopsy} />
        </div>
      </div>

      {/* Mini-League Effective Ownership Matrix */}
      <section>
        <EOMatrixTable data={sampleEoData} />
      </section>
    </main>
  );
}
