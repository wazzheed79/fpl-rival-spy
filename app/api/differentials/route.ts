import { NextResponse } from "next/server";

export async function GET() {
  try {
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

    const topDifferentials = players
      .filter((p: any) => parseFloat(p.selected_by_percent) < 10.0 && p.minutes >= 180)
      .sort((a: any, b: any) => parseFloat(b.form) - parseFloat(a.form))
      .slice(0, 12)
      .map((p: any) => ({
        id: p.id,
        name: p.web_name,
        teamId: p.team,
        team: teamMap[p.team] || "PL",
        price: (p.now_cost / 10).toFixed(1),
        ownership: `${p.selected_by_percent}%`,
        form: p.form,
        totalPoints: p.total_points,
        nextFixtures: teamNextFixtures[p.team] || [],
      }));

    return NextResponse.json(topDifferentials);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}