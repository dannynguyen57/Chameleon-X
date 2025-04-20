import { createContext, useContext } from 'react';
import { GameContextType } from './gameTypes';

export const GameContext = createContext<GameContextType>({} as GameContextType);

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}; 