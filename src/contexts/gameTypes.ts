import { GameRoom, GameSettings } from '@/lib/types';

export type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string, settings: GameSettings) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  startGame: () => Promise<void>;
  selectCategory: (category: string) => Promise<void>;
  submitVote: (targetPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  updateSettings: (settings: GameSettings) => Promise<void>;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  setRoom: (room: GameRoom | null) => void;
  loading: boolean;
  error: Error | null;
  getPublicRooms: () => Promise<GameRoom[]>;
}; 