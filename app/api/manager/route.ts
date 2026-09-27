import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "Team ID is required" }, { status: 400 });
  }

  try {
    const bootstrapRes = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      next: { revalidate: 1800 },
    });
    if (!bootstrapRes.ok) {
      return NextResponse.json({ error: "Failed to fetch FPL bootstrap data" }, { status: 500 });
    }
    const bootstrap = await bootstrapRes.json();
    const currentEvent = bootstrap.events.find((e: any) => e.is_current || e.is_next)?.id || 1;
    const playersMap = new Map();
    bootstrap.elements.forEach((p: any) => {
      playersMap.set(p.id, p.web_name);
    });

    const entryRes = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/`, {
      next: { revalidate: 300 },
    });
    if (!entryRes.ok) {
      return NextResponse.json({ error: "Manager team ID not found" }, { status: 404 });
    }
    const entryData = await entryRes.json();

    const activeGw = entryData.current_event || currentEvent;
    const picksRes = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${activeGw}/picks/`, {
      next: { revalidate: 300 },
    });

    let ownedPlayerIds: number[] = [];
    let captain: { id: number; name: string } | null = null;
    let viceCaptain: { id: number; name: string } | null = null;

    if (picksRes.ok) {
      const picksData = await picksRes.json();
      if (picksData.picks && Array.isArray(picksData.picks)) {
        ownedPlayerIds = picksData.picks.map((p: any) => p.element);
        const captainPick = picksData.picks.find((p: any) => p.is_captain);
        const viceCaptainPick = picksData.picks.find((p: any) => p.is_vice_captain);

        if (captainPick) {
          captain = {
            id: captainPick.element,
            name: playersMap.get(captainPick.element) || `Player #${captainPick.element}`,
          };
        }
        if (viceCaptainPick) {
          viceCaptain = {
            id: viceCaptainPick.element,
            name: playersMap.get(viceCaptainPick.element) || `Player #${viceCaptainPick.element}`,
          };
        }
      }
    }

    return NextResponse.json({
      teamName: entryData.name || `Team #${teamId}`,
      managerName: `${entryData.player_first_name || ""} ${entryData.player_last_name || ""}`.trim() || "Manager",
      ownedPlayerIds,
      captain,
      viceCaptain,
      activeGameweek: activeGw,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch manager data from FPL" }, { status: 500 });
  }
}
