import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameRoom, PlayerRole, GameState, GameMode, GameSettings, Player } from '@/lib/types';
import { GamePhase } from '@/types/GamePhase';
import { Room } from '@/types/Room';
import { toast } from '@/components/ui/use-toast';

interface DatabasePlayer {
  id: string;
  name: string;
  room_id: string;
  role?: PlayerRole;
  is_host: boolean;
  is_ready: boolean;
  turn_description?: string;
  vote?: string;
  last_active: string;
  last_updated: string;
  is_protected?: boolean | null;
  vote_multiplier?: number | null;
  special_word?: string | null;
  special_ability_used?: boolean | null;
}

export interface DatabaseRoom {
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
  settings?: GameSettings | null;
  players: DatabasePlayer[];
  category?: string;
  secret_word?: string;
  chameleon_id?: string;
  timer?: number;
  current_turn?: number;
  round_outcome?: string | null;
  votes_tally?: { [playerId: string]: number } | null;
  revealed_player_id?: string | null;
  revealed_role?: PlayerRole | null;
  turn_order?: string[];
}

const DEFAULT_SETTINGS_REALTIME: GameSettings = {
  max_players: 10,
  discussion_time: 30,
  max_rounds: 3,
  game_mode: 'classic',
  team_size: 2,
  chaos_mode: false,
  time_per_round: 30,
  voting_time: 30,
  roles: {
    classic: [PlayerRole.Regular, PlayerRole.Chameleon],
    creative: [
      PlayerRole.Regular,
      PlayerRole.Chameleon,
      PlayerRole.Mimic,
      PlayerRole.Oracle,
      PlayerRole.Jester,
      PlayerRole.Spy,
      PlayerRole.Mirror,
      PlayerRole.Whisperer,
      PlayerRole.Timekeeper,
      PlayerRole.Illusionist,
      PlayerRole.Guardian,
      PlayerRole.Trickster
    ],
    team: [
      PlayerRole.Regular,
      PlayerRole.Chameleon,
      PlayerRole.Mimic,
      PlayerRole.Guardian
    ],
    chaos: [
      PlayerRole.Regular,
      PlayerRole.Chameleon,
      PlayerRole.Mimic,
      PlayerRole.Jester,
      PlayerRole.Spy,
      PlayerRole.Mirror
    ]
  },
  special_abilities: false
};

export const mapRoomData = (data: DatabaseRoom): GameRoom => {
  const settings = data.settings ?? DEFAULT_SETTINGS_REALTIME;

  const mappedPlayers: GameRoom['players'] = data.players.map((player): GameRoom['players'][number] => ({
    id: player.id,
    name: player.name,
    is_host: player.is_host,
    is_ready: player.is_ready || false,
    vote: player.vote || null,
    role: player.role as PlayerRole | undefined,
    turn_description: player.turn_description || '',
    last_active: player.last_active || new Date().toISOString(),
    last_updated: player.last_updated || new Date().toISOString(),
    room_id: player.room_id,
    is_protected: player.is_protected ?? false,
    vote_multiplier: player.vote_multiplier ?? 1,
    special_word: player.special_word || undefined,
    special_ability_used: player.special_ability_used ?? false,
  }));

  return {
    id: data.id,
    host_id: data.host_id,
    state: data.state as GameState,
    round: data.round,
    created_at: data.created_at,
    updated_at: data.updated_at,
    last_updated: data.last_updated,
    max_players: data.max_players,
    discussion_time: data.discussion_time,
    max_rounds: data.max_rounds,
    game_mode: data.game_mode as GameMode,
    team_size: data.team_size,
    chaos_mode: data.chaos_mode,
    time_per_round: data.time_per_round,
    voting_time: data.voting_time,
    settings: {
      ...DEFAULT_SETTINGS_REALTIME,
      ...settings
    },
    players: mappedPlayers,
    category: data.category || undefined,
    secret_word: data.secret_word || undefined,
    chameleon_id: data.chameleon_id || undefined,
    timer: data.timer ?? undefined,
    current_turn: data.current_turn ?? 0,
    turn_order: data.turn_order || data.players.map(p => p.id),
    round_outcome: data.round_outcome,
    votes_tally: data.votes_tally,
    revealed_player_id: data.revealed_player_id,
    revealed_role: data.revealed_role as PlayerRole | null
  };
};

export const useGameRealtime = (roomId: string | undefined): { room: GameRoom | null; isLoading: boolean; error: string | null } => {
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const fetchRoomData = useCallback(async () => {
    if (!roomId) return;

    try {
      const { data, error: fetchErr } = await supabase
        .from('game_rooms')
        .select('*, players!players_room_id_fkey (*)')
        .eq('id', roomId)
        .single();

      if (fetchErr) throw fetchErr;

      if (data) {
        const mappedRoom = mapRoomData(data as DatabaseRoom);
        setRoom(mappedRoom as unknown as GameRoom);
        setError(null);
        lastUpdateRef.current = Date.now();
      }
    } catch (err) {
      const error = err as Error;
      console.error('Error fetching room data:', error);
      setError('Failed to fetch room data: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      setIsLoading(false);
      setRoom(null);
      return;
    }
    setIsLoading(true);
    fetchRoomData();

    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }

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
          fetchRoomData();
        }
      });

    channelRef.current = channel;

    const syncInterval = setInterval(() => {
      if (Date.now() - lastUpdateRef.current > 5000) {
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