import { useState, useEffect, useRef, useCallback } from 'react';
import { GameRoom, GameSettings, GameState } from '../lib/types';
import { supabase } from '../integrations/supabase/client';

export const useGameTimer = (room: GameRoom | null, settings: GameSettings, setRoom: (room: GameRoom | null) => void) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastTimerValueRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.Selecting);
  const [roomId, setRoomId] = useState<string | null>(null);
  const updateIntervalRef = useRef<number>(5000); // Update database every 5 seconds

  // Update local timer state when room timer changes
  useEffect(() => {
    if (!room) return;

    // Reset timer when game state changes
    if (room.state !== gameState) {
      setTimeLeft(room.timer ?? 0);
      setGameState(room.state);
    }

    // Start timer based on game state
    if (room.timer && room.timer > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [room, gameState]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    if (duration <= 0) return;
    setIsActive(true);
    setTimeLeft(duration);
    lastUpdateRef.current = Date.now();
    lastTimerValueRef.current = duration;

    if (timerRef.current) {
      cancelAnimationFrame(timerRef.current);
    }

    // Use requestAnimationFrame for smoother updates
    let lastFrameTime = Date.now();
    const updateTimer = async () => {
      const now = Date.now();
      const elapsed = Math.floor((now - lastFrameTime) / 1000);
      if (elapsed >= 1) {
        const newTimeLeft = Math.max(0, lastTimerValueRef.current - elapsed);
        setTimeLeft(newTimeLeft);
        lastTimerValueRef.current = newTimeLeft;
        lastFrameTime = now;

        // Update database less frequently
        if (now - lastUpdateRef.current >= updateIntervalRef.current) {
          if (room && newTimeLeft > 0) {
            try {
              const { error } = await supabase
                .from('game_rooms')
                .update({ 
                  timer: newTimeLeft,
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
                timer: newTimeLeft,
                last_updated: new Date().toISOString()
              });
              
              lastUpdateRef.current = now;
            } catch (error) {
              console.error('Error in timer update:', error);
            }
          }
        }

        if (newTimeLeft <= 0) {
          stopTimer();
          // When timer reaches 0, trigger state transition
          if (room) {
            // For presenting phase, check if all players have submitted
            if (room.state === GameState.Presenting) {
              const allPlayersSubmitted = room.players.every(p => p.turn_description);
              if (!allPlayersSubmitted) {
                // Move to next player's turn
                const currentTurnIndex = room.current_turn ?? 0;
                const nextTurnIndex = (currentTurnIndex + 1) % (room.turn_order?.length ?? 0);
                const nextPlayerId = room.turn_order?.[nextTurnIndex];
                const nextPlayerRoomIndex = room.players.findIndex(p => p.id === nextPlayerId);

                supabase
                  .from('game_rooms')
                  .update({ 
                    current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                    timer: settings.time_per_round,
                    last_updated: new Date().toISOString()
                  })
                  .eq('id', room.id)
                  .then(({ error: turnError }) => {
                    if (turnError) {
                      console.error('Error updating turn:', turnError);
                      return;
                    }

                    setRoom({
                      ...room,
                      current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                      timer: settings.time_per_round,
                      last_updated: new Date().toISOString()
                    });
                  });
              } else {
                // All players have submitted, move to discussion phase
                supabase
                  .from('game_rooms')
                  .update({ 
                    state: GameState.Discussion,
                    timer: settings.discussion_time,
                    last_updated: new Date().toISOString()
                  })
                  .eq('id', room.id)
                  .then(({ error: stateError }) => {
                    if (stateError) {
                      console.error('Error updating state:', stateError);
                      return;
                    }

                    setRoom({
                      ...room,
                      state: GameState.Discussion,
                      timer: settings.discussion_time,
                      last_updated: new Date().toISOString()
                    });
                  });
              }
            } else if (room.state === GameState.Discussion) {
              // Move to voting phase when discussion timer hits zero
              supabase
                .from('game_rooms')
                .update({ 
                  state: GameState.Voting,
                  timer: settings.voting_time,
                  last_updated: new Date().toISOString()
                })
                .eq('id', room.id)
                .then(({ error: stateError }) => {
                  if (stateError) {
                    console.error('Error updating state:', stateError);
                    return;
                  }

                  setRoom({
                    ...room,
                    state: GameState.Voting,
                    timer: settings.voting_time,
                    last_updated: new Date().toISOString()
                  });
                });
            } else if (room.state === GameState.Voting) {
              // Move to results phase when voting timer hits zero
              supabase
                .from('game_rooms')
                .update({ 
                  state: GameState.Results,
                  timer: 0,
                  last_updated: new Date().toISOString()
                })
                .eq('id', room.id)
                .then(({ error: stateError }) => {
                  if (stateError) {
                    console.error('Error updating state:', stateError);
                    return;
                  }

                  setRoom({
                    ...room,
                    state: GameState.Results,
                    timer: 0,
                    last_updated: new Date().toISOString()
                  });
                });
            } else {
              // For other phases, just update the timer
              supabase
                .from('game_rooms')
                .update({ 
                  timer: 0,
                  last_updated: new Date().toISOString()
                })
                .eq('id', room.id)
                .then(({ error }) => {
                  if (error) {
                    console.error('Error updating timer at 0:', error);
                    return;
                  }

                  setRoom({
                    ...room,
                    timer: 0,
                    last_updated: new Date().toISOString()
                  });
                });
            }
          }
        } else {
          timerRef.current = requestAnimationFrame(updateTimer);
        }
      } else {
        timerRef.current = requestAnimationFrame(updateTimer);
      }
    };

    timerRef.current = requestAnimationFrame(updateTimer);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        cancelAnimationFrame(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [room, stopTimer, setRoom, settings]);

  const resetTimer = useCallback(async (duration: number) => {
    setTimeLeft(duration);
    lastTimerValueRef.current = duration;
    lastUpdateRef.current = Date.now();
    
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

  // Update database when timer changes
  useEffect(() => {
    if (!room || !roomId) return;

    const updateTimer = async () => {
      try {
        await supabase
          .from('game_rooms')
          .update({
            timer: timeLeft,
            last_updated: new Date().toISOString(),
            updated_at: new Date().toISOString() // Force real-time update
          })
          .eq('id', roomId);
      } catch (error) {
        console.error('Error updating timer:', error);
      }
    };

    // Only update if timer has changed significantly
    if (Math.abs(timeLeft - (room.timer ?? 0)) >= 5) {
      updateTimer();
    }
  }, [timeLeft, room, roomId]);

  return { timeLeft, isActive, startTimer, stopTimer, resetTimer, formatTime };
};
