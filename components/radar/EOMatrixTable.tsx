import React, { useState, useEffect } from "react";

export interface EORow {
  id: number;
  name: string;
  team: string;
  globalEo: number;
  leagueEo: number;
  userOwned: boolean;
}

interface EOMatrixTableProps {
  data?: EORow[];
  leagueId?: number;
  currentGw?: number;
}

const DEFAULT_EO_ROWS: EORow[] = [
  { id: 1, name: "Haaland", team: "MCI", globalEo: 142.5, leagueEo: 160.0, userOwned: true },
  { id: 2, name: "Salah", team: "LIV", globalEo: 110.2, leagueEo: 120.0, userOwned: true },
  { id: 3, name: "Palmer", team: "CHE", globalEo: 88.4, leagueEo: 90.0, userOwned: false },
  { id: 4, name: "Saka", team: "ARS", globalEo: 72.0, leagueEo: 65.0, userOwned: true },
  { id: 5, name: "Mbeumo", team: "BRE", globalEo: 45.6, leagueEo: 70.0, userOwned: false },
  { id: 6, name: "Wood", team: "NFO", globalEo: 38.2, leagueEo: 55.0, userOwned: false },
  { id: 7, name: "Rogers", team: "AVL", globalEo: 42.0, leagueEo: 30.0, userOwned: true },
  { id: 8, name: "Alexander-Arnold", team: "LIV", globalEo: 35.8, leagueEo: 25.0, userOwned: true },
];

export const EOMatrixTable: React.FC<EOMatrixTableProps> = ({
  data,
  leagueId,
  currentGw,
}) => {
  const [filter, setFilter] = useState<"all" | "threats" | "differentials">("all");
  const [rows, setRows] = useState<EORow[]>(data && data.length > 0 ? data : DEFAULT_EO_ROWS);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (data && data.length > 0) {
      setRows(data);
      return;
    }

    if (!leagueId || !currentGw) return;

    let isMounted = true;
    setLoading(true);

    fetch("/api/league-eo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId, gameweek: currentGw }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((resData) => {
        if (!isMounted || !resData?.leagueEo?.length) return;
        // Merge with player names or update rows
        const updated = DEFAULT_EO_ROWS.map((defaultRow) => {
          const matched = resData.leagueEo.find((item: any) => item.id === defaultRow.id);
          if (matched) {
            return {
              ...defaultRow,
              leagueEo: matched.effectiveOwnership,
            };
          }
          return defaultRow;
        });
        setRows(updated);
      })
      .catch(() => {
        // Fallback to default benchmark rows
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [data, leagueId, currentGw]);

  const filteredData = rows.filter((item) => {
    if (filter === "threats") return item.leagueEo > 50 && !item.userOwned;
    if (filter === "differentials") return item.userOwned && item.leagueEo < 40;
    return true;
  });

  return (
    <div className="bg-[#1f0024]/70 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-48 h-48 bg-[#38003c]/40 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 relative z-10">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#00ff87] shadow-[0_0_8px_#00ff87]" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              Mini-League Effective Ownership Matrix
            </h3>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Compare local mini-league exposure directly against overall top 10k benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#120015]/90 border border-white/10 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === "all"
                ? "bg-[#38003c] text-white shadow-sm border border-white/10"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("threats")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === "threats"
                ? "bg-[#e90052]/20 text-[#e90052] border border-[#e90052]/40 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Threats
          </button>
          <button
            onClick={() => setFilter("differentials")}
            className={`px-3 py-1 rounded-lg font-bold transition-all ${
              filter === "differentials"
                ? "bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/40 shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            My Differentials
          </button>
        </div>
      </div>

      <div className="overflow-x-auto relative z-10">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-widest font-mono text-[10px]">
              <th className="py-3 px-3">Player</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">League EO</th>
              <th className="py-3 px-3">Global EO</th>
              <th className="py-3 px-3">Risk Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {filteredData.map((row) => {
              const netSwing = Number((row.leagueEo - row.globalEo).toFixed(1));
              return (
                <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                  <td className="py-3 px-3 font-bold text-white">
                    {row.name} <span className="text-zinc-400 font-normal font-mono text-[11px]">({row.team})</span>
                  </td>
                  <td className="py-3 px-3">
                    {row.userOwned ? (
                      <span className="bg-[#00ff87]/20 text-[#00ff87] border border-[#00ff87]/30 px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                        OWNED
                      </span>
                    ) : (
                      <span className="bg-zinc-900 text-zinc-400 border border-white/5 px-2 py-0.5 rounded font-mono text-[10px]">
                        UNOWNED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-black text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-zinc-900 rounded-full h-2 overflow-hidden border border-white/5">
                        <div
                          className={`h-full ${row.leagueEo > 60 ? "bg-[#e90052]" : "bg-[#00ff87]"}`}
                          style={{ width: `${Math.min(row.leagueEo, 100)}%` }}
                        />
                      </div>
                      <span>{row.leagueEo}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">{row.globalEo}%</td>
                  <td className="py-3 px-3 font-mono text-[11px]">
                    {netSwing > 15 ? (
                      <span className="text-[#e90052] font-bold">+{netSwing}% Local Skew</span>
                    ) : netSwing < -15 ? (
                      <span className="text-[#00ff87] font-bold">{netSwing}% Under-owned</span>
                    ) : (
                      <span className="text-zinc-500">Global Par</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
