import { GameSettings, PlayerRole, GameState, GameResultType, WordCategory } from '@/lib/types';
import { ExtendedGameRoom } from './GameContextProvider';

export interface ChatMessage {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  content: string;
  is_hint: boolean;
  created_at: string;
  role: string;
}

export interface DatabasePlayer {
  id: string;
  room_id: string;
  name: string;
  role: PlayerRole;
  is_host: boolean;
  is_ready: boolean;
  turn_description?: string;
  vote?: string;
  last_active: string;
  last_updated: string;
  is_protected: boolean;
  vote_multiplier: number;
  special_word?: string;
  special_ability_used: boolean;
  turn_timer: number;
  turn_started_at?: string;
}

export interface DatabaseRoom {
  id: string;
  host_id: string;
  state: GameState;
  round: number;
  max_rounds: number;
  category?: string;
  secret_word?: string;
  chameleon_id?: string;
  created_at: string;
  updated_at: string;
  last_updated: string;
  max_players: number;
  discussion_time: number;
  game_mode: string;
  team_size: number;
  chaos_mode: boolean;
  presenting_time: number;
  voting_time: number;
  settings: GameSettings;
  current_turn: number;
  turn_order: string[];
  round_outcome?: GameResultType;
  votes_tally: Record<string, number>;
  revealed_player_id?: string;
  revealed_role?: PlayerRole;
  votes: Record<string, string>;
  results: GameResultType[];
  chameleon_count: number;
  player_count: number;
  discussion_timer: number;
  voting_timer: number;
  turn_timer: number;
  presenting_timer: number;
}

export interface GameContextType {
  playerId: string;
  room: ExtendedGameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string, settings: GameSettings) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  selectCategory: (category: WordCategory) => Promise<void>;
  submitWord: (word: string) => Promise<void>;
  submitVote: (votedPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  handleRoleAbility: (targetPlayerId?: string) => Promise<void>;
  setPlayerRole: (playerId: string, role: PlayerRole) => Promise<boolean>;
  handleGameStateTransition: (newState: GameState) => Promise<void>;
  getPublicRooms: () => Promise<ExtendedGameRoom[]>;
  updateSettings: (newSettings: GameSettings) => Promise<void>;
  checkNameExists: (roomId: string, playerName: string) => Promise<boolean>;
  isPlayerChameleon: boolean;
  remainingTime: {
    timeLeft: number;
    isActive: boolean;
    startTimer: (duration: number) => void;
    stopTimer: () => void;
    resetTimer: (duration: number) => void;
    formatTime: (seconds: number) => string;
  };
  playerName: string;
  setPlayerName: (name: string) => void;
  setRoom: (room: ExtendedGameRoom | null) => void;
  loading: boolean;
  error: Error | null;
} 