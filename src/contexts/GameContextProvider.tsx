import React, { useState, useCallback, useMemo, useRef, useEffect, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameRoom as BaseGameRoom, Player, GameState, GameSettings, PlayerRole, GameResultType, GameMode } from '../lib/types';
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
import { convertToExtendedRoom } from '@/lib/roomUtils';

// Extend the base GameRoom type with additional timer fields
export interface ExtendedGameRoom extends BaseGameRoom {
  presenting_timer: number;  // Time for each player's turn
  discussion_timer: number;  // Time for discussion phase
  voting_timer: number;     // Time for voting phase
  turn_timer: number;       // Current time left for individual player
  turn_started_at?: string;
  chameleon_count: number;
  player_count: number;
  presenting_time: number;
  game_mode: string;
  team_size: number;
  chaos_mode: boolean;
  max_players: number;
  discussion_time: number;
  voting_time: number;
  host_id: string;
  round: number;
  max_rounds: number;
  turn_order: string[];
  votes_tally: Record<string, number>;
  votes: Record<string, string>;
  results: GameResultType[];
  round_outcome: GameResultType | null;
  revealed_player_id: string | null;
  revealed_role: PlayerRole | null;
  last_updated: string;
  updated_at: string;
  created_at: string;
}

// export const useGame = () => {
//   const context = useContext(GameContext);
//   if (!context) {
//     throw new Error('useGame must be used within a GameProvider');
//   }
//   return context;
// };

interface BroadcastPayload {
  action: string;
  playerId?: string;
  playerName?: string;
  isReady?: boolean;
  timestamp?: string;
  roomId?: string;
  newState?: GameState;
  category?: string;
  secretWord?: string;
  currentTurn?: number;
  turnOrder?: string[];
  timer?: number;
}

interface BroadcastMessage {
  event: string;
  payload: BroadcastPayload;
  type: string;
}

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  // Memoize the ID generation function with retry logic
  const generateNewPlayerId = useCallback(async () => {
    const MAX_RETRIES = 3;
    let retries = 0;
    
    while (retries < MAX_RETRIES) {
      try {
        const newPlayerId = uuidv4();
        
        // Check if this ID already exists in the database
        const { data: existingPlayer, error: checkError } = await supabase
          .from('players')
          .select('id')
          .eq('id', newPlayerId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking player ID:', checkError);
          retries++;
          continue;
        }

        // If ID doesn't exist, use it
        if (!existingPlayer) {
          setPlayerId(newPlayerId);
          // Only update storage when necessary
          if (sessionStorage.getItem('playerId') !== newPlayerId) {
            sessionStorage.setItem('playerId', newPlayerId);
            localStorage.setItem('playerId', newPlayerId);
          }
          return newPlayerId;
        }

        // If ID exists, try again
        retries++;
      } catch (error) {
        console.error('Error generating new player ID:', error);
        retries++;
      }
    }

    // If we've exhausted retries, throw an error
    throw new Error('Failed to generate a unique player ID after multiple attempts');
  }, []);

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
    // Note: This will be updated when the component mounts
    return uuidv4();
  });

  // Add effect to handle initial ID generation
  useEffect(() => {
    const initializePlayerId = async () => {
      try {
        await generateNewPlayerId();
      } catch (error) {
        console.error('Failed to initialize player ID:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to initialize player. Please refresh the page."
        });
      }
    };

    initializePlayerId();
  }, [generateNewPlayerId]);

  const [room, setRoom] = useState<ExtendedGameRoom | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const roomRef = useRef<ExtendedGameRoom | null>(null);
  const reconnectAttempts = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<number>(0);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const MAX_RETRIES = 3;

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
  const remainingTime = useGameTimer(room, settings, setRoom, playerId);

  const mapRoomWithTimers = useCallback((roomData: DatabaseRoom): ExtendedGameRoom => {
    const baseRoom = mapRoomData(roomData);
    return convertToExtendedRoom(baseRoom);
  }, []);

  const fetchRoom = useCallback(async () => {
    if (!room?.id) {
      console.log('No room ID available for fetchRoom');
      return;
    }

    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    // Set a new timeout to debounce the fetch
    fetchTimeoutRef.current = setTimeout(async () => {
      try {
        isFetchingRef.current = true;
        console.log('Fetching room data for:', room.id);
        
        const { data, error } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players (*)
          `)
          .eq('id', room.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching room:', error);
          // Implement retry logic
          if (retryCountRef.current < MAX_RETRIES) {
            retryCountRef.current++;
            setTimeout(() => fetchRoom(), 1000 * retryCountRef.current);
            return;
          }
          throw error;
        }

        // Reset retry count on successful fetch
        retryCountRef.current = 0;

        if (data) {
          console.log('Room data received:', data);
          const mappedRoom = mapRoomWithTimers(data as DatabaseRoom);
          
          // Only update if the data has actually changed
          const currentRoomStr = JSON.stringify(roomRef.current);
          const newRoomStr = JSON.stringify(mappedRoom);
          
          if (currentRoomStr !== newRoomStr) {
            console.log('Updating room state with:', mappedRoom);
            setRoom(mappedRoom);
            roomRef.current = mappedRoom;
            lastUpdateRef.current = Date.now();
          }
        } else {
          console.log('No room data received for ID:', room.id);
          setRoom(null);
        }
      } catch (error) {
        console.error('Error in fetchRoom:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to update room. Please try again."
        });
      } finally {
        isFetchingRef.current = false;
      }
    }, 100); // 100ms debounce
  }, [room?.id, mapRoomWithTimers]);

  const handleGameStateTransition = useCallback(async (newState: GameState) => {
    if (!room) return;

    const now = new Date().toISOString();
    let updates: Partial<ExtendedGameRoom> = {
      state: newState,
      last_updated: now
    };

    // Set appropriate timers based on the game state
    switch (newState) {
      case 'discussion': {
        const discussionTime = room.settings.discussion_time;
        updates = {
          ...updates,
          presenting_timer: 0,
          voting_timer: 0,
          discussion_timer: discussionTime
        };
        break;
      }
      case 'voting': {
        const votingTime = room.settings.voting_time;
        updates = {
          ...updates,
          presenting_timer: 0,
          discussion_timer: 0,
          voting_timer: votingTime
        };
        break;
      }
      case 'presenting': {
        const turnTime = room.settings.presenting_time;
        updates = {
          ...updates,
          presenting_timer: turnTime,
          turn_started_at: now,
          current_turn: room.current_turn || 0
        };
        break;
      }
      default: {
        updates = {
          ...updates,
          presenting_timer: 0,
          discussion_timer: 0,
          voting_timer: 0,
          turn_started_at: undefined
        };
      }
    }

    const { error } = await supabase
      .from('game_rooms')
      .update(updates)
      .eq('id', room.id);

    if (error) {
      console.error('Error transitioning game state:', error);
      throw error;
    }

    // Force a room data refresh
    await fetchRoom();
  }, [room, fetchRoom]);

  const handleBroadcast = useCallback(async (payload: BroadcastMessage) => {
    console.log('Sync broadcast received:', payload);
    
    // Only process if we still have a room
    if (!roomRef.current?.id || !room) return;

    const { action, playerId, playerName, roomId, isReady, timestamp } = payload.payload;
    
    // Handle player joined events
    if (action === 'player_joined' && playerId && playerName) {
      console.log('Player joined broadcast received:', { playerId, playerName, roomId });
      
      // Force immediate room update
      await fetchRoom();
      
      // Update local state immediately
      setRoom(prevRoom => {
        if (!prevRoom) return null;
        
        // Check if player already exists
        const playerExists = prevRoom.players.some(p => p.id === playerId);
        
        if (!playerExists) {
          // Create new player with both database and application requirements
          const newPlayer: Player = {
            // Database schema fields
            id: playerId,
            room_id: roomId || '',
            name: playerName,
            role: PlayerRole.Regular,
            is_host: false,
            is_ready: false,
            turn_description: undefined,
            vote: undefined,
            last_active: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            is_protected: false,
            vote_multiplier: 1,
            special_word: undefined,
            special_ability_used: false,
            turn_timer: 0,
            // Application-specific fields
            isProtected: false,
            isInvestigated: false,
            isCurrentPlayer: false,
            isTurn: false,
            score: 0,
            created_at: new Date().toISOString()
          };
          
          return {
            ...prevRoom,
            players: [...prevRoom.players, newPlayer],
            last_updated: timestamp || new Date().toISOString()
          };
        }
        
        return prevRoom;
      });
      
      return;
    }

    // Handle ready status changes
    if (action === 'player_ready_changed') {
      console.log('Updating player ready status from broadcast:', { 
        playerId, 
        isReady, 
        timestamp,
        currentRoom: room ? {
          id: room.id,
          players: room.players.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready }))
        } : null
      });
      
      // Update local state immediately
      setRoom(prevRoom => {
        if (!prevRoom) return null;
        
        const updatedPlayers = prevRoom.players.map(player => 
          player.id === playerId 
            ? { ...player, is_ready: isReady || false }
            : player
        );
        
        return {
          ...prevRoom,
          players: updatedPlayers,
          last_updated: timestamp || new Date().toISOString()
        };
      });

      // Force a re-fetch after a short delay to ensure consistency
      setTimeout(async () => {
        await fetchRoom();
      }, 100);
      return;
    }

    // Handle other game state changes
    if (action === 'game_state_changed' || 
        action === 'game_started' || 
        action === 'category_selected' || 
        action === 'description_submitted') {
      
      // Force immediate update
      await fetchRoom();

      // If game has started or state has changed, ensure we're on the game screen
      if (roomId === room.id) {
        // Force a complete state update with all broadcast data
        if (roomRef.current) {
          const updatedRoom = {
            ...roomRef.current,
            state: payload.payload?.newState || roomRef.current.state,
            category: payload.payload?.category 
              ? categories.find((c: WordCategory) => c.name === payload.payload.category)
              : roomRef.current.category,
            secret_word: payload.payload?.secretWord || roomRef.current.secret_word,
            current_turn: payload.payload?.currentTurn ?? roomRef.current.current_turn,
            turn_order: payload.payload?.turnOrder || roomRef.current.turn_order,
            presenting_timer: payload.payload?.timer ?? roomRef.current.presenting_timer,
            discussion_timer: payload.payload?.timer ?? roomRef.current.discussion_timer,
            voting_timer: payload.payload?.timer ?? roomRef.current.voting_timer,
            last_updated: new Date().toISOString()
          };
          
          setRoom(updatedRoom);

          // Force a navigation to the game screen if needed
          if (!window.location.pathname.includes(`/room/${room.id}`)) {
            window.location.href = `/room/${room.id}`;
          }
        }
      }
    }
  }, [room, fetchRoom]);

  useEffect(() => {
    if (!room?.id) {
      if (channelRef.current) {
        console.log('Cleaning up subscription - no room');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      return;
    }
    
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
      .on('broadcast', { event: 'sync' }, handleBroadcast)
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
  }, [room?.id, fetchRoom, handleBroadcast]);

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
        const mappedRoom = mapRoomWithTimers(roomData as DatabaseRoom);
        setRoom(mappedRoom as unknown as ExtendedGameRoom);
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
  }, [createRoomAction, setRoom, mapRoomWithTimers]);

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
        // Add user-facing notification
        toast({
          variant: "destructive",
          title: "Name Taken",
          description: `The name "${playerName}" is already in use in this room. Please choose a different name.`
        });
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
          const mappedRoom = mapRoomWithTimers(updatedRoomData as DatabaseRoom);
          setRoom(mappedRoom as unknown as ExtendedGameRoom);
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
  }, [joinRoomAction, setRoom, room?.id, playerId, setPlayerName, mapRoomWithTimers]);

  const leaveRoom = useCallback(async () => {
    if (!room?.id || !playerId) return;

    const roomId = room.id;
    let wasHost = false;
    let newHostId: string | null = null;

    try {
      // 1. Fetch current players *before* deleting
      const { data: playersInRoom, error: fetchPlayersError } = await supabase
        .from('players')
        .select('id, is_host')
        .eq('room_id', roomId);

      if (fetchPlayersError) throw fetchPlayersError;

      const currentPlayer = playersInRoom?.find(p => p.id === playerId);
      wasHost = currentPlayer?.is_host || false;

      // 2. Delete the current player
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (deleteError) throw deleteError;

      const remainingPlayers = playersInRoom?.filter(p => p.id !== playerId) || [];

      // 3. Handle Host Migration or Room Deletion
      if (remainingPlayers.length === 0) {
        // If no players left, delete the room
        const { error: deleteRoomError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);
        if (deleteRoomError) console.error('Error deleting room:', deleteRoomError);
      } else if (wasHost) {
        // If host left and others remain, assign a new host
        // Simple logic: assign to the first remaining player
        newHostId = remainingPlayers[0].id;
        const { error: hostUpdateError } = await supabase
          .from('players')
          .update({ is_host: true })
          .eq('id', newHostId);
        if (hostUpdateError) console.error('Error updating host:', hostUpdateError);
      }

      // 4. Broadcast the update to other clients
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'sync',
          payload: { action: 'player_left', roomId: roomId, playerId: playerId, newHostId: newHostId },
        });
      }

      // 5. Clean up local state
      await generateNewPlayerId();
      setRoom(null); // Immediately set room to null locally

    } catch (error) {
      console.error('Error leaving room:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to leave room. Please try again."
      });
      // Attempt to clean up local state even on error
      setRoom(null);
    }
  }, [room?.id, playerId, setRoom, generateNewPlayerId]);

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

  const handleRoomUpdate = useCallback(async (room: ExtendedGameRoom) => {
    console.log('Room update received:', room);
    
    // Always update the room state if we have a valid room
    if (room) {
      setRoom(room);
      
      // If this is the current room, also update the game state
      if (roomRef.current?.id === room.id) {
        // Use a small delay to ensure state updates are processed
        setTimeout(async () => {
          await fetchRoom();
        }, 50);
      }
    }
  }, [setRoom, fetchRoom]);

  // Create a type-safe setRoom function
  const setRoomSafe = useCallback((newRoom: ExtendedGameRoom | null) => {
    setRoom(newRoom);
  }, []);

  const value: GameContextType = useMemo(() => ({
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitWord,
    submitVote,
    nextRound,
    leaveRoom,
    resetGame,
    handleRoleAbility,
    setPlayerRole,
    handleGameStateTransition,
    handleRoomUpdate,
    getPublicRooms: async (): Promise<ExtendedGameRoom[]> => {
      const { data: rooms, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (*)
        `)
        .eq('state', 'lobby');

      if (error) {
        console.error('Error fetching public rooms:', error);
        return [];
      }

      return (rooms || [])
        .filter(room => room.players && room.players.length > 0)
        .map(room => mapRoomWithTimers(room as DatabaseRoom));
    },
    updateSettings: async (newSettings: GameSettings) => {
      setSettings(newSettings);
      await fetchRoom();
      return true;
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
    setRoom: setRoomSafe,
    loading: false,
    error: null
  }), [
    playerId, room, settings, createRoom, joinRoom, startGame, selectCategory, submitWord, submitVote, nextRound, leaveRoom, resetGame, handleRoleAbility, setPlayerRole,
    isPlayerChameleon, remainingTime, playerName, setSettings, setRoomSafe, fetchRoom, handleGameStateTransition, handleRoomUpdate, mapRoomWithTimers
  ]);

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

  // Add effect to generate new player ID when joining a new room
  useEffect(() => {
    const handleRoomChange = async () => {
      // Only generate new ID when joining a new room (not when room state changes)
      if (room?.id && !roomRef.current?.id) {
        try {
          await generateNewPlayerId();
        } catch (error) {
          console.error('Failed to generate new player ID for room:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to join room. Please try again."
          });
        }
      }
    };

    handleRoomChange();
  }, [room?.id, generateNewPlayerId]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

GameProvider.displayName = 'GameProvider';
