import { useState, useEffect, useRef, useCallback } from 'react';
import { GameRoom, GameSettings, GameState } from '../lib/types';
import { supabase } from '../integrations/supabase/client';
import { ExtendedGameRoom } from '../contexts/GameContextProvider';

export const useGameTimer = (room: ExtendedGameRoom | null, settings: GameSettings, setRoom: (room: ExtendedGameRoom | null) => void) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(false);
  const mainTimerRef = useRef<NodeJS.Timeout | null>(null);
  const playerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastTimerValueRef = useRef<number>(0);
  const [gameState, setGameState] = useState<GameState>(GameState.Selecting);
  const [roomId, setRoomId] = useState<string | null>(null);
  const updateIntervalRef = useRef<number>(5000); // Update database every 5 seconds
  const [currentPlayerTimer, setCurrentPlayerTimer] = useState<number>(0);

  // Update local timer state when room timer changes
  useEffect(() => {
    if (!room) return;

    // Clear any existing timer
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = null;
    }

    // Get the appropriate timer based on game state
    let currentTimer = 0;
    switch (room.state) {
      case 'presenting':
        currentTimer = room.turn_timer ?? room.settings.presenting_time;
        break;
      case 'discussion':
        currentTimer = room.discussion_timer ?? room.settings.discussion_time;
        break;
      case 'voting':
        currentTimer = room.voting_timer ?? room.settings.voting_time;
        break;
      default:
        currentTimer = 0;
    }

    setTimeLeft(currentTimer);

    // Start the timer if we have time remaining
    if (currentTimer > 0) {
      mainTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 0) {
            if (mainTimerRef.current) {
              clearInterval(mainTimerRef.current);
              mainTimerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (mainTimerRef.current) {
        clearInterval(mainTimerRef.current);
        mainTimerRef.current = null;
      }
    };
  }, [room, room?.state, room?.turn_timer, room?.discussion_timer, room?.voting_timer]);

  // Handle individual player timers in presenting phase
  useEffect(() => {
    if (!room || room.state !== GameState.Presenting) {
      setCurrentPlayerTimer(0);
      return;
    }

    const currentPlayer = room.players[room.current_turn ?? 0];
    if (!currentPlayer) return;

    // Reset and start individual timer for current player
    setCurrentPlayerTimer(room.settings.presenting_time);
    
    // Clear any existing timer
    if (playerTimerRef.current) {
      clearInterval(playerTimerRef.current);
      playerTimerRef.current = null;
    }

    // Start new timer
    playerTimerRef.current = setInterval(() => {
      setCurrentPlayerTimer((prev) => {
        if (prev <= 1) {
          if (playerTimerRef.current) {
            clearInterval(playerTimerRef.current);
            playerTimerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (playerTimerRef.current) {
        clearInterval(playerTimerRef.current);
        playerTimerRef.current = null;
      }
    };
  }, [room, room?.current_turn, room?.state, room?.settings.presenting_time, room?.players]);

  const stopTimer = useCallback(() => {
    setIsActive(false);
    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = null;
    }
    if (playerTimerRef.current) {
      clearInterval(playerTimerRef.current);
      playerTimerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    if (duration <= 0) return;
    setIsActive(true);
    setTimeLeft(duration);
    lastUpdateRef.current = Date.now();
    lastTimerValueRef.current = duration;

    if (mainTimerRef.current) {
      clearInterval(mainTimerRef.current);
      mainTimerRef.current = null;
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
              const updates: Partial<ExtendedGameRoom> = {
                last_updated: new Date().toISOString()
              };

              // Update the appropriate timer based on game state
              switch (room.state) {
                case 'presenting':
                  updates.presenting_timer = newTimeLeft;
                  break;
                case 'discussion':
                  updates.discussion_timer = newTimeLeft;
                  break;
                case 'voting':
                  updates.voting_timer = newTimeLeft;
                  break;
              }

              const { error } = await supabase
                .from('game_rooms')
                .update(updates)
                .eq('id', room.id);

              if (error) {
                console.error('Error updating timer:', error);
                return;
              }
              
              // Update local room state
              setRoom({
                ...room,
                ...updates
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
            const handleStateTransition = async (newState: GameState) => {
              if (!room) return;

              const updates: Partial<ExtendedGameRoom> = {
                state: newState,
                last_updated: new Date().toISOString()
              };

              // Set appropriate timers based on the game state
              switch (newState) {
                case 'presenting':
                  updates.presenting_timer = room.settings.presenting_time;
                  break;
                case 'discussion':
                  updates.discussion_timer = room.settings.discussion_time;
                  break;
                case 'voting':
                  updates.voting_timer = room.settings.voting_time;
                  break;
              }

              try {
                await supabase
                  .from('game_rooms')
                  .update(updates)
                  .eq('id', room.id);

                setRoom({
                  ...room,
                  ...updates
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
                    await supabase
                      .from('game_rooms')
                      .update({ 
                        current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                        presenting_timer: settings.presenting_time,
                        last_updated: new Date().toISOString()
                      })
                      .eq('id', room.id);

                    // Update local state
                    setRoom({
                      ...room,
                      current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                      presenting_timer: settings.presenting_time,
                      last_updated: new Date().toISOString()
                    });
                  } catch (error) {
                    console.error('Error in turn update:', error);
                  }
                } else {
                  // All players have submitted, move to discussion phase
                  await handleStateTransition(GameState.Discussion);
                }
                break;

              case GameState.Discussion:
                // Move to voting phase when discussion timer hits zero
                await handleStateTransition(GameState.Voting);
                break;

              case GameState.Voting:
                // Move to results phase when voting timer hits zero
                await handleStateTransition(GameState.Results);
                break;

              default:
                // For other phases, just update the timer
                await handleStateTransition(room.state);
                break;
            }
          }
        } else {
          mainTimerRef.current = setTimeout(updateTimer, 1000);
        }
      } else {
        mainTimerRef.current = setTimeout(updateTimer, 1000);
      }
    };

    mainTimerRef.current = setTimeout(updateTimer, 1000);

    // Cleanup on unmount
    return () => {
      if (mainTimerRef.current) {
        clearInterval(mainTimerRef.current);
        mainTimerRef.current = null;
      }
    };
  }, [room, stopTimer, setRoom, settings]);

  const resetTimer = useCallback(async (duration: number) => {
    setTimeLeft(duration);
    lastTimerValueRef.current = duration;
    lastUpdateRef.current = Date.now();
    
    if (room) {
      try {
        const updates: Partial<ExtendedGameRoom> = {
          last_updated: new Date().toISOString()
        };

        // Set the appropriate timer based on game state
        switch (room.state) {
          case 'presenting':
            updates.presenting_timer = duration;
            break;
          case 'discussion':
            updates.discussion_timer = duration;
            break;
          case 'voting':
            updates.voting_timer = duration;
            break;
        }

        await supabase
          .from('game_rooms')
          .update(updates)
          .eq('id', room.id);

        // Update local state
        setRoom({
          ...room,
          ...updates
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
        const updates: Partial<ExtendedGameRoom> = {
          last_updated: new Date().toISOString()
        };

        // Update the appropriate timer based on game state
        switch (room.state) {
          case 'presenting':
            updates.presenting_timer = timeLeft;
            break;
          case 'discussion':
            updates.discussion_timer = timeLeft;
            break;
          case 'voting':
            updates.voting_timer = timeLeft;
            break;
        }

        await supabase
          .from('game_rooms')
          .update(updates)
          .eq('id', roomId);

        // Update local state
        setRoom({
          ...room,
          ...updates
        });
      } catch (error) {
        console.error('Error updating timer:', error);
      }
    };

    // Only update if timer has changed significantly
    const currentTimer = room.state === 'presenting' ? room.presenting_timer :
                        room.state === 'discussion' ? room.discussion_timer :
                        room.state === 'voting' ? room.voting_timer : 0;

    if (Math.abs(timeLeft - (currentTimer ?? 0)) >= 5) {
      updateTimer();
    }
  }, [timeLeft, room, roomId, setRoom]);

  return { 
    timeLeft: room?.state === GameState.Presenting ? currentPlayerTimer : timeLeft, 
    isActive, 
    startTimer, 
    stopTimer, 
    resetTimer, 
    formatTime 
  };
};
