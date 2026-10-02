'use client';

import React, { useRef, useState } from 'react';
import { DuelResponse } from '@/types/fpl';

interface BanterCardStudioProps {
  data: DuelResponse;
}

export const BanterCardStudio: React.FC<BanterCardStudioProps> = ({ data }) => {
  const { user, rival, metrics, armbandClash, gameweek } = data;
  const swing = metrics.netScoreSwing;
  const isWinning = swing > 0;
  const cardRef = useRef<HTMLDivElement>(null);

  const [customBanter, setCustomBanter] = useState<string>(
    isWinning
      ? `Mind the gap! Looks like ${rival.managerName}'s season is crumbling.`
      : `Just an unlucky gameweek. Revenge is coming in GW${gameweek + 1}!`
  );

  const [copiedNotification, setCopiedNotification] = useState<boolean>(false);

  // Generate an SVG Image URL that the user can download or view
  const downloadCardAsSvg = () => {
    const cardEl = cardRef.current;
    if (!cardEl) return;

    const svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="600" height="360" viewBox="0 0 600 360">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#020617"/>
            <stop offset="50%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
        </defs>
        <rect width="600" height="360" rx="20" fill="url(#bg)" stroke="#334155" stroke-width="2"/>
        
        <!-- Header -->
        <text x="30" y="45" font-family="sans-serif" font-weight="900" font-size="16" fill="#22d3ee" letter-spacing="1">FPL RIVAL SPY • MATCH REPORT</text>
        <text x="570" y="45" font-family="sans-serif" font-weight="bold" font-size="14" fill="#94a3b8" text-anchor="end">GW${gameweek}</text>
        <line x1="30" y1="60" x2="570" y2="60" stroke="#1e293b" stroke-width="1.5"/>

        <!-- Teams & Scoreline -->
        <text x="30" y="110" font-family="sans-serif" font-weight="bold" font-size="18" fill="#ffffff">${user.teamName.replace(/&/g, '&amp;')}</text>
        <text x="30" y="132" font-family="sans-serif" font-size="12" fill="#22d3ee">${user.managerName.replace(/&/g, '&amp;')}</text>
        <text x="30" y="180" font-family="monospace" font-weight="900" font-size="44" fill="#22d3ee">${user.liveNetPoints}</text>

        <text x="300" y="150" font-family="sans-serif" font-weight="900" font-size="20" fill="#64748b" text-anchor="middle">VS</text>

        <text x="570" y="110" font-family="sans-serif" font-weight="bold" font-size="18" fill="#ffffff" text-anchor="end">${rival.teamName.replace(/&/g, '&amp;')}</text>
        <text x="570" y="132" font-family="sans-serif" font-size="12" fill="#fb7185" text-anchor="end">${rival.managerName.replace(/&/g, '&amp;')}</text>
        <text x="570" y="180" font-family="monospace" font-weight="900" font-size="44" fill="#fb7185" text-anchor="end">${rival.liveNetPoints}</text>

        <!-- Swing Badge -->
        <rect x="220" y="185" width="160" height="34" rx="8" fill="${swing >= 0 ? '#064e3b' : '#881337'}" stroke="${swing >= 0 ? '#10b981' : '#f43f5e'}" stroke-width="1"/>
        <text x="300" y="207" font-family="sans-serif" font-weight="900" font-size="14" fill="#ffffff" text-anchor="middle">
          ${swing > 0 ? `+${swing} PTS SWING` : swing === 0 ? 'LEVEL 0 PTS' : `${swing} PTS DEFICIT`}
        </text>

        <!-- Banter Quote -->
        <rect x="30" y="245" width="540" height="70" rx="10" fill="#0b1329" stroke="#1e293b"/>
        <text x="50" y="275" font-family="sans-serif" font-style="italic" font-size="13" fill="#cbd5e1">
          "${customBanter.replace(/"/g, '&quot;').replace(/&/g, '&amp;').slice(0, 68)}"
        </text>
        <text x="50" y="296" font-family="sans-serif" font-size="11" fill="#64748b">
          Captains: ${armbandClash.userCaptain} vs ${armbandClash.rivalCaptain}
        </text>

        <text x="570" y="342" font-family="sans-serif" font-size="10" fill="#475569" text-anchor="end">generated with fplrivalspy.com</text>
      </svg>
    `;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fpl-rival-duel-gw${gameweek}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const copyWhatsAppShare = async () => {
    const text = [
      `🚨 *FPL RIVAL SPY MATCH CARD | GW${gameweek}* 🚨`,
      `━━━━━━━━━━━━━━━━━━━`,
      `*${user.teamName}* (${user.liveNetPoints} pts) vs *${rival.teamName}* (${rival.liveNetPoints} pts)`,
      `*Net Margin:* ${swing >= 0 ? `+${swing}` : swing} pts`,
      `*Armband Clash:* ${armbandClash.userCaptain} vs ${armbandClash.rivalCaptain}`,
      ``,
      `💬 *"${customBanter}"*`,
      `━━━━━━━━━━━━━━━━━━━`,
      `_Audit your rivals live on FPL Rival Spy_ 🕵️‍♂️`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Banter & Brag Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Create high-end matchday cards and brag quotes formatted for WhatsApp, Twitter, and mini-league chats.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyWhatsAppShare}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              copiedNotification
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            {copiedNotification ? '✔ Copied Text' : '📱 Copy WhatsApp Text'}
          </button>
          <button
            onClick={downloadCardAsSvg}
            className="rounded-lg bg-gradient-to-tr from-cyan-500 to-emerald-400 px-3.5 py-1.5 text-xs font-bold text-slate-950 hover:opacity-90 shadow-md"
          >
            ⬇️ Download Visual Card (SVG)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Visual Card Preview */}
        <div
          ref={cardRef}
          className="lg:col-span-2 rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 p-6 shadow-2xl space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 text-xs">
            <span className="font-black tracking-widest text-cyan-400 uppercase">
              FPL RIVAL SPY • MATCHDAY DUEL
            </span>
            <span className="font-mono font-bold text-slate-400">GW{gameweek}</span>
          </div>

          <div className="grid grid-cols-5 items-center py-4">
            <div className="col-span-2 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">You</span>
              <h3 className="text-base sm:text-lg font-black text-white truncate">{user.teamName}</h3>
              <p className="text-xs text-cyan-400 font-semibold">{user.managerName}</p>
              <div className="text-3xl sm:text-4xl font-mono font-black text-cyan-400 pt-2">
                {user.liveNetPoints} <span className="text-xs text-slate-400 font-sans font-normal">pts</span>
              </div>
            </div>

            <div className="col-span-1 text-center flex flex-col items-center">
              <span className="text-xs font-black text-slate-600">VS</span>
              <div
                className={`mt-2 px-2.5 py-1 rounded-full text-[10px] font-black tracking-wider uppercase border ${
                  swing > 0
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    : swing < 0
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {swing > 0 ? `+${swing} SWING` : swing < 0 ? `${swing} SWING` : 'LEVEL'}
              </div>
            </div>

            <div className="col-span-2 text-right space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400">Rival</span>
              <h3 className="text-base sm:text-lg font-black text-white truncate">{rival.teamName}</h3>
              <p className="text-xs text-rose-400 font-semibold">{rival.managerName}</p>
              <div className="text-3xl sm:text-4xl font-mono font-black text-rose-400 pt-2">
                {rival.liveNetPoints} <span className="text-xs text-slate-400 font-sans font-normal">pts</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
            <p className="text-xs sm:text-sm font-medium italic text-slate-200">
              &ldquo;{customBanter}&rdquo;
            </p>
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
              <span>
                Armbands: <b className="text-cyan-400">{armbandClash.userCaptain}</b> vs{' '}
                <b className="text-rose-400">{armbandClash.rivalCaptain}</b>
              </span>
              <span>Generated on FPL Rival Spy</span>
            </div>
          </div>
        </div>

        {/* Customization controls */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-4">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            Edit Roast Line
          </h4>
          <textarea
            value={customBanter}
            onChange={(e) => setCustomBanter(e.target.value)}
            rows={3}
            maxLength={120}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500"
            placeholder="Enter custom banter quote..."
          />
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-slate-400 block">Quick templates:</span>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() => setCustomBanter(`Class is permanent, form is temporary! Better luck next week.`)}
                className="text-left text-[11px] text-cyan-400 hover:underline truncate"
              >
                👉 &quot;Class is permanent...&quot;
              </button>
              <button
                onClick={() => setCustomBanter(`Who told you to captain ${armbandClash.rivalCaptain}? Asking for a friend!`)}
                className="text-left text-[11px] text-cyan-400 hover:underline truncate"
              >
                👉 &quot;Who told you to captain {armbandClash.rivalCaptain}?&quot;
              </button>
              <button
                onClick={() => setCustomBanter(`Damage limitation complete. See you on the other side of the break.`)}
                className="text-left text-[11px] text-cyan-400 hover:underline truncate"
              >
                👉 &quot;Damage limitation complete...&quot;
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
