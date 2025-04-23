import { GameState, GameMode, GameSettings, PlayerRole, WordCategory, GameResultType, Player } from '@/lib/types';

export interface Room {
  id: string;
  host_id?: string;
  state: GameState;
  settings: GameSettings;
  max_players: number;
  discussion_time: number;
  max_rounds?: number;
  game_mode: GameMode;
  team_size: number;
  chaos_mode: boolean;
  // time_per_round: number;
  presenting_time: number;
  voting_time: number;
  created_at: string;
  updated_at: string;
  last_updated?: string;
  players: Player[];
  category: WordCategory | undefined;
  secret_word?: string;
  chameleon_id?: string;
  current_turn?: number;
  current_word?: string;
  turn_order?: string[];
  round?: number;
  round_outcome?: GameResultType | null;
  votes_tally?: Record<string, number> | null;
  votes?: Record<string, string>;
  results?: GameResultType[];
  revealed_player_id?: string | null;
  revealed_role?: PlayerRole | null;
} 