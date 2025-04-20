import React, { useState, useCallback, useMemo, useRef, useEffect, useContext, createContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings, GameMode, PlayerRole, GameResultType } from '../lib/types';
import { useGameRealtime } from '../hooks/useGameRealtime';
import { mapRoomData } from '../hooks/useGameRealtime';
import { useGameTimer } from '../hooks/useGameTimer';
import { useGameActions } from '../hooks/useGameActions';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../components/ui/use-toast';
import { nanoid } from 'nanoid';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { GameContextType } from './gameTypes';

export const GameContext = createContext<GameContextType | null>(null);


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
  room_id: string;
}

interface DatabaseRoom {
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
}

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [playerId, setPlayerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const roomRef = useRef<GameRoom | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const isPlayerChameleon = useMemo(() => 
    Boolean(room?.chameleon_id && playerId === room.chameleon_id),
    [room?.chameleon_id, playerId]
  );

  const { createRoom: createRoomAction, joinRoom: joinRoomAction, startGame, selectCategory, submitVote, nextRound, leaveRoom: leaveRoomAction, resetGame, handleRoleAbility, setPlayerRole } = useGameActions(
    playerId,
    room,
    settings,
    setRoom
  );
  const remainingTime = useGameTimer(room?.id, room?.timer ?? undefined, room?.state, settings);

  const fetchRoom = useCallback(async () => {
    if (!room?.id) return;

    try {
      console.log('Fetching room data for:', room.id);
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players!players_room_id_fkey (*)
        `)
        .eq('id', room.id)
        .single();

      if (error) {
        console.error('Error fetching room:', error);
        toast({
          variant: "destructive",
          title: "Error fetching game data",
          description: "Could not retrieve the latest game data. Please refresh the page."
        });
        return;
      }

      if (data) {
        const mappedRoom = mapRoomData(data as unknown as DatabaseRoom);
        setRoom(mappedRoom as unknown as GameRoom);
        roomRef.current = mappedRoom as unknown as GameRoom;
      }
    } catch (error) {
      console.error('Error in fetchRoom:', error);
      toast({
        variant: "destructive",
        title: "Unexpected error",
        description: "An error occurred while refreshing game data."
      });
    }
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id) return;
    
    if (channelRef.current) {
      console.log('Cleaning up old subscription');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    console.log('Setting up realtime subscription for room:', room.id);

    const channel = supabase
      .channel(`room:${room.id}`, {
        config: {
          broadcast: { self: true },
          presence: { key: '' },
        },
      })
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'game_rooms',
          filter: `id=eq.${room.id}`
        }, 
        async (payload) => {
          console.log('Room change detected:', payload);
          await fetchRoom();
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'players',
          filter: `room_id=eq.${room.id}`
        }, 
        async (payload) => {
          console.log('Player change detected:', payload);
          await fetchRoom();
        }
      )
      .on('broadcast', { event: 'sync' }, async () => {
        console.log('Sync broadcast received');
        await fetchRoom();
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          fetchRoom();
        }
      });

    channelRef.current = channel;

    const syncInterval = setInterval(() => {
      fetchRoom();
    }, 2000);

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up subscription for room:', room.id);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(syncInterval);
    };
  }, [room?.id, fetchRoom]);

  const createRoom = useCallback(async (playerName: string, settings: GameSettings): Promise<string> => {
    const roomId = playerId.substring(0, 6).toUpperCase();
    await createRoomAction(playerName, settings, roomId);
    await fetchRoom();
    return roomId;
  }, [createRoomAction, fetchRoom, playerId]);

  const joinRoom = useCallback(async (roomId: string, playerName: string) => {
    const success = await joinRoomAction(roomId, playerName, setPlayerId);
    if (success) {
      await fetchRoom();
    }
  }, [joinRoomAction, fetchRoom, setPlayerId]);

  const leaveRoom = useCallback(async () => {
    if (!room?.id) return;
    await leaveRoomAction();
    setRoom(null);
  }, [room?.id, leaveRoomAction]);

  const value: GameContextType = useMemo(() => ({
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitVote,
    nextRound,
    leaveRoom,
    resetGame,
    handleRoleAbility,
    setPlayerRole,
    getPublicRooms: async (): Promise<GameRoom[]> => {
      try {
        const { data: rooms, error } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players!players_room_id_fkey (*)
          `)
          .eq('settings->is_public', true)
          .eq('state', 'lobby');

        if (error) {
          console.error('Error fetching public rooms:', error);
          return [];
        }

        return (rooms || []).map(room => mapRoomData(room as unknown as DatabaseRoom));
      } catch (error) {
        console.error('Error in getPublicRooms:', error);
        return [];
      }
    },
    updateSettings: async (newSettings: GameSettings) => {
      setSettings(newSettings);
      await fetchRoom();
    },
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName,
    setRoom,
    loading: false,
    error: null
  }), [
    playerId, room, settings, createRoom, joinRoom, startGame, selectCategory, submitVote, nextRound, leaveRoom, resetGame, handleRoleAbility, setPlayerRole,
    isPlayerChameleon, remainingTime, playerName, setSettings, setRoom, fetchRoom
  ]);

  const handleGameStateTransition = useCallback(async (newState: GameState) => {
    if (!room) return;

    const updates = {
      state: newState,
      timer: newState === 'selecting' ? 30 : undefined,
      current_turn: newState === 'selecting' ? 0 : undefined,
      secret_word: newState === 'selecting' ? undefined : room.secret_word,
      chameleon_id: newState === 'selecting' ? undefined : room.chameleon_id,
      last_updated: new Date().toISOString()
    };

    const { error } = await supabase
      .from('game_rooms')
      .update(updates)
      .eq('id', room.id);

    if (error) {
      console.error('Error transitioning game state:', error);
      throw error;
    }
  }, [room]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

GameProvider.displayName = 'GameProvider';
