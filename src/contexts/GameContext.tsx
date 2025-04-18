
import React, { createContext, useContext, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings } from '@/lib/types';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  discussionTime: 120,
  maxRounds: 3
};

type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  selectCategory: (categoryName: string) => Promise<void>;
  submitVote: (targetPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
};

const GameContext = createContext<GameContextType>(null!);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');

  const isPlayerChameleon = !!(room?.chameleonId && playerId === room.chameleonId);

  // Use our custom hooks
  useGameRealtime(room?.id, setRoom);
  const remainingTime = useGameTimer(room?.id, room?.timer, room?.state);
  const gameActions = useGameActions(playerId, room, settings);

  const value = {
    playerId,
    room,
    settings,
    ...gameActions,
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
