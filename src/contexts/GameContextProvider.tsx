import React, { useState, useCallback, useMemo, useRef, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings, PlayerRole, GameResultType, GameMode } from '../lib/types';
import { mapRoomData, DatabaseRoom } from '../hooks/useGameRealtime';
import { useGameTimer } from '../hooks/useGameTimer';
import { useGameActions } from '../hooks/useGameActions';
import { supabase } from '../integrations/supabase/client';
import { toast } from '../components/ui/use-toast';
import { nanoid } from 'nanoid';
import { DEFAULT_SETTINGS } from '../lib/constants';
import { GameContext } from './gameContext';
import { GameContextType } from './gameTypes';

// export const useGame = () => {
//   const context = useContext(GameContext);
//   if (!context) {
//     throw new Error('useGame must be used within a GameProvider');
//   }
//   return context;
// };

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [playerId, setPlayerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
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

  const { createRoom: createRoomAction, joinRoom: joinRoomAction, startGame: startGameAction, selectCategory, submitVote, nextRound, leaveRoom: leaveRoomAction, resetGame, handleRoleAbility, setPlayerRole, submitWord } = useGameActions(
    playerId,
    room,
    settings,
    setRoom
  );
  const remainingTime = useGameTimer(room, settings, setRoom);

  const handleGameStateTransition = useCallback(async (newState: GameState) => {
    if (!room) return;

    const updates = {
      state: newState,
      timer: newState === 'selecting' ? 30 : undefined,
      current_turn: newState === 'selecting' ? 0 : undefined,
      secret_word: newState === 'selecting' ? undefined : room.secret_word,
      chameleon_id: newState === 'selecting' ? undefined : room.chameleon_id,
      category: room.category,
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
        return;
      }

      if (data) {
        const mappedRoom = mapRoomData(data as unknown as DatabaseRoom);
        // Only update if there are actual changes
        if (JSON.stringify(roomRef.current) !== JSON.stringify(mappedRoom)) {
          console.log('Room data changed, updating state');
          setRoom(mappedRoom as unknown as GameRoom);
          roomRef.current = mappedRoom as unknown as GameRoom;
        }
      }
    } catch (error) {
      console.error('Error in fetchRoom:', error);
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
          // Force immediate update for room changes
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
          // Force immediate update for player changes
          await fetchRoom();
        }
      )
      .on('broadcast', { event: 'sync' }, async (payload) => {
        console.log('Sync broadcast received:', payload);
        if (payload.payload?.action === 'player_joined' || payload.payload?.action === 'player_left') {
          await fetchRoom();
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          fetchRoom();
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up subscription for room:', room.id);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [room?.id, fetchRoom]);

  const createRoom = useCallback(async (playerName: string, settings: GameSettings): Promise<string> => {
    try {
      // Generate a room ID using only alphanumeric characters
      const roomId = nanoid(6).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      console.log('Starting room creation process for:', roomId);
      
      const createdRoomId = await createRoomAction(playerName, settings, roomId);
      
      if (!createdRoomId) {
        throw new Error('Failed to create room');
      }
      
      console.log('Room created, fetching initial data for room:', roomId);
      
      // Fetch the new room data
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players_room_id_fkey (*)
        `)
        .eq('id', roomId)
        .single();
        
      if (roomError) {
        console.error('Error fetching new room:', roomError);
        throw new Error(`Failed to fetch room data: ${roomError.message}`);
      }
        
      // Set the room data
      if (roomData) {
        const mappedRoom = mapRoomData(roomData as unknown as DatabaseRoom);
        setRoom(mappedRoom as unknown as GameRoom);
        console.log('Room data set successfully:', mappedRoom);
      }
      
      return roomId;
    } catch (error) {
      console.error('Error in createRoom wrapper:', error);
      toast({
        variant: "destructive",
        title: "Error Creating Room",
        description: error instanceof Error ? error.message : "Unknown error occurred"
      });
      throw error;
    }
  }, [createRoomAction, setRoom]);

  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<boolean> => {
    try {
      // Check if we're already in this room
      if (room?.id === roomId) {
        console.log('Already in room:', roomId);
        return true;
      }

      // Clear the current player name
      setPlayerName('');

      // Sanitize the room ID to ensure it only contains valid characters
      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9-]/g, '');
      
      // If the room ID changed after sanitizing, log a warning
      if (cleanRoomId !== roomId) {
        console.warn(`Room ID was sanitized from ${roomId} to ${cleanRoomId}`);
        roomId = cleanRoomId; // Use the sanitized ID for all operations
      }
      
      console.log(`Attempting to join room: ${roomId} with player name: ${playerName}`);
      const success = await joinRoomAction(roomId, playerName);
      
      if (success) {
        console.log(`Successfully joined room ${roomId}, fetching room data`);
        
        // Direct fetch of room data to ensure we have the latest
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players:players_room_id_fkey (*)
          `)
          .eq('id', roomId)
          .single();
          
        if (roomError) {
          console.error('Error fetching room after join:', roomError);
          return false;
        }
        
        if (roomData) {
          const mappedRoom = mapRoomData(roomData as unknown as DatabaseRoom);
          setRoom(mappedRoom as unknown as GameRoom);
          console.log(`Room data loaded successfully after joining: ${roomId}`);
          return true;
        }
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error in joinRoom wrapper:', error);
      return false;
    }
  }, [joinRoomAction, setRoom, room?.id]);

  const leaveRoom = useCallback(async () => {
    if (!room?.id || !playerId) return;

    try {
      // Delete the player
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (deleteError) throw deleteError;

      // Update room's last_updated timestamp to trigger real-time updates
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id);

      if (updateError) throw updateError;

      // Fetch the latest room data before setting to null
      const { data: updatedRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players(*)
        `)
        .eq('id', room.id)
        .single();

      if (fetchError) throw fetchError;

      // Update local state with the latest room data
      setRoom(updatedRoom);
      
      // Then set to null after a short delay to ensure UI updates
      setTimeout(() => {
        setRoom(null);
      }, 100);
    } catch (error) {
      console.error('Error leaving room:', error);
    }
  }, [room?.id, playerId, setRoom]);

  const startGame = useCallback(async () => {
    if (!room) return;
    await startGameAction(room);
  }, [room, startGameAction]);

  const value: GameContextType = useMemo(() => ({
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitWord: async (word: string) => {
      if (!room) return;
      await submitWord(word);
    },
    submitVote,
    nextRound,
    leaveRoom,
    resetGame,
    handleRoleAbility,
    setPlayerRole,
    handleGameStateTransition,
    getPublicRooms: async (): Promise<GameRoom[]> => {
      try {
        const { data: rooms, error } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players:players_room_id_fkey (*)
          `)
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
    checkNameExists: async (roomId: string, playerName: string) => {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*')
          .eq('id', roomId)
          .single();

        if (roomError || !roomData) {
          return false;
        }

        return roomData.players?.some((p: Player) => 
          p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
        );
      } catch (error) {
        console.error('Error checking name:', error);
        return false;
      }
    },
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName,
    setRoom,
    loading: false,
    error: null
  }), [
    playerId, room, settings, createRoom, joinRoom, startGame, selectCategory, submitWord, submitVote, nextRound, leaveRoom, resetGame, handleRoleAbility, setPlayerRole,
    isPlayerChameleon, remainingTime, playerName, setSettings, setRoom, fetchRoom, handleGameStateTransition
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

GameProvider.displayName = 'GameProvider';
