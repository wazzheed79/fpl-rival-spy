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
  xG: string;
  xA: string;
  nextFixtures: Fixture[];
}

interface CaptainInfo {
  id: number;
  name: string;
}

interface ManagerInfo {
  teamName: string;
  managerName: string;
  ownedPlayerIds: number[];
  captain?: CaptainInfo | null;
  viceCaptain?: CaptainInfo | null;
  activeGameweek?: number;
}

interface LeagueRival {
  entry: number;
  player_name: string;
  entry_name: string;
  rank: number;
  total: number;
}

type SortField = "name" | "costRaw" | "form" | "xG" | "xA" | "ownership";
type SortDirection = "asc" | "desc";

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
  const [easyRunOnly, setEasyRunOnly] = useState<boolean>(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("form");
  const [sortDir, setSortDir] = useState<SortDirection>("desc");

  // User & Rival IDs
  const [myTeamId, setMyTeamId] = useState("");
  const [myManager, setMyManager] = useState<ManagerInfo | null>(null);

  const [rivalTeamId, setRivalTeamId] = useState("");
  const [rivalManager, setRivalManager] = useState<ManagerInfo | null>(null);

  // Mini-League
  const [leagueId, setLeagueId] = useState("");
  const [leagueName, setLeagueName] = useState("");
  const [leagueRivals, setLeagueRivals] = useState<LeagueRival[]>([]);
  const [loadingLeague, setLoadingLeague] = useState(false);

  const [searching, setSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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
    const savedLeagueId = localStorage.getItem("fpl_league_id");

    if (savedMyId) {
      setMyTeamId(savedMyId);
      lookupManager(savedMyId, savedRivalId || "");
    }
    if (savedRivalId) {
      setRivalTeamId(savedRivalId);
    }
    if (savedLeagueId) {
      setLeagueId(savedLeagueId);
      fetchLeague(savedLeagueId);
    }
  }, []);

  const fetchLeague = async (id: string) => {
    if (!id.trim()) return;
    setLoadingLeague(true);
    try {
      const res = await fetch(`/api/league?leagueId=${id.trim()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "League not found");
      setLeagueName(data.leagueName);
      setLeagueRivals(data.rivals || []);
      localStorage.setItem("fpl_league_id", id.trim());
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load league");
    } finally {
      setLoadingLeague(false);
    }
  };

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

  const handleSelectRival = (selectedId: string) => {
    setRivalTeamId(selectedId);
    lookupManager(myTeamId, selectedId);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const filteredPlayers = players
    .filter((p) => {
      const matchesPos = selectedPos === "ALL" || p.position === selectedPos;
      const matchesPrice = p.costRaw <= maxPrice;
      const matchesEasy =
        !easyRunOnly ||
        (p.nextFixtures.length > 0 &&
          p.nextFixtures.every((f) => f.difficulty <= 3));

      return matchesPos && matchesPrice && matchesEasy;
    })
    .sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortField === "name") {
        valA = a.name.toLowerCase();
        valB = b.name.toLowerCase();
        return sortDir === "asc"
          ? (valA as string).localeCompare(valB as string)
          : (valB as string).localeCompare(valA as string);
      }

      if (sortField === "costRaw") {
        valA = a.costRaw;
        valB = b.costRaw;
      } else if (sortField === "form") {
        valA = parseFloat(a.form) || 0;
        valB = parseFloat(b.form) || 0;
      } else if (sortField === "xG") {
        valA = parseFloat(a.xG) || 0;
        valB = parseFloat(b.xG) || 0;
      } else if (sortField === "xA") {
        valA = parseFloat(a.xA) || 0;
        valB = parseFloat(b.xA) || 0;
      } else if (sortField === "ownership") {
        valA = parseFloat(a.ownership) || 0;
        valB = parseFloat(b.ownership) || 0;
      }

      return sortDir === "asc" ? (valA as number) - (valB as number) : (valB as number) - (valA as number);
    });

  const renderSortIndicator = (field: SortField) => {
    if (sortField !== field) return <span className="text-slate-600 ml-1">↕</span>;
    return sortDir === "asc" ? (
      <span className="text-emerald-400 ml-1 font-bold">↑</span>
    ) : (
      <span className="text-emerald-400 ml-1 font-bold">↓</span>
    );
  };

  const isCaptainShielded =
    myManager?.captain &&
    rivalManager?.captain &&
    myManager.captain.id === rivalManager.captain.id;

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        <header>
          <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full mb-3">
            FPL Scout Engine
          </div>
          <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-white">
            Rival Spy & Differential Radar
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Differential targets, live captaincy clashing, and mini-league tracking.
          </p>
        </header>

        {/* Mini-League Sync Bar */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-300 whitespace-nowrap">🏆 Mini-League ID:</span>
            <input
              type="text"
              placeholder="e.g. 56789"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-white focus:outline-none focus:border-amber-400 w-32"
            />
            <button
              onClick={() => fetchLeague(leagueId)}
              disabled={loadingLeague}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all disabled:opacity-50"
            >
              {loadingLeague ? "Syncing..." : "Sync League"}
            </button>
          </div>

          {leagueRivals.length > 0 && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-slate-400">Pick Rival ({leagueName}):</span>
              <select
                value={rivalTeamId}
                onChange={(e) => handleSelectRival(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-rose-300 font-semibold focus:outline-none focus:border-rose-500"
              >
                <option value="">-- Choose Rival from Standings --</option>
                {leagueRivals.map((r) => (
                  <option key={r.entry} value={r.entry}>
                    #{r.rank} {r.player_name} ({r.entry_name}) - {r.total} pts
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Manager Input */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
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
              <label className="text-xs font-semibold text-slate-300">Rival's Team ID (Or use dropdown above)</label>
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

          {/* Captaincy Clash Indicator */}
          {myManager && rivalManager && myManager.captain && rivalManager.captain && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                isCaptainShielded
                  ? "bg-slate-900 border-slate-700 text-slate-300"
                  : "bg-amber-950/40 border-amber-500/50 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-base">{isCaptainShielded ? "🛡️" : "⚔️"}</span>
                <div>
                  <strong className="block font-semibold">
                    {isCaptainShielded ? "Armband Shielded" : "Captaincy Clash Active"}
                  </strong>
                  <span className="text-slate-400">
                    {isCaptainShielded
                      ? `Both managers backed ${myManager.captain.name} (C). Net captaincy swing: 0 pts.`
                      : `You backed ${myManager.captain.name} (C) vs Rival's ${rivalManager.captain.name} (C). High rank swing gameweek!`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Manager Meta Details */}
          {(myManager || rivalManager || errorMsg) && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-4 text-xs">
              {myManager && (
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                  <span className="text-slate-400">You:</span>
                  <strong className="text-emerald-400">{myManager.teamName}</strong>
                  {myManager.captain && (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      (C) {myManager.captain.name}
                    </span>
                  )}
                </div>
              )}
              {rivalManager && (
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                  <span className="text-slate-400">Rival:</span>
                  <strong className="text-rose-400">{rivalManager.teamName}</strong>
                  {rivalManager.captain && (
                    <span className="bg-rose-950 text-rose-300 border border-rose-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      (C) {rivalManager.captain.name}
                    </span>
                  )}
                </div>
              )}
              {errorMsg && <p className="text-rose-400 font-semibold self-center">{errorMsg}</p>}
            </div>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-900/40">
          <div className="flex flex-wrap gap-2">
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

            <button
              onClick={() => setEasyRunOnly(!easyRunOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                easyRunOnly
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                  : "bg-slate-800/80 text-slate-400 border-transparent hover:text-white"
              }`}
            >
              <span>🟢</span> Easy Run Only
            </button>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">
              Max Price: <strong className="text-emerald-400 font-mono">£{maxPrice.toFixed(1)}m</strong>
            </label>
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

        {/* Player Table */}
        {loading ? (
          <div className="p-8 text-center border border-slate-800 rounded-lg bg-slate-900/30">
            <p className="text-slate-400 animate-pulse">Running live scouting analysis...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40 backdrop-blur">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider bg-slate-900/60 select-none">
                  <th onClick={() => handleSort("name")} className="py-3.5 px-4 cursor-pointer hover:text-white">
                    Player {renderSortIndicator("name")}
                  </th>
                  <th className="py-3.5 px-4">Pos</th>
                  <th className="py-3.5 px-4">Club</th>
                  <th onClick={() => handleSort("costRaw")} className="py-3.5 px-4 cursor-pointer hover:text-white">
                    Cost {renderSortIndicator("costRaw")}
                  </th>
                  <th onClick={() => handleSort("ownership")} className="py-3.5 px-4 cursor-pointer hover:text-white">
                    Ownership {renderSortIndicator("ownership")}
                  </th>
                  <th onClick={() => handleSort("form")} className="py-3.5 px-4 cursor-pointer hover:text-white">
                    Form {renderSortIndicator("form")}
                  </th>
                  <th onClick={() => handleSort("xG")} className="py-3.5 px-4 cursor-pointer hover:text-white">
                    xG {renderSortIndicator("xG")}
                  </th>
                  <th onClick={() => handleSort("xA")} className="py-3.5 px-4 cursor-pointer hover:text-white">
                    xA {renderSortIndicator("xA")}
                  </th>
                  <th className="py-3.5 px-4">Next 3 Fixtures</th>
                  <th className="py-3.5 px-4 text-right">Rival Spy Verdict</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-500">
                      No differentials match your selected filters.
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
                        <td className="py-3.5 px-4 font-mono text-slate-300">{p.xG}</td>
                        <td className="py-3.5 px-4 font-mono text-slate-300">{p.xA}</td>
                        
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