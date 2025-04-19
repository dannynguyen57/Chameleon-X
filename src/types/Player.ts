import { PlayerRole } from '@/lib/types';

export interface Player {
  id: string;
  name: string;
  room_id: string;
  role: PlayerRole;
  is_host: boolean;
  is_ready: boolean;
  last_active: string;
  last_updated: string;
  turn_description?: string;
  vote?: string;
  timeout_at?: string;
  protected_player_id?: string;
  investigated_player_id?: string;
  special_ability_used?: boolean;
  is_protected?: boolean;
  vote_multiplier?: number;
  special_word?: string;
  team?: number;
  is_illusionist?: boolean;
  can_see_word?: boolean;
  revealed_role?: PlayerRole;
} 