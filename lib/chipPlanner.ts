// Chip-timing war planner: recommends the best upcoming gameweek to deploy Bench Boost and
// Triple Captain based on each squad's actual fixtures, and flags which chips are already spent.
// This is advisory, not a guarantee - fixture difficulty is a proxy, not a points forecast.

export interface ChipPlannerSquadPlayer {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number;
  form: number;
  isStarter: boolean;
}

export interface TeamFixtureOutlookEntry {
  event: number;
  opponent: string;
  isHome: boolean;
  difficulty: number;
}

export interface ChipUsage {
  name: string;
  event: number;
}

export interface ChipRecommendation {
  chip: 'bboost' | '3xc';
  label: string;
  isAvailable: boolean;
  usedEvents: number[];
  recommendedEvent: number | null;
  targetPlayer?: { id: number; webName: string } | null;
  rationale: string;
}

const BLANK_GW_PENALTY_DIFFICULTY = 5.5;
const CHIP_NAME_MAP: Record<string, 'bboost' | '3xc' | 'freehit' | 'wildcard'> = {
  bboost: 'bboost',
  '3xc': '3xc',
  freehit: 'freehit',
  wildcard: 'wildcard',
};

function usedEventsFor(chipsUsed: ChipUsage[], chip: string): number[] {
  return chipsUsed.filter((c) => CHIP_NAME_MAP[c.name] === chip).map((c) => c.event);
}

function candidateEvents(teams: Record<string, TeamFixtureOutlookEntry[]>): number[] {
  const set = new Set<number>();
  Object.values(teams).forEach((fixtures) => fixtures.forEach((f) => set.add(f.event)));
  return [...set].sort((a, b) => a - b).slice(0, 5);
}

export function computeChipRecommendations(
  squad: ChipPlannerSquadPlayer[],
  teams: Record<string, TeamFixtureOutlookEntry[]>,
  chipsUsed: ChipUsage[]
): ChipRecommendation[] {
  const events = candidateEvents(teams);
  const starters = squad.filter((p) => p.isStarter);

  const difficultyFor = (teamShort: string, event: number): number => {
    const fixture = (teams[teamShort] || []).find((f) => f.event === event);
    return fixture ? fixture.difficulty : BLANK_GW_PENALTY_DIFFICULTY;
  };

  // --- Bench Boost: best event is the one with the lowest average fixture difficulty
  // across the ENTIRE 15-man squad (bench included), since every player counts. ---
  const bboostUsed = usedEventsFor(chipsUsed, 'bboost');
  let bestBboostEvent: number | null = null;
  let bestBboostAvg = Infinity;

  for (const event of events) {
    const avg =
      squad.reduce((sum, p) => sum + difficultyFor(p.teamShort, event), 0) / Math.max(1, squad.length);
    if (avg < bestBboostAvg) {
      bestBboostAvg = avg;
      bestBboostEvent = event;
    }
  }

  const bboostRec: ChipRecommendation = {
    chip: 'bboost',
    label: 'Bench Boost',
    isAvailable: bboostUsed.length === 0,
    usedEvents: bboostUsed,
    recommendedEvent: bboostUsed.length === 0 ? bestBboostEvent : null,
    rationale:
      bboostUsed.length === 0
        ? `GW${bestBboostEvent} gives your full 15-man squad the softest combined run of fixtures in the next ${events.length} gameweeks (avg FDR ${bestBboostAvg.toFixed(1)}).`
        : `Already used in GW${bboostUsed.join(', GW')}.`,
  };

  // --- Triple Captain: best (player, event) pair among in-form starters with the easiest
  // fixture, weighting both form and difficulty. ---
  const topStarters = [...starters].sort((a, b) => b.form - a.form).slice(0, 4);
  const tcUsed = usedEventsFor(chipsUsed, '3xc');

  let bestTcScore = -Infinity;
  let bestTcEvent: number | null = null;
  let bestTcPlayer: ChipPlannerSquadPlayer | null = null;

  for (const player of topStarters) {
    for (const event of events) {
      const difficulty = difficultyFor(player.teamShort, event);
      if (difficulty >= BLANK_GW_PENALTY_DIFFICULTY) continue; // skip blank gameweeks
      const score = player.form * (6 - difficulty);
      if (score > bestTcScore) {
        bestTcScore = score;
        bestTcEvent = event;
        bestTcPlayer = player;
      }
    }
  }

  const tcRec: ChipRecommendation = {
    chip: '3xc',
    label: 'Triple Captain',
    isAvailable: tcUsed.length === 0,
    usedEvents: tcUsed,
    recommendedEvent: tcUsed.length === 0 ? bestTcEvent : null,
    targetPlayer: bestTcPlayer ? { id: bestTcPlayer.id, webName: bestTcPlayer.webName } : null,
    rationale:
      tcUsed.length === 0 && bestTcPlayer
        ? `${bestTcPlayer.webName} (form ${bestTcPlayer.form}) has his easiest upcoming fixture in GW${bestTcEvent} - the strongest Triple Captain window available.`
        : tcUsed.length > 0
        ? `Already used in GW${tcUsed.join(', GW')}.`
        : 'No clear fixture window found in the current outlook.',
  };

  return [bboostRec, tcRec];
}
