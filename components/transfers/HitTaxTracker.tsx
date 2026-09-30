'use client';

import React, { useEffect, useState } from 'react';

interface TransferAudit {
  time: string;
  elementIn: { id: number; name: string; team: string; livePoints: number };
  elementOut: { id: number; name: string; team: string; livePoints: number };
  cost: number;
  netSwing: number;
  status: 'PROFIT' | 'EVEN' | 'LOSS';
}

interface ManagerHitAudit {
  teamId: number;
  gameweek: number;
  totalTransfersCost: number;
  totalTransfersCount: number;
  transfers: TransferAudit[];
  overallNetProfit: number;
}

interface HitTaxTrackerProps {
  userId: number;
  rivalId: number;
  userName: string;
  rivalName: string;
  currentGw: number;
}

export const HitTaxTracker: React.FC<HitTaxTrackerProps> = ({
  userId,
  rivalId,
  userName,
  rivalName,
  currentGw,
}) => {
  const [data, setData] = useState<{ user: ManagerHitAudit; rival: ManagerHitAudit } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    fetch(`/api/transfers?userId=${userId}&rivalId=${rivalId}&gw=${currentGw}`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load transfer audits');
        return res.json();
      })
      .then((payload) => {
        if (isMounted) setData(payload);
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [userId, rivalId, currentGw]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 text-center text-xs text-slate-500 animate-pulse">
        Auditing gameweek transfer deductions and break-even points...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">💸</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Hit Tax & Break-Even Tracker
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time audit of transfer point hits: did the incoming player beat the hit hurdle + outgoing player?
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5">
            <span className="text-slate-400">Your Hit Cost: </span>
            <b className={data.user.totalTransfersCost > 0 ? 'text-rose-400' : 'text-slate-300'}>
              -{data.user.totalTransfersCost} pts
            </b>
          </div>
          <div className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-1.5">
            <span className="text-slate-400">Rival Hit Cost: </span>
            <b className={data.rival.totalTransfersCost > 0 ? 'text-rose-400' : 'text-slate-300'}>
              -{data.rival.totalTransfersCost} pts
            </b>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ManagerTransferColumn managerTitle={userName} audit={data.user} isRival={false} />
        <ManagerTransferColumn managerTitle={rivalName} audit={data.rival} isRival={true} />
      </div>
    </div>
  );
};

const ManagerTransferColumn: React.FC<{
  managerTitle: string;
  audit: ManagerHitAudit;
  isRival: boolean;
}> = ({ managerTitle, audit, isRival }) => {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${isRival ? 'bg-rose-500' : 'bg-cyan-500'}`} />
          <h3 className="text-sm font-bold text-white">{managerTitle}</h3>
        </div>
        <span className="text-xs font-mono text-slate-400">
          Transfers: <b className="text-white">{audit.totalTransfersCount}</b>
        </span>
      </div>

      {audit.transfers.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 font-medium">
          No transfers made for Gameweek {audit.gameweek}. (0 hit cost)
        </div>
      ) : (
        <div className="space-y-2.5">
          {audit.transfers.map((t, idx) => (
            <div
              key={`${t.elementIn.id}-${t.elementOut.id}-${idx}`}
              className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3 space-y-2"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-rose-400">OUT:</span>
                  <span className="text-white font-bold">{t.elementOut.name}</span>
                  <span className="text-slate-500">({t.elementOut.team})</span>
                  <span className="font-mono text-slate-400">[{t.elementOut.livePoints} pts]</span>
                </div>
                <span className="text-slate-600 font-bold">➔</span>
                <div className="flex items-center gap-1.5 font-medium">
                  <span className="text-emerald-400">IN:</span>
                  <span className="text-white font-bold">{t.elementIn.name}</span>
                  <span className="text-slate-500">({t.elementIn.team})</span>
                  <span className="font-mono text-amber-300 font-bold">[{t.elementIn.livePoints} pts]</span>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-slate-800/60 pt-2 text-[10px] font-mono">
                <span className="text-slate-400">
                  Hit Cost:{' '}
                  <b className={t.cost > 0 ? 'text-rose-400' : 'text-slate-400'}>
                    {t.cost > 0 ? `-${t.cost} pts` : 'Free'}
                  </b>
                </span>

                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">Break-Even Swing:</span>
                  <span
                    className={`rounded px-1.5 py-0.5 font-bold ${
                      t.netSwing > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : t.netSwing < 0
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {t.netSwing > 0 ? `+${t.netSwing} pts (PROFIT)` : `${t.netSwing} pts (IN THE RED)`}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
