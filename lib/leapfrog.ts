export interface CandidatePlayer {
  id: number;
  webName: string;
  teamShort: string;
  elementType: number; // 1: GKP, 2: DEF, 3: MID, 4: FWD
  cost: number;
  form: number;
  xgi: number;
  fdrNext3Avg: number;
  localOwnershipPct: number;
  chanceOfPlaying: number | null;
  isOwnedByRival?: boolean;
}

export interface SquadPlayer extends CandidatePlayer {
  sellingPrice: number;
}

export interface LeapfrogTransferRecommendation {
  type: 'DIFFERENTIAL_WEAPON' | 'BLOCK_SHIELD';
  sell: SquadPlayer;
  buy: CandidatePlayer;
  deltaForm: number;
  deltaFdr: number;
  costDifference: number;
  netImpactScore: number;
  strategicNote: string;
}

export interface EngineFilters {
  mode: 'CHASING' | 'DEFENDING';
  deficitOrLead: number; // Positive = trailing (chasing), Negative = leading (defending)
  remainingGws: number;
  maxFdr?: number;
  minForm?: number;
  enforceZeroLocalOwnership?: boolean;
}

export function generateLeapfrogRecommendations(
  squad: SquadPlayer[],
  allPlayers: CandidatePlayer[],
  availableBank: number,
  rivalPlayerIds: Set<number>,
  filters: EngineFilters
): LeapfrogTransferRecommendation[] {
  const {
    mode,
    maxFdr = 2.6,
    minForm = 3.5,
    enforceZeroLocalOwnership = true,
  } = filters;

  const squadIds = new Set(squad.map((p) => p.id));
  const recommendations: LeapfrogTransferRecommendation[] = [];

  // Sell candidate detection: low form, harsh fixtures, or injury flag
  const sellCandidates = squad.filter((p) => {
    const isInjuredOrDoubtful = p.chanceOfPlaying !== null && p.chanceOfPlaying < 75;
    const isCold = p.form < minForm;
    const hasToughFixtures = p.fdrNext3Avg >= 3.8;
    return isInjuredOrDoubtful || isCold || hasToughFixtures;
  });

  const targets = sellCandidates.length > 0
    ? sellCandidates
    : [...squad].sort((a, b) => a.form - b.form).slice(0, 3);

  // ==========================================
  // MODE 1: DEFENDING (BLOCK TRANSFERS)
  // ==========================================
  if (mode === 'DEFENDING') {
    // Identify rival's high-threat differentials (owned by rival, not by user)
    const rivalThreats = allPlayers.filter(
      (p) => rivalPlayerIds.has(p.id) && !squadIds.has(p.id) && p.form >= 3.8
    );

    for (const sell of targets) {
      const maxBudget = Number((sell.sellingPrice + availableBank).toFixed(1));

      const viableBlocks = rivalThreats.filter(
        (threat) => threat.elementType === sell.elementType && threat.cost <= maxBudget
      );

      for (const blockTarget of viableBlocks) {
        const deltaForm = Number((blockTarget.form - sell.form).toFixed(1));
        const deltaFdr = Number((blockTarget.fdrNext3Avg - sell.fdrNext3Avg).toFixed(2));
        const costDifference = Number((blockTarget.cost - sell.sellingPrice).toFixed(1));
        const netImpactScore = Number((blockTarget.form * 1.8 + Math.max(0, -deltaFdr)).toFixed(1));

        recommendations.push({
          type: 'BLOCK_SHIELD',
          sell,
          buy: blockTarget,
          deltaForm,
          deltaFdr,
          costDifference,
          netImpactScore,
          strategicNote: `Rival owns ${blockTarget.webName}. Buying them eliminates your rival's primary differential route.`,
        });
      }
    }
  }

  // ==========================================
  // MODE 2: CHASING (DIFFERENTIAL WEAPONS)
  // ==========================================
  // If in chasing mode OR if defending returned no valid block targets, hunt pure differentials
  if (mode === 'CHASING' || recommendations.length === 0) {
    for (const sell of targets) {
      const maxBudget = Number((sell.sellingPrice + availableBank).toFixed(1));

      const eligibleBuys = allPlayers.filter((buy) => {
        if (squadIds.has(buy.id)) return false;
        if (rivalPlayerIds.has(buy.id)) return false; // In chasing mode, never copy the rival
        if (buy.elementType !== sell.elementType) return false;
        if (buy.cost > maxBudget) return false;
        if (buy.chanceOfPlaying !== null && buy.chanceOfPlaying < 100) return false;
        if (enforceZeroLocalOwnership && buy.localOwnershipPct > 0) return false;
        if (buy.fdrNext3Avg > maxFdr) return false;
        if (buy.form <= sell.form) return false;
        return true;
      });

      for (const buy of eligibleBuys) {
        const deltaForm = Number((buy.form - sell.form).toFixed(1));
        const deltaFdr = Number((buy.fdrNext3Avg - sell.fdrNext3Avg).toFixed(2));
        const costDifference = Number((buy.cost - sell.sellingPrice).toFixed(1));

        const fdrAdvantage = Math.max(0, -deltaFdr) * 1.5;
        const xgiBonus = buy.xgi * 0.8;
        const netImpactScore = Number((deltaForm * 2.0 + fdrAdvantage + xgiBonus).toFixed(1));

        recommendations.push({
          type: 'DIFFERENTIAL_WEAPON',
          sell,
          buy,
          deltaForm,
          deltaFdr,
          costDifference,
          netImpactScore,
          strategicNote: `0% mini-league owned. Generates direct positive variance against your rival's template.`,
        });
      }
    }
  }

  return recommendations
    .sort((a, b) => b.netImpactScore - a.netImpactScore)
    .slice(0, 6);
}
