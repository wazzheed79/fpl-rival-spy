"use client";

import { useEffect, useState } from "react";

interface Fixture {
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

interface Player {
  id: number;
  name: string;
  position: string;
  team: string;
  price: string;
  costRaw: number;
  ownership: string;
  form: string;
  totalPoints: number;
  nextFixtures: Fixture[];
}

interface ManagerInfo {
  teamName: string;
  managerName: string;
  ownedPlayerIds: number[];
}

function FDRBadge({ fixture }: { fixture: Fixture }) {
  const getFDRStyle = (diff: number) => {
    switch (diff) {
      case 2:
        return "bg-emerald-950 text-emerald-300 border-emerald-600/60";
      case 3:
        return "bg-slate-800 text-slate-300 border-slate-700";
      case 4:
        return "bg-rose-950 text-rose-300 border-rose-600/60";
      case 5:
        return "bg-red-950 text-red-200 border-red-500 font-extrabold";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <span
      title={`Difficulty: ${fixture.difficulty}/5`}
      className={`inline-block px-1.5 py-0.5 text-[11px] font-mono rounded border ${getFDRStyle(
        fixture.difficulty
      )}`}
    >
      {fixture.opponent} ({fixture.isHome ? "H" : "A"})
    </span>
  );
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPos, setSelectedPos] = useState<string>("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(15.0);

  // User & Rival IDs
  const [myTeamId, setMyTeamId] = useState("");
  const [myManager, setMyManager] = useState<ManagerInfo | null>(null);

  const [rivalTeamId, setRivalTeamId] = useState("");
  const [rivalManager, setRivalManager] = useState<ManagerInfo | null>(null);

  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load differentials & saved team IDs on boot
  useEffect(() => {
    fetch("/api/differentials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPlayers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    const savedMyId = localStorage.getItem("fpl_my_team_id");
    const savedRivalId = localStorage.getItem("fpl_rival_team_id");

    if (savedMyId) {
      setMyTeamId(savedMyId);
      lookupManager(savedMyId, savedRivalId || "");
    }
    if (savedRivalId) {
      setRivalTeamId(savedRivalId);
    }
  }, []);

  const lookupManager = async (myId: string, rivalId: string) => {
    if (!myId.trim()) return;
    setSearching(true);
    setErrorMsg("");

    try {
      const myRes = await fetch(`/api/manager?teamId=${myId.trim()}`);
      const myData = await myRes.json();
      if (!myRes.ok) throw new Error(myData.error || "Your team ID was not found");
      setMyManager(myData);
      localStorage.setItem("fpl_my_team_id", myId.trim());

      if (rivalId.trim()) {
        const rivalRes = await fetch(`/api/manager?teamId=${rivalId.trim()}`);
        const rivalData = await rivalRes.json();
        if (!rivalRes.ok) throw new Error(rivalData.error || "Rival team ID was not found");
        setRivalManager(rivalData);
        localStorage.setItem("fpl_rival_team_id", rivalId.trim());
      } else {
        setRivalManager(null);
        localStorage.removeItem("fpl_rival_team_id");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to fetch squads");
    } finally {
      setSearching(false);
    }
  };

  const handleCompare = (e: React.FormEvent) => {
    e.preventDefault();
    lookupManager(myTeamId, rivalTeamId);
  };

  // Filter logic
  const filteredPlayers = players.filter((p) => {
    const matchesPos = selectedPos === "ALL" || p.position === selectedPos;
    const matchesPrice = p.costRaw <= maxPrice;
    return matchesPos && matchesPrice;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header>
          <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full mb-3">
            FPL Scout Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
            Rival Spy & Differential Radar
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Top differentials filtered by position, budget, and mini-league rival ownership.
          </p>
        </header>

        {/* Dual Manager Search Panel */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl">
          <form onSubmit={handleCompare} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">Your FPL Team ID</label>
              <input
                type="text"
                placeholder="e.g. 123456"
                value={myTeamId}
                onChange={(e) => setMyTeamId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm focus:outline-none focus:border-emerald-500 text-white font-mono"
              />
            </div>

            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-semibold text-slate-300">Rival's Team ID (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 987654"
                value={rivalTeamId}
                onChange={(e) => setRivalTeamId(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm focus:outline-none focus:border-rose-500 text-white font-mono"
              />
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={searching}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-all disabled:opacity-50"
              >
                {searching ? "Spying..." : "Compare"}
              </button>
            </div>
          </form>

          {(myManager || rivalManager || errorMsg) && (
            <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap gap-4 text-xs">
              {myManager && (
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">You: </span>
                  <strong className="text-emerald-400">{myManager.teamName}</strong> ({myManager.managerName})
                </div>
              )}
              {rivalManager && (
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Rival: </span>
                  <strong className="text-rose-400">{rivalManager.teamName}</strong> ({rivalManager.managerName})
                </div>
              )}
              {errorMsg && <p className="text-rose-400 font-semibold self-center">{errorMsg}</p>}
            </div>
          )}
        </div>

        {/* Position & Price Filters */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex gap-2">
            {["ALL", "DEF", "MID", "FWD", "GKP"].map((pos) => (
              <button
                key={pos}
                onClick={() => setSelectedPos(pos)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                  selectedPos === pos
                    ? "bg-emerald-500 text-slate-950"
                    : "bg-slate-800/80 text-slate-400 hover:text-white"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Max Price: <strong className="text-emerald-400">£{maxPrice.toFixed(1)}m</strong></label>
            <input
              type="range"
              min="4.0"
              max="15.0"
              step="0.5"
              value={maxPrice}
              onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
              className="w-28 accent-emerald-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center border border-slate-800 rounded-lg bg-slate-900/30">
            <p className="text-slate-400 animate-pulse">Running live scouting analysis...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Pos</th>
                  <th className="py-3.5 px-4">Club</th>
                  <th className="py-3.5 px-4">Cost</th>
                  <th className="py-3.5 px-4">Ownership</th>
                  <th className="py-3.5 px-4">Form</th>
                  <th className="py-3.5 px-4">Next 3 Fixtures</th>
                  <th className="py-3.5 px-4 text-right">Rival Spy Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No differentials match your selected position and price filters.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p) => {
                    const iOwn = myManager?.ownedPlayerIds.includes(p.id);
                    const rivalOwns = rivalManager?.ownedPlayerIds.includes(p.id);

                    let badge = <span className="text-xs text-slate-600">—</span>;

                    if (myManager) {
                      if (iOwn) {
                        badge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            In Your Squad
                          </span>
                        );
                      } else if (rivalOwns) {
                        badge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            ⚠️ Rival Owns
                          </span>
                        );
                      } else if (rivalManager && !rivalOwns && !iOwn) {
                        badge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                            🔥 Leapfrog Target
                          </span>
                        );
                      } else {
                        badge = (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Scout Target
                          </span>
                        );
                      }
                    }

                    return (
                      <tr
                        key={p.id}
                        className={`transition-colors ${
                          iOwn ? "bg-emerald-950/15" : rivalOwns ? "bg-rose-950/15" : "hover:bg-slate-800/30"
                        }`}
                      >
                        <td className="py-3.5 px-4 font-semibold text-slate-100">{p.name}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-xs text-slate-400 font-mono font-medium">{p.position}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-xs font-medium text-slate-300">
                            {p.team}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400 font-medium">£{p.price}m</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{p.ownership}</td>
                        <td className="py-3.5 px-4 font-semibold text-amber-400">{p.form}</td>
                        
                        <td className="py-3.5 px-4">
                          <div className="flex gap-1.5">
                            {p.nextFixtures.length > 0 ? (
                              p.nextFixtures.map((f, idx) => (
                                <FDRBadge key={idx} fixture={f} />
                              ))
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {badge}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}