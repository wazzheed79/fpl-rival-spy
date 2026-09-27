"use client";

import { useEffect, useState, useMemo } from "react";

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
  ownershipRaw: number;
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

interface PlayerPick {
  id: number;
  name: string;
  position: string;
  elementType: number;
  rawPoints: number;
  points: number;
  multiplier: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
}

interface ChipsRemaining {
  wildcard: number;
  freehit: number;
  bboost: number;
  tripleCaptain: number;
}

interface ChipUsage {
  name: string;
  event: number;
  time: string;
}

interface ManagerInfo {
  teamName: string;
  managerName: string;
  ownedPlayerIds: number[];
  startingXI: PlayerPick[];
  bench: PlayerPick[];
  formation: string;
  totalStartingPoints: number;
  captain?: CaptainInfo | null;
  viceCaptain?: CaptainInfo | null;
  activeGameweek?: number;
  bank?: number;
  value?: number;
  chipsRemaining?: ChipsRemaining;
  chipsUsed?: ChipUsage[];
}

interface LeagueRival {
  entry: number;
  player_name: string;
  entry_name: string;
  rank: number;
  total: number;
  ownedPlayerIds?: number[];
}

type SortField = "name" | "costRaw" | "form" | "xG" | "xA" | "ownershipRaw";
type SortDirection = "asc" | "desc";

function FDRBadge({ fixture }: { fixture: Fixture }) {
  const getFDRStyle = (diff: number) => {
    switch (diff) {
      case 2:
        return "bg-emerald-950/80 text-emerald-300 border-emerald-600/50";
      case 3:
        return "bg-slate-800 text-slate-300 border-slate-700";
      case 4:
        return "bg-rose-950/80 text-rose-300 border-rose-600/50";
      case 5:
        return "bg-red-950 text-red-200 border-red-500 font-black";
      default:
        return "bg-slate-800 text-slate-300 border-slate-700";
    }
  };

  return (
    <span
      title={`Difficulty: ${fixture.difficulty}/5`}
      className={`inline-block px-1.5 py-0.5 text-[10px] md:text-[11px] font-mono rounded border whitespace-nowrap ${getFDRStyle(
        fixture.difficulty
      )}`}
    >
      {fixture.opponent} ({fixture.isHome ? "H" : "A"})
    </span>
  );
}

function PitchView({
  manager,
  otherManager,
  title,
  themeColor,
}: {
  manager: ManagerInfo;
  otherManager: ManagerInfo | null;
  title: string;
  themeColor: "emerald" | "rose";
}) {
  const otherStartingIds = useMemo(() => {
    if (!otherManager || !otherManager.startingXI) return new Set<number>();
    return new Set(otherManager.startingXI.map((p) => p.id));
  }, [otherManager]);

  const startingXI = manager.startingXI || [];
  const bench = manager.bench || [];

  const fwds = startingXI.filter((p) => p.elementType === 4);
  const mids = startingXI.filter((p) => p.elementType === 3);
  const defs = startingXI.filter((p) => p.elementType === 2);
  const gkps = startingXI.filter((p) => p.elementType === 1);

  const renderPlayerCard = (p: PlayerPick) => {
    const isShared = otherStartingIds.has(p.id);
    const isMine = themeColor === "emerald";

    let badgeClass = "bg-slate-900/90 border-slate-700 text-slate-200";
    let statusLabel = "";
    let statusEmoji = "";

    if (otherManager) {
      if (isShared) {
        badgeClass = "bg-emerald-950/90 border-emerald-500/70 text-emerald-200 ring-1 ring-emerald-500/40";
        statusLabel = "Shared Shield";
        statusEmoji = "🟢";
      } else if (isMine) {
        badgeClass = "bg-sky-950/90 border-sky-500/70 text-sky-200 ring-1 ring-sky-500/40";
        statusLabel = "Your Weapon";
        statusEmoji = "🔵";
      } else {
        badgeClass = "bg-rose-950/90 border-rose-500/70 text-rose-200 ring-1 ring-rose-500/40";
        statusLabel = "Rival Danger";
        statusEmoji = "🔴";
      }
    }

    return (
      <div
        key={p.id}
        title={`${p.name} (${p.position}) - ${p.points} pts ${statusLabel ? `[${statusLabel}]` : ""}`}
        className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl border shadow-md backdrop-blur-sm transition-all hover:scale-105 select-none w-16 sm:w-20 md:w-24 ${badgeClass}`}
      >
        <div className="flex items-center gap-1 w-full justify-between">
          <span className="text-[9px] sm:text-[10px] font-mono opacity-80">{p.position}</span>
          {statusEmoji && <span className="text-[10px]" title={statusLabel}>{statusEmoji}</span>}
        </div>
        <span className="text-xs sm:text-sm font-black truncate max-w-full text-white text-center my-0.5">
          {p.name}
        </span>
        <div className="flex items-center justify-between w-full pt-1 border-t border-white/10 text-[10px] sm:text-xs">
          <span className="font-mono font-bold text-amber-300">{p.points} pts</span>
          {p.isCaptain && (
            <span className="px-1 py-0.2 bg-amber-500 text-slate-950 font-black text-[9px] rounded">
              {p.multiplier === 3 ? "TC" : "C"}
            </span>
          )}
          {p.isViceCaptain && !p.isCaptain && (
            <span className="px-1 py-0.2 bg-slate-700 text-slate-300 font-bold text-[9px] rounded">
              VC
            </span>
          )}
        </div>
      </div>
    );
  };

  const borderColor = themeColor === "emerald" ? "border-emerald-500/30" : "border-rose-500/30";
  const headerBg = themeColor === "emerald" ? "bg-emerald-950/40 text-emerald-300" : "bg-rose-950/40 text-rose-300";

  return (
    <div className={`rounded-2xl border ${borderColor} bg-slate-900/60 p-4 space-y-4 shadow-xl flex flex-col justify-between`}>
      {/* Pitch Header */}
      <div className={`flex items-center justify-between p-3 rounded-xl border ${borderColor} ${headerBg}`}>
        <div>
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">{title}</span>
          <h4 className="font-black text-sm sm:text-base text-white">{manager.teamName}</h4>
          <span className="text-xs opacity-90">{manager.managerName}</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-80 block">Starting XI</span>
          <div className="text-base sm:text-lg font-black font-mono text-amber-400">
            {manager.totalStartingPoints} pts
          </div>
          <span className="text-[10px] font-mono opacity-80">Formation: {manager.formation}</span>
        </div>
      </div>

      {/* Visual Football Pitch */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-b from-emerald-900 via-emerald-950 to-emerald-900 border border-emerald-700/40 p-4 sm:p-6 shadow-inner min-h-[380px] flex flex-col justify-between">
        {/* Pitch markings background */}
        <div className="absolute inset-0 pointer-events-none opacity-20 flex flex-col justify-between p-4">
          <div className="w-full h-1/2 border-b border-dashed border-emerald-300/40 relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-emerald-300/40"></div>
          </div>
          <div className="w-full h-1/2"></div>
        </div>

        {/* Forwards */}
        <div className="relative z-10 flex justify-center gap-2 sm:gap-4">
          {fwds.map(renderPlayerCard)}
        </div>

        {/* Midfielders */}
        <div className="relative z-10 flex justify-center gap-2 sm:gap-4">
          {mids.map(renderPlayerCard)}
        </div>

        {/* Defenders */}
        <div className="relative z-10 flex justify-center gap-2 sm:gap-4">
          {defs.map(renderPlayerCard)}
        </div>

        {/* Goalkeeper */}
        <div className="relative z-10 flex justify-center">
          {gkps.map(renderPlayerCard)}
        </div>
      </div>

      {/* Bench Row */}
      <div className="space-y-1.5 pt-2 border-t border-slate-800">
        <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block">Substitutes Bench</span>
        <div className="grid grid-cols-4 gap-2">
          {bench.map((p) => (
            <div
              key={p.id}
              className="bg-slate-950/80 border border-slate-800/80 rounded-lg p-2 text-center flex flex-col justify-between"
            >
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>{p.position}</span>
                <span className="text-amber-400 font-bold">{p.points} pts</span>
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate my-0.5">{p.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedPos, setSelectedPos] = useState<string>("ALL");
  const [maxPrice, setMaxPrice] = useState<number>(15.0);
  const [maxOwnership, setMaxOwnership] = useState<number>(10.0);
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

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        const matchesPos = selectedPos === "ALL" || p.position === selectedPos;
        const matchesPrice = p.costRaw <= maxPrice;
        const matchesOwnership = p.ownershipRaw <= maxOwnership;
        const matchesEasy =
          !easyRunOnly ||
          (p.nextFixtures.length > 0 &&
            p.nextFixtures.every((f) => f.difficulty <= 3));

        return matchesPos && matchesPrice && matchesOwnership && matchesEasy;
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
        } else if (sortField === "ownershipRaw") {
          valA = a.ownershipRaw;
          valB = b.ownershipRaw;
        }

        return sortDir === "asc"
          ? (valA as number) - (valB as number)
          : (valB as number) - (valA as number);
      });
  }, [players, selectedPos, maxPrice, maxOwnership, easyRunOnly, sortField, sortDir]);

  const leapfrogCount = useMemo(() => {
    if (!rivalManager || !myManager) return 0;
    return filteredPlayers.filter(
      (p) => !myManager.ownedPlayerIds.includes(p.id) && !rivalManager.ownedPlayerIds.includes(p.id)
    ).length;
  }, [filteredPlayers, myManager, rivalManager]);

  // Pitch Duel Summary Stats
  const pitchDuelStats = useMemo(() => {
    if (!myManager || !rivalManager || !myManager.startingXI || !rivalManager.startingXI) {
      return { sharedCount: 0, differentialCount: 0, pointsSwing: 0 };
    }
    const myIds = new Set(myManager.startingXI.map((p) => p.id));
    const rivalIds = new Set(rivalManager.startingXI.map((p) => p.id));

    let sharedCount = 0;
    myManager.startingXI.forEach((p) => {
      if (rivalIds.has(p.id)) sharedCount++;
    });

    const differentialCount = (myManager.startingXI.length - sharedCount) + (rivalManager.startingXI.length - sharedCount);
    const pointsSwing = myManager.totalStartingPoints - rivalManager.totalStartingPoints;

    return { sharedCount, differentialCount, pointsSwing };
  }, [myManager, rivalManager]);

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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-12 font-sans antialiased">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Live FPL Sync
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight text-white">
              Rival Spy & Differential Radar
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Scout differential transfers and track mini-league rivals before deadline.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex gap-2">
            <div className="bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2 text-center min-w-[76px]">
              <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider">Targets</span>
              <strong className="text-sm md:text-base font-black text-white">{filteredPlayers.length}</strong>
            </div>
            {rivalManager && (
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl px-3.5 py-2 text-center min-w-[76px]">
                <span className="text-[10px] text-amber-300/80 block uppercase font-mono tracking-wider">Leapfrog</span>
                <strong className="text-sm md:text-base font-black text-amber-400">{leapfrogCount}</strong>
              </div>
            )}
          </div>
        </header>

        {/* Mini-League Sync Bar */}
        <div className="p-4 rounded-2xl border border-slate-800/90 bg-slate-900/50 backdrop-blur shadow-lg flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">🏆 Mini-League ID:</span>
            <input
              type="text"
              placeholder="e.g. 56789"
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs font-mono text-white focus:outline-none focus:border-amber-400 w-28 md:w-36"
            />
            <button
              onClick={() => fetchLeague(leagueId)}
              disabled={loadingLeague}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-all disabled:opacity-50 active:scale-95 shadow-sm"
            >
              {loadingLeague ? "Syncing..." : "Sync League"}
            </button>
          </div>

          {leagueRivals.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <span className="text-xs text-slate-400">Rival ({leagueName}):</span>
              <select
                value={rivalTeamId}
                onChange={(e) => handleSelectRival(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-rose-300 font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
              >
                <option value="">-- Pick Mini-League Rival --</option>
                {leagueRivals.map((r) => (
                  <option key={r.entry} value={r.entry}>
                    #{r.rank} {r.player_name} ({r.entry_name}) • {r.total} pts
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Manager Input */}
        <div className="p-4 sm:p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-4">
          <form onSubmit={handleCompare} className="grid grid-cols-1 md:grid-cols-5 gap-3 md:gap-4 items-end">
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
              <label className="text-xs font-semibold text-slate-300">Rival's Team ID (Or select above)</label>
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
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-sm transition-all disabled:opacity-50 active:scale-95 shadow-md shadow-emerald-500/20"
              >
                {searching ? "Spying..." : "Compare"}
              </button>
            </div>
          </form>

          {/* Captaincy Clash Indicator */}
          {myManager && rivalManager && myManager.captain && rivalManager.captain && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-center justify-between transition-all ${
                isCaptainShielded
                  ? "bg-slate-900 border-slate-700 text-slate-300"
                  : "bg-amber-950/30 border-amber-500/40 text-amber-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{isCaptainShielded ? "🛡️" : "⚔️"}</span>
                <div>
                  <strong className="block font-bold">
                    {isCaptainShielded ? "Armband Shielded" : "Captaincy Clash Active"}
                  </strong>
                  <span className="text-slate-400">
                    {isCaptainShielded
                      ? `Both managers picked ${myManager.captain.name} (C). Net swing: 0 pts.`
                      : `You backed ${myManager.captain.name} (C) vs Rival's ${rivalManager.captain.name} (C). Rank swing gameweek!`}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Manager Meta Details */}
          {(myManager || rivalManager || errorMsg) && (
            <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-3 text-xs">
              {myManager && (
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 flex items-center gap-2">
                  <span className="text-slate-400">You:</span>
                  <strong className="text-emerald-400">{myManager.teamName}</strong>
                  {myManager.captain && (
                    <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-1.5 py-0.5 rounded text-[11px] font-mono">
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
                    <span className="bg-rose-950 text-rose-300 border border-rose-700/60 px-1.5 py-0.5 rounded text-[11px] font-mono">
                      (C) {rivalManager.captain.name}
                    </span>
                  )}
                </div>
              )}
              {errorMsg && <p className="text-rose-400 font-semibold self-center">{errorMsg}</p>}
            </div>
          )}
        </div>

        {/* Rival Recon Card */}
        <div className="p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-br from-slate-900 via-slate-900/90 to-rose-950/20 shadow-2xl relative overflow-hidden space-y-4">
          <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 text-lg shadow-inner">
                🕵️‍♂️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight">
                    Rival Recon Card
                  </h3>
                  <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold rounded-full border border-rose-500/30">
                    INTEL
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  {rivalManager
                    ? `Tracking ${rivalManager.teamName} (${rivalManager.managerName})`
                    : "No rival loaded. Enter a rival ID or select from mini-league above."}
                </p>
              </div>
            </div>

            {rivalManager && rivalTeamId && (
              <div className="text-right font-mono text-xs text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                Team ID: <strong className="text-rose-400">{rivalTeamId}</strong>
              </div>
            )}
          </div>

          {rivalManager ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              {/* Financials & Value */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3 flex flex-col justify-between">
                <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400">Squad Financials</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Bank Balance</span>
                    <strong className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                      £{rivalManager.bank?.toFixed(1)}m
                    </strong>
                  </div>
                  <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-mono">Team Value</span>
                    <strong className="text-base sm:text-lg font-black text-indigo-400 font-mono">
                      £{rivalManager.value?.toFixed(1)}m
                    </strong>
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 italic">
                  Active GW{rivalManager.activeGameweek || 1} deadline stats
                </div>
              </div>

              {/* Remaining Chips */}
              <div className="md:col-span-2 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-mono text-slate-400">Remaining Chips Arsenal</span>
                  <span className="text-[11px] text-slate-400">
                    Season Quota: <strong className="text-white">2 per chip</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      label: "Wildcard",
                      code: "WC",
                      icon: "🔄",
                      left: rivalManager.chipsRemaining?.wildcard ?? 2,
                    },
                    {
                      label: "Free Hit",
                      code: "FH",
                      icon: "⚡",
                      left: rivalManager.chipsRemaining?.freehit ?? 2,
                    },
                    {
                      label: "Triple Captain",
                      code: "TC",
                      icon: "⭐",
                      left: rivalManager.chipsRemaining?.tripleCaptain ?? 2,
                    },
                    {
                      label: "Bench Boost",
                      code: "BB",
                      icon: "🚀",
                      left: rivalManager.chipsRemaining?.bboost ?? 2,
                    },
                  ].map((chip) => {
                    const isAvailable = chip.left > 0;
                    return (
                      <div
                        key={chip.code}
                        className={`p-3 rounded-xl border flex flex-col items-center text-center transition-all ${
                          isAvailable
                            ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                            : "bg-slate-900/50 border-slate-800 text-slate-500"
                        }`}
                      >
                        <span className="text-base mb-1">{chip.icon}</span>
                        <span className="text-[11px] font-bold text-white">{chip.label}</span>
                        <span
                          className={`text-xs font-mono font-black mt-1 px-2 py-0.5 rounded-full ${
                            isAvailable
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {chip.left} left
                        </span>
                      </div>
                    );
                  })}
                </div>

                {rivalManager.chipsUsed && rivalManager.chipsUsed.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap gap-2 items-center text-xs">
                    <span className="text-slate-400 text-[11px]">History Played:</span>
                    {rivalManager.chipsUsed.map((c, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300 font-mono text-[11px]"
                      >
                        {c.name.toUpperCase()} (GW{c.event})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-950/40 rounded-xl border border-slate-800/80 space-y-2">
              <p className="text-slate-400 text-sm">
                🔍 No rival team selected yet.
              </p>
              <p className="text-slate-500 text-xs">
                Enter a rival Team ID above or sync a mini-league to view their chip inventory, bank, and team value.
              </p>
            </div>
          )}
        </div>

        {/* Head-to-Head Visual Pitch Duel Section */}
        {myManager && rivalManager && (
          <div className="space-y-4">
            {/* Top Banner Summary */}
            <div className="p-4 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-lg">
                  ⚔️
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight">
                    Head-to-Head Visual Pitch Duel
                  </h3>
                  <p className="text-xs text-slate-400">
                    Direct Starting XI clash comparison & live gameweek swing analysis.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 items-center">
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Shared Shields</span>
                  <strong className="text-sm font-black text-emerald-400 font-mono">{pitchDuelStats.sharedCount} / 11</strong>
                </div>
                <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Active Battles</span>
                  <strong className="text-sm font-black text-sky-400 font-mono">{pitchDuelStats.differentialCount}</strong>
                </div>
                <div className="bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block">Net Points Swing</span>
                  <strong
                    className={`text-sm md:text-base font-black font-mono ${
                      pitchDuelStats.pointsSwing >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {pitchDuelStats.pointsSwing > 0 ? `+${pitchDuelStats.pointsSwing}` : pitchDuelStats.pointsSwing} pts
                  </strong>
                </div>
              </div>
            </div>

            {/* Side-by-Side Visual Pitches */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PitchView
                manager={myManager}
                otherManager={rivalManager}
                title="Your Squad"
                themeColor="emerald"
              />
              <PitchView
                manager={rivalManager}
                otherManager={myManager}
                title="Rival Squad"
                themeColor="rose"
              />
            </div>
          </div>
        )}

        {/* Filter Toolbar with Position, Easy Run, Max Price & Max Ownership */}
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {["ALL", "DEF", "MID", "FWD", "GKP"].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPos(pos)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                    selectedPos === pos
                      ? "bg-emerald-500 text-slate-950 shadow-sm"
                      : "bg-slate-800/80 text-slate-400 hover:text-white"
                  }`}
                >
                  {pos}
                </button>
              ))}

              <button
                onClick={() => setEasyRunOnly(!easyRunOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 flex items-center gap-1.5 ${
                  easyRunOnly
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500"
                    : "bg-slate-800/80 text-slate-400 border-transparent hover:text-white"
                }`}
              >
                <span>🟢</span> Easy Run Only
              </button>
            </div>

            {/* Differential Threshold Presets */}
            <div className="flex gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
              {[
                { label: "Ultra (<3%)", val: 3.0 },
                { label: "Punt (<10%)", val: 10.0 },
                { label: "Semi (<20%)", val: 20.0 },
                { label: "All (<100%)", val: 100.0 },
              ].map((btn) => (
                <button
                  key={btn.val}
                  onClick={() => setMaxOwnership(btn.val)}
                  className={`px-2 py-1 rounded font-semibold transition-colors ${
                    maxOwnership === btn.val
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Max Price & Max Ownership */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <label className="text-xs text-slate-400 min-w-[130px]">
                Max Price: <strong className="text-emerald-400 font-mono">£{maxPrice.toFixed(1)}m</strong>
              </label>
              <input
                type="range"
                min="4.0"
                max="15.0"
                step="0.5"
                value={maxPrice}
                onChange={(e) => setMaxPrice(parseFloat(e.target.value))}
                className="w-36 accent-emerald-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-start gap-3">
              <label className="text-xs text-slate-400 min-w-[130px]">
                Ownership Under: <strong className="text-indigo-400 font-mono">{maxOwnership}%</strong>
              </label>
              <input
                type="range"
                min="1.0"
                max="50.0"
                step="1.0"
                value={maxOwnership}
                onChange={(e) => setMaxOwnership(parseFloat(e.target.value))}
                className="w-36 accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-12 text-center border border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-400 animate-pulse text-sm">Gathering live Premier League numbers...</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur shadow-2xl">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-900 border-b border-slate-800 select-none shadow-sm">
                <tr className="text-slate-400 text-[11px] uppercase tracking-wider">
                  <th onClick={() => handleSort("name")} className="py-3 px-4 cursor-pointer hover:text-white">
                    Player {renderSortIndicator("name")}
                  </th>
                  <th className="py-3 px-3">Pos</th>
                  <th className="py-3 px-3">Club</th>
                  <th onClick={() => handleSort("costRaw")} className="py-3 px-3 cursor-pointer hover:text-white">
                    Cost {renderSortIndicator("costRaw")}
                  </th>
                  <th onClick={() => handleSort("ownershipRaw")} className="py-3 px-3 cursor-pointer hover:text-white">
                    Own {renderSortIndicator("ownershipRaw")}
                  </th>
                  <th onClick={() => handleSort("form")} className="py-3 px-3 cursor-pointer hover:text-white">
                    Form {renderSortIndicator("form")}
                  </th>
                  <th onClick={() => handleSort("xG")} className="py-3 px-3 cursor-pointer hover:text-white">
                    xG {renderSortIndicator("xG")}
                  </th>
                  <th onClick={() => handleSort("xA")} className="py-3 px-3 cursor-pointer hover:text-white">
                    xA {renderSortIndicator("xA")}
                  </th>
                  <th className="py-3 px-4">Next 3 Runs</th>
                  <th className="py-3 px-4 text-right">Rival Spy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-500 text-sm">
                      No differentials match your selected filters. Try sliding Ownership or Price higher.
                    </td>
                  </tr>
                ) : (
                  filteredPlayers.map((p) => {
                    const iOwn = myManager?.ownedPlayerIds.includes(p.id);
                    const rivalOwns = rivalManager?.ownedPlayerIds.includes(p.id);
                    const rivalOwnersCount = leagueRivals.filter(
                      (r) => r.ownedPlayerIds && r.ownedPlayerIds.includes(p.id)
                    ).length;

                    let badge = <span className="text-xs text-slate-600">—</span>;

                    if (myManager || rivalManager || leagueRivals.length > 0) {
                      if (myManager && iOwn) {
                        badge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 whitespace-nowrap">
                            In Your Squad
                          </span>
                        );
                      } else if (rivalManager && rivalOwns) {
                        badge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 whitespace-nowrap animate-pulse">
                            ⚠️ Rival Shield Required
                          </span>
                        );
                      } else if (rivalOwnersCount > 1) {
                        badge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap animate-pulse">
                            🛡️ Must Shield
                          </span>
                        );
                      } else if (!rivalOwns && rivalOwnersCount === 0 && parseFloat(p.form) >= 5.0) {
                        badge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40 whitespace-nowrap">
                            🔥 True Weapon
                          </span>
                        );
                      } else if (rivalManager && !rivalOwns && !iOwn) {
                        badge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 whitespace-nowrap">
                            🔥 Leapfrog Target
                          </span>
                        );
                      } else {
                        badge = (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
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
                        <td className="py-3 px-4 font-semibold text-slate-100 whitespace-nowrap">{p.name}</td>
                        <td className="py-3 px-3">
                          <span className="text-[11px] text-slate-400 font-mono font-medium">{p.position}</span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                            {p.team}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-medium">£{p.price}m</td>
                        <td className="py-3 px-3 font-mono text-indigo-300">{p.ownership}</td>
                        <td className="py-3 px-3 font-semibold text-amber-400">{p.form}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{p.xG}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{p.xA}</td>
                        
                        <td className="py-3 px-4">
                          <div className="flex gap-1">
                            {p.nextFixtures.length > 0 ? (
                              p.nextFixtures.map((f, idx) => (
                                <FDRBadge key={idx} fixture={f} />
                              ))
                            ) : (
                              <span className="text-xs text-slate-600">—</span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 text-right">
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