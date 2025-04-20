import { GameState, GameMode, GameSettings, PlayerRole, WordCategory, GameResultType, Player } from '@/lib/types';

export interface Room {
  id: string;
  host_id: string;
  state: GameState;
  settings: GameSettings;
  max_players: number;
  discussion_time: number;
  max_rounds: number;
  game_mode: GameMode;
  team_size: number;
  chaos_mode: boolean;
  time_per_round: number;
  voting_time: number;
  created_at: string;
  updated_at: string;
  last_updated: string;
  players: Player[];
  category: WordCategory | undefined;
  secret_word: string | undefined;
  chameleon_id: string | undefined;
  timer: number | undefined;
  current_turn: number | undefined;
  current_word: string | undefined;
  turn_order?: string[];
  round: number;
  round_outcome: GameResultType | null;
  votes_tally: Record<string, number> | null;
  votes: Record<string, string>;
  results: GameResultType[];
  revealed_player_id: string | null;
  revealed_role: PlayerRole | null;
} 