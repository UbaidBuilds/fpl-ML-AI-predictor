export interface Team {
  id: number;
  fpl_id: number;
  name: string;
  short_name: string;
  strength: number;
  created_at: string;
  updated_at: string;
}

export interface Prediction {
  id: number;
  player_id: number;
  gameweek: number;
  predicted_points: string; // decimal:2 cast -> string from DB
  confidence: string; // decimal:2 cast -> string from DB
  features: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: number;
  fpl_id: number;
  name: string;
  web_name: string;
  team_fpl_id: number;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: string; // decimal:1 cast -> string e.g. "8.5"
  total_points: number;
  form: string; // decimal:1 cast -> string e.g. "6.2"
  status: string;
  selected_by_percent: string; // decimal:1 cast -> string e.g. "45.2"
  created_at: string;
  updated_at: string;
  team?: Team;
  predictions?: Prediction[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  fpl_team_id: number | null;
  subscription_tier: string;
  subscription_expires: string | null;
  api_calls_today: number;
  api_limit: number;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PredictionApiResponse {
  player: Player;
  prediction: {
    predicted_points: number;
    confidence: number;
    gameweek: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface PlayerQueryParams {
  search?: string;
  position?: string;
  team?: number;
  sort?: "total_points" | "price" | "form" | "name";
  dir?: "asc" | "desc";
  per_page?: number;
  page?: number;
}

// Team Analyzer types

export interface TeamAnalyzerTeamInfo {
  team_name: string;
  manager_name: string;
  overall_points: number;
  overall_rank: number | null;
  fpl_team_id: number;
  gameweek: number;
  free_hit_active?: boolean;
  active_chip?: string | null;
  next_gameweek?: number;
}

export interface TeamAnalyzerPick {
  squad_position: number;
  is_starter: boolean;
  multiplier: number;
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface TeamAnalyzerPlayerPrediction {
  predicted_points: number;
  confidence: number;
}

export interface TeamAnalyzerSquadEntry {
  player: {
    id: number;
    fpl_id: number;
    name: string;
    web_name: string;
    position: "GKP" | "DEF" | "MID" | "FWD";
    price: string;
    form: string;
    total_points: number;
    status: string;
    team: { name: string; short_name: string } | null;
  };
  pick: TeamAnalyzerPick;
  prediction: TeamAnalyzerPlayerPrediction;
}

export interface TeamAnalyzerAnalysis {
  optimal_xi_fpl_ids: number[];
  optimal_captain_fpl_id: number | null;
  current_xi_predicted: number;
  optimal_xi_predicted: number;
  points_improvement: number;
  weak_player_fpl_ids: number[];
}

export interface TeamAnalyzerResponse {
  team_info: TeamAnalyzerTeamInfo;
  squad: TeamAnalyzerSquadEntry[];
  analysis: TeamAnalyzerAnalysis;
  meta: {
    players_found: number;
    players_missing: number;
    api_calls_remaining: number;
  };
}

// Fixture types

export interface PlayerFixture {
  id: number;
  gameweek: number;
  kickoff_time: string | null;
  is_home: boolean;
  opponent: Team;
  difficulty: number;
  finished: boolean;
}

export interface PlayerFixturesResponse {
  player_id: number;
  team_fpl_id: number;
  fixtures: PlayerFixture[];
}

export interface FixtureItem {
  id: number;
  fpl_id: number;
  gameweek: number;
  home_team_fpl_id: number;
  away_team_fpl_id: number;
  kickoff_time: string | null;
  home_score: number | null;
  away_score: number | null;
  home_difficulty: number;
  away_difficulty: number;
  finished: boolean;
  home_team: Team;
  away_team: Team;
}

export interface GameweekFixturesResponse {
  gameweek: number;
  fixtures: FixtureItem[];
}

// Transfer Suggestion types

export interface TransferFixtureInfo {
  opponent_short: string;
  difficulty: number;
  is_home: boolean;
}

export interface TransferPlayer {
  id: number;
  fpl_id: number;
  web_name: string;
  position: "GKP" | "DEF" | "MID" | "FWD";
  price: string;
  form: string;
  total_points: number;
  selected_by_percent?: string;
  team: { name: string; short_name: string } | null;
  score_3gw: number;
  fixtures: TransferFixtureInfo[];
}

export interface TransferSuggestion {
  player_out: TransferPlayer;
  player_in: TransferPlayer;
  points_gain: number;
  price_diff: number;
  worth_hit: boolean;
  reason: string;
}

export interface TransferSuggestionsResponse {
  suggestions: TransferSuggestion[];
  meta: {
    gameweek: number;
    players_analyzed: number;
    position_filter: string | null;
    api_calls_remaining: number;
  };
}

export interface TransferSuggestRequest {
  position?: "GKP" | "DEF" | "MID" | "FWD";
  max_price?: number;
  min_price?: number;
}

export interface PlannerBudget {
  bank: number;
  squad_value: number;
  event_transfers: number;
  event_transfers_cost: number;
  free_transfers?: number;
}

export interface TransferDraft {
  id: string;
  name: string;
  savedAt: string;
  fplTeamId: number;
  transfers: {
    outFplId: number;
    outName: string;
    inFplId: number;
    inName: string;
    inPrice: string;
    playerInData?: Player;
  }[];
  selectedChip?: string | null;
}

// Unified My Team types

export interface PlayerNextFixture {
  opponent_short_name: string;
  is_home: boolean;
  difficulty: number;
}

export interface MyTeamSquadEntry {
  player: {
    id: number;
    fpl_id: number;
    web_name: string;
    position: "GKP" | "DEF" | "MID" | "FWD";
    price: string;
    form: string;
    total_points: number;
    status: string;
    team_fpl_id: number;
    selected_by_percent?: string;
    team: { name: string; short_name: string } | null;
  };
  pick: {
    squad_position: number;
    is_starter: boolean;
    multiplier: number;
    is_captain: boolean;
    is_vice_captain: boolean;
  };
  prediction: {
    predicted_points: number;
    confidence: number;
  };
  next_fixture: PlayerNextFixture | null;
}

export interface MyTeamResponse {
  team_info: TeamAnalyzerTeamInfo;
  squad: MyTeamSquadEntry[];
  analysis: TeamAnalyzerAnalysis;
  budget: PlannerBudget;
  meta: {
    players_found: number;
    players_missing: number;
    api_calls_remaining: number;
  };
}

export interface MyTeamPendingTransfer {
  playerOut: MyTeamSquadEntry;
  playerIn: Player;
}
