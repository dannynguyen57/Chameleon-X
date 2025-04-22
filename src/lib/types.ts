import { WordCategory } from './word-categories';
import { RoleTheme } from './roleThemes';

export type { WordCategory };

export enum PlayerRole {
  Regular = 'regular',
  Chameleon = 'chameleon',
  Mimic = 'mimic',
  Oracle = 'oracle',
  Jester = 'jester',
  Spy = 'spy',
  Guardian = 'guardian',
  Trickster = 'trickster',
  Illusionist = 'illusionist',
}

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  isProtected: boolean;
  isInvestigated: boolean;
  isCurrentPlayer: boolean;
  isTurn: boolean;
  turn_description?: string;
  protected_player_id?: string;
  investigated_player_id?: string;
  score: number;
  is_host: boolean;
  is_ready: boolean;
  word?: string;
  is_protected?: boolean;
  has_voted?: boolean;
  vote?: string;
  last_active: string;
  last_updated: string;
  vote_multiplier?: number;
  special_word?: string;
  special_ability_used?: boolean;
  timeout_at?: string;
  revealed_role?: PlayerRole;
  team?: number;
  is_illusionist?: boolean;
  can_see_word?: boolean;
  room_id: string;
  created_at: string;
  avatar?: string;
  roleTheme?: RoleTheme;
}

export enum GameState {
  Lobby = 'lobby',
  Selecting = 'selecting',
  Presenting = 'presenting',
  Discussion = 'discussion',
  Voting = 'voting',
  Results = 'results',
  Ended = 'ended'
}

export enum GameMode {
  Classic = 'classic',
  Teams = 'teams',
  Chaos = 'chaos',
  Timed = 'timed'
}

export interface GameSettings {
  max_players: number;
  discussion_time: number;
  max_rounds: number;
  game_mode: GameMode;
  team_size: number;
  chaos_mode: boolean;
  time_per_round: number;
  voting_time: number;
  roles: {
    [GameMode.Classic]: PlayerRole[];
    [GameMode.Teams]: PlayerRole[];
    [GameMode.Chaos]: PlayerRole[];
    [GameMode.Timed]: PlayerRole[];
  };
  special_abilities: boolean;
}

export enum GameResultType {
  ImposterCaught = 'imposter_caught',
  InnocentVoted = 'innocent_voted',
  JesterWins = 'jester_wins',
  Tie = 'tie'
}

export type GameResult = {
  winner: string | null;
  imposter: string | null;
  votes: Record<string, string>;
  special_abilities: boolean;
}

export type DatabasePlayer = {
  id: string;
  name: string;
  role: PlayerRole;
  score: number;
  is_host: boolean;
  is_ready: boolean;
  is_protected: boolean;
  has_voted: boolean;
  word?: string;
  turn_description?: string;
  vote?: string;
  last_active: string;
  last_updated: string;
  vote_multiplier: number;
  special_word?: string;
  special_ability_used: boolean;
  timeout_at?: string;
  protected_player_id?: string;
  investigated_player_id?: string;
  revealed_role?: PlayerRole;
  team?: number;
  is_illusionist: boolean;
  can_see_word: boolean;
  created_at: string;
  room_id: string;
};

export type DatabaseRoom = {
  id: string;
  state: GameState;
  settings: GameSettings;
  players: DatabasePlayer[];
  category?: string;
  secret_word?: string;
  chameleon_id?: string;
  timer?: number;
  current_turn?: number;
  current_word?: string;
  created_at: string;
  updated_at: string;
  round?: number;
  round_outcome?: GameResultType | null;
  votes_tally?: Record<string, number> | null;
  votes?: Record<string, string>;
  results?: GameResultType[];
  revealed_player_id?: string | null;
  revealed_role?: PlayerRole | null;
  last_updated?: string;
  max_rounds?: number;
  host_id?: string;
};

export type GamePhase = 'lobby' | 'selecting' | 'presenting' | 'discussion' | 'voting' | 'results';

export interface GameRoom {
  id: string;
  state: GameState;
  settings: GameSettings;
  players: Player[];
  category: WordCategory | undefined;
  secret_word: string | undefined;
  chameleon_id: string | undefined;
  timer: number | undefined;
  current_turn: number | undefined;
  current_word: string | undefined;
  created_at: string;
  updated_at: string;
  turn_order: string[];
  round: number;
  current_round: number;
  round_outcome: GameResultType | null;
  votes_tally: Record<string, number> | null;
  votes: Record<string, string>;
  results: GameResultType[];
  revealed_player_id: string | null;
  revealed_role: PlayerRole | null;
  last_updated: string;
  max_rounds: number;
  host_id: string;
  current_phase: GamePhase;
  phase: GamePhase;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  content: string;
  is_hint: boolean;
  created_at: string;
  role?: PlayerRole;
}

export interface Database {
  public: {
    Tables: {
      game_rooms: {
        Row: {
          id: string;
          host_id: string;
          state: string;
          round: number;
          max_rounds: number;
          category: string | null;
          secret_word: string | null;
          chameleon_id: string | null;
          timer: number | null;
          created_at: string;
          updated_at: string;
          max_players: number;
          discussion_time: number;
          voting_time: number;
          settings: GameSettings;
        };
        Insert: {
          id: string;
          host_id: string;
          state: string;
          round: number;
          max_rounds: number;
          category?: string | null;
          secret_word?: string | null;
          chameleon_id?: string | null;
          timer?: number | null;
          created_at?: string;
          updated_at?: string;
          max_players: number;
          discussion_time: number;
          voting_time: number;
          settings: GameSettings;
        };
        Update: {
          id?: string;
          host_id?: string;
          state?: string;
          round?: number;
          max_rounds?: number;
          category?: string | null;
          secret_word?: string | null;
          chameleon_id?: string | null;
          timer?: number | null;
          created_at?: string;
          updated_at?: string;
          max_players?: number;
          discussion_time?: number;
          voting_time?: number;
          settings?: GameSettings;
        };
      };
      players: {
        Row: {
          id: string;
          room_id: string;
          name: string;
          role: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          room_id: string;
          name: string;
          role?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          room_id?: string;
          name?: string;
          role?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      start_game: {
        Args: { room_id: string };
        Returns: void;
      };
      update_room_settings: {
        Args: { room_id: string; new_settings: GameSettings };
        Returns: void;
      };
    };
  };
}

export const DEFAULT_ROLES: Record<GameMode, PlayerRole[]> = {
  [GameMode.Classic]: [PlayerRole.Regular, PlayerRole.Chameleon],
  [GameMode.Teams]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Guardian],
  [GameMode.Chaos]: [],
  [GameMode.Timed]: []
};
