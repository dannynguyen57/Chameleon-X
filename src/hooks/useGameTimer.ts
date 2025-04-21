import { useState, useEffect, useCallback, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { GameState, GamePhase, PlayerRole } from '../lib/types';
import { useDebounce } from './useDebounce';

export const useGameTimer = () => {
  const { room, handleGameStateTransition } = useGame();
  const currentPlayer = room?.players.find(p => p.id === room.current_turn?.toString());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);
  
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const debouncedTimeLeft = useDebounce(timeLeft, 100);

  const startTimer = useCallback((duration: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeLeft(duration);
    setIsActive(true);
    startTimeRef.current = Date.now();
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsActive(false);
    startTimeRef.current = null;
  }, []);

  const resetTimer = useCallback((duration: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimeLeft(duration);
    setIsActive(false);
    startTimeRef.current = null;
  }, []);

  // Handle timer countdown
  useEffect(() => {
    if (!isActive || !room) return;

    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newTimeLeft = Math.max(0, timeLeft - elapsed);
        
        if (newTimeLeft <= 0) {
          stopTimer();
          
          // Handle state transitions based on current phase
          switch (room.current_phase) {
            case 'presenting':
              if (room.current_turn?.toString() === currentPlayer?.id) {
                handleGameStateTransition(GameState.Discussion);
              }
              break;
            case 'discussion':
              handleGameStateTransition(GameState.Voting);
              break;
            case 'voting':
              handleGameStateTransition(GameState.Results);
              break;
          }
        }
        
        setTimeLeft(newTimeLeft);
        startTimeRef.current = Date.now();
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isActive, room, currentPlayer, stopTimer, handleGameStateTransition, timeLeft]);

  // Initialize timer based on game state
  useEffect(() => {
    if (!room) return;

    switch (room.current_phase) {
      case 'presenting':
        if (room.current_turn?.toString() === currentPlayer?.id) {
          startTimer(room.settings.time_per_round);
        } else {
          stopTimer();
        }
        break;
      case 'discussion':
        startTimer(room.settings.discussion_time);
        break;
      case 'voting':
        startTimer(room.settings.voting_time);
        break;
      default:
        stopTimer();
    }
  }, [room, currentPlayer, startTimer, stopTimer]);

  // Sync timer with room state
  useEffect(() => {
    if (!room) return;
    
    // Only sync if the timer is not active or if the room timer is different
    if (!isActive || room.timer !== timeLeft) {
      setTimeLeft(room.timer || 0);
    }
  }, [room, timeLeft, isActive]);

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
