'use client';

import React, { useState } from 'react';
import { DuelResponse } from '@/types/fpl';

interface RivalAutopsyCardProps {
  data: DuelResponse;
}

export const RivalAutopsyCard: React.FC<RivalAutopsyCardProps> = ({ data }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const { user, rival, metrics, armbandClash, gameweek } = data;

  const swing = metrics.netScoreSwing;
  const isUserWinner = swing > 0;
  const isDraw = swing === 0;

  // Diagnostic calculations
  const capPointDiff =
    (user.captain ? user.picks.find((p) => p.id === user.captain?.id)?.effectivePoints ?? 0 : 0) -
    (rival.captain ? rival.picks.find((p) => p.id === rival.captain?.id)?.effectivePoints ?? 0 : 0);

  const hitAdvantage = rival.eventTransfersCost - user.eventTransfersCost;

  // Find biggest user weapon and biggest rival danger
  const topUserWeapon = [...user.picks]
    .filter((p) => p.category === 'WEAPON' && p.isStarter)
    .sort((a, b) => b.effectivePoints - a.effectivePoints)[0];

  const topRivalDanger = [...rival.picks]
    .filter((p) => p.category === 'DANGER' && p.isStarter)
    .sort((a, b) => b.effectivePoints - a.effectivePoints)[0];

  // Dynamic Headline Generation
  const generateHeadline = () => {
    if (swing >= 25) return `💀 ABSOLUTE DEMOLITION OF ${rival.managerName.toUpperCase()}`;
    if (swing >= 12) return `🚀 COMFORTABLE CLINIC OVER ${rival.managerName.toUpperCase()}`;
    if (swing > 0) return `⚡ NARROW SQUEEZE PAST ${rival.managerName.toUpperCase()}`;
    if (isDraw) return `🤝 DEAD HEAT STALEMATE WITH ${rival.managerName.toUpperCase()}`;
    if (swing <= -25) return `⚰️ HUMBLING DISASTER AGAINST ${rival.managerName.toUpperCase()}`;
    return `📉 EDGE CONCEDED TO ${rival.managerName.toUpperCase()}`;
  };

  // Plain-Text Generator for WhatsApp / Discord / Telegram
  const generateClipboardText = () => {
    const verdict = isUserWinner
      ? `🏆 +${swing} pts victory over${rival.managerName}`
      : isDraw
      ? `🤝 Even draw (0 pt margin)`
      : `💀 -${Math.abs(swing)} pts conceded to${rival.managerName}`;

    return [
      `⚽ *FPL RIVAL AUTOPSY | GW${gameweek}*`,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `*${user.teamName}* (${user.liveNetPoints} pts) vs *${rival.teamName}* (${rival.managerName}) (${rival.liveNetPoints} pts)`,
      `*Verdict:* ${verdict}`,
      ``,
      `*Key Battlegrounds:*`,
      `• *Armbands:* ${armbandClash.isNeutralized ? `Neutralized (${armbandClash.userCaptain})` : `${armbandClash.userCaptain} vs ${armbandClash.rivalCaptain} (${capPointDiff >= 0 ? `+${capPointDiff}` : capPointDiff} pts swing)`}`,
      topUserWeapon ? `• *MVP Weapon:* ${topUserWeapon.webName} (+${topUserWeapon.effectivePoints} pts)` : null,
      topRivalDanger ? `• *Chief Threat:* ${topRivalDanger.webName} (+${topRivalDanger.effectivePoints} pts)` : null,
      hitAdvantage !== 0 ? `• *Hit Tax Edge:* ${hitAdvantage > 0 ? `+${hitAdvantage} pts saved` : `${hitAdvantage} pts lost`}` : null,
      `━━━━━━━━━━━━━━━━━━━━━━━━`,
      `_Generated via FPL Rival Spy_ 🕵️`,
    ]
      .filter(Boolean)
      .join('\n');
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateClipboardText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎙</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Rival Autopsy & Post-Match Roast
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Shareable matchday breakdown analyzing exactly where the gameweek was won or lost.
          </p>
        </div>

        <button
          onClick={handleCopy}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-md ${
            copied
              ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400'
              : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
          }`}
        >
          <span>{copied ? '✔ Copied to Clipboard!' : '📋 Copy Roast to WhatsApp / Discord'}</span>
        </button>
      </div>

      <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/60 to-slate-950 p-5 space-y-5 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              GW{gameweek} Duel Diagnosis
            </span>
            <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
              {generateHeadline()}
            </h3>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Net Score Swing
            </span>
            <span
              className={`text-2xl font-black ${
                swing > 0 ? 'text-emerald-400' : swing < 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {swing > 0 ? `+${swing}` : swing} pts
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <span>🎯</span>
              <span>Armband Decision</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              {armbandClash.isNeutralized ? (
                <>
                  Neutralized on <b className="text-white">{armbandClash.userCaptain}</b>. Neither manager gained an armband edge.
                </>
              ) : (
                <>
                  <b className="text-cyan-400">{armbandClash.userCaptain}</b> vs{' '}
                  <b className="text-rose-400">{armbandClash.rivalCaptain}</b>. Resulted in a{' '}
                  <b className={capPointDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {capPointDiff >= 0 ? `+${capPointDiff}` : capPointDiff} pt
                  </b>{' '}
                  margin.
                </>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <span>⚡</span>
              <span>Differential Factor</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              {topUserWeapon ? (
                <>
                  Your key weapon was <b className="text-cyan-400">{topUserWeapon.webName}</b> (
                  <b className="text-emerald-400">{topUserWeapon.effectivePoints} pts</b>).
                </>
              ) : (
                'No active starter weapons separated the teams.'
              )}
              {topRivalDanger && (
                <>
                  {' '}Rival countered with <b className="text-rose-400">{topRivalDanger.webName}</b> (
                  <b className="text-white">{topRivalDanger.effectivePoints} pts</b>).
                </>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <span>⚖️</span>
              <span>Hits & Administration</span>
            </div>
            <p className="text-xs text-slate-400 leading-snug">
              {hitAdvantage === 0 ? (
                'Hit deductions were identical. Scoreline reflected pure matchday performance.'
              ) : hitAdvantage > 0 ? (
                <>
                  Rival burned <b className="text-rose-400">-{rival.eventTransfersCost} pts</b> on hits, providing you an immediate{' '}
                  <b className="text-emerald-400">+{hitAdvantage} pt cushion</b>.
                </>
              ) : (
                <>
                  Your <b className="text-rose-400">-{user.eventTransfersCost} pt</b> transfer hits conceded ground to rival before kickoff.
                </>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-800/60 pt-3 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 font-mono">
            <span className="text-cyan-400 font-bold">{user.teamName} ({user.liveNetPoints})</span>
            <span>vs</span>
            <span className="text-rose-400 font-bold">{rival.teamName} ({rival.liveNetPoints})</span>
          </div>
          <span className="italic text-slate-500">Auto-generated match autopsy</span>
        </div>
      </div>
    </div>
  );
};
