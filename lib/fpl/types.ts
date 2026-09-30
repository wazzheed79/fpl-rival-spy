export interface BootstrapStatic {
  elements: Array<{
    id: number;
    web_name: string;
    element_type: number; // 1: GK, 2: DEF, 3: MID, 4: FWD
    team: number;
    now_cost: number;
    form: string;
    ep_next: string;
    selected_by_percent: string;
  }>;
  teams: Array<{ id: number; short_name: string; name: string }>;
  events: Array<{ id: number; is_current: boolean; is_next: boolean }>;
}

export interface ManagerPicksResponse {
  picks: Array<{
    element: number;
    position: number;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  }>;
  active_chip: string | null;
  entry_history: {
    event: number;
    points: number;
    total_points: number;
    bank: number;
    value: number;
  };
}

export interface EnrichedPick {
  element: number;
  position: number;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
  name: string;
  type: number;
  cost: number;
  form: string;
  duelRole: 'SHIELD' | 'WEAPON' | 'RIVAL_DANGER';
}
