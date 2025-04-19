import { GameState, GameMode, GameSettings, PlayerRole } from '@/lib/types';
import { Player } from './Player';

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
  category?: string | null;
  secret_word?: string | null;
  chameleon_id?: string | null;
  timer?: number | null;
  current_turn?: number;
  turn_order?: string[];
  round_outcome?: string | null;
  votes_tally?: { [playerId: string]: number } | null;
  revealed_player_id?: string | null;
  revealed_role?: PlayerRole | null;
  round?: number;
} 