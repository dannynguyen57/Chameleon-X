import { createContext, useContext } from 'react';
import { GameContextType } from './gameTypes';
import { ExtendedGameRoom } from './GameContextProvider';

// Update the GameContextType to use ExtendedGameRoom
export interface ExtendedGameContextType extends Omit<GameContextType, 'room' | 'setRoom' | 'getPublicRooms'> {
  room: ExtendedGameRoom | null;
  setRoom: (room: ExtendedGameRoom | null) => void;
  getPublicRooms: () => Promise<ExtendedGameRoom[]>;
}

// Create the context with ExtendedGameContextType
export const GameContext = createContext<ExtendedGameContextType | null>(null);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}; 