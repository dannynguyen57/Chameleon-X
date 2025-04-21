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
  const isUpdatingRef = useRef<boolean>(false);

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Only start timer for valid game states and when we have a room ID and timer
    if (timer && timer > 0 && roomId && (gameState === 'selecting' || gameState === 'presenting' || gameState === 'voting' || gameState === 'discussion')) {
      setRemainingTime(timer);
      lastUpdateRef.current = Date.now();

      timerRef.current = setInterval(async () => {
        if (isUpdatingRef.current) return; // Prevent concurrent updates
        
        const now = Date.now();
        const elapsed = Math.floor((now - lastUpdateRef.current) / 1000);
        lastUpdateRef.current = now;

        const newTime = (remainingTime || 0) - elapsed;
        setRemainingTime(newTime);
        
        // Update the timer in the database only when it changes significantly
        if (newTime > 0 && newTime % 5 === 0) { // Update every 5 seconds
          isUpdatingRef.current = true;
          try {
            await supabase
              .from('game_rooms')
              .update({ timer: newTime })
              .eq('id', roomId);
          } catch (error) {
            console.error('Error updating timer:', error);
          } finally {
            isUpdatingRef.current = false;
          }
        } else if (newTime <= 0) {
          // Time's up, handle based on game state
          isUpdatingRef.current = true;
          try {
            if (gameState === 'presenting') {
              // For presenting state, move to next player or discussion
              const { data, error } = await supabase
                .from('game_rooms')
                .select('current_turn, players!players_room_id_fkey (*)')
                .eq('id', roomId)
                .single();

              if (error) {
                console.error('Error fetching room data:', error);
                return;
              }

              if (data) {
                const currentTurn = data.current_turn || 0;
                const nextTurn = currentTurn + 1;
                const isLastPlayer = nextTurn >= (data.players?.length || 0);

                if (isLastPlayer) {
                  // Move to discussion phase
                  await supabase
                    .from('game_rooms')
                    .update({ 
                      state: 'discussion',
                      timer: settings?.discussion_time || 30,
                      current_turn: 0
                    })
                    .eq('id', roomId);
                } else {
                  // Move to next player
                  await supabase
                    .from('game_rooms')
                    .update({ 
                      current_turn: nextTurn,
                      timer: settings?.time_per_round || 30
                    })
                    .eq('id', roomId);
                }
              }
            } else if (gameState === 'discussion') {
              // Move to voting phase when discussion time is up
              await supabase
                .from('game_rooms')
                .update({ 
                  state: 'voting',
                  timer: settings?.voting_time || 30,
                  current_turn: 0
                })
                .eq('id', roomId);
            } else if (gameState === 'voting') {
              // Move to results phase when voting time is up
              const { data: players, error: playersError } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', roomId);

              if (!playersError && players) {
                const votes: Record<string, number> = {};
                players.forEach(player => {
                  if (player.vote && !player.is_protected) {
                    votes[player.vote] = (votes[player.vote] || 0) + (player.vote_multiplier || 1);
                  }
                });

                // Find the most voted player
                let maxVotes = 0;
                let mostVotedId: string | null = null;
                let isTie = false;

                Object.entries(votes).forEach(([playerId, voteCount]) => {
                  if (voteCount > maxVotes) {
                    maxVotes = voteCount;
                    mostVotedId = playerId;
                    isTie = false;
                  } else if (voteCount === maxVotes) {
                    isTie = true;
                  }
                });

                // Update game room with voting results
                await supabase
                  .from('game_rooms')
                  .update({ 
                    state: 'results',
                    timer: 30,
                    current_turn: 0,
                    votes_tally: votes,
                    revealed_player_id: isTie ? null : mostVotedId,
                    revealed_role: isTie ? null : players.find(p => p.id === mostVotedId)?.role || null,
                    round_outcome: isTie ? 'tie' : 'vote_complete'
                  })
                  .eq('id', roomId);
              }
            } else if (gameState === 'selecting') {
              // Move to presenting phase when selection time is up
              await supabase
                .from('game_rooms')
                .update({ 
                  state: 'presenting',
                  timer: settings?.time_per_round || 30,
                  current_turn: 0
                })
                .eq('id', roomId);
            }
          } catch (error) {
            console.error('Error handling timer expiration:', error);
          } finally {
            isUpdatingRef.current = false;
          }
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [roomId, timer, gameState, settings, remainingTime]);

  return remainingTime;
};
