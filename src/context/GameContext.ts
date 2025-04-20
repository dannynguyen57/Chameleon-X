import { createContext } from 'react';
import { PlayerRole, GameSettings, GameRoom } from '@/lib/types';

export const DEFAULT_SETTINGS: GameSettings = {
  max_players: Number(import.meta.env.VITE_MAX_PLAYERS) || 10,
  discussion_time: 30,
  max_rounds: Number(import.meta.env.VITE_DEFAULT_MAX_ROUNDS) || 3,
  game_mode: 'classic',
  team_size: 2,
  chaos_mode: false,
  time_per_round: 30,
  voting_time: 30,
  roles: {
    classic: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Mimic],
    creative: [
      PlayerRole.Regular,
      PlayerRole.Chameleon,
      PlayerRole.Mimic,
      PlayerRole.Oracle,
      PlayerRole.Jester,
      PlayerRole.Spy,
      PlayerRole.Mirror,
      PlayerRole.Whisperer,
      PlayerRole.Timekeeper,
      PlayerRole.Illusionist,
      PlayerRole.Guardian,
      PlayerRole.Trickster
    ],
    team: [
      PlayerRole.Regular,
      PlayerRole.Chameleon,
      PlayerRole.Mimic,
      PlayerRole.Guardian
    ],
    chaos: [
      PlayerRole.Regular,
      PlayerRole.Chameleon,
      PlayerRole.Mimic,
      PlayerRole.Jester,
      PlayerRole.Spy,
      PlayerRole.Mirror
    ]
  },
  special_abilities: false
};

export type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string, settings: GameSettings) => Promise<GameRoom | null>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  selectCategory: (categoryName: string) => Promise<void>;
  submitVote: (targetPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => Promise<void>;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
  setRoom: (room: GameRoom | null) => void;
};

export const GameContext = createContext<GameContextType | null>(null); 