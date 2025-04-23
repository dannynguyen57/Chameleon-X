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
import { categories } from '@/lib/word-categories';
import { WordCategory } from '@/lib/types';

// export const useGame = () => {
//   const context = useContext(GameContext);
//   if (!context) {
//     throw new Error('useGame must be used within a GameProvider');
//   }
//   return context;
// };

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [playerId, setPlayerId] = useState(() => {
    // First try to get from sessionStorage (tab-specific)
    const sessionId = sessionStorage.getItem('playerId');
    if (sessionId) {
      return sessionId;
    }
    
    // If no session ID, check localStorage (browser-wide)
    const savedId = localStorage.getItem('playerId');
    if (savedId) {
      // Copy to sessionStorage for this tab
      sessionStorage.setItem('playerId', savedId);
      return savedId;
    }
    
    // If no ID exists anywhere, generate a new one
    const newPlayerId = uuidv4();
    // Save to both session and local storage
    sessionStorage.setItem('playerId', newPlayerId);
    localStorage.setItem('playerId', newPlayerId);
    return newPlayerId;
  });

  // Add effect to handle tab/window close
  useEffect(() => {
    const handleBeforeUnload = () => {
      // When tab/window closes, remove the session ID
      sessionStorage.removeItem('playerId');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

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

  const fetchRoom = useCallback(async () => {
    if (!room?.id) {
      console.log('No room ID available for fetchRoom');
      return;
    }

    try {
      console.log('Fetching room data for:', room.id);
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (
            id,
            name,
            is_host,
            is_ready,
            role,
            vote,
            turn_description,
            special_ability_used,
            is_protected,
            vote_multiplier,
            special_word,
            last_active,
            last_updated
          )
        `)
        .eq('id', room.id)
        .maybeSingle();  // Use maybeSingle instead of single to handle no results

      if (error) {
        console.error('Error fetching room:', error);
        return;
      }

      if (data) {
        console.log('Room data received:', data);
        const mappedRoom = mapRoomData(data as unknown as DatabaseRoom);
        
        // Always update the room state to ensure real-time updates
        console.log('Updating room state with:', mappedRoom);
        setRoom(mappedRoom as unknown as GameRoom);
        roomRef.current = mappedRoom as unknown as GameRoom;

        // Force a re-render by updating the last_updated timestamp
        if (mappedRoom) {
          setRoom({
            ...mappedRoom,
            last_updated: new Date().toISOString()
          } as GameRoom);
        }
      } else {
        console.log('No room data received for ID:', room.id);
        // If no room data is found, set room to null
        setRoom(null);
      }
    } catch (error) {
      console.error('Error in fetchRoom:', error);
    }
  }, [room?.id]);

  const handleGameStateTransition = useCallback(async (newState: GameState) => {
    if (!room) return;

    // Get the current players data to preserve their roles and host status
    const { data: currentPlayers, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', room.id);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      return;
    }

    // First update the room state
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

    // Then ensure all players maintain their original roles and host status
    if (currentPlayers) {
      const updatePromises = currentPlayers.map(player => {
        // Only update the necessary fields to preserve the player's state
        return supabase
          .from('players')
          .update({
            role: player.role,
            is_host: player.is_host,
            is_ready: player.is_ready,
            vote: player.vote,
            turn_description: player.turn_description,
            special_ability_used: player.special_ability_used,
            is_protected: player.is_protected,
            vote_multiplier: player.vote_multiplier,
            special_word: player.special_word,
            last_updated: new Date().toISOString()
          })
          .eq('id', player.id);
      });

      // Wait for all player updates to complete
      const results = await Promise.all(updatePromises);
      
      // Log any errors that occurred during player updates
      results.forEach((result, index) => {
        if (result.error) {
          console.error(`Error updating player ${currentPlayers[index].id}:`, result.error);
        }
      });
    }

    // Force a room data refresh to ensure all clients have the latest state
    await fetchRoom();
  }, [room, fetchRoom]);

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
        if (payload.payload?.action === 'player_joined' || 
            payload.payload?.action === 'player_left' ||
            payload.payload?.action === 'game_state_changed' ||
            payload.payload?.action === 'game_started' ||
            payload.payload?.action === 'category_selected') {
          
          // Force immediate update
          await fetchRoom();

          // If game has started or state has changed, ensure we're on the game screen
          if ((payload.payload?.action === 'game_started' || 
               payload.payload?.action === 'game_state_changed' ||
               payload.payload?.newState === GameState.Selecting ||
               payload.payload?.newState === GameState.Presenting ||
               payload.payload?.action === 'category_selected') && 
              payload.payload?.roomId === room.id) {
            
            // Force a complete state update with all broadcast data
            if (roomRef.current) {
              // Find the full category object if we have a category name
              const categoryName = payload.payload?.category;
              const fullCategory = categoryName 
                ? categories.find((c: WordCategory) => c.name === categoryName)
                : roomRef.current.category;

              const updatedRoom = {
                ...roomRef.current,
                state: payload.payload?.newState || roomRef.current.state,
                category: fullCategory,
                secret_word: payload.payload?.secretWord || roomRef.current.secret_word,
                current_turn: payload.payload?.currentTurn ?? roomRef.current.current_turn,
                turn_order: payload.payload?.turnOrder || roomRef.current.turn_order,
                timer: payload.payload?.timer ?? roomRef.current.timer,
                last_updated: new Date().toISOString()
              };
              
              console.log('Updating room state with broadcast data:', updatedRoom);
              setRoom(updatedRoom);

              // Force a navigation to the game screen if needed
              if (!window.location.pathname.includes(`/room/${room.id}`)) {
                window.location.href = `/room/${room.id}`;
              }
            }
          }
        }
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Force an initial fetch when subscription is established
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
      
      console.log(`Attempting to join room: ${roomId} with player name: ${playerName} and playerId: ${playerId}`);
      
      // First check if the room exists and get current players
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players_room_id_fkey (*)
        `)
        .eq('id', roomId)
        .single();
        
      if (roomError) {
        console.error('Error checking room:', roomError);
        return false;
      }

      if (!roomData) {
        console.error('Room not found:', roomId);
        return false;
      }

      // Check if player name already exists in the room
      const nameExists = roomData.players.some((p: Player) => 
        p.name.toLowerCase().trim() === playerName.toLowerCase().trim()
      );

      if (nameExists) {
        console.error('Player name already exists in room');
        return false;
      }

      // Join the room with our existing playerId
      const success = await joinRoomAction(roomId, playerName);
      
      if (success) {
        console.log(`Successfully joined room ${roomId}, fetching room data`);
        
        // Fetch the updated room data
        const { data: updatedRoomData, error: updateError } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players:players_room_id_fkey (*)
          `)
          .eq('id', roomId)
          .single();
          
        if (updateError) {
          console.error('Error fetching room after join:', updateError);
          return false;
        }
        
        if (updatedRoomData) {
          const mappedRoom = mapRoomData(updatedRoomData as unknown as DatabaseRoom);
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
  }, [joinRoomAction, setRoom, room?.id, playerId, setPlayerName]);

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

    // Check if the current player is the host
    const currentPlayer = room.players.find(p => p.id === playerId);
    if (!currentPlayer?.is_host) {
      console.log('Only the host can start the game');
      toast({
        variant: "destructive",
        title: "Error",
        description: "Only the host can start the game"
      });
      return;
    }

    // Check if all players are ready
    const allPlayersReady = room.players.every(player => player.is_ready);
    if (!allPlayersReady) {
      console.log('Not all players are ready:', room.players.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready })));
      toast({
        variant: "destructive",
        title: "Error",
        description: "All players must be ready to start the game"
      });
      return;
    }

    try {
      await startGameAction(room);
    } catch (error) {
      console.error('Error starting game:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start game. Please try again."
      });
    }
  }, [room, playerId, startGameAction]);

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
