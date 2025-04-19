export type GameMode = 'classic' | 'timed' | 'chaos' | 'team';

export type GameSettings = {
  max_players: number;
  discussion_time: number;
  max_rounds: number;
  game_mode: GameMode;
  team_size?: number;
  chaos_mode?: boolean;
  time_per_round?: number;
  voting_time?: number;
  roles?: {
    classic?: PlayerRole[];      // Default: [Regular, Chameleon]
    creative?: PlayerRole[];     // All roles available
    team?: PlayerRole[];         // Team-based roles
    chaos?: PlayerRole[];        // Random roles each round
  };
  special_abilities?: boolean;    // Enable/disable special abilities
};

export enum PlayerRole {
  Regular = 'regular',           // Knows the exact word
  Chameleon = 'chameleon',       // Doesn't know the word
  Mimic = 'mimic',              // Knows a similar word but not the exact one
  Oracle = 'oracle',            // Knows the word and can see who the chameleon is
  Jester = 'jester',            // Wins if they get voted as the chameleon
  Spy = 'spy',                  // Knows the word but must pretend they don't
  Mirror = 'mirror',            // Must repeat what the previous player said
  Whisperer = 'whisperer',      // Can secretly communicate with one other player
  Timekeeper = 'timekeeper',    // Can extend or reduce the timer once
  Illusionist = 'illusionist',  // Can make one player's vote count double
  Guardian = 'guardian',        // Can protect one player from being voted
  Trickster = 'trickster'       // Can swap roles with another player once
}

export type Player = {
  id: string;
  name: string;
  isHost: boolean;
  vote: string | null;
  team?: number;
  role?: PlayerRole;
  specialWord?: string;         // For roles that know a different word
  specialAbilityUsed?: boolean; // Track if special ability was used
  turn_description?: string;
  last_active: string;
  last_updated: string;
};

export enum GameState {
  Lobby = 'lobby',
  Selecting = 'selecting',
  Presenting = 'presenting',
  Voting = 'voting',
  Results = 'results'
}

export interface GameRoom {
  id: string;
  host_id: string;
  state: GameState;
  round: number;
  created_at: string;
  updated_at: string;
  last_updated: string;
  max_players: number;
  discussion_time: number;
  max_rounds: number;
  game_mode: GameMode;
  team_size: number;
  chaos_mode: boolean;
  time_per_round: number;
  voting_time: number;
  settings: GameSettings;
  players: Player[];
  category?: string;
  secret_word?: string;
  chameleon_id?: string;
  timer?: number;
  current_turn?: number;
  turn_order?: string[];
  chat_messages?: ChatMessage[];
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
