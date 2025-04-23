import { useState, useEffect, useRef, useCallback } from 'react';
import { GameRoom, GameSettings, GameState } from '../lib/types';
import { supabase } from '../integrations/supabase/client';

export const useGameTimer = (room: GameRoom | null, settings: GameSettings, setRoom: (room: GameRoom | null) => void) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastTimerValueRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.Selecting);
  const [roomId, setRoomId] = useState<string | null>(null);
  const updateIntervalRef = useRef<number>(5000); // Update database every 5 seconds
  const [currentPlayerTimer, setCurrentPlayerTimer] = useState<number>(0);

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

  // Handle individual player timers in presenting phase
  useEffect(() => {
    if (!room || room.state !== GameState.Presenting) {
      setCurrentPlayerTimer(0);
      return;
    }

    const currentPlayer = room.players[room.current_turn ?? 0];
    if (!currentPlayer) return;

    // Reset and start individual timer for current player
    setCurrentPlayerTimer(settings.time_per_round);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Start new timer
    const timer = setInterval(() => {
      setCurrentPlayerTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Store timer reference
    timerRef.current = timer;

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [room?.current_turn, room?.state, settings.time_per_round, room]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
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
      clearInterval(timerRef.current);
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
            const updateRoomState = async (newState: GameState, newTimer: number) => {
              try {
                const { error } = await supabase
                  .from('game_rooms')
                  .update({ 
                    state: newState,
                    timer: newTimer,
                    last_updated: new Date().toISOString()
                  })
                  .eq('id', room.id);

                if (error) {
                  console.error('Error updating room state:', error);
                  return;
                }

                setRoom({
                  ...room,
                  state: newState,
                  timer: newTimer,
                  last_updated: new Date().toISOString()
                });
              } catch (error) {
                console.error('Error in room state update:', error);
              }
            };

            // Handle state transitions based on current state
            const allPlayersSubmitted = room.players.every(p => p.turn_description);
            const currentTurnIndex = room.current_turn ?? 0;
            const nextTurnIndex = (currentTurnIndex + 1) % (room.turn_order?.length ?? 0);
            const nextPlayerId = room.turn_order?.[nextTurnIndex];
            const nextPlayerRoomIndex = room.players.findIndex(p => p.id === nextPlayerId);

            switch (room.state) {
              case GameState.Presenting:
                // In presenting phase, always move to next player or discussion
                if (!allPlayersSubmitted) {
                  // Move to next player's turn
                  try {
                    // Mark current player's turn as skipped
                    const currentPlayer = room.players[room.current_turn ?? 0];
                    if (currentPlayer) {
                      await supabase
                        .from('players')
                        .update({ 
                          turn_description: "[Skipped Turn]",
                          last_updated: new Date().toISOString()
                        })
                        .eq('id', currentPlayer.id)
                        .eq('room_id', room.id);
                    }

                    // Update room state for next turn
                    const { error } = await supabase
                      .from('game_rooms')
                      .update({ 
                        current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                        timer: settings.time_per_round,
                        last_updated: new Date().toISOString()
                      })
                      .eq('id', room.id);

                    if (error) {
                      console.error('Error updating turn:', error);
                      return;
                    }

                    setRoom({
                      ...room,
                      current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                      timer: settings.time_per_round,
                      last_updated: new Date().toISOString()
                    });
                  } catch (error) {
                    console.error('Error in turn update:', error);
                  }
                } else {
                  // All players have submitted, move to discussion phase
                  await updateRoomState(GameState.Discussion, settings.discussion_time);
                }
                break;

              case GameState.Discussion:
                // Move to voting phase when discussion timer hits zero
                await updateRoomState(GameState.Voting, settings.voting_time);
                break;

              case GameState.Voting:
                // Move to results phase when voting timer hits zero
                await updateRoomState(GameState.Results, 0);
                break;

              default:
                // For other phases, just update the timer
                await updateRoomState(room.state, 0);
                break;
            }
          }
        } else {
          timerRef.current = setTimeout(updateTimer, 1000);
        }
      } else {
        timerRef.current = setTimeout(updateTimer, 1000);
      }
    };

    timerRef.current = setTimeout(updateTimer, 1000);

    // Cleanup on unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
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

  return { 
    timeLeft: room?.state === GameState.Presenting ? currentPlayerTimer : timeLeft, 
    isActive, 
    startTimer, 
    stopTimer, 
    resetTimer, 
    formatTime 
  };
};
