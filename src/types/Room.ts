import { PlayerRole, GameState, GameMode, GameSettings } from '@/lib/types';

export interface Player {
  id: string;
  name: string;
  role: PlayerRole;
  word?: string;
  turn_description?: string;
  isHost: boolean;
  vote: string | null;
  last_active: string;
  last_updated: string;
}

export interface Room {
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
} 