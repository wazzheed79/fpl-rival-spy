import { NextRequest, NextResponse } from 'next/server';

export interface AlertPayload {
  playerName?: string;
  teamName?: string;
  managerName?: string;
  rivalName?: string;
  points?: number;
  bps?: number;
  statType?: 'goal' | 'assist' | 'bonus' | 'card' | 'blank' | string;
  gameweek?: number;
  leadPoints?: number;
  customMessage?: string;
}

export interface TelegramAlertRequest {
  botToken?: string;
  chatId?: string;
  eventType: 'rival_differential' | 'rival_captain_fail' | 'user_weapon_haul' | 'deficit_flip' | 'test' | string;
  payload?: AlertPayload;
  customMessage?: string;
}

function formatTelegramHtmlMessage(eventType: string, payload?: AlertPayload, customText?: string): string {
  if (customText) {
    return `🛰️ <b>[FPL RIVAL SPY ALERT]</b>\n\n${customText}\n\n<i>Live matchday reconnaissance</i>`;
  }

  const gwStr = payload?.gameweek ? `GW${payload.gameweek}` : 'MATCHDAY';
  const player = payload?.playerName || 'Target Player';
  const rival = payload?.rivalName || 'Rival';
  const manager = payload?.managerName || 'Your Team';
  const pts = payload?.points ?? 0;

  switch (eventType) {
    case 'rival_differential':
      return [
        `🚨 <b>[RIVAL DIFFERENTIAL ALERT - ${gwStr}]</b>`,
        `⚠️ <b>${player}</b> just registered a return for <b>${rival}</b>!`,
        `📊 Impact: <b>+${pts} pts</b> (Event: ${payload?.statType?.toUpperCase() || 'RETURN'}, BPS: ${payload?.bps ?? 'N/A'})`,
        `🎯 Action: Check your weapon differentials for counter-returns!`,
        `\n<i>FPL Rival Spy Espionage Feed</i>`,
      ].join('\n');

    case 'rival_captain_fail':
      return [
        `🤦 <b>[RIVAL CAPTAIN BLANK - ${gwStr}]</b>`,
        `📉 Rival captain <b>${player}</b> (${rival}) failed to haul!`,
        `⏱️ Match Status: ${payload?.statType === 'card' ? 'CARDED 🟨/🟥' : 'BLANKED'}. Live Points: <b>${pts} pts</b>`,
        `💥 Massive swing opportunity for your rank!`,
        `\n<i>FPL Rival Spy Espionage Feed</i>`,
      ].join('\n');

    case 'user_weapon_haul':
      return [
        `🚀 <b>[WEAPON DIFFERENTIAL HAUL - ${gwStr}]</b>`,
        `✨ <b>BOOM!</b> Your differential weapon <b>${player}</b> has hauled!`,
        `🔥 Live Points: <b>${pts} pts</b> (Bonus: +${payload?.bps ?? 3})`,
        `👑 Differential damage inflicted against ${rival}.`,
        `\n<i>FPL Rival Spy Espionage Feed</i>`,
      ].join('\n');

    case 'deficit_flip':
      return [
        `🔄 <b>[DEFICIT FLIP ALERT - ${gwStr}]</b>`,
        `🏆 <b>MOMENTUM SWING!</b> You have taken the live lead!`,
        `📈 Current Advantage: <b>+${payload?.leadPoints ?? 5} pts</b> over ${rival}.`,
        `⚔️ The live mini-league table has flipped in your favour!`,
        `\n<i>FPL Rival Spy Espionage Feed</i>`,
      ].join('\n');

    case 'test':
    default:
      return [
        `📡 <b>[FPL RIVAL SPY TELEMETRY TEST]</b>`,
        `✅ Telegram alert dispatcher connected successfully!`,
        `\n<b>Configured Watchlists:</b>`,
        `• 🚨 Rival Differential Returns (Goals/Assists/Bonus)`,
        `• 😬 Rival Captain Blanks & Cards`,
        `• 🚀 User Weapon Differential Hauls`,
        `• 🔄 Deficit Flip Live Lead Alerts`,
        `\n<i>Ready for live Gameweek telemetry!</i>`,
      ].join('\n');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: TelegramAlertRequest = await request.json();
    const botToken = body.botToken?.trim() || process.env.TELEGRAM_BOT_TOKEN?.trim();
    const chatId = body.chatId?.trim() || process.env.TELEGRAM_CHAT_ID?.trim();
    const { eventType, payload, customMessage } = body;

    const formattedMessage = formatTelegramHtmlMessage(eventType, payload, customMessage);

    // If bot token or chat ID is missing or test token 'DEMO', provide simulated success
    if (!botToken || !chatId || botToken === 'DEMO' || chatId === 'DEMO') {
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Alert simulated successfully. Provide a valid Telegram Bot Token and Chat ID for live mobile push dispatch.',
        formattedMessage,
        timestamp: new Date().toISOString(),
      });
    }

    // Dispatch real message via Telegram Bot API
    const telegramEndpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const res = await fetch(telegramEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: formattedMessage,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.description || `Telegram API error (${res.status})`,
          formattedMessage,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      simulated: false,
      telegramMessageId: data.result?.message_id,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to dispatch alert' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    service: 'FPL Rival Spy Telegram Dispatcher',
    supportedEvents: [
      'rival_differential',
      'rival_captain_fail',
      'user_weapon_haul',
      'deficit_flip',
      'test',
    ],
  });
}
