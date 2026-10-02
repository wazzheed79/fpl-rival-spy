'use client';

import React, { useState, useEffect } from 'react';
import { DuelResponse } from '@/types/fpl';

interface DifferentialAlertsProps {
  duelData?: DuelResponse | null;
}

export interface AlertConfig {
  telegramEnabled: boolean;
  browserPushEnabled: boolean;
  botToken: string;
  chatId: string;
  events: {
    rivalDifferentialReturn: boolean;
    rivalCaptainFail: boolean;
    userWeaponHaul: boolean;
    deficitFlip: boolean;
  };
}

const STORAGE_KEY = 'fpl_spy_alerts_config';

const DEFAULT_CONFIG: AlertConfig = {
  telegramEnabled: true,
  browserPushEnabled: false,
  botToken: '',
  chatId: '',
  events: {
    rivalDifferentialReturn: true,
    rivalCaptainFail: true,
    userWeaponHaul: true,
    deficitFlip: true,
  },
};

export const DifferentialAlerts: React.FC<DifferentialAlertsProps> = ({ duelData }) => {
  const [config, setConfig] = useState<AlertConfig>(DEFAULT_CONFIG);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [browserPerm, setBrowserPerm] = useState<NotificationPermission>('default');
  const [activeTab, setActiveTab] = useState<'configure' | 'simulate' | 'guide'>('configure');

  // Load configuration from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setConfig(JSON.parse(saved));
        } catch {
          // ignore corrupted JSON
        }
      }
      if ('Notification' in window) {
        setBrowserPerm(Notification.permission);
      }
    }
  }, []);

  const saveConfig = (newConfig: AlertConfig) => {
    setConfig(newConfig);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }
  };

  const handleToggleEvent = (key: keyof AlertConfig['events']) => {
    const updated: AlertConfig = {
      ...config,
      events: {
        ...config.events,
        [key]: !config.events[key],
      },
    };
    saveConfig(updated);
  };

  const handleRequestBrowserPermission = async () => {
    if (!('Notification' in window)) {
      alert('Browser Push Notifications are not supported in this browser.');
      return;
    }
    const perm = await Notification.requestPermission();
    setBrowserPerm(perm);
    if (perm === 'granted') {
      const updated = { ...config, browserPushEnabled: true };
      saveConfig(updated);
      new Notification('FPL Rival Spy Connected! 📡', {
        body: 'Browser push alerts are now active for live matchday events.',
        icon: '⚽',
      });
    } else {
      const updated = { ...config, browserPushEnabled: false };
      saveConfig(updated);
    }
  };

  // Dispatch alert to Telegram and/or Browser
  const triggerAlert = async (
    eventType: 'rival_differential' | 'rival_captain_fail' | 'user_weapon_haul' | 'deficit_flip' | 'test',
    customPayload?: any
  ) => {
    setIsTesting(true);
    setTestResult(null);

    const rivalName = duelData?.rival.teamName || 'Rival Team';
    const userName = duelData?.user.teamName || 'Your Team';
    const gw = duelData?.gameweek || 1;

    // Default sample payloads for simulation
    const payloadMap: Record<string, any> = {
      test: {
        gameweek: gw,
        managerName: userName,
        rivalName,
      },
      rival_differential: {
        playerName: 'Mbeumo',
        rivalName,
        managerName: userName,
        points: 7,
        bps: 28,
        statType: 'goal',
        gameweek: gw,
      },
      rival_captain_fail: {
        playerName: duelData?.rival.captain?.name || 'Haaland',
        rivalName,
        points: 2,
        statType: 'blank',
        gameweek: gw,
      },
      user_weapon_haul: {
        playerName: duelData?.user.picks.find((p) => p.category === 'WEAPON')?.webName || 'Wood',
        managerName: userName,
        rivalName,
        points: 12,
        bps: 3,
        statType: 'goal',
        gameweek: gw,
      },
      deficit_flip: {
        managerName: userName,
        rivalName,
        leadPoints: 6,
        gameweek: gw,
      },
    };

    const effectivePayload = customPayload || payloadMap[eventType];

    try {
      let telegramSuccess = false;
      let statusMsg = '';

      if (config.telegramEnabled) {
        const res = await fetch('/api/alerts/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            botToken: config.botToken,
            chatId: config.chatId,
            eventType,
            payload: effectivePayload,
          }),
        });

        const data = await res.json();
        if (data.success) {
          telegramSuccess = true;
          statusMsg = data.simulated
            ? 'Simulated Telegram Alert generated (Provide Bot Token & Chat ID for direct Telegram push).'
            : 'Telegram alert dispatched to your chat successfully!';
        } else {
          throw new Error(data.error || 'Failed to dispatch to Telegram');
        }
      }

      // Trigger browser notification if enabled
      if (config.browserPushEnabled && 'Notification' in window && Notification.permission === 'granted') {
        const notifTitles: Record<string, string> = {
          test: '📡 FPL Spy Alert Connection Verified!',
          rival_differential: `🚨 Rival Differential Alert: ${effectivePayload.playerName} scored!`,
          rival_captain_fail: `🤦 Rival Captain Blank: ${effectivePayload.playerName} failed!`,
          user_weapon_haul: `🚀 Weapon Haul: ${effectivePayload.playerName} returned double-digits!`,
          deficit_flip: `🔄 DEFICIT FLIP: You have taken the live lead! (+${effectivePayload.leadPoints} pts)`,
        };

        new Notification(notifTitles[eventType] || 'FPL Rival Spy Alert', {
          body: `Gameweek ${gw} • Monitoring ${userName} vs ${rivalName}`,
          icon: '⚽',
        });
        statusMsg += ' Browser notification triggered.';
      }

      setTestResult({
        success: true,
        message: statusMsg.trim() || 'Notification triggered successfully!',
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Error sending notification',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔔</span>
            <h2 className="text-xl font-black tracking-tight text-white">
              Instant Push & Telegram Alerts
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time differential returns, rival captain fails, weapon hauls, and live deficit flips.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isSaved && (
            <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg">
              Saved ✓
            </span>
          )}
          <div className="inline-flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
            <button
              onClick={() => setActiveTab('configure')}
              className={`rounded px-3 py-1 font-bold transition-all ${
                activeTab === 'configure' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Configure
            </button>
            <button
              onClick={() => setActiveTab('simulate')}
              className={`rounded px-3 py-1 font-bold transition-all ${
                activeTab === 'simulate' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Simulate Matchday
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`rounded px-3 py-1 font-bold transition-all ${
                activeTab === 'guide' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
            >
              Bot Setup Guide
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Areas */}
      {activeTab === 'configure' && (
        <div className="space-y-6">
          {/* Dispatch Channel Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telegram Setup Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">✈️</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Telegram Webhook Bot</h3>
                    <p className="text-[10px] text-slate-400">Direct mobile push alerts to your Telegram chat</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.telegramEnabled}
                  onChange={(e) => saveConfig({ ...config, telegramEnabled: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
              </div>

              {config.telegramEnabled && (
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Telegram Bot Token
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ (or leave blank for simulated)"
                      value={config.botToken}
                      onChange={(e) => saveConfig({ ...config, botToken: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Telegram Chat ID
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 987654321 or @yourchannel"
                      value={config.chatId}
                      onChange={(e) => saveConfig({ ...config, chatId: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-600 outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Browser Notifications Setup Card */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💻</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">Browser Push Notifications</h3>
                    <p className="text-[10px] text-slate-400">Desktop / laptop instant banner notifications</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={config.browserPushEnabled}
                  onChange={(e) => {
                    if (e.target.checked && browserPerm !== 'granted') {
                      handleRequestBrowserPermission();
                    } else {
                      saveConfig({ ...config, browserPushEnabled: e.target.checked });
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500 focus:ring-cyan-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Permission Status:</span>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                      browserPerm === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : browserPerm === 'denied'
                        ? 'bg-rose-500/20 text-rose-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {browserPerm}
                  </span>
                </div>
                {browserPerm !== 'granted' && (
                  <button
                    onClick={handleRequestBrowserPermission}
                    className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-cyan-400 border border-cyan-500/30 transition-colors"
                  >
                    Request Browser Push Access
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Event Triggers Configuration */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              🚨 Active Matchday Event Triggers
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Event 1 */}
              <label
                onClick={() => handleToggleEvent('rivalDifferentialReturn')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  config.events.rivalDifferentialReturn
                    ? 'border-cyan-500/40 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.events.rivalDifferentialReturn}
                  readOnly
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    🚨 Rival Differential Returns
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                    Alert instantly when a rival-owned differential player scores, assists, or enters the provisional bonus points.
                  </span>
                </div>
              </label>

              {/* Event 2 */}
              <label
                onClick={() => handleToggleEvent('rivalCaptainFail')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  config.events.rivalCaptainFail
                    ? 'border-cyan-500/40 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.events.rivalCaptainFail}
                  readOnly
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    😬 Rival Captain Blanks or Carded
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                    Alert when rival captain match ends with 1-2 points, or receives a yellow / red card.
                  </span>
                </div>
              </label>

              {/* Event 3 */}
              <label
                onClick={() => handleToggleEvent('userWeaponHaul')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  config.events.userWeaponHaul
                    ? 'border-cyan-500/40 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.events.userWeaponHaul}
                  readOnly
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    🚀 User Weapon Differential Hauls
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                    Celebrate when your unique differential player bags 8+ points or double-digits.
                  </span>
                </div>
              </label>

              {/* Event 4 */}
              <label
                onClick={() => handleToggleEvent('deficitFlip')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  config.events.deficitFlip
                    ? 'border-cyan-500/40 bg-cyan-950/20'
                    : 'border-slate-800 bg-slate-950'
                }`}
              >
                <input
                  type="checkbox"
                  checked={config.events.deficitFlip}
                  readOnly
                  className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
                />
                <div>
                  <span className="text-xs font-bold text-white block">
                    🔄 Deficit Flip Alert (Live Lead)
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5 leading-tight">
                    Trigger an immediate alert when your live points overtake your rival, flipping the head-to-head deficit.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Test Notification Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div>
              <span className="text-xs font-bold text-white block">
                Verify Telemetry & Push Pipeline
              </span>
              <p className="text-[11px] text-slate-400">
                Sends a diagnostic ping across all active channels to confirm delivery.
              </p>
            </div>

            <button
              onClick={() => triggerAlert('test')}
              disabled={isTesting}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-400 px-4 py-2 text-xs font-black text-slate-950 shadow hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-2"
            >
              {isTesting ? (
                <>
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                  <span>Transmitting...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Test Notification Trigger</span>
                </>
              )}
            </button>
          </div>

          {/* Test Feedback Notice */}
          {testResult && (
            <div
              className={`rounded-xl border p-3.5 text-xs font-semibold ${
                testResult.success
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
              }`}
            >
              {testResult.success ? '✅ ' : '❌ '} {testResult.message}
            </div>
          )}
        </div>
      )}

      {/* Simulator Tab */}
      {activeTab === 'simulate' && (
        <div className="space-y-4">
          <p className="text-xs text-slate-400">
            Preview and fire real-time matchday alert simulations to experience how each event displays on your devices:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => triggerAlert('rival_differential')}
              disabled={isTesting}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 text-left transition-colors"
            >
              <span className="text-2xl">🚨</span>
              <div>
                <span className="text-xs font-bold text-rose-300 block">Fire Rival Differential Return</span>
                <span className="text-[10px] text-slate-400">Simulates Mbeumo goal + bonus points for rival</span>
              </div>
            </button>

            <button
              onClick={() => triggerAlert('rival_captain_fail')}
              disabled={isTesting}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-amber-900/50 bg-amber-950/20 hover:bg-amber-950/40 text-left transition-colors"
            >
              <span className="text-2xl">🤦</span>
              <div>
                <span className="text-xs font-bold text-amber-300 block">Fire Rival Captain Blank</span>
                <span className="text-[10px] text-slate-400">Simulates rival captain 2-point failure</span>
              </div>
            </button>

            <button
              onClick={() => triggerAlert('user_weapon_haul')}
              disabled={isTesting}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-cyan-900/50 bg-cyan-950/20 hover:bg-cyan-950/40 text-left transition-colors"
            >
              <span className="text-2xl">🚀</span>
              <div>
                <span className="text-xs font-bold text-cyan-300 block">Fire Weapon Differential Haul</span>
                <span className="text-[10px] text-slate-400">Simulates 12pt return from your differential weapon</span>
              </div>
            </button>

            <button
              onClick={() => triggerAlert('deficit_flip')}
              disabled={isTesting}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-colors"
            >
              <span className="text-2xl">🔄</span>
              <div>
                <span className="text-xs font-bold text-emerald-300 block">Fire Deficit Flip Alert</span>
                <span className="text-[10px] text-slate-400">Simulates taking the live lead (+6 pts) over rival</span>
              </div>
            </button>
          </div>

          {testResult && (
            <div
              className={`rounded-xl border p-3.5 text-xs font-semibold mt-4 ${
                testResult.success
                  ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                  : 'border-rose-500/40 bg-rose-950/30 text-rose-300'
              }`}
            >
              {testResult.success ? '✅ ' : '❌ '} {testResult.message}
            </div>
          )}
        </div>
      )}

      {/* Guide Tab */}
      {activeTab === 'guide' && (
        <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/30 p-5 text-xs text-slate-300 leading-relaxed">
          <h3 className="font-bold text-white text-sm">How to create a free Telegram Bot for push notifications:</h3>
          <ol className="list-decimal list-inside space-y-2 text-slate-400">
            <li>
              Open Telegram and search for <b className="text-cyan-400">@BotFather</b>.
            </li>
            <li>
              Send the command <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">/newbot</code> and follow the prompts to name your bot (e.g. <i>MyFplSpyBot</i>).
            </li>
            <li>
              Copy the resulting <b className="text-cyan-400">API Token</b> and paste it into the Telegram Bot Token field above.
            </li>
            <li>
              Start a chat with your newly created bot and click <b className="text-white">Start</b>.
            </li>
            <li>
              To get your <b className="text-cyan-400">Chat ID</b>, message <b className="text-cyan-400">@userinfobot</b> on Telegram, or visit <code className="bg-slate-800 px-1.5 py-0.5 rounded text-white font-mono">https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/getUpdates</code> in your browser.
            </li>
            <li>
              Paste the Chat ID into the field above and click <b className="text-emerald-400">Test Notification Trigger</b>!
            </li>
          </ol>
        </div>
      )}
    </div>
  );
};
