import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../integrations/supabase/client';
import { GameRoom, GameSettings, GameState } from '../lib/types';

export const useGameTimer = (room: GameRoom | null, settings: GameSettings, setRoom: (room: GameRoom | null) => void) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout>();
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    if (room?.timer !== undefined) {
      setTimeLeft(room.timer || 0);
    }
  }, [room?.timer]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    if (duration <= 0) return;
    setIsActive(true);
    setTimeLeft(duration);
    lastUpdateRef.current = Date.now();

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(async () => {
      setTimeLeft(prev => {
        if (prev <= 0) {
          stopTimer();
          return 0;
        }
        return prev - 1;
      });

      // Only update database every 5 seconds to reduce load
      const now = Date.now();
      if (room && timeLeft > 0 && now - lastUpdateRef.current >= 5000) {
        try {
          const { error } = await supabase
            .from('game_rooms')
            .update({ 
              timer: timeLeft - 1,
              last_updated: new Date().toISOString()
            })
            .eq('id', room.id);

          if (error) {
            console.error('Error updating timer:', error);
            return;
          }
          
          // Update local room state
          setRoom({
            ...room,
            timer: timeLeft - 1,
            last_updated: new Date().toISOString()
          });
          
          lastUpdateRef.current = now;
        } catch (error) {
          console.error('Error in timer update:', error);
        }
      }
    }, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = undefined;
      }
    };
  }, [room, timeLeft, stopTimer, setRoom]);

  const resetTimer = useCallback(async (duration: number) => {
    setTimeLeft(duration);
    if (room) {
      try {
        const { error } = await supabase
          .from('game_rooms')
          .update({ 
            timer: duration,
            last_updated: new Date().toISOString()
          })
          .eq('id', room.id);

        if (error) {
          console.error('Error resetting timer:', error);
          return;
        }
        
        // Update local room state
        setRoom({
          ...room,
          timer: duration,
          last_updated: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error in timer reset:', error);
      }
    }
  }, [room, setRoom]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  useEffect(() => {
    if (room?.state === GameState.Presenting || room?.state === GameState.Discussion) {
      // Get the appropriate timer duration based on the phase
      const duration = room.state === GameState.Presenting 
        ? settings.time_per_round 
        : settings.discussion_time;
      
      // Only start if we have a valid duration
      if (duration > 0) {
        startTimer(duration);
      }
    } else {
      stopTimer();
    }

    return () => {
      stopTimer();
    };
  }, [room?.state, startTimer, stopTimer, settings.time_per_round, settings.discussion_time]);

  return { timeLeft, isActive, startTimer, stopTimer, resetTimer, formatTime };
};
