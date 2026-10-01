import { NextResponse } from 'next/server';

const FPL_BASE_URL = 'https://fantasy.premierleague.com/api';

export interface TeamFixtureOutlook {
  event: number;
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

export interface FixturesOutlookResponse {
  currentEvent: number;
  // Keyed by team short name (e.g. "ARS") -> next 5 distinct upcoming gameweeks.
  teams: Record<string, TeamFixtureOutlook[]>;
}

// Powers the chip-timing war planner: unlike /api/differentials (which flattens each team's
// next matches without gameweek numbers), this keeps the actual event number per fixture so
// callers can find the single best gameweek to deploy Bench Boost / Triple Captain.
export async function GET() {
  try {
    const [bootstrapRes, fixturesRes] = await Promise.all([
      fetch(`${FPL_BASE_URL}/bootstrap-static/`, { next: { revalidate: 1800 } }),
      fetch(`${FPL_BASE_URL}/fixtures/?future=1`, { next: { revalidate: 1800 } }),
    ]);

    if (!bootstrapRes.ok || !fixturesRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch FPL data' }, { status: 500 });
    }

    const bootstrap = await bootstrapRes.json();
    const fixtures = await fixturesRes.json();

    const currentEvent =
      bootstrap.events.find((e: any) => e.is_current)?.id ??
      bootstrap.events.find((e: any) => e.is_next)?.id ??
      1;

    const teamMap = new Map<number, string>(bootstrap.teams.map((t: any) => [t.id, t.short_name]));
    const teams: Record<string, TeamFixtureOutlook[]> = {};
    teamMap.forEach((short) => {
      teams[short] = [];
    });

    const sorted = [...fixtures].sort((a: any, b: any) => (a.event ?? 999) - (b.event ?? 999));

    for (const f of sorted) {
      if (!f.event) continue; // skip fixtures not yet scheduled to a gameweek

      const homeShort = teamMap.get(f.team_h);
      const awayShort = teamMap.get(f.team_a);

      if (homeShort && teams[homeShort].length < 5) {
        teams[homeShort].push({
          event: f.event,
          opponent: awayShort || 'PL',
          isHome: true,
          difficulty: f.team_h_difficulty,
        });
      }
      if (awayShort && teams[awayShort].length < 5) {
        teams[awayShort].push({
          event: f.event,
          opponent: homeShort || 'PL',
          isHome: false,
          difficulty: f.team_a_difficulty,
        });
      }
    }

    const payload: FixturesOutlookResponse = { currentEvent, teams };
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
