'use client';

import React from 'react';
import { ManagerSummary } from '@/types/fpl';

interface RivalReconCardProps {
  user: ManagerSummary;
  rival: ManagerSummary;
  currentGw: number;
}

interface ChipAudit {
  id: string;
  name: string;
  userUsed: boolean;
  userGw?: number;
  rivalUsed: boolean;
  rivalGw?: number;
  tacticalVerdict: {
    status: 'ADVANTAGE' | 'DANGER' | 'NEUTRAL';
    note: string;
  };
}

export const RivalReconCard: React.FC<RivalReconCardProps> = ({
  user,
  rival,
  currentGw,
}) => {
  // Parse Wildcards (WC1 is <= GW19, WC2 is >= GW20) and single-use chips
  const parseChipStatus = (
    chipName: string,
    chipsUsed: Array<{ name: string; event: number }>,
    targetWc: 1 | 2 = 1
  ): { used: boolean; event?: number } => {
    if (chipName === 'wildcard') {
      const wcUsages = chipsUsed.filter((c) => c.name === 'wildcard');
      if (targetWc === 1) {
        const firstWc = wcUsages.find((c) => c.event <= 19);
        return { used: !!firstWc, event: firstWc?.event };
      } else {
        const secondWc = wcUsages.find((c) => c.event >= 20);
        return { used: !!secondWc, event: secondWc?.event };
      }
    }

    const found = chipsUsed.find((c) => c.name === chipName);
    return { used: !!found, event: found?.event };
  };

  const chips: ChipAudit[] = [
    (() => {
      const u = parseChipStatus('wildcard', user.chipsUsed, 1);
      const r = parseChipStatus('wildcard', rival.chipsUsed, 1);
      return {
        id: 'wc1',
        name: 'Wildcard 1',
        userUsed: u.used,
        userGw: u.event,
        rivalUsed: r.used,
        rivalGw: r.event,
        tacticalVerdict:
          !u.used && r.used
            ? { status: 'ADVANTAGE', note: 'You have restructuring flexibility without point hits.' }
            : u.used && !r.used
            ? { status: 'DANGER', note: 'Rival can freely pivot during injury or fixture swings.' }
            : { status: 'NEUTRAL', note: 'Chip parity.' },
      };
    })(),
    (() => {
      const u = parseChipStatus('wildcard', user.chipsUsed, 2);
      const r = parseChipStatus('wildcard', rival.chipsUsed, 2);
      return {
        id: 'wc2',
        name: 'Wildcard 2',
        userUsed: u.used,
        userGw: u.event,
        rivalUsed: r.used,
        rivalGw: r.event,
        tacticalVerdict:
          !u.used && r.used
            ? { status: 'ADVANTAGE', note: 'Major advantage for setting up Double Gameweek squads.' }
            : u.used && !r.used
            ? { status: 'DANGER', note: 'Rival holds high late-season pivot leverage.' }
            : { status: 'NEUTRAL', note: currentGw < 20 ? 'Active in second half of season.' : 'Parity.' },
      };
    })(),
    (() => {
      const u = parseChipStatus('freehit', user.chipsUsed);
      const r = parseChipStatus('freehit', rival.chipsUsed);
      return {
        id: 'freehit',
        name: 'Free Hit',
        userUsed: u.used,
        userGw: u.event,
        rivalUsed: r.used,
        rivalGw: r.event,
        tacticalVerdict:
          !u.used && r.used
            ? { status: 'ADVANTAGE', note: 'Huge leverage during major blank fixture weeks.' }
            : u.used && !r.used
            ? { status: 'DANGER', note: 'Watch for rival Free Hit ambush on blank gameweeks.' }
            : { status: 'NEUTRAL', note: 'Parity.' },
      };
    })(),
    (() => {
      const u = parseChipStatus('3xc', user.chipsUsed);
      const r = parseChipStatus('3xc', rival.chipsUsed);
      return {
        id: '3xc',
        name: 'Triple Captain',
        userUsed: u.used,
        userGw: u.event,
        rivalUsed: r.used,
        rivalGw: r.event,
        tacticalVerdict:
          !u.used && r.used
            ? { status: 'ADVANTAGE', note: 'Pocket high upside for a double gameweek talisman.' }
            : u.used && !r.used
            ? { status: 'DANGER', note: 'Rival can weaponize this on an elite DGW fixture.' }
            : { status: 'NEUTRAL', note: 'Parity.' },
      };
    })(),
    (() => {
      const u = parseChipStatus('bboost', user.chipsUsed);
      const r = parseChipStatus('bboost', rival.chipsUsed);
      return {
        id: 'bboost',
        name: 'Bench Boost',
        userUsed: u.used,
        userGw: u.event,
        rivalUsed: r.used,
        rivalGw: r.event,
        tacticalVerdict:
          !u.used && r.used
            ? { status: 'ADVANTAGE', note: 'Target full 15-man Double GW squad upside.' }
            : u.used && !r.used
            ? { status: 'DANGER', note: 'Rival can gain 15-25 points on a primed DGW bench.' }
            : { status: 'NEUTRAL', note: 'Parity.' },
      };
    })(),
  ];

  const financialDelta = Number((user.squadValue - rival.squadValue).toFixed(1));
  const bankDelta = Number((user.bank - rival.bank).toFixed(1));

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      {/* Title & Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕵️</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Rival Recon & Chip Asymmetry
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit remaining chip arsenals, financial liquidity, and tactical vulnerability windows.
          </p>
        </div>

        {/* Live Active Chip Indicators */}
        <div className="flex items-center gap-2 text-xs">
          {user.activeChip && (
            <span className="rounded-lg bg-cyan-500/20 border border-cyan-500/40 px-2.5 py-1 font-bold text-cyan-400 uppercase">
              You: {user.activeChip.toUpperCase()} ACTIVE
            </span>
          )}
          {rival.activeChip && (
            <span className="rounded-lg bg-rose-500/20 border border-rose-500/40 px-2.5 py-1 font-bold text-rose-400 uppercase">
              Rival: {rival.activeChip.toUpperCase()} ACTIVE
            </span>
          )}
        </div>
      </div>

      {/* Financial Health Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Squad Value */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Squad Value
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-cyan-400 block font-semibold">{user.teamName}</span>
              <span className="text-lg font-black text-white">£{user.squadValue.toFixed(1)}m</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-rose-400 block font-semibold">{rival.teamName}</span>
              <span className="text-lg font-black text-white">£{rival.squadValue.toFixed(1)}m</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Purchasing Edge:{' '}
            <b className={financialDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {financialDelta >= 0 ? `+£${financialDelta}m` : `-£${Math.abs(financialDelta)}m`}
            </b>
          </div>
        </div>

        {/* Bank Balance */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            In The Bank (Liquidity)
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-cyan-400 block font-semibold">{user.teamName}</span>
              <span className="text-lg font-black text-emerald-400">£{user.bank.toFixed(1)}m</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-rose-400 block font-semibold">{rival.teamName}</span>
              <span className="text-lg font-black text-emerald-400">£{rival.bank.toFixed(1)}m</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Liquidity Spread:{' '}
            <b className={bankDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {bankDelta >= 0 ? `+£${bankDelta}m` : `-£${Math.abs(bankDelta)}m`}
            </b>
          </div>
        </div>

        {/* Hit Tax Paid this Gameweek */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            GW{currentGw} Transfer Cost Hits
          </span>
          <div className="mt-2 flex items-baseline justify-between">
            <div>
              <span className="text-xs text-cyan-400 block font-semibold">{user.teamName}</span>
              <span className={`text-lg font-black ${user.eventTransfersCost > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                -{user.eventTransfersCost} pts
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs text-rose-400 block font-semibold">{rival.teamName}</span>
              <span className={`text-lg font-black ${rival.eventTransfersCost > 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                -{rival.eventTransfersCost} pts
              </span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400">
            Net Hit Swing:{' '}
            <b className={rival.eventTransfersCost - user.eventTransfersCost >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {rival.eventTransfersCost - user.eventTransfersCost >= 0
                ? `+${rival.eventTransfersCost - user.eventTransfersCost} pts advantage`
                : `${rival.eventTransfersCost - user.eventTransfersCost} pts deficit`}
            </b>
          </div>
        </div>
      </div>

      {/* Chip Inventory Comparison Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/40">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-900/80 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3 px-4">Chip Arsenal</th>
              <th className="py-3 px-4 text-cyan-400">You ({user.managerName.split(' ')[0]})</th>
              <th className="py-3 px-4 text-rose-400">Rival ({rival.managerName.split(' ')[0]})</th>
              <th className="py-3 px-4">Tactical Leverage Assessment</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {chips.map((chip) => (
              <tr key={chip.id} className="hover:bg-slate-800/20 transition-colors">
                <td className="py-3 px-4 font-bold text-white flex items-center gap-2">
                  <span>{chip.name}</span>
                </td>
                <td className="py-3 px-4">
                  {chip.userUsed ? (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                      ❌ Spent (GW{chip.userGw})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                      ✅ Available
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {chip.rivalUsed ? (
                    <span className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-0.5 text-[11px] text-slate-400">
                      ❌ Spent (GW{chip.rivalGw})
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 border border-rose-500/40 px-2 py-0.5 text-[11px] font-bold text-rose-400">
                      ⚠️ Threat (Available)
                    </span>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        chip.tacticalVerdict.status === 'ADVANTAGE'
                          ? 'bg-emerald-400'
                          : chip.tacticalVerdict.status === 'DANGER'
                          ? 'bg-rose-400'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="text-slate-300 text-xs">
                      {chip.tacticalVerdict.note}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
