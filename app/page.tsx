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
  team: string;
  price: string;
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

  const [teamIdInput, setTeamIdInput] = useState("");
  const [manager, setManager] = useState<ManagerInfo | null>(null);
  const [searchingManager, setSearchingManager] = useState(false);
  const [managerError, setManagerError] = useState("");

  useEffect(() => {
    fetch("/api/differentials")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setPlayers(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleLookupManager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamIdInput.trim()) return;

    setSearchingManager(true);
    setManagerError("");

    try {
      const res = await fetch(`/api/manager?teamId=${teamIdInput.trim()}`);
      const data = await res.json();

      if (!res.ok) {
        setManagerError(data.error || "Team not found");
        setManager(null);
      } else {
        setManager(data);
      }
    } catch {
      setManagerError("Could not connect to FPL");
    } finally {
      setSearchingManager(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-5xl mx-auto space-y-8">
        
        <header>
          <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full mb-3">
            FPL Scout Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
            Differential Radar
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Top form players with under 10% ownership and upcoming fixture difficulty (FDR).
          </p>
        </header>

        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
          <form onSubmit={handleLookupManager} className="flex gap-2 w-full md:w-auto">
            <input
              type="text"
              placeholder="e.g. 123456"
              value={teamIdInput}
              onChange={(e) => setTeamIdInput(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm focus:outline-none focus:border-emerald-500 text-white w-48 font-mono"
            />
            <button
              type="submit"
              disabled={searchingManager}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-all disabled:opacity-50"
            >
              {searchingManager ? "Scanning..." : "Check My Squad"}
            </button>
          </form>

          <div className="text-xs text-slate-500">
            {manager ? (
              <span className="text-slate-300">
                Loaded: <strong className="text-emerald-400">{manager.teamName}</strong> ({manager.managerName})
              </span>
            ) : (
              <span>Enter your FPL Entry ID to filter your squad</span>
            )}
            {managerError && <p className="text-rose-400 mt-1">{managerError}</p>}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center border border-slate-800 rounded-lg bg-slate-900/30">
            <p className="text-slate-400 animate-pulse">Calculating fixture difficulty ratings...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/60">
                  <th className="py-3.5 px-4">Player</th>
                  <th className="py-3.5 px-4">Club</th>
                  <th className="py-3.5 px-4">Cost</th>
                  <th className="py-3.5 px-4">Ownership</th>
                  <th className="py-3.5 px-4">Form</th>
                  <th className="py-3.5 px-4">Next 3 Fixtures</th>
                  <th className="py-3.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {players.map((p) => {
                  const isOwned = manager?.ownedPlayerIds.includes(p.id);

                  return (
                    <tr
                      key={p.id}
                      className={`transition-colors ${
                        isOwned ? "bg-emerald-950/20" : "hover:bg-slate-800/30"
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-slate-100">{p.name}</td>
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
                        {manager ? (
                          isOwned ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              In Squad
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              Target
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
