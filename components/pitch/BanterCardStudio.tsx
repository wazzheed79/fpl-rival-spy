'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { DuelResponse } from '@/types/fpl';

interface BanterCardStudioProps {
  duelData: DuelResponse;
}

type CardTheme = 'espionage' | 'crime_scene' | 'receipt_of_shame';

export const BanterCardStudio: React.FC<BanterCardStudioProps> = ({ duelData }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<CardTheme>('espionage');
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [copiedImage, setCopiedImage] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const { user, rival, gameweek, metrics, armbandClash } = duelData;

  // Extract key tactical blunders
  const benchedPlayers = rival.picks.filter((p) => !p.isStarter);
  const rivalBenchPoints = benchedPlayers.reduce(
    (acc, p) => acc + (p.effectivePoints ?? p.rawLivePoints ?? 0),
    0
  );
  const topBenched = [...benchedPlayers].sort(
    (a, b) => (b.effectivePoints ?? b.rawLivePoints ?? 0) - (a.effectivePoints ?? a.rawLivePoints ?? 0)
  )[0];

  const rivalHitCost = rival.eventTransfersCost || 0;
  const userCaptainScore = user.captain
    ? user.picks.find((p) => p.isCaptain)?.effectivePoints ?? 0
    : 0;
  const rivalCaptainScore = rival.captain
    ? rival.picks.find((p) => p.isCaptain)?.effectivePoints ?? 0
    : 0;
  const rivalCapBlanked = rivalCaptainScore <= 4; // <= 2 raw pts * 2 = 4

  const userLivePts = user.liveNetPoints ?? user.liveStartingPoints ?? user.totalPoints;
  const rivalLivePts = rival.liveNetPoints ?? rival.liveStartingPoints ?? rival.totalPoints;
  const netMargin = userLivePts - rivalLivePts;

  // Generate dynamic savage banter roast text
  const generateRoastQuote = useCallback((): string => {
    if (rivalBenchPoints >= 10 && rivalCapBlanked) {
      return `Benched ${rivalBenchPoints} pts while ${rival.captain?.name || 'Captain'} blanked. Elite management Masterclass in self-sabotage! 💀`;
    }
    if (rivalBenchPoints >= 8) {
      return `Leaving ${topBenched?.webName || 'points'} (${topBenched?.effectivePoints ?? 0} pts) rotting on the bench while chasing differentials. Call the coastguard! 🪑`;
    }
    if (rivalHitCost >= 8) {
      return `Spent -${rivalHitCost} pts on transfer hits just to fall further behind. Revenue donation approved! 💸`;
    }
    if (rivalCapBlanked && userCaptainScore > rivalCaptainScore) {
      return `${rival.captain?.name || 'Captain'} blanked with ${rivalCaptainScore} pts while ${user.captain?.name || 'my captain'} delivered. Armband diff in full effect! 🎯`;
    }
    if (netMargin > 0) {
      return `Trailing by ${netMargin} points with weapon differentials running riot. Tactical surrender pending! 🏳️`;
    }
    return `Tactical autopsy complete: Points benched, hit taxes paid, and weapons neutralized. 📉`;
  }, [rivalBenchPoints, rivalCapBlanked, rivalHitCost, userCaptainScore, rivalCaptainScore, netMargin, topBenched, rival, user]);

  const generateShareText = useCallback((): string => {
    return [
      `🚨 [FPL RIVAL AUTOPSY • GW${gameweek}] 🚨`,
      `Target: ${rival.managerName} (${rival.teamName})`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `🪑 Bench Tax: ${rivalBenchPoints} pts left on bench ${topBenched ? `(${topBenched.webName}: ${topBenched.effectivePoints ?? 0} pts)` : ''}`,
      `💸 Hit Penalty: -${rivalHitCost} pts in transfer deductions`,
      `🤦 Captain Verdict: ${rival.captain?.name || 'Captain'} (${rivalCaptainScore} pts)`,
      `⚔️ Duel Standing: ${user.teamName} ${userLivePts} - ${rivalLivePts} ${rival.teamName}`,
      `━━━━━━━━━━━━━━━━━━━━`,
      `"${generateRoastQuote()}"`,
      `\nGenerated via FPL Rival Spy 🛰️`,
    ].join('\n');
  }, [gameweek, rival, rivalBenchPoints, topBenched, rivalHitCost, rivalCaptainScore, user, userLivePts, rivalLivePts, generateRoastQuote]);

  // Render graphic onto HTML5 Canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // Background Styling
    if (selectedTheme === 'espionage') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#090d16');
      grad.addColorStop(0.5, '#0c1524');
      grad.addColorStop(1, '#05080e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Radar Grid Accents
      ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
      ctx.lineWidth = 1;
      for (let i = 0; i < width; i += 60) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, height);
        ctx.stroke();
      }
      for (let j = 0; j < height; j += 60) {
        ctx.beginPath();
        ctx.moveTo(0, j);
        ctx.lineTo(width, j);
        ctx.stroke();
      }
    } else if (selectedTheme === 'crime_scene') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#150608');
      grad.addColorStop(0.6, '#1e0a0d');
      grad.addColorStop(1, '#0c0203');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Caution stripes bar at top
      const stripeH = 36;
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(0, 0, width, stripeH);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('CRIME SCENE AUTOPSY • CAUTION • TACTICAL DISASTER • TACTICAL DISASTER', 40, 26);
    } else {
      // Receipt of shame
      const grad = ctx.createLinearGradient(0, 0, width, height);
      grad.addColorStop(0, '#121212');
      grad.addColorStop(1, '#1e1e1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 2;
      ctx.strokeRect(30, 30, width - 60, height - 60);
    }

    // Outer Glow / Border Frame
    ctx.strokeStyle = selectedTheme === 'crime_scene' ? 'rgba(244, 63, 94, 0.4)' : 'rgba(34, 211, 238, 0.3)';
    ctx.lineWidth = 4;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Watermark & Brand Header
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    ctx.fillText('FPL RIVAL SPY • TACTICAL DOSSIER', 80, 100);

    ctx.fillStyle = selectedTheme === 'crime_scene' ? '#fb7185' : '#22d3ee';
    ctx.font = '900 24px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`GW${gameweek} DECLASSIFIED`, width - 80, 100);
    ctx.textAlign = 'left';

    // Main Card Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 52px system-ui, -apple-system, sans-serif';
    ctx.fillText('RIVAL BLUNDER AUTOPSY', 80, 175);

    // Rival Team & Manager Name Pill
    ctx.fillStyle = 'rgba(244, 63, 94, 0.15)';
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, 210, width - 160, 95, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fda4af';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('TARGET PROFILE:', 105, 248);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(`${rival.managerName} (${rival.teamName})`, 105, 288);

    // 3 Stat Grid Boxes
    const boxY = 340;
    const boxH = 220;
    const boxW = (width - 160 - 40) / 3;

    // Stat 1: Bench Tax
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.roundRect(80, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('BENCH TAX WASTED', 105, boxY + 45);

    ctx.fillStyle = '#f43f5e';
    ctx.font = '900 64px monospace';
    ctx.fillText(`${rivalBenchPoints} pts`, 105, boxY + 120);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(
      topBenched ? `Left ${topBenched.webName} (${topBenched.effectivePoints ?? 0} pts)` : 'None on bench',
      105,
      boxY + 175
    );

    // Stat 2: Transfer Hits Paid
    const box2X = 80 + boxW + 20;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(box2X, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('TRANSFER HIT PENALTY', box2X + 25, boxY + 45);

    ctx.fillStyle = '#fbbf24';
    ctx.font = '900 64px monospace';
    ctx.fillText(`-${rivalHitCost} pts`, box2X + 25, boxY + 120);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(
      rivalHitCost > 0 ? `${rivalHitCost / 4} hits taken this GW` : '0 penalty deduction',
      box2X + 25,
      boxY + 175
    );

    // Stat 3: Captain Fail
    const box3X = box2X + boxW + 20;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)';
    ctx.beginPath();
    ctx.roundRect(box3X, boxY, boxW, boxH, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px system-ui, sans-serif';
    ctx.fillText('CAPTAINCY OUTCOME', box3X + 25, boxY + 45);

    ctx.fillStyle = rivalCapBlanked ? '#f87171' : '#34d399';
    ctx.font = '900 64px monospace';
    ctx.fillText(`${rivalCaptainScore} pts`, box3X + 25, boxY + 120);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(
      `${rival.captain?.name || 'Captain'} (${rivalCapBlanked ? 'BLANKED' : 'Returned'})`,
      box3X + 25,
      boxY + 175
    );

    // Live Duel Score Banner
    const scoreY = 590;
    ctx.fillStyle = 'rgba(2, 6, 23, 0.9)';
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.25)';
    ctx.beginPath();
    ctx.roundRect(80, scoreY, width - 160, 110, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#22d3ee';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(`${user.teamName} (YOU)`, 110, scoreY + 65);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px monospace';
    ctx.fillText(`${userLivePts}`, 480, scoreY + 70);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 28px monospace';
    ctx.fillText('VS', 560, scoreY + 65);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 48px monospace';
    ctx.fillText(`${rivalLivePts}`, 630, scoreY + 70);
    ctx.fillStyle = '#f43f5e';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText(`${rival.teamName}`, 740, scoreY + 65);

    // Savage Roast Quote Box
    const roastY = 730;
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.roundRect(80, roastY, width - 160, 200, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 22px monospace';
    ctx.fillText('AI BANTER VERDICT:', 110, roastY + 45);

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'italic 26px system-ui, sans-serif';

    // Wrap quote text nicely
    const roastText = `"${generateRoastQuote()}"`;
    const words = roastText.split(' ');
    let line = '';
    let curY = roastY + 95;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > width - 240 && n > 0) {
        ctx.fillText(line, 110, curY);
        line = words[n] + ' ';
        curY += 40;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 110, curY);

    // Footer Bar
    ctx.fillStyle = 'rgba(148, 163, 184, 0.5)';
    ctx.font = 'bold 20px monospace';
    ctx.fillText('CONFIDENTIAL MINI-LEAGUE ESPIONAGE • fpl-rival-spy.local', 80, height - 70);
    ctx.textAlign = 'right';
    ctx.fillText(`TOTAL WEAPONS FACED: ${metrics?.userWeaponsCount ?? 0}`, width - 80, height - 70);
    ctx.textAlign = 'left';
  }, [selectedTheme, gameweek, rival, user, rivalBenchPoints, topBenched, rivalHitCost, rivalCapBlanked, rivalCaptainScore, userLivePts, rivalLivePts, metrics, generateRoastQuote]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Export 1: Download Image
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsExporting(true);
    const link = document.createElement('a');
    link.download = `FPL-Banter-GW${gameweek}-${rival.managerName.replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setIsExporting(false);
  };

  // Export 2: Copy Image to Clipboard
  const handleCopyImage = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopiedImage(true);
        setTimeout(() => setCopiedImage(false), 2500);
      });
    } catch {
      // Fallback: copy text roast
      handleCopyText();
    }
  };

  // Export 3: Copy Text Roast
  const handleCopyText = () => {
    navigator.clipboard.writeText(generateShareText());
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  // Export 4: Share to WhatsApp
  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  // Export 5: Share to Twitter / X
  const handleShareTwitter = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
  };

  // Export 6: Share to Telegram
  const handleShareTelegram = () => {
    const text = encodeURIComponent(generateShareText());
    window.open(`https://t.me/share/url?url=&text=${text}`, '_blank');
  };

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🎨</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              WhatsApp & Social Banter Card Studio
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            1-Click shareable graphics highlighting rival benched points, captain fails, and transfer hit taxes.
          </p>
        </div>

        {/* Theme Picker */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme:</span>
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
            <button
              onClick={() => setSelectedTheme('espionage')}
              className={`rounded px-2.5 py-1 font-bold transition-all ${
                selectedTheme === 'espionage'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🕵️ Espionage
            </button>
            <button
              onClick={() => setSelectedTheme('crime_scene')}
              className={`rounded px-2.5 py-1 font-bold transition-all ${
                selectedTheme === 'crime_scene'
                  ? 'bg-rose-500 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              💀 Crime Scene
            </button>
            <button
              onClick={() => setSelectedTheme('receipt_of_shame')}
              className={`rounded px-2.5 py-1 font-bold transition-all ${
                selectedTheme === 'receipt_of_shame'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🧾 Shame Receipt
            </button>
          </div>
        </div>
      </div>

      {/* Studio Workspace: Canvas Preview + Action Control Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Canvas Graphic Preview (Col 7) */}
        <div className="lg:col-span-7 flex flex-col items-center">
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              className="w-full h-full object-contain rounded-xl"
              style={{ maxHeight: '520px' }}
            />
          </div>
          <span className="text-[10px] text-slate-500 mt-2 font-mono">
            High-Resolution 1080x1080 Graphic Output • Ready for Instant Export
          </span>
        </div>

        {/* Action Controls & Sharing Hub (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Quick Metrics Breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Roast Highlight Summary
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Benched</span>
                <span className="font-mono text-base font-black text-rose-400">
                  {rivalBenchPoints} pts
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Hits Paid</span>
                <span className="font-mono text-base font-black text-amber-400">
                  -{rivalHitCost} pts
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-[10px] text-slate-500 block">Captain</span>
                <span className={`font-mono text-base font-black ${rivalCapBlanked ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {rivalCaptainScore} pts
                </span>
              </div>
            </div>
            <p className="text-xs italic text-slate-300 bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
              "{generateRoastQuote()}"
            </p>
          </div>

          {/* Primary 1-Click Export Actions */}
          <div className="space-y-2.5">
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-400 p-3.5 text-xs font-black text-slate-950 shadow-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <span>📥</span>
              <span>Download 1080x1080 PNG Image</span>
            </button>

            <button
              onClick={handleCopyImage}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 p-3 text-xs font-bold text-white border border-slate-700 transition-colors flex items-center justify-center gap-2"
            >
              <span>📋</span>
              <span>{copiedImage ? 'Image Copied to Clipboard! ✅' : 'Copy Graphic to Clipboard'}</span>
            </button>

            <button
              onClick={handleCopyText}
              className="w-full rounded-xl bg-slate-900 hover:bg-slate-800 p-2.5 text-xs font-bold text-slate-300 border border-slate-800 transition-colors flex items-center justify-center gap-2"
            >
              <span>💬</span>
              <span>{copiedText ? 'Roast Text Copied! ✅' : 'Copy Text Banter Summary'}</span>
            </button>
          </div>

          {/* Direct Social Channels */}
          <div className="pt-2 border-t border-slate-800/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Instant Share to Mini-League Chats
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 p-2.5 text-xs font-bold text-emerald-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🟢</span>
                <span>WhatsApp</span>
              </button>
              <button
                onClick={handleShareTelegram}
                className="rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 p-2.5 text-xs font-bold text-sky-300 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>✈️</span>
                <span>Telegram</span>
              </button>
              <button
                onClick={handleShareTwitter}
                className="rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 p-2.5 text-xs font-bold text-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <span>𝕏</span>
                <span>Post</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
