import { PlayerRole } from '@/lib/types';

export interface Player {
  id: string;
  name: string;
  room_id: string;
  role?: PlayerRole;
  is_host: boolean;
  is_ready: boolean;
  turn_description?: string;
  vote?: string;
  last_active: string;
  last_updated: string;
  is_protected?: boolean;
  vote_multiplier?: number;
  special_word?: string;
  special_ability_used?: boolean;
} 