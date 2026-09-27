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
    const elementTypesMap = new Map();

    bootstrap.elements.forEach((p: any) => {
      playersMap.set(p.id, p.web_name);
      elementTypesMap.set(p.id, p.element_type);
    });

    const [entryRes, histRes, liveRes] = await Promise.all([
      fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/`, {
        next: { revalidate: 300 },
      }),
      fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/history/`, {
        next: { revalidate: 300 },
      }),
      fetch(`https://fantasy.premierleague.com/api/event/${currentEvent}/live/`, {
        next: { revalidate: 300 },
      }),
    ]);

    if (!entryRes.ok) {
      return NextResponse.json({ error: "Manager team ID not found" }, { status: 404 });
    }
    const entryData = await entryRes.json();
    const histData = histRes.ok ? await histRes.json() : { chips: [], current: [] };
    const liveData = liveRes.ok ? await liveRes.json() : { elements: [] };

    const pointsMap = new Map();
    if (liveData.elements && Array.isArray(liveData.elements)) {
      liveData.elements.forEach((el: any) => {
        pointsMap.set(el.id, el.stats?.total_points ?? 0);
      });
    }

    const activeGw = entryData.current_event || currentEvent;
    const picksRes = await fetch(`https://fantasy.premierleague.com/api/entry/${teamId}/event/${activeGw}/picks/`, {
      next: { revalidate: 300 },
    });

    let ownedPlayerIds: number[] = [];
    let startingXI: any[] = [];
    let bench: any[] = [];
    let captain: { id: number; name: string } | null = null;
    let viceCaptain: { id: number; name: string } | null = null;

    if (picksRes.ok) {
      const picksData = await picksRes.json();
      if (picksData.picks && Array.isArray(picksData.picks)) {
        ownedPlayerIds = picksData.picks.map((p: any) => p.element);

        picksData.picks.forEach((p: any) => {
          const id = p.element;
          const name = playersMap.get(id) || `Player #${id}`;
          const elementType = elementTypesMap.get(id) || 2;
          const posMap: { [key: number]: string } = { 1: "GKP", 2: "DEF", 3: "MID", 4: "FWD" };
          const position = posMap[elementType] || "DEF";
          const rawPoints = pointsMap.get(id) || 0;
          const multiplier = p.multiplier || 1;
          const points = rawPoints * multiplier;

          const playerObj = {
            id,
            name,
            position,
            elementType,
            rawPoints,
            points,
            multiplier,
            isCaptain: p.is_captain,
            isViceCaptain: p.is_vice_captain,
          };

          if (p.position <= 11) {
            startingXI.push(playerObj);
          } else {
            bench.push(playerObj);
          }

          if (p.is_captain) {
            captain = { id, name };
          }
          if (p.is_vice_captain) {
            viceCaptain = { id, name };
          }
        });
      }
    }

    const defs = startingXI.filter((p) => p.elementType === 2).length;
    const mids = startingXI.filter((p) => p.elementType === 3).length;
    const fwds = startingXI.filter((p) => p.elementType === 4).length;
    const formation = `${defs}-${mids}-${fwds}`;
    const totalStartingPoints = startingXI.reduce((sum, p) => sum + p.points, 0);

    const bank = (entryData.last_deadline_bank ?? 0) / 10;
    const value = (entryData.last_deadline_value ?? 1000) / 10;
    const chips = histData.chips || [];

    const wcUsed = chips.filter((c: any) => c.name === "wildcard").length;
    const fhUsed = chips.filter((c: any) => c.name === "freehit").length;
    const bbUsed = chips.filter((c: any) => c.name === "bboost").length;
    const tcUsed = chips.filter((c: any) => c.name === "3xc").length;

    const chipsRemaining = {
      wildcard: Math.max(0, 2 - wcUsed),
      freehit: Math.max(0, 2 - fhUsed),
      bboost: Math.max(0, 2 - bbUsed),
      tripleCaptain: Math.max(0, 2 - tcUsed),
    };

    return NextResponse.json({
      teamName: entryData.name || `Team #${teamId}`,
      managerName: `${entryData.player_first_name || ""} ${entryData.player_last_name || ""}`.trim() || "Manager",
      ownedPlayerIds,
      startingXI,
      bench,
      formation,
      totalStartingPoints,
      captain,
      viceCaptain,
      activeGameweek: activeGw,
      bank,
      value,
      chipsRemaining,
      chipsUsed: chips,
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch manager data from FPL" }, { status: 500 });
  }
}
