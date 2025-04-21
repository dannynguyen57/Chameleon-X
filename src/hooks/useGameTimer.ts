import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { GameState, GamePhase, PlayerRole } from '../lib/types';
import { useDebounce } from './useDebounce';

export const useGameTimer = () => {
  const { room, handleGameStateTransition } = useGame();
  const currentPlayer = room?.players.find(p => p.id === room.current_turn?.toString());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const debouncedTimeLeft = useDebounce(timeLeft, 100);

  const startTimer = useCallback((duration: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(duration);
    setIsActive(true);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
  }, []);

  const resetTimer = useCallback((duration: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(duration);
    setIsActive(false);
  }, []);

  useEffect(() => {
    if (!room || !currentPlayer) return;

    if (room.current_phase === 'presenting') {
      resetTimer(room.settings.time_per_round);
    } else {
      stopTimer();
    }
  }, [room, currentPlayer, room?.current_phase, resetTimer, stopTimer, room?.settings?.time_per_round]);

  useEffect(() => {
    if (!isActive || !room || !currentPlayer) return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setIsActive(false);
          
          if (room.current_phase === 'presenting' && room.current_turn?.toString() === currentPlayer.id) {
            handleGameStateTransition(GameState.Discussion);
          }
          
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, room, currentPlayer, handleGameStateTransition]);

  useEffect(() => {
    if (!room || !currentPlayer) return;

    if (room.current_phase === 'presenting' && 
        room.current_turn?.toString() === currentPlayer.id && 
        !isActive) {
      startTimer(room.settings.time_per_round);
    }
  }, [room, currentPlayer, isActive, startTimer]);

  return {
    timeLeft: debouncedTimeLeft,
    isActive,
    startTimer,
    stopTimer,
    resetTimer,
    formatTime: (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
  };
};
