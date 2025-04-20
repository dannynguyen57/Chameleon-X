import { createContext } from 'react';
import { GameRoom, GameSettings } from '@/lib/types';

export interface GameContextType {
  room: GameRoom | null;
  settings: GameSettings;
  playerId: string;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  createRoom: (playerName: string) => Promise<string>;
  joinRoom: (roomId: string, playerName: string) => Promise<void>;
  startGame: () => Promise<void>;
  submitWord: (word: string) => Promise<boolean>;
  submitVote: (votedPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  updateSettings: (newSettings: GameSettings) => Promise<void>;
  handleRoleAbility: (targetPlayerId: string | null) => Promise<void>;
  resetGame: () => Promise<void>;
  setRoom: (room: GameRoom | null) => void;
  setPlayerId: (id: string) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export default GameContext; 