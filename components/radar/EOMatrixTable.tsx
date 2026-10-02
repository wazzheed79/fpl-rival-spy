import React, { useState } from "react";

export interface EORow {
  id: number;
  name: string;
  team: string;
  globalEo: number;
  leagueEo: number;
  userOwned: boolean;
}

interface EOMatrixTableProps {
  data: EORow[];
}

export const EOMatrixTable: React.FC<EOMatrixTableProps> = ({ data = [] }) => {
  const [filter, setFilter] = useState<"all" | "threats" | "differentials">("all");

  const filteredData = data.filter((item) => {
    if (filter === "threats") return item.leagueEo > 50 && !item.userOwned;
    if (filter === "differentials") return item.userOwned && item.leagueEo < 30;
    return true;
  });

  return (
    <div className="bg-[#0b0e14] border border-white/10 rounded-xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Mini-League Effective Ownership Matrix
          </h3>
          <p className="text-xs text-zinc-400">
            Compare local mini-league exposure directly against overall top 10k benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 p-1 rounded-lg text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded transition-colors ${
              filter === "all" ? "bg-zinc-800 text-white font-medium" : "text-zinc-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("threats")}
            className={`px-3 py-1 rounded transition-colors ${
              filter === "threats" ? "bg-rose-500/20 text-rose-300 font-medium" : "text-zinc-400 hover:text-white"
            }`}
          >
            Threats
          </button>
          <button
            onClick={() => setFilter("differentials")}
            className={`px-3 py-1 rounded transition-colors ${
              filter === "differentials" ? "bg-emerald-500/20 text-emerald-300 font-medium" : "text-zinc-400 hover:text-white"
            }`}
          >
            My Differentials
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-zinc-400 uppercase tracking-wider font-mono">
              <th className="py-2.5 px-3">Player</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">League EO</th>
              <th className="py-2.5 px-3">Global EO</th>
              <th className="py-2.5 px-3">Risk Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {filteredData.map((row) => {
              const netSwing = Number((row.leagueEo - row.globalEo).toFixed(1));
              return (
                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-semibold text-white">
                    {row.name} <span className="text-zinc-500 font-normal">({row.team})</span>
                  </td>
                  <td className="py-3 px-3">
                    {row.userOwned ? (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-mono text-[10px]">
                        OWNED
                      </span>
                    ) : (
                      <span className="bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded font-mono text-[10px]">
                        UNOWNED
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-white">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${row.leagueEo > 60 ? "bg-rose-500" : "bg-emerald-400"}`}
                          style={{ width: `${Math.min(row.leagueEo, 100)}%` }}
                        />
                      </div>
                      <span>{row.leagueEo}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-mono text-zinc-400">{row.globalEo}%</td>
                  <td className="py-3 px-3 font-mono">
                    {netSwing > 15 ? (
                      <span className="text-rose-400 font-medium">+{netSwing}% Local Skew</span>
                    ) : netSwing < -15 ? (
                      <span className="text-emerald-400 font-medium">{netSwing}% Under-owned</span>
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
