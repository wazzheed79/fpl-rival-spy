// Predictive rank-swing model: projects how the point gap between two managers is likely to
// move over upcoming gameweeks, using each starting player's current form and near-term fixture
// difficulty as a proxy for expected output. This is a heuristic estimate (not a guarantee) -
// it assumes both squads are held unchanged and that recent form continues.

export interface SwingPlayer {
  id: number;
  webName: string;
  isStarter: boolean;
  multiplier: number; // 2 for captain, 3 for triple captain, 0 if benched/subbed off
  form: number;
  fdrNext3Avg: number;
}

export interface RankSwingForecast {
  userExpectedPerGw: number;
  rivalExpectedPerGw: number;
  swingPerGw: number; // positive = user projected to gain ground per gameweek
  projectedMarginIn5Gws: number;
  projectedFinalMargin: number;
  trend: 'USER_PULLING_AWAY' | 'USER_CLOSING_GAP' | 'RIVAL_PULLING_AWAY' | 'RIVAL_CLOSING_GAP' | 'STABLE';
  narrative: string;
}

// Converts a 1 (easy) - 5 (hard) FDR into a multiplier around 1.0: easier fixtures boost
// expected output, harder fixtures suppress it. Neutral FDR of 3 => multiplier of 1.0.
function fixtureMultiplier(fdr: number): number {
  const delta = 3 - fdr;
  return Math.max(0.6, Math.min(1.4, 1 + delta * 0.08));
}

function expectedPointsPerGw(squad: SwingPlayer[]): number {
  return squad
    .filter((p) => p.isStarter)
    .reduce((sum, p) => {
      const effectiveMultiplier = p.multiplier > 0 ? p.multiplier : 1;
      return sum + p.form * fixtureMultiplier(p.fdrNext3Avg) * effectiveMultiplier;
    }, 0);
}

export function computeRankSwingForecast(
  userSquad: SwingPlayer[],
  rivalSquad: SwingPlayer[],
  currentMarginUserMinusRival: number,
  remainingGws: number
): RankSwingForecast {
  const userExpectedPerGw = Number(expectedPointsPerGw(userSquad).toFixed(1));
  const rivalExpectedPerGw = Number(expectedPointsPerGw(rivalSquad).toFixed(1));
  const swingPerGw = Number((userExpectedPerGw - rivalExpectedPerGw).toFixed(1));

  const horizon = Math.max(0, remainingGws);
  const projectedMarginIn5Gws = Number((currentMarginUserMinusRival + swingPerGw * Math.min(5, horizon)).toFixed(1));
  const projectedFinalMargin = Number((currentMarginUserMinusRival + swingPerGw * horizon).toFixed(1));

  let trend: RankSwingForecast['trend'] = 'STABLE';
  if (Math.abs(swingPerGw) >= 0.5) {
    if (swingPerGw > 0) {
      trend = currentMarginUserMinusRival >= 0 ? 'USER_PULLING_AWAY' : 'USER_CLOSING_GAP';
    } else {
      trend = currentMarginUserMinusRival <= 0 ? 'RIVAL_PULLING_AWAY' : 'RIVAL_CLOSING_GAP';
    }
  }

  const narrativeMap: Record<RankSwingForecast['trend'], string> = {
    USER_PULLING_AWAY: `Your starting XI's form and fixtures project +${swingPerGw} pts/GW over your rival - the gap is set to widen in your favour.`,
    USER_CLOSING_GAP: `You're trailing, but your squad is projected to outscore your rival by +${swingPerGw} pts/GW - the deficit should shrink if form holds.`,
    RIVAL_PULLING_AWAY: `Your rival's squad projects +${Math.abs(swingPerGw)} pts/GW over yours - their lead is set to extend. Consider the Leapfrog Engine for counters.`,
    RIVAL_CLOSING_GAP: `You're ahead, but your rival is projected to outscore you by +${Math.abs(swingPerGw)} pts/GW - your lead is at risk of shrinking.`,
    STABLE: `Both squads project near-identical weekly output - expect the current gap to roughly hold.`,
  };

  return {
    userExpectedPerGw,
    rivalExpectedPerGw,
    swingPerGw,
    projectedMarginIn5Gws,
    projectedFinalMargin,
    trend,
    narrative: narrativeMap[trend],
  };
}
