import { useEffect, useState, useCallback, useRef } from 'react';
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

  const safeDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toISOString();
    } catch (e) {
      return new Date().toISOString();
    }
  };

  // Sort players by their join order (using last_updated timestamp)
  const sortedPlayers = [...data.players].sort((a, b) => 
    new Date(a.last_updated).getTime() - new Date(b.last_updated).getTime()
  );

  return {
    ...data,
    players: sortedPlayers.map((player: DatabasePlayer) => ({
      id: player.id,
      name: player.name,
      room_id: player.room_id,
      role: player.role,
      isHost: player.is_host,
      turn_description: player.turn_description || '',
      vote: player.vote || null,
      last_active: safeDate(player.last_active),
      last_updated: safeDate(player.last_updated),
      severity: 0
    })),
    last_updated: safeDate(data.last_updated),
    created_at: safeDate(data.created_at),
    updated_at: safeDate(data.updated_at),
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
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<number>(0);

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
        const mappedRoom = mapRoomData(data as DatabaseRoom);
        setRoom(mappedRoom);
        setError(null);
        lastUpdateRef.current = Date.now();
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

    // Initial fetch
    fetchRoomData();

    // Setup realtime subscription
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

    const channel = supabase
      .channel(`room:${roomId}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
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
          // Only fetch if it's been more than 1 second since last update
          if (Date.now() - lastUpdateRef.current > 1000) {
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
          // Force immediate update for player changes
          await fetchRoomData();
        }
      )
      .on('broadcast', { event: 'sync' }, () => {
        console.log('Sync broadcast received');
        fetchRoomData();
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Force an immediate fetch after successful subscription
          fetchRoomData();
        }
      });

    channelRef.current = channel;

    // Add periodic sync check
    const syncInterval = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 5000) { // 5 seconds
        fetchRoomData();
      }
    }, 5000);

    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      clearInterval(syncInterval);
    };
  }, [roomId, fetchRoomData]);

  return { room, isLoading, error };
};