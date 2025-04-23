import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { GameRoom, GameState, GameMode, GameSettings, Player, GameResultType, WordCategory } from '@/lib/types';
import { GamePhase, PlayerRole } from '../lib/types';
import { Room } from '@/types/Room';
import { toast } from '@/components/ui/use-toast';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { categories } from '@/lib/word-categories';

interface DatabasePlayer {
  id: string;
  name: string;
  role: PlayerRole;
  score: number;
  is_host: boolean;
  is_ready: boolean;
  is_protected: boolean;
  has_voted: boolean;
  word?: string;
  turn_description?: string;
  vote?: string;
  last_active: string;
  last_updated: string;
  vote_multiplier: number;
  special_word?: string;
  special_ability_used: boolean;
  timeout_at?: string;
  protected_player_id?: string;
  investigated_player_id?: string;
  revealed_role?: PlayerRole;
  team?: string;
  is_illusionist: boolean;
  can_see_word: boolean;
  created_at: string;
}

export interface DatabaseRoom {
  id: string;
  state: GameState;
  settings: GameSettings;
  players: DatabasePlayer[];
  category?: string;
  secret_word?: string;
  chameleon_id?: string;
  timer?: number;
  current_turn?: number;
  current_word?: string;
  created_at: string;
  updated_at: string;
  round?: number;
  round_outcome?: GameResultType | null;
  votes_tally?: Record<string, number> | null;
  votes?: Record<string, string>;
  results?: GameResultType[];
  revealed_player_id?: string | null;
  revealed_role?: PlayerRole | null;
  last_updated?: string;
  max_rounds?: number;
  host_id?: string;
  turn_order: string[];
  discussion_timer?: number;
}

// const DEFAULT_SETTINGS_REALTIME: GameSettings = {
//   max_players: 10,
//   discussion_time: 30,
//   max_rounds: 3,
//   game_mode: GameMode.Classic,
//   team_size: 2,
//   chaos_mode: false,
//   time_per_round: 30,
//   voting_time: 30,
//   roles: {
//     [GameMode.Classic]: [PlayerRole.Regular, PlayerRole.Chameleon],
//     [GameMode.Teams]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Guardian],
//     [GameMode.Chaos]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Mimic, PlayerRole.Jester, PlayerRole.Spy],
//     [GameMode.Timed]: [PlayerRole.Regular, PlayerRole.Chameleon]
//   },
//   special_abilities: false
// };

export const mapRoomData = (room: DatabaseRoom): GameRoom => {
  const categoryData = room.category ? categories.find(c => c.name === room.category) : undefined;

  // Ensure players array exists and is properly mapped
  const mappedPlayers = Array.isArray(room.players) ? room.players.map(player => ({
    ...player,
    role: player.role || PlayerRole.Regular,
    special_ability_used: player.special_ability_used || false,
    special_word: player.special_word || undefined,
    is_ready: player.is_ready || false,
    isProtected: player.is_protected || false,
    isInvestigated: false,
    isCurrentPlayer: false,
    isTurn: false,
    room_id: room.id,
    team: player.team ? Number(player.team) : undefined
  })) : [];

  return {
    id: room.id,
    state: room.state,
    settings: room.settings,
    players: mappedPlayers,
    category: categoryData || undefined,
    secret_word: room.secret_word || undefined,
    chameleon_id: room.chameleon_id || undefined,
    timer: room.timer || 0,
    discussion_timer: room.discussion_timer || 0,
    current_turn: room.current_turn || 0,
    current_word: room.current_word || undefined,
    created_at: room.created_at,
    updated_at: room.updated_at,
    turn_order: room.turn_order || [],
    round: room.round || 1,
    current_round: room.round || 1,
    round_outcome: room.round_outcome || null,
    votes_tally: room.votes_tally || null,
    votes: room.votes || {},
    results: room.results || [],
    revealed_player_id: room.revealed_player_id || null,
    revealed_role: room.revealed_role || null,
    last_updated: room.last_updated || new Date().toISOString(),
    max_rounds: room.max_rounds || 1,
    host_id: room.host_id || '',
    current_phase: room.state === GameState.Lobby ? 'lobby' :
                  room.state === GameState.Selecting ? 'selecting' :
                  room.state === GameState.Presenting ? 'presenting' :
                  room.state === GameState.Discussion ? 'discussion' :
                  room.state === GameState.Voting ? 'voting' :
                  room.state === GameState.Results ? 'results' :
                  'lobby'
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
      console.log('Fetching room data for room:', roomId);
      const { data, error: fetchErr } = await supabase
        .from('game_rooms')
        .select('*, players!players_room_id_fkey (*)')
        .eq('id', roomId)
        .single();

      if (fetchErr) {
        console.error('Error fetching room:', fetchErr);
        throw fetchErr;
      }

      if (data) {
        console.log('Raw room data received:', {
          id: data.id,
          state: data.state,
          players: data.players?.map((p: DatabasePlayer) => ({ id: p.id, name: p.name, is_host: p.is_host })),
          category: data.category,
          secret_word: data.secret_word
        });

        // Ensure players array exists and is properly mapped
        const mappedPlayers = Array.isArray(data.players) ? data.players.map((player: DatabasePlayer) => ({
          ...player,
          role: player.role || PlayerRole.Regular,
          special_ability_used: player.special_ability_used || false,
          special_word: player.special_word || undefined,
          is_ready: player.is_ready || false,
          isProtected: player.is_protected || false,
          isInvestigated: false,
          isCurrentPlayer: false,
          isTurn: false,
          room_id: data.id,
          team: player.team ? Number(player.team) : undefined
        })) : [];

        const mappedRoom = {
          ...data,
          players: mappedPlayers,
          category: data.category ? categories.find(c => c.name === data.category) : undefined,
          state: data.state,
          timer: data.timer || 0,
          discussion_timer: data.discussion_timer || 0,
          current_turn: data.current_turn || 0,
          round: data.round || 1,
          max_rounds: data.max_rounds || 1,
          votes: data.votes || {},
          results: data.results || [],
          last_updated: data.last_updated || new Date().toISOString()
        };

        console.log('Mapped room data:', {
          id: mappedRoom.id,
          state: mappedRoom.state,
          players: mappedRoom.players.map((p: Player) => ({ id: p.id, name: p.name, is_host: p.is_host })),
          category: mappedRoom.category,
          secret_word: mappedRoom.secret_word
        });

        setRoom(mappedRoom as unknown as GameRoom);
        setError(null);
        lastUpdateRef.current = Date.now();
      } else {
        console.log('No room data received');
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
      console.log('No roomId provided, clearing state');
      setIsLoading(false);
      setRoom(null);
      return;
    }

    console.log('Setting up realtime subscription for room:', roomId);
    setIsLoading(true);
    fetchRoomData();

    if (channelRef.current) {
      console.log('Unsubscribing from previous channel');
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
          console.log('Room change detected:', {
            event: payload.eventType,
            new: payload.new,
            old: payload.old
          });
          // Force immediate update for room changes
          await fetchRoomData();
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
          console.log('Player change detected:', {
            event: payload.eventType,
            new: payload.new,
            old: payload.old
          });
          // Force immediate update for player changes
          await fetchRoomData();
        }
      )
      .on('broadcast', { event: 'sync' }, async (payload) => {
        console.log('Sync broadcast received:', payload);
        
        // Define the actions that require immediate updates
        const criticalActions = [
          'category_selected',
          'game_state_changed',
          'game_started',
          'player_joined',
          'player_left'
        ];

        if (payload.payload?.action && criticalActions.includes(payload.payload.action)) {
          // Force immediate update
          await fetchRoomData();

          // Only fetch room data again if we have broadcast data
          if (payload.payload) {
            const { data: roomData, error: fetchError } = await supabase
              .from('game_rooms')
              .select('*, players!players_room_id_fkey (*)')
              .eq('id', roomId)
              .single();

            if (fetchError) {
              console.error('Error fetching room after broadcast:', fetchError);
              return;
            }

            if (roomData) {
              const mappedRoom = mapRoomData(roomData as DatabaseRoom);
              console.log('Updating room state with broadcast data:', {
                id: mappedRoom.id,
                state: mappedRoom.state,
                category: mappedRoom.category,
                currentTurn: mappedRoom.current_turn,
                turnOrder: mappedRoom.turn_order,
                players: mappedRoom.players.map(p => ({ id: p.id, name: p.name, role: p.role }))
              });
              
              // Update room state
              setRoom(mappedRoom);
              
              // Handle navigation for critical state changes
              const { action, roomId: broadcastRoomId } = payload.payload;
              if ((action === 'category_selected' || action === 'game_state_changed') && 
                  broadcastRoomId === roomId) {
                // Only navigate if not already on the game screen
                if (!window.location.pathname.includes(`/room/${roomId}`)) {
                  window.location.href = `/room/${roomId}`;
                }
              }
            }
          }
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          fetchRoomData();
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up realtime subscription');
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [roomId, fetchRoomData]);

  return { room, isLoading, error };
};