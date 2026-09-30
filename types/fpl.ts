export type TacticalCategory = 'SHIELD' | 'WEAPON' | 'DANGER';

export type SubStatus = 'ACTIVE' | 'SUBBED_ON' | 'SUBBED_OFF' | 'BENCHED';

export interface EnrichedPlayer {
  id: number;
  webName: string;
  teamShort: string;
  teamCode: number;
  photoCode: string;
  elementType: number; // 1: GKP, 2: DEF, 3: MID, 4: FWD
  position: number;    // 1-11 Starting XI, 12-15 Bench
  isStarter: boolean;
  multiplier: number;
  isCaptain: boolean;
  isViceCaptain: boolean;
  category: TacticalCategory;
  rawLivePoints: number;
  provisionalBonus: number; // 0, 1, 2, or 3
  effectivePoints: number;
  subStatus: SubStatus;
  hasFinishedMatch: boolean;
  stats: {
    minutes: number;
    goals: number;
    assists: number;
    cleanSheets: number;
    bonus: number;
    bps: number;
  };
}

export interface ManagerSummary {
  teamId: number;
  managerName: string;
  teamName: string;
  bank: number;
  squadValue: number;
  totalPoints: number;
  eventTransfersCost: number;
  activeChip: string | null;
  chipsUsed: Array<{ name: string; time: string; event: number }>;
  captain: {
    id: number;
    name: string;
    multiplier: number;
    isInheritedVice: boolean;
  } | null;
  liveStartingPoints: number;
  liveNetPoints: number;
  picks: EnrichedPlayer[];
}

export interface DuelResponse {
  gameweek: number;
  armbandClash: {
    isNeutralized: boolean;
    userCaptain: string;
    rivalCaptain: string;
    userViceInherited: boolean;
    rivalViceInherited: boolean;
  };
  metrics: {
    sharedShieldsCount: number;
    userWeaponsCount: number;
    rivalDangersCount: number;
    netScoreSwing: number;
  };
  user: ManagerSummary;
  rival: ManagerSummary;
}

export interface LeagueCompetitor {
  entry: number;
  entryName: string;
  playerName: string;
  rank: number;
  lastRank: number;
  total: number;
  eventTotal: number;
}

export interface LeagueResponse {
  leagueId: number;
  leagueName: string;
  standings: LeagueCompetitor[];
}
