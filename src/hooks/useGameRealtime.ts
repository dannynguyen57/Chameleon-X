import { useEffect, useCallback, useRef } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { GameRoom, Player, GameState, GameMode } from '@/lib/types';

type DatabasePlayer = {
  id: string;
  name: string;
  is_host: boolean;
  vote: string | null;
};

type DatabaseRoom = {
  id: string;
  host_id: string;
  players: DatabasePlayer[];
  state: string;
  category: string | null;
  secret_word: string | null;
  chameleon_id: string | null;
  timer: number | null;
  round: number;
  max_rounds: number;
  max_players: number;
  discussion_time: number;
  game_mode: string;
  team_size: number;
  chaos_mode: boolean;
  time_per_round: number;
  voting_time: number;
};

export const mapRoomData = (roomData: DatabaseRoom): GameRoom => {
  const mappedPlayers: Player[] = roomData.players.map((player: DatabasePlayer) => ({
    id: player.id,
    name: player.name,
    isHost: player.is_host,
    vote: player.vote
  }));

  return {
    id: roomData.id,
    hostId: roomData.host_id,
    players: mappedPlayers,
    state: roomData.state as GameState,
    category: roomData.category || undefined,
    secretWord: roomData.secret_word || undefined,
    chameleonId: roomData.chameleon_id || undefined,
    timer: roomData.timer || undefined,
    round: roomData.round,
    maxRounds: roomData.max_rounds,
    settings: {
      maxPlayers: roomData.max_players,
      discussionTime: roomData.discussion_time,
      maxRounds: roomData.max_rounds,
      gameMode: roomData.game_mode as GameMode,
      teamSize: roomData.team_size,
      chaosMode: roomData.chaos_mode,
      timePerRound: roomData.time_per_round,
      votingTime: roomData.voting_time
    }
  };
};

export const useGameRealtime = (
  roomId: string | undefined,
  setRoom: (room: GameRoom | null) => void
) => {
  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;

    try {
      const { data: roomData, error } = await supabase
        .from('game_rooms')
        .select('*, players(*)')
        .eq('id', roomId)
        .single();

      if (error) {
        console.error('Error fetching room data:', error);
        return;
      }

      if (roomData) {
        const mappedRoom = mapRoomData(roomData);
        setRoom(mappedRoom);
      }
    } catch (error) {
      console.error('Error in fetchRoomData:', error);
    }
  }, [roomId, setRoom]);

  const roomChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const playersChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const isSubscribedRef = useRef(false);

  useEffect(() => {
    if (!roomId || isSubscribedRef.current) return;

    // Initial fetch
    fetchRoomData();

    // Cleanup previous subscriptions
    if (roomChannelRef.current) {
      roomChannelRef.current.unsubscribe();
    }
    if (playersChannelRef.current) {
      playersChannelRef.current.unsubscribe();
    }

    // Set up realtime subscription for room changes
    roomChannelRef.current = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('Room update received:', payload);
          await fetchRoomData();
        }
      )
      .subscribe();

    // Set up realtime subscription for player changes
    playersChannelRef.current = supabase
      .channel(`players:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          console.log('Player update received:', payload);
          await fetchRoomData();
        }
      )
      .subscribe();

    isSubscribedRef.current = true;

    return () => {
      if (roomChannelRef.current) {
        roomChannelRef.current.unsubscribe();
      }
      if (playersChannelRef.current) {
        playersChannelRef.current.unsubscribe();
      }
      isSubscribedRef.current = false;
    };
  }, [roomId, fetchRoomData]);
};
