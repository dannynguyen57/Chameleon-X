import { useEffect, useRef, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { GameSettings, GameState } from '@/lib/types';

export const useGameTimer = (
  roomId: string | undefined,
  timer: number | undefined,
  gameState: GameState | undefined,
  settings: GameSettings | undefined
) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const lastDbUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer for valid game states and when we have a room ID and timer
    if (timer && timer > 0 && roomId && (gameState === 'presenting' || gameState === 'voting' || gameState === 'discussion')) {
      setRemainingTime(timer);
      lastUpdateRef.current = Date.now();
      lastDbUpdateRef.current = Date.now();

      timerRef.current = setInterval(async () => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);
        const dbUpdateElapsed = Math.floor((now - lastDbUpdateRef.current) / 1000);
        lastUpdateRef.current = now;

        setRemainingTime(prevTime => {
          if (!prevTime) return null;
          const newTime = prevTime - elapsed;
          
          // Update the timer in the database less frequently (every 5 seconds)
          // or when time is running low (< 10 seconds) or about to expire
          if (dbUpdateElapsed >= 5 || newTime <= 10 || (prevTime > 0 && newTime <= 0)) {
            lastDbUpdateRef.current = now;
            supabase
              .from('game_rooms')
              .update({ timer: newTime })
              .eq('id', roomId)
              .then(({ error }) => {
                if (error) {
                  console.error('Error updating timer:', error);
                }
              });
          }
          
          if (newTime <= 0) {
            // Time's up, handle based on game state
            if (gameState === 'presenting') {
              // For presenting state, move to next player or discussion
              supabase
                .from('game_rooms')
                .select('current_turn, players, state')
                .eq('id', roomId)
                .single()
                .then(({ data, error }) => {
                  if (error) {
                    console.error('Error fetching room data:', error);
                    return;
                  }

                  if (data) {
                    const currentTurn = data.current_turn || 0;
                    const nextTurn = currentTurn + 1;
                    const isLastPlayer = nextTurn >= data.players.length;

                    if (isLastPlayer) {
                      // Move to discussion phase
                      supabase
                        .from('game_rooms')
                        .update({ 
                          state: 'discussion',
                          timer: settings?.discussion_time || 30,
                          current_turn: 0
                        })
                        .eq('id', roomId);
                    } else {
                      // Move to next player
                      supabase
                        .from('game_rooms')
                        .update({ 
                          current_turn: nextTurn,
                          timer: settings?.time_per_round || 30
                        })
                        .eq('id', roomId);
                    }
                  }
                });
            } else if (gameState === 'discussion') {
              // Move to voting phase when discussion time is up
              supabase
                .from('game_rooms')
                .update({ 
                  state: 'voting',
                  timer: settings?.voting_time || 30,
                  current_turn: 0
                })
                .eq('id', roomId);
            } else if (gameState === 'voting') {
              // Move to results phase when voting time is up
              supabase
                .from('game_rooms')
                .update({ 
                  state: 'results',
                  timer: null
                })
                .eq('id', roomId);
            }
            return 0;
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [roomId, timer, gameState, settings]);

  return remainingTime;
};
