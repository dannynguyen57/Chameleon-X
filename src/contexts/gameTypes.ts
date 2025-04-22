import { GameRoom, GameSettings, PlayerRole, GameState, GameResultType, WordCategory } from '@/lib/types';

export interface DatabaseRoom {
  id: string;
  state: GameState;
  settings: GameSettings;
  players: { id: string; name: string; role?: PlayerRole }[];
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
}

export interface GameContextType {
  playerId: string;
  room: GameRoom | null;
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
  getPublicRooms: () => Promise<GameRoom[]>;
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
  setRoom: (room: GameRoom | null) => void;
  loading: boolean;
  error: Error | null;
} 