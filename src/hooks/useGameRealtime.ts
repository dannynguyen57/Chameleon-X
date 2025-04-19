import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameRoom, PlayerRole, GameState, GameMode } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';

interface DatabasePlayer {
  id: string;
  name: string;
  room_id: string;
  role?: PlayerRole;
  is_host: boolean;
  turn_description?: string;
  vote?: string;
  last_active: string;
  last_updated: string;
}

interface DatabaseRoom {
  id: string;
  host_id: string;
  state: GameState;
  round: number;
  created_at: string;
  updated_at: string;
  last_updated: string;
  max_players: number;
  discussion_time: number;
  max_rounds: number;
  game_mode: GameMode;
  team_size: number;
  chaos_mode: boolean;
  time_per_round: number;
  voting_time: number;
  settings?: {
    roles?: Record<string, string[]>;
    special_abilities?: boolean;
  };
  players: DatabasePlayer[];
  category?: string;
  secret_word?: string;
  chameleon_id?: string;
  timer?: number;
  current_turn?: number;
  turn_order?: string[];
}

export const mapRoomData = (data: DatabaseRoom): GameRoom => {
  if (!data) return null;

  return {
    ...data,
    players: data.players.map((player: DatabasePlayer) => ({
      id: player.id,
      name: player.name,
      room_id: player.room_id,
      role: player.role,
      isHost: player.is_host,
      turn_description: player.turn_description,
      vote: player.vote,
      last_active: new Date(player.last_active).toISOString(),
      last_updated: new Date(player.last_updated).toISOString()
    })),
    last_updated: new Date(data.last_updated).toISOString(),
    created_at: new Date(data.created_at).toISOString(),
    updated_at: new Date(data.updated_at).toISOString(),
    settings: {
      max_players: data.max_players,
      discussion_time: data.discussion_time,
      max_rounds: data.max_rounds,
      game_mode: data.game_mode,
      team_size: data.team_size,
      chaos_mode: data.chaos_mode,
      time_per_round: data.time_per_round,
      voting_time: data.voting_time,
      roles: data.settings?.roles || {},
      special_abilities: data.settings?.special_abilities || false
    }
  };
};

export const useGameRealtime = (roomId: string | undefined) => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;

    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (
            id,
            name,
            role,
            is_host,
            turn_description,
            vote,
            last_active,
            last_updated
          )
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;

      if (data) {
        setRoom(mapRoomData(data as DatabaseRoom));
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching room data:', err);
      setError('Failed to fetch room data');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch room data. Please try again."
      });
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const fetchWithRetry = async () => {
      while (mounted && retryCount < maxRetries) {
        try {
          await fetchRoomData();
          break;
        } catch (err) {
          retryCount++;
          if (retryCount === maxRetries) {
            console.error('Max retries reached:', err);
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    };

    fetchWithRetry();

    // Create a single channel for both room and player changes
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`
        },
        async (payload) => {
          console.log('Room change detected:', payload);
          if (mounted) {
            await fetchRoomData();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
        },
        async (payload) => {
          console.log('Player change detected:', payload);
          if (mounted) {
            await fetchRoomData();
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to room changes');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error('Subscription error:', status);
          // Attempt to resubscribe
          if (mounted) {
            setTimeout(() => {
              channel.subscribe();
            }, 1000);
          }
        }
      });

    return () => {
      mounted = false;
      channel.unsubscribe();
    };
  }, [roomId, fetchRoomData]);

  return { room, isLoading, error };
};