"use client";

import { useState, useEffect } from "react";

interface EnrichedLivePick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  name: string;
  type: number;
  cost: number;
  form: string;
  duelRole: "SHIELD" | "WEAPON" | "RIVAL_DANGER";
  livePoints: number;
  effectivePoints: number;
  minutes: number;
}

interface ChipStatus {
  name: string;
  key: string;
  playedEvent: number | null;
  isAvailable: boolean;
}

interface SquadData {
  picks: EnrichedLivePick[];
  chip: string | null;
  bank: number;
  liveTotal: number;
  chipsInventory: ChipStatus[];
}

interface DuelResponse {
  gameweek: number;
  netDelta: number;
  myTeam: SquadData;
  rivalTeam: SquadData;
}

interface Competitor {
  entry: number;
  teamName: string;
  managerName: string;
  rank: number;
  totalPoints: number;
}

interface TransferRecommendation {
  sellPlayer: {
    id: number;
    name: string;
    cost: number;
    form: number;
    type: number;
  };
  buyPlayer: {
    id: number;
    name: string;
    team: string;
    cost: number;
    form: number;
    type: number;
    selectedBy: string;
  };
  formDelta: number;
  costDelta: number;
}

export default function Home() {
  const [leagueId, setLeagueId] = useState("");
  const [leagueName, setLeagueName] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  const [myId, setMyId] = useState("");
  const [rivalId, setRivalId] = useState("");
  const [gw, setGw] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingLeague, setLoadingLeague] = useState(false);
  const [loadingTransfers, setLoadingTransfers] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duel, setDuel] = useState<DuelResponse | null>(null);
  const [transfers, setTransfers] = useState<TransferRecommendation[]>([]);

  useEffect(() => {
    const savedMyId = localStorage.getItem("fpl_my_id");
    const savedRivalId = localStorage.getItem("fpl_rival_id");
    const savedLeagueId = localStorage.getItem("fpl_league_id");

    if (savedMyId) setMyId(savedMyId);
    if (savedRivalId) setRivalId(savedRivalId);
    if (savedLeagueId) {
      setLeagueId(savedLeagueId);
      loadLeague(savedLeagueId);
    }
  }, []);

  const loadLeague = async (idToFetch: string) => {
    if (!idToFetch) return;
    setLoadingLeague(true);
    setError(null);

    try {
      const res = await fetch(`/api/league?leagueId=${idToFetch}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "League not found");

      setLeagueName(data.leagueName);
      setCompetitors(data.standings);
      localStorage.setItem("fpl_league_id", idToFetch);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error syncing league");
    } finally {
      setLoadingLeague(false);
    }
  };

  const handleLeagueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadLeague(leagueId);
  };

  const fetchTransfers = async (id: string) => {
    if (!id) return;
    setLoadingTransfers(true);
    try {
      const res = await fetch(`/api/leapfrog?myId=${id}${gw ? `&gw=${gw}` : ""}`);
      const data = await res.json();
      if (res.ok) setTransfers(data.recommendations || []);
    } catch {
      // Background pass
    } finally {
      setLoadingTransfers(false);
    }
  };

  const fetchDuel = async (targetMyId = myId, targetRivalId = rivalId) => {
    if (!targetMyId || !targetRivalId) {
      setError("Please provide both Your Team ID and Rival Team ID");
      return;
    }

    setLoading(true);
    setError(null);
    localStorage.setItem("fpl_my_id", targetMyId);
    localStorage.setItem("fpl_rival_id", targetRivalId);

    try {
      const url = `/api/manager?myId=${targetMyId}&rivalId=${targetRivalId}${gw ? `&gw=${gw}` : ""}`;
      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Failed to fetch tactical data");
      setDuel(data);
      fetchTransfers(targetMyId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error connecting to FPL API");
    } finally {
      setLoading(false);
    }
  };

  const renderPitchLines = (picks: EnrichedLivePick[]) => {
    const starters = picks.filter((p) => p.position <= 11);
    const bench = picks.filter((p) => p.position > 11);

    const gks = starters.filter((p) => p.type === 1);
    const defs = starters.filter((p) => p.type === 2);
    const mids = starters.filter((p) => p.type === 3);
    const fwds = starters.filter((p) => p.type === 4);

    return (
      <div className="flex flex-col justify-between h-full space-y-4">
        <div className="flex justify-around items-center">{renderLine(gks)}</div>
        <div className="flex justify-around items-center">{renderLine(defs)}</div>
        <div className="flex justify-around items-center">{renderLine(mids)}</div>
        <div className="flex justify-around items-center">{renderLine(fwds)}</div>
        <div className="border-t border-slate-700/60 pt-3 mt-4">
          <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-2 text-center">Substitutes</div>
          <div className="flex justify-around items-center">{renderLine(bench, true)}</div>
        </div>
      </div>
    );
  };

  const renderLine = (players: EnrichedLivePick[], isBench = false) => {
    return players.map((p) => {
      const roleStyles = {
        SHIELD: "border-emerald-500/80 bg-emerald-950/30 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
        WEAPON: "border-cyan-500/80 bg-cyan-950/30 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.15)]",
        RIVAL_DANGER: "border-rose-500/80 bg-rose-950/30 text-rose-300 shadow-[0_0_12px_rgba(244,63,94,0.15)]",
      }[p.duelRole];

      return (
        <div
          key={p.element}
          className={`flex flex-col items-center justify-center p-2 rounded-lg border backdrop-blur-md transition-all duration-200 min-w-[76px] sm:min-w-[90px] ${roleStyles} ${
            isBench ? "opacity-60 scale-90" : ""
          }`}
        >
          <div className="flex items-center space-x-1">
            <span className="text-xs font-bold tracking-tight truncate max-w-[65px]">{p.name}</span>
            {p.is_captain && (
              <span className="text-[9px] font-black bg-amber-500 text-black px-1 rounded-sm">C</span>
            )}
            {p.is_vice_captain && (
              <span className="text-[9px] font-black bg-slate-500 text-white px-1 rounded-sm">V</span>
            )}
          </div>

          <div className="flex items-center justify-between w-full mt-1.5 px-1">
            <span className="text-[11px] font-black font-mono text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
              {p.effectivePoints} pts
            </span>
            <span className="text-[10px] text-slate-400 font-mono">£{p.cost.toFixed(1)}</span>
          </div>
        </div>
      );
    });
  };

  const myStarters = duel?.myTeam.picks.filter((p) => p.position <= 11) ?? [];
  const rivalStarters = duel?.rivalTeam.picks.filter((p) => p.position <= 11) ?? [];
  const shieldsCount = myStarters.filter((p) => p.duelRole === "SHIELD").length;
  const weaponsCount = myStarters.filter((p) => p.duelRole === "WEAPON").length;
  const dangerCount = rivalStarters.filter((p) => p.duelRole === "RIVAL_DANGER").length;

  const myCaptain = duel?.myTeam.picks.find((p) => p.is_captain);
  const rivalCaptain = duel?.rivalTeam.picks.find((p) => p.is_captain);
  const isCaptainNeutralized = myCaptain && rivalCaptain && myCaptain.element === rivalCaptain.element;

  // Calculate chip advantage
  const myAvailableChips = duel?.myTeam.chipsInventory.filter((c) => c.isAvailable).length ?? 0;
  const rivalAvailableChips = duel?.rivalTeam.chipsInventory.filter((c) => c.isAvailable).length ?? 0;
  const chipAdvantage = myAvailableChips - rivalAvailableChips;

  return (
    <main className="min-h-screen bg-[#070B11] text-slate-100 flex flex-col items-center p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <header className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white">
              FPL Rival Spy <span className="text-cyan-400 text-sm font-mono font-medium">/// HUD v1.0</span>
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">Head-to-head mini-league reconnaissance and tactical pitch duel</p>
        </div>

        {/* Mini-League Sync */}
        <form onSubmit={handleLeagueSubmit} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-xl border border-slate-800">
          <input
            type="number"
            placeholder="Mini-League ID"
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="w-36 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono focus:border-cyan-400 outline-none"
            required
          />
          <button
            type="submit"
            disabled={loadingLeague}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-cyan-300 font-bold text-xs uppercase tracking-wider rounded-md transition-all border border-slate-700"
          >
            {loadingLeague ? "Syncing..." : "Sync League"}
          </button>
        </form>
      </header>

      {/* Manual Input Controls */}
      <div className="w-full max-w-7xl mt-4 p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1">Direct Matchup:</span>
          <input
            type="number"
            placeholder="Your Team ID"
            value={myId}
            onChange={(e) => setMyId(e.target.value)}
            className="w-32 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono focus:border-cyan-400 outline-none"
          />
          <input
            type="number"
            placeholder="Rival Team ID"
            value={rivalId}
            onChange={(e) => setRivalId(e.target.value)}
            className="w-32 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono focus:border-rose-400 outline-none"
          />
          <input
            type="number"
            placeholder="GW (Opt)"
            value={gw}
            onChange={(e) => setGw(e.target.value)}
            className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-md text-xs font-mono focus:border-slate-500 outline-none"
          />
          <button
            onClick={() => fetchDuel()}
            disabled={loading || !myId || !rivalId}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-md transition-all"
          >
            {loading ? "Scanning..." : "Launch Duel"}
          </button>
        </div>

        <button
          onClick={() => {
            setMyId("12345");
            setRivalId("67890");
            fetchDuel("12345", "67890");
          }}
          className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono underline"
        >
          Load Demo IDs
        </button>
      </div>

      {/* Synced Competitors Bar */}
      {competitors.length > 0 && (
        <div className="w-full max-w-7xl mt-4 p-4 bg-slate-900/60 border border-cyan-900/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase font-semibold tracking-wider">Synced League</span>
            <h2 className="text-sm font-bold text-white">{leagueName} ({competitors.length} Managers)</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Your Team</label>
              <select
                value={myId}
                onChange={(e) => {
                  setMyId(e.target.value);
                  if (rivalId) fetchDuel(e.target.value, rivalId);
                }}
                className="bg-slate-950 border border-slate-700 rounded-md text-xs px-2 py-1.5 text-cyan-300 outline-none focus:border-cyan-400"
              >
                <option value="">Select Your Team</option>
                {competitors.map((c) => (
                  <option key={c.entry} value={c.entry}>
                    #{c.rank} {c.managerName} ({c.teamName}) - {c.totalPoints} pts
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-semibold text-slate-400 mb-1">Target Rival</label>
              <select
                value={rivalId}
                onChange={(e) => {
                  setRivalId(e.target.value);
                  if (myId) fetchDuel(myId, e.target.value);
                }}
                className="bg-slate-950 border border-slate-700 rounded-md text-xs px-2 py-1.5 text-rose-300 outline-none focus:border-rose-400"
              >
                <option value="">Select Target Rival</option>
                {competitors.map((c) => (
                  <option key={c.entry} value={c.entry}>
                    #{c.rank} {c.managerName} ({c.teamName}) - {c.totalPoints} pts
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => fetchDuel()}
              disabled={!myId || !rivalId || loading}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-md transition-all self-end"
            >
              {loading ? "Scanning..." : "Duel Rival"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="w-full max-w-7xl mt-4 p-3 bg-rose-950/40 border border-rose-500/50 rounded-lg text-rose-300 text-xs">
          [Alert] {error}
        </div>
      )}

      {!duel && !loading && (
        <div className="w-full max-w-7xl mt-12 flex flex-col items-center justify-center p-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/30 text-center">
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl font-bold mb-4">
            ⚽
          </div>
          <h2 className="text-lg font-bold text-white mb-2">No Active Pitch Duel</h2>
          <p className="text-xs text-slate-400 max-w-md mb-6 leading-relaxed">
            Enter a Mini-League ID in the top right to load your competitors, or input two direct FPL Team IDs above to compare Starting XIs, armbands, and differential point threats.
          </p>
          <div className="flex gap-4 text-xs font-mono">
            <span className="text-emerald-400">🟢 Shared Shield</span>
            <span className="text-cyan-400">🔵 Your Weapon</span>
            <span className="text-rose-400">🔴 Rival Danger</span>
          </div>
        </div>
      )}

      {/* Duel Arena */}
      {duel && (
        <div className="w-full max-w-7xl mt-6 space-y-6">
          {/* Live Net Score Swing Header */}
          <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Live Gameweek Net Swing</span>
              <div className="flex items-center gap-3 mt-1">
                <span className={`text-2xl sm:text-3xl font-black font-mono ${
                  duel.netDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}>
                  {duel.netDelta >= 0 ? `+${duel.netDelta}` : duel.netDelta} pts
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ({duel.myTeam.liveTotal} pts vs {duel.rivalTeam.liveTotal} pts)
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono">
                <span className="text-[9px] uppercase text-slate-400 block">Your Points</span>
                <span className="text-sm font-bold text-cyan-400">{duel.myTeam.liveTotal}</span>
              </div>
              <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-center font-mono">
                <span className="text-[9px] uppercase text-slate-400 block">Rival Points</span>
                <span className="text-sm font-bold text-rose-400">{duel.rivalTeam.liveTotal}</span>
              </div>
            </div>
          </div>

          {/* Chip Recon Arsenal Card */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-white">Chip Recon Arsenal</span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  chipAdvantage > 0
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-500/30"
                    : chipAdvantage < 0
                    ? "bg-rose-950 text-rose-300 border border-rose-500/30"
                    : "bg-slate-800 text-slate-300 border border-slate-700"
                }`}>
                  {chipAdvantage > 0 ? `+${chipAdvantage} Chip Leverage` : chipAdvantage < 0 ? `${chipAdvantage} Chip Deficit` : "Equal Chip Parity"}
                </span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Double / Blank GW Tactical Readiness
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* My Chips */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[11px] font-bold text-cyan-400 uppercase tracking-wide mb-2 flex justify-between">
                  <span>Your Chip Inventory</span>
                  <span className="text-slate-400 font-mono">{myAvailableChips} Remaining</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {duel.myTeam.chipsInventory.map((chip) => (
                    <div
                      key={chip.key}
                      className={`p-2 rounded-lg border text-center font-mono ${
                        chip.isAvailable
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                          : "bg-slate-900/40 border-slate-800/80 text-slate-500 line-through opacity-70"
                      }`}
                    >
                      <div className="text-[10px] font-bold truncate">{chip.name}</div>
                      <div className="text-[9px] mt-0.5">
                        {chip.isAvailable ? "READY" : `Used GW${chip.playedEvent}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rival Chips */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div className="text-[11px] font-bold text-rose-400 uppercase tracking-wide mb-2 flex justify-between">
                  <span>Rival Chip Inventory</span>
                  <span className="text-slate-400 font-mono">{rivalAvailableChips} Remaining</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {duel.rivalTeam.chipsInventory.map((chip) => (
                    <div
                      key={chip.key}
                      className={`p-2 rounded-lg border text-center font-mono ${
                        chip.isAvailable
                          ? "bg-amber-950/30 border-amber-500/40 text-amber-300"
                          : "bg-slate-900/40 border-slate-800/80 text-slate-500 line-through opacity-70"
                      }`}
                    >
                      <div className="text-[10px] font-bold truncate">{chip.name}</div>
                      <div className="text-[9px] mt-0.5">
                        {chip.isAvailable ? "THREAT" : `Used GW${chip.playedEvent}`}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tactical Intel Header */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Gameweek</span>
              <p className="text-xl font-black font-mono text-cyan-400">GW {duel.gameweek}</p>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-emerald-400 uppercase font-semibold">Shared Shields</span>
              <p className="text-xl font-black font-mono text-emerald-400">{shieldsCount} Neutral</p>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-cyan-400 uppercase font-semibold">Your Weapons</span>
              <p className="text-xl font-black font-mono text-cyan-400">{weaponsCount} Differentials</p>
            </div>
            <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
              <span className="text-[10px] text-rose-400 uppercase font-semibold">Rival Danger</span>
              <p className="text-xl font-black font-mono text-rose-400">{dangerCount} Threats</p>
            </div>
          </div>

          {/* Armband Clash Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isCaptainNeutralized 
              ? "bg-emerald-950/20 border-emerald-500/40" 
              : "bg-rose-950/20 border-rose-500/40"
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-black/40 font-black text-amber-400 text-sm border border-amber-400/30">
                CAPTAINCY
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {isCaptainNeutralized ? "Armband Neutralized (Shared Shield)" : "High Volatility Armband Duel"}
                </p>
                <p className="text-xs text-slate-400">
                  You: <span className="font-semibold text-cyan-300">{myCaptain?.name || "N/A"} ({myCaptain?.effectivePoints} pts)</span> vs Rival: <span className="font-semibold text-rose-300">{rivalCaptain?.name || "N/A"} ({rivalCaptain?.effectivePoints} pts)</span>
                </p>
              </div>
            </div>
            <div className="text-xs font-mono px-3 py-1 rounded bg-black/50 border border-slate-700 text-slate-300">
              {isCaptainNeutralized ? "0 Pt Swing Delta" : "Active Volatility"}
            </div>
          </div>

          {/* Pitches */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-cyan-400 uppercase">Your Squad</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Bank: {duel.myTeam.bank.toFixed(1)}m | Active Chip: {duel.myTeam.chip || "None"}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Shield</span>
                  <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-500"></span>Weapon</span>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#0a1510] to-[#0d1f17] rounded-xl p-4 sm:p-6 border border-emerald-950/60 shadow-inner flex-1 min-h-[460px]">
                {renderPitchLines(duel.myTeam.picks)}
              </div>
            </div>

            <div className="flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 relative overflow-hidden backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
                <div>
                  <h3 className="font-bold text-sm tracking-wide text-rose-400 uppercase">Rival Recon Squad</h3>
                  <p className="text-[11px] text-slate-400 font-mono">Bank: {duel.rivalTeam.bank.toFixed(1)}m | Active Chip: {duel.rivalTeam.chip || "None"}</p>
                </div>
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span>Shield</span>
                  <span className="flex items-center gap-1 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span>Threat</span>
                </div>
              </div>

              <div className="bg-gradient-to-b from-[#190a0d] to-[#240e13] rounded-xl p-4 sm:p-6 border border-rose-950/60 shadow-inner flex-1 min-h-[460px]">
                {renderPitchLines(duel.rivalTeam.picks)}
              </div>
            </div>
          </div>

          {/* Leapfrog Transfer Radar Section */}
          <div className="p-5 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <span>⚡ Leapfrog Differential Engine</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated replacement targets for squad underperformers based on your bank ({duel.myTeam.bank.toFixed(1)}m)
                </p>
              </div>
              {loadingTransfers && <span className="text-xs font-mono text-cyan-400 animate-pulse">Calculating radar...</span>}
            </div>

            {transfers.length === 0 && !loadingTransfers ? (
              <div className="text-xs text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-lg">
                Squad in optimal form — no urgent differential swaps required.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {transfers.map((rec, i) => (
                  <div key={i} className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col justify-between">
                    <div className="flex items-center justify-between text-[11px] mb-2">
                      <span className="text-rose-400 font-bold uppercase">Sell</span>
                      <span className="text-emerald-400 font-bold uppercase">Buy Differential</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-white truncate max-w-[90px]">{rec.sellPlayer.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">F: {rec.sellPlayer.form} | {rec.sellPlayer.cost}m</p>
                      </div>

                      <span className="text-slate-500 font-bold text-xs">➔</span>

                      <div className="text-right">
                        <p className="text-xs font-bold text-cyan-300 truncate max-w-[90px]">{rec.buyPlayer.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{rec.buyPlayer.team} | {rec.buyPlayer.cost}m</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono">
                      <span className="text-emerald-400 font-semibold">+{rec.formDelta} Form Delta</span>
                      <span className="text-slate-400">{rec.buyPlayer.selectedBy}% Global EO</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
