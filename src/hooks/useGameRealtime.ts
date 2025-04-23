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
  turn_timer?: number;
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
  discussion_timer: number;
  voting_timer: number;
  turn_timer: number;
  presenting_timer: number;
  max_players: number;
  discussion_time: number;
  game_mode: string;
  team_size: number;
  chaos_mode: boolean;
  presenting_time: number;
  voting_time: number;
  chameleon_count: number;
  player_count: number;
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
    team: player.team ? Number(player.team) : undefined,
    turn_timer: player.turn_timer || 0
  })) : [];

  return {
    id: room.id,
    state: room.state,
    settings: room.settings,
    players: mappedPlayers,
    category: categoryData || undefined,
    secret_word: room.secret_word || undefined,
    chameleon_id: room.chameleon_id || undefined,
    presenting_timer: room.presenting_timer || 0,
    discussion_timer: room.discussion_timer || 0,
    voting_timer: room.voting_timer || 0,
    current_turn: room.current_turn || 0,
    created_at: room.created_at,
    updated_at: room.updated_at,
    turn_order: room.turn_order || [],
    round: room.round || 1,
    max_rounds: room.max_rounds || 1,
    round_outcome: room.round_outcome || null,
    votes_tally: room.votes_tally || {},
    votes: room.votes || {},
    results: room.results || [],
    revealed_player_id: room.revealed_player_id || null,
    revealed_role: room.revealed_role || null,
    last_updated: room.last_updated || new Date().toISOString(),
    host_id: room.host_id || '',
    max_players: room.max_players || 10,
    discussion_time: room.discussion_time || 30,
    game_mode: room.game_mode || 'classic',
    team_size: room.team_size || 2,
    chaos_mode: room.chaos_mode || false,
    presenting_time: room.presenting_time || 30,
    voting_time: room.voting_time || 30,
    chameleon_count: room.chameleon_count || 1,
    player_count: room.players?.length || 0,
    turn_timer: room.turn_timer || 0,
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
          team: player.team ? Number(player.team) : undefined,
          turn_timer: player.turn_timer || 0
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
          
          // If this is a ready status change, update immediately
          if (payload.eventType === 'UPDATE' && 
              'is_ready' in payload.new && 
              'is_ready' in payload.old && 
              payload.new.is_ready !== payload.old.is_ready) {
            console.log('Ready status change detected in postgres:', {
              playerId: payload.new.id,
              newStatus: payload.new.is_ready,
              oldStatus: payload.old.is_ready
            });
            
            // Update local state immediately
            setRoom(prevRoom => {
              if (!prevRoom) return null;
              
              const updatedPlayers = prevRoom.players.map(player => 
                player.id === payload.new.id 
                  ? { ...player, is_ready: payload.new.is_ready }
                  : player
              );
              
              console.log('Updated players from postgres:', updatedPlayers.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready })));
              
              return {
                ...prevRoom,
                players: updatedPlayers,
                last_updated: new Date().toISOString()
              };
            });

            // Send broadcast to all clients
            const channel = supabase.channel(`room:${roomId}`);
            await channel.send({
              type: 'broadcast',
              event: 'sync',
              payload: {
                action: 'player_ready_changed',
                roomId: roomId,
                playerId: payload.new.id,
                isReady: payload.new.is_ready,
                timestamp: new Date().toISOString()
              }
            });
          }
          
          // Always fetch the latest data for any player change
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
          'player_left',
          'player_ready_changed'
        ];

        if (payload.payload?.action && criticalActions.includes(payload.payload.action)) {
          console.log('Critical action detected, forcing update:', payload.payload.action);
          
          // For player ready status changes, update immediately
          if (payload.payload.action === 'player_ready_changed') {
            const { playerId, isReady, timestamp } = payload.payload;
            console.log('Updating player ready status from broadcast:', { 
              playerId, 
              isReady, 
              timestamp,
              currentRoom: room ? {
                id: room.id,
                players: room.players.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready }))
              } : null
            });
            
            // Check if this is a newer update than what we have
            const currentTimestamp = room?.last_updated;
            if (currentTimestamp && timestamp && new Date(timestamp) <= new Date(currentTimestamp)) {
              console.log('Ignoring older update:', { currentTimestamp, newTimestamp: timestamp });
              return;
            }
            
            // Update local state immediately
            setRoom(prevRoom => {
              if (!prevRoom) {
                console.log('No previous room state to update');
                return null;
              }
              
              const updatedPlayers = prevRoom.players.map(player => {
                const isUpdated = player.id === playerId;
                console.log('Updating player:', { 
                  playerId: player.id, 
                  isUpdated, 
                  currentReady: player.is_ready,
                  newReady: isUpdated ? isReady : player.is_ready
                });
                return isUpdated 
                  ? { ...player, is_ready: isReady }
                  : player;
              });
              
              console.log('Updated players from broadcast:', updatedPlayers.map(p => ({ 
                id: p.id, 
                name: p.name, 
                is_ready: p.is_ready 
              })));
              
              const updatedRoom = {
                ...prevRoom,
                players: updatedPlayers,
                last_updated: timestamp || new Date().toISOString()
              };
              
              console.log('New room state:', {
                id: updatedRoom.id,
                players: updatedRoom.players.map(p => ({ 
                  id: p.id, 
                  name: p.name, 
                  is_ready: p.is_ready 
                }))
              });
              
              return updatedRoom;
            });

            // Force a re-fetch after a short delay to ensure consistency
            setTimeout(async () => {
              console.log('Forcing re-fetch after ready status change');
              const { data: roomData, error: fetchError } = await supabase
                .from('game_rooms')
                .select('*, players!players_room_id_fkey (*)')
                .eq('id', roomId)
                .single();

              if (fetchError) {
                console.error('Error fetching room after ready status change:', fetchError);
                return;
              }

              if (roomData) {
                console.log('Room data after ready status change:', {
                  id: roomData.id,
                  players: roomData.players.map((p: DatabasePlayer) => ({ 
                    id: p.id, 
                    name: p.name, 
                    is_ready: p.is_ready 
                  }))
                });
                const mappedRoom = mapRoomData(roomData as DatabaseRoom);
                setRoom(mappedRoom);
              }
            }, 100);
          } else {
            // For other actions, fetch the latest data
            await fetchRoomData();
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
  }, [roomId, fetchRoomData, room]);

  return { room, isLoading, error };
};