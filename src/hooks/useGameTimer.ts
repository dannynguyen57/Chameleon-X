import { useEffect, useRef, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { GameSettings } from '@/lib/types';

export const useGameTimer = (
  roomId: string | undefined,
  timer: number | undefined,
  gameState: string | undefined,
  settings: GameSettings | undefined
) => {
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<number>(Date.now());

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer for valid game states and when we have a room ID and timer
    if (timer && timer > 0 && roomId && (gameState === 'presenting' || gameState === 'voting')) {
      setRemainingTime(timer);
      lastUpdateRef.current = Date.now();

      timerRef.current = setInterval(async () => {
        const now = Date.now();
        const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);
        lastUpdateRef.current = now;

        setRemainingTime(prevTime => {
          if (!prevTime) return null;
          const newTime = prevTime - elapsed;
          
          if (newTime <= 0) {
            // Time's up, handle based on game state
            if (gameState === 'presenting') {
              // For presenting state, move to next player or voting
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
                      // Move to voting phase
                      supabase
                        .from('game_rooms')
                        .update({ 
                          state: 'voting',
                          timer: settings?.voting_time || 30,
                          current_turn: 0
                        })
                        .eq('id', roomId);
                    } else {
                      // Move to next player
                      supabase
                        .from('game_rooms')
                        .update({ 
                          current_turn: nextTurn,
                          timer: settings?.discussion_time || 60
                        })
                        .eq('id', roomId);
                    }
                  }
                });
            } else if (gameState === 'voting') {
              // For voting state, move to results
              supabase
                .from('game_rooms')
                .update({ 
                  state: 'results',
                  timer: 0
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
