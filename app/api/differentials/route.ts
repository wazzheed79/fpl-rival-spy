import { NextRequest, NextResponse } from "next/server";
import { CandidatePlayer } from "@/lib/leapfrog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Element IDs the rival currently owns, used to flag block-transfer targets.
    const rivalIds = new Set(
      (searchParams.get("rivalIds") || "")
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n))
    );
    // Element IDs to force-include even if they fall outside the top-200 form cut
    // (used to look up the caller's own squad so sell-candidate stats stay real).
    const forceIds = new Set(
      (searchParams.get("forceIds") || "")
        .split(",")
        .map((s) => parseInt(s, 10))
        .filter((n) => !Number.isNaN(n))
    );

    const [bootstrapRes, fixturesRes] = await Promise.all([
      fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
        next: { revalidate: 1800 },
      }),
      fetch("https://fantasy.premierleague.com/api/fixtures/?future=1", {
        next: { revalidate: 1800 },
      }),
    ]);

    if (!bootstrapRes.ok || !fixturesRes.ok) {
      return NextResponse.json({ error: "Failed to fetch FPL data" }, { status: 500 });
    }

    const bootstrap = await bootstrapRes.json();
    const fixtures = await fixturesRes.json();

    const players = bootstrap.elements;
    const teams = bootstrap.teams;

    const teamMap: Record<number, string> = {};
    teams.forEach((t: { id: number; short_name: string }) => {
      teamMap[t.id] = t.short_name;
    });

    const positionMap: Record<number, string> = {
      1: "GKP",
      2: "DEF",
      3: "MID",
      4: "FWD",
    };

    const teamNextFixtures: Record<
      number,
      Array<{ opponent: string; isHome: boolean; difficulty: number }>
    > = {};

    teams.forEach((t: { id: number }) => {
      teamNextFixtures[t.id] = [];
    });

    for (const f of fixtures) {
      if (teamNextFixtures[f.team_h]?.length < 3) {
        teamNextFixtures[f.team_h].push({
          opponent: teamMap[f.team_a] || "PL",
          isHome: true,
          difficulty: f.team_h_difficulty,
        });
      }
      if (teamNextFixtures[f.team_a]?.length < 3) {
        teamNextFixtures[f.team_a].push({
          opponent: teamMap[f.team_h] || "PL",
          isHome: false,
          difficulty: f.team_a_difficulty,
        });
      }
    }

    const fdrFor = (teamId: number): number => {
      const upcoming = teamNextFixtures[teamId] || [];
      if (upcoming.length === 0) return 3.0; // neutral default (e.g. season end / blank GW)
      const sum = upcoming.reduce((acc, f) => acc + f.difficulty, 0);
      return Number((sum / upcoming.length).toFixed(2));
    };

    // Broad pool: filter out completely inactive players, slice top 200 by form/minutes,
    // but always force-include any requested squad IDs so caller-side lookups stay real.
    const ranked = players
      .filter((p: any) => p.minutes >= 90 || parseFloat(p.form) > 1.0 || forceIds.has(p.id))
      .sort((a: any, b: any) => parseFloat(b.form) - parseFloat(a.form));

    const topSlice = ranked.slice(0, 200);
    const topIds = new Set(topSlice.map((p: any) => p.id));
    const forced = ranked.filter((p: any) => forceIds.has(p.id) && !topIds.has(p.id));
    const finalPlayers = [...topSlice, ...forced];

    const pool: Array<CandidatePlayer & {
      name: string;
      position: string;
      team: string;
      price: string;
      ownership: string;
      totalPoints: number;
      nextFixtures: Array<{ opponent: string; isHome: boolean; difficulty: number }>;
    }> = finalPlayers.map((p: any) => {
      const minutes = p.minutes || 0;
      const xgiTotal = parseFloat(p.expected_goal_involvements) || 0;
      const xgiPer90 = minutes > 0 ? Number(((xgiTotal / minutes) * 90).toFixed(2)) : 0;

      return {
        // CandidatePlayer-compatible fields (consumed directly by lib/leapfrog.ts)
        id: p.id,
        webName: p.web_name,
        teamShort: teamMap[p.team] || "PL",
        elementType: p.element_type,
        cost: p.now_cost / 10,
        form: parseFloat(p.form) || 0,
        xgi: xgiPer90,
        fdrNext3Avg: fdrFor(p.team),
        localOwnershipPct: rivalIds.has(p.id) ? 100 : 0,
        chanceOfPlaying: p.chance_of_playing_next_round ?? 100,
        isOwnedByRival: rivalIds.has(p.id),

        // Legacy display-friendly fields kept for any future market-browser UI
        name: p.web_name,
        position: positionMap[p.element_type] || "MID",
        team: teamMap[p.team] || "PL",
        price: (p.now_cost / 10).toFixed(1),
        ownership: `${p.selected_by_percent}%`,
        totalPoints: p.total_points,
        nextFixtures: teamNextFixtures[p.team] || [],
      };
    });

    return NextResponse.json(pool);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}