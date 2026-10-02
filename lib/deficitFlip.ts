import { DuelResponse, EnrichedPlayer } from '@/types/fpl';

export type MatchEventType =
  | 'GOAL'
  | 'ASSIST'
  | 'CLEAN_SHEET'
  | 'CONCEDED_2'
  | 'YELLOW_CARD'
  | 'RED_CARD'
  | 'PENALTY_MISS'
  | 'OWN_GOAL'
  | 'BONUS_1'
  | 'BONUS_2'
  | 'BONUS_3';

export interface DifferentialPlayer {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number; // 1: GKP, 2: DEF, 3: MID, 4: FWD
  isStarter: boolean;
  userMultiplier: number; // 0, 1, 2, 3
  rivalMultiplier: number; // 0, 1, 2, 3
  effectiveMultiplierDiff: number; // userMultiplier - rivalMultiplier
  owner: 'user' | 'rival';
  isCaptain: boolean;
  isViceCaptain: boolean;
  category: 'WEAPON' | 'DANGER';
  currentPoints: number;
}

export interface SimulatedEvent {
  id: string;
  playerId: number;
  playerName: string;
  teamShort: string;
  eventType: MatchEventType;
  basePoints: number;
  userMultiplier: number;
  rivalMultiplier: number;
  userPointsDelta: number;
  rivalPointsDelta: number;
  netSwingToUser: number;
  label: string;
  owner: 'user' | 'rival';
}

export interface QuickScenario {
  id: string;
  title: string;
  description: string;
  badge: string;
  icon: string;
  events: SimulatedEvent[];
  projectedNetSwing: number;
}

export interface DeficitSimulationResult {
  currentMargin: number; // userScore - rivalScore (negative means user trailing)
  currentDeficit: number; // rivalScore - userScore (positive when user trailing)
  simulatedUserPoints: number;
  simulatedRivalPoints: number;
  simulatedMargin: number;
  netSwing: number;
  isFlipped: boolean;
  isLeadExtended: boolean;
  isDeficitReduced: boolean;
  isDeficitWidened: boolean;
  events: SimulatedEvent[];
}

export const EVENT_METADATA: Record<
  MatchEventType,
  { label: string; icon: string; shortCode: string; description: string }
> = {
  GOAL: { label: 'Goal', icon: '⚽', shortCode: 'G', description: 'FWD +4, MID +5, DEF/GK +6' },
  ASSIST: { label: 'Assist', icon: '👟', shortCode: 'A', description: '+3 pts across all positions' },
  CLEAN_SHEET: { label: 'Clean Sheet', icon: '🛡️', shortCode: 'CS', description: 'GK/DEF +4, MID +1' },
  CONCEDED_2: { label: 'Conceded 2+', icon: '🥅', shortCode: '-2GC', description: 'DEF/GK -1 per 2 conceded' },
  YELLOW_CARD: { label: 'Yellow Card', icon: '🟨', shortCode: 'YC', description: '-1 pt deduction' },
  RED_CARD: { label: 'Red Card', icon: '🟥', shortCode: 'RC', description: '-3 pts deduction' },
  PENALTY_MISS: { label: 'Pen Miss', icon: '❌', shortCode: 'PM', description: '-2 pts deduction' },
  OWN_GOAL: { label: 'Own Goal', icon: '💥', shortCode: 'OG', description: '-2 pts deduction' },
  BONUS_1: { label: '1 Bonus (BPS)', icon: '🥉', shortCode: 'B1', description: '+1 provisional bonus' },
  BONUS_2: { label: '2 Bonus (BPS)', icon: '🥈', shortCode: 'B2', description: '+2 provisional bonus' },
  BONUS_3: { label: '3 Bonus (BPS)', icon: '🥇', shortCode: 'B3', description: '+3 maximum bonus' },
};

/**
 * Calculates FPL base points for a given event and player position.
 */
export function getBaseEventPoints(eventType: MatchEventType, elementType: number): number {
  switch (eventType) {
    case 'GOAL':
      if (elementType === 1 || elementType === 2) return 6; // GKP/DEF
      if (elementType === 3) return 5; // MID
      return 4; // FWD
    case 'ASSIST':
      return 3;
    case 'CLEAN_SHEET':
      if (elementType === 1 || elementType === 2) return 4;
      if (elementType === 3) return 1;
      return 0;
    case 'CONCEDED_2':
      if (elementType === 1 || elementType === 2) return -1;
      return 0;
    case 'YELLOW_CARD':
      return -1;
    case 'RED_CARD':
      return -3;
    case 'PENALTY_MISS':
      return -2;
    case 'OWN_GOAL':
      return -2;
    case 'BONUS_1':
      return 1;
    case 'BONUS_2':
      return 2;
    case 'BONUS_3':
      return 3;
    default:
      return 0;
  }
}

/**
 * Create a single simulated event with calculated multipliers and net swing.
 */
export function createSimulatedEvent(
  player: DifferentialPlayer,
  eventType: MatchEventType
): SimulatedEvent {
  const basePoints = getBaseEventPoints(eventType, player.elementType);
  const userPointsDelta = basePoints * player.userMultiplier;
  const rivalPointsDelta = basePoints * player.rivalMultiplier;
  const netSwingToUser = userPointsDelta - rivalPointsDelta;
  const meta = EVENT_METADATA[eventType];

  const sign = netSwingToUser >= 0 ? `+${netSwingToUser}` : `${netSwingToUser}`;
  const label = `${player.webName} ${meta.label} (${sign} pts net)`;

  return {
    id: `${player.id}-${eventType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    playerId: player.id,
    playerName: player.webName,
    teamShort: player.teamShort,
    eventType,
    basePoints,
    userMultiplier: player.userMultiplier,
    rivalMultiplier: player.rivalMultiplier,
    userPointsDelta,
    rivalPointsDelta,
    netSwingToUser,
    label,
    owner: player.owner,
  };
}

/**
 * Extracts active tactical differentials (weapons for user, threats for rival)
 * taking into account starting XI status and captaincy multipliers.
 */
export function extractDifferentials(duel: DuelResponse): {
  userWeapons: DifferentialPlayer[];
  rivalThreats: DifferentialPlayer[];
  allDifferentials: DifferentialPlayer[];
} {
  const userPicks = duel.user?.picks || [];
  const rivalPicks = duel.rival?.picks || [];

  const userStartersMap = new Map<number, EnrichedPlayer>();
  const rivalStartersMap = new Map<number, EnrichedPlayer>();

  userPicks.forEach((p) => {
    if (p.isStarter) userStartersMap.set(p.id, p);
  });
  rivalPicks.forEach((p) => {
    if (p.isStarter) rivalStartersMap.set(p.id, p);
  });

  const allRelevantIds = new Set<number>([
    ...Array.from(userStartersMap.keys()),
    ...Array.from(rivalStartersMap.keys()),
  ]);

  const userWeapons: DifferentialPlayer[] = [];
  const rivalThreats: DifferentialPlayer[] = [];

  allRelevantIds.forEach((id) => {
    const uPlayer = userStartersMap.get(id);
    const rPlayer = rivalStartersMap.get(id);

    // Multiplier is 0 if player is not started by manager
    const userMult = uPlayer ? Math.max(1, uPlayer.multiplier || 1) : 0;
    const rivalMult = rPlayer ? Math.max(1, rPlayer.multiplier || 1) : 0;
    const diff = userMult - rivalMult;

    if (diff === 0) {
      // Perfectly neutralized (both start player with same multiplier)
      return;
    }

    const refPlayer = uPlayer || rPlayer!;
    const owner: 'user' | 'rival' = diff > 0 ? 'user' : 'rival';

    const diffPlayer: DifferentialPlayer = {
      id: refPlayer.id,
      webName: refPlayer.webName,
      teamShort: refPlayer.teamShort,
      elementType: refPlayer.elementType,
      isStarter: true,
      userMultiplier: userMult,
      rivalMultiplier: rivalMult,
      effectiveMultiplierDiff: diff,
      owner,
      isCaptain: !!(uPlayer?.isCaptain || rPlayer?.isCaptain),
      isViceCaptain: !!(uPlayer?.isViceCaptain || rPlayer?.isViceCaptain),
      category: owner === 'user' ? 'WEAPON' : 'DANGER',
      currentPoints: refPlayer.effectivePoints ?? refPlayer.rawLivePoints ?? 0,
    };

    if (owner === 'user') {
      userWeapons.push(diffPlayer);
    } else {
      rivalThreats.push(diffPlayer);
    }
  });

  // Sort by effective multiplier and captain status first
  userWeapons.sort((a, b) => (b.isCaptain ? 2 : 1) - (a.isCaptain ? 2 : 1));
  rivalThreats.sort((a, b) => (b.isCaptain ? 2 : 1) - (a.isCaptain ? 2 : 1));

  return {
    userWeapons,
    rivalThreats,
    allDifferentials: [...userWeapons, ...rivalThreats],
  };
}

/**
 * Calculates the exact simulation state given actual duel scores and a list of applied simulated events.
 */
export function calculateDeficitSimulation(
  duel: DuelResponse,
  events: SimulatedEvent[]
): DeficitSimulationResult {
  const userActual =
    duel.user.liveNetPoints ?? duel.user.liveStartingPoints ?? duel.user.totalPoints ?? 0;
  const rivalActual =
    duel.rival.liveNetPoints ?? duel.rival.liveStartingPoints ?? duel.rival.totalPoints ?? 0;

  const currentMargin = userActual - rivalActual;
  const currentDeficit = rivalActual - userActual;

  const totalUserDelta = events.reduce((sum, e) => sum + e.userPointsDelta, 0);
  const totalRivalDelta = events.reduce((sum, e) => sum + e.rivalPointsDelta, 0);
  const netSwing = totalUserDelta - totalRivalDelta;

  const simulatedUserPoints = userActual + totalUserDelta;
  const simulatedRivalPoints = rivalActual + totalRivalDelta;
  const simulatedMargin = simulatedUserPoints - simulatedRivalPoints;

  const isFlipped = currentMargin < 0 && simulatedMargin > 0;
  const isLeadExtended = currentMargin >= 0 && simulatedMargin > currentMargin;
  const isDeficitReduced = currentMargin < 0 && simulatedMargin > currentMargin && simulatedMargin <= 0;
  const isDeficitWidened = simulatedMargin < currentMargin;

  return {
    currentMargin,
    currentDeficit,
    simulatedUserPoints,
    simulatedRivalPoints,
    simulatedMargin,
    netSwing,
    isFlipped,
    isLeadExtended,
    isDeficitReduced,
    isDeficitWidened,
    events,
  };
}

/**
 * Generate automated 1-click Quick Flip Scenarios based on the current duel setup.
 */
export function generateQuickScenarios(
  duel: DuelResponse,
  userWeapons: DifferentialPlayer[],
  rivalThreats: DifferentialPlayer[]
): QuickScenario[] {
  const userActual =
    duel.user.liveNetPoints ?? duel.user.liveStartingPoints ?? duel.user.totalPoints ?? 0;
  const rivalActual =
    duel.rival.liveNetPoints ?? duel.rival.liveStartingPoints ?? duel.rival.totalPoints ?? 0;
  const currentMargin = userActual - rivalActual;
  const pointsToFlip = currentMargin < 0 ? Math.abs(currentMargin) + 1 : 0;

  const scenarios: QuickScenario[] = [];

  // 1. "Weapons Fire": All user active differentials score 1 goal + 2 BPS
  const weaponsFireEvents: SimulatedEvent[] = [];
  userWeapons.forEach((w) => {
    if (w.elementType === 1) {
      // GK gets Clean Sheet + 2 Bonus
      weaponsFireEvents.push(createSimulatedEvent(w, 'CLEAN_SHEET'));
      weaponsFireEvents.push(createSimulatedEvent(w, 'BONUS_2'));
    } else {
      // Outfield weapon gets Goal + 2 Bonus
      weaponsFireEvents.push(createSimulatedEvent(w, 'GOAL'));
      weaponsFireEvents.push(createSimulatedEvent(w, 'BONUS_2'));
    }
  });

  const weaponsFireSwing = weaponsFireEvents.reduce((s, e) => s + e.netSwingToUser, 0);
  scenarios.push({
    id: 'weapons-fire',
    title: 'Weapons Fire',
    badge: 'ATTACK OVERLOAD',
    icon: '🔥',
    description: 'Every user starting differential scores 1 goal and claims 2 bonus points.',
    events: weaponsFireEvents,
    projectedNetSwing: weaponsFireSwing,
  });

  // 2. "Rival Captain Blank": Rival captain blanks/concedes while user captain hauls
  const rivalCaptain = rivalThreats.find((t) => t.isCaptain);
  const userCaptain = userWeapons.find((w) => w.isCaptain);
  const captainBlankEvents: SimulatedEvent[] = [];

  if (userCaptain) {
    // User captain scores 2 goals + 3 BPS
    captainBlankEvents.push(createSimulatedEvent(userCaptain, 'GOAL'));
    captainBlankEvents.push(createSimulatedEvent(userCaptain, 'GOAL'));
    captainBlankEvents.push(createSimulatedEvent(userCaptain, 'BONUS_3'));
  } else if (userWeapons.length > 0) {
    // Fallback: top user weapon hauls
    captainBlankEvents.push(createSimulatedEvent(userWeapons[0], 'GOAL'));
    captainBlankEvents.push(createSimulatedEvent(userWeapons[0], 'BONUS_3'));
  }

  if (rivalCaptain) {
    // Rival captain receives yellow card or concedes 2 goals
    if (rivalCaptain.elementType === 1 || rivalCaptain.elementType === 2) {
      captainBlankEvents.push(createSimulatedEvent(rivalCaptain, 'CONCEDED_2'));
    }
    captainBlankEvents.push(createSimulatedEvent(rivalCaptain, 'YELLOW_CARD'));
  } else if (rivalThreats.length > 0) {
    captainBlankEvents.push(createSimulatedEvent(rivalThreats[0], 'YELLOW_CARD'));
  }

  const captainBlankSwing = captainBlankEvents.reduce((s, e) => s + e.netSwingToUser, 0);
  scenarios.push({
    id: 'captain-blank',
    title: 'Rival Captain Blank',
    badge: 'ARMBAND LEVERAGE',
    icon: '👑',
    description:
      'User captain hauls with a brace & max bonus, while rival captain blanks with negative cards.',
    events: captainBlankEvents,
    projectedNetSwing: captainBlankSwing,
  });

  // 3. "Clean Sheet Fortress": User defenders keep CS, rival defenders concede 2+
  const csFortressEvents: SimulatedEvent[] = [];
  const userDefenders = userWeapons.filter((w) => w.elementType === 1 || w.elementType === 2);
  const rivalDefenders = rivalThreats.filter((t) => t.elementType === 1 || t.elementType === 2);

  userDefenders.forEach((d) => {
    csFortressEvents.push(createSimulatedEvent(d, 'CLEAN_SHEET'));
    csFortressEvents.push(createSimulatedEvent(d, 'BONUS_1'));
  });

  rivalDefenders.forEach((d) => {
    csFortressEvents.push(createSimulatedEvent(d, 'CONCEDED_2'));
  });

  const csFortressSwing = csFortressEvents.reduce((s, e) => s + e.netSwingToUser, 0);
  scenarios.push({
    id: 'clean-sheet-fortress',
    title: 'Clean Sheet Fortress',
    badge: 'DEFENSIVE LOCKOUT',
    icon: '🏰',
    description:
      'User defensive weapons keep clean sheets with bonus, while rival backline concedes 2+ goals.',
    events: csFortressEvents,
    projectedNetSwing: csFortressSwing,
  });

  // 4. "Minimum Path to Victory": Smallest set of high-leverage differential events to flip deficit into a lead
  const minPathEvents: SimulatedEvent[] = [];
  let accumulatedSwing = 0;
  const targetSwing = pointsToFlip > 0 ? pointsToFlip : 5; // If already leading, target +5 safety cushion

  // Strategy pool: prioritize user captain haul, then user attacking weapons, then rival slip-ups
  const candidatePool: Array<{ player: DifferentialPlayer; type: MatchEventType }> = [];

  // Captain goal & bonus first
  if (userCaptain) {
    candidatePool.push({ player: userCaptain, type: 'GOAL' });
    candidatePool.push({ player: userCaptain, type: 'BONUS_3' });
    candidatePool.push({ player: userCaptain, type: 'ASSIST' });
  }

  // Other user weapons goals & assists
  userWeapons
    .filter((w) => !w.isCaptain)
    .forEach((w) => {
      if (w.elementType === 1 || w.elementType === 2) {
        candidatePool.push({ player: w, type: 'CLEAN_SHEET' });
        candidatePool.push({ player: w, type: 'BONUS_2' });
        candidatePool.push({ player: w, type: 'GOAL' });
      } else {
        candidatePool.push({ player: w, type: 'GOAL' });
        candidatePool.push({ player: w, type: 'BONUS_3' });
        candidatePool.push({ player: w, type: 'ASSIST' });
      }
    });

  // Rival threats negative events
  rivalThreats.forEach((t) => {
    if (t.elementType === 1 || t.elementType === 2) {
      candidatePool.push({ player: t, type: 'CONCEDED_2' });
    }
    candidatePool.push({ player: t, type: 'YELLOW_CARD' });
  });

  for (const item of candidatePool) {
    if (accumulatedSwing >= targetSwing) break;
    const evt = createSimulatedEvent(item.player, item.type);
    if (evt.netSwingToUser > 0) {
      minPathEvents.push(evt);
      accumulatedSwing += evt.netSwingToUser;
    }
  }

  scenarios.push({
    id: 'minimum-path',
    title: 'Minimum Path to Victory',
    badge: currentMargin < 0 ? 'DEFICIT BREAKER' : 'LEAD STABILIZER',
    icon: '🎯',
    description:
      currentMargin < 0
        ? `Fewest combination of events needed to overcome your ${Math.abs(currentMargin)} pt deficit and take the lead.`
        : 'Strategic micro-swings to build an unassailable point cushion over your rival.',
    events: minPathEvents,
    projectedNetSwing: accumulatedSwing,
  });

  return scenarios;
}
