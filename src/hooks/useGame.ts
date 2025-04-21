import { useContext } from 'react';
import { GameContext } from '@/contexts/gameContext';
import { GameContextType } from '@/contexts/gameTypes';

export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}; 