import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings, GameMode, PlayerRole } from '@/lib/types';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const DEFAULT_SETTINGS: GameSettings = {
  max_players: Number(import.meta.env.VITE_MAX_PLAYERS) || 10,
  discussion_time: Number(import.meta.env.VITE_DEFAULT_DISCUSSION_TIME) || 120,
  max_rounds: Number(import.meta.env.VITE_DEFAULT_MAX_ROUNDS) || 3,
  game_mode: 'classic',
  team_size: 2,
  chaos_mode: false,
  time_per_round: Number(import.meta.env.VITE_DEFAULT_TIME_PER_ROUND) || 60,
  voting_time: Number(import.meta.env.VITE_DEFAULT_VOTING_TIME) || 30,
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

export type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string, settings: GameSettings) => Promise<string | null>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  selectCategory: (categoryName: string) => Promise<void>;
  submitVote: (targetPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  updateSettings: (settings: GameSettings) => Promise<void>;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
};

export const GameContext = createContext<GameContextType | null>(null);

export const GameProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  // State hooks
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

  // Refs
  const roomRef = useRef<GameRoom | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Effects
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Derived values
  const isPlayerChameleon = useMemo(() => 
    !!(room?.chameleon_id && playerId === room.chameleon_id),
    [room?.chameleon_id, playerId]
  );

  // Custom hooks
  const { createRoom: createRoomAction, joinRoom: joinRoomAction, ...gameActions } = useGameActions(
    playerId,
    room,
    settings,
    setRoom
  );
  const remainingTime = useGameTimer(room?.id, room?.timer, room?.state);

  const fetchRoom = useCallback(async () => {
    if (!room?.id) return;

    const now = Date.now();
    if (now - lastUpdateRef.current < 500) {
      return; // Prevent too frequent updates
    }
    lastUpdateRef.current = now;

    try {
      console.log('Fetching room data for:', room.id);
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (
            id,
            name,
            room_id,
            role,
            vote,
            turn_description,
            last_active
          )
        `)
        .eq('id', room.id)
        .single();

      if (error) {
        console.error('Error fetching room:', error);
        toast({
          variant: "destructive",
          title: "Error fetching room",
          description: error.message
        });
        return;
      }

      if (data) {
        console.log('Room data received:', data);
        const mappedRoom = mapRoomData(data);
        setRoom(mappedRoom);
      }
    } catch (error) {
      console.error('Error in fetchRoom:', error);
    }
  }, [room?.id]);

  const setupSubscription = useCallback(() => {
    if (!room?.id || channelRef.current) return;

    console.log('Setting up subscription for room:', room.id);

    // Cleanup any existing subscription
    if (channelRef.current) {
      console.log('Cleaning up existing subscription');
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Set up new subscription
    channelRef.current = supabase
      .channel(`room:${room.id}`, {
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
          filter: `id=eq.${room.id}`
        },
        (payload) => {
          console.log('Room update received:', payload);
          fetchRoom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          console.log('Player update received:', payload);
          fetchRoom();
        }
      )
      .on('broadcast', { event: 'sync' }, () => {
        console.log('Sync broadcast received');
        fetchRoom();
      })
      .subscribe((status) => {
        console.log('Subscription status changed:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to room updates');
          setIsConnected(true);
          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
          fetchRoom();
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.log('Subscription closed or error occurred');
          setIsConnected(false);
          if (!reconnectTimeoutRef.current) {
            console.log('Scheduling reconnection...');
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log('Attempting to reconnect...');
              if (channelRef.current) {
                channelRef.current.unsubscribe();
                channelRef.current = null;
              }
              setupSubscription();
            }, 2000); // Increased delay to 2 seconds
          }
        }
      });
  }, [room?.id, fetchRoom]);

  useEffect(() => {
    if (!room?.id) return;

    fetchRoom();
    setupSubscription();

    const syncInterval = setInterval(() => {
      if (isConnected) {
        fetchRoom();
      }
    }, 5000);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      clearInterval(syncInterval);
    };
  }, [room?.id, fetchRoom, setupSubscription, isConnected]);

  // Callbacks
  const createRoom = useCallback(async (playerName: string, settings: GameSettings): Promise<string | null> => {
    const roomId = playerId.substring(0, 6).toUpperCase();
    const success = await createRoomAction(playerName, settings);
    
    if (success) {
      try {
        const { data: newRoom, error } = await supabase
          .from('game_rooms')
          .select('*, players(*)')
          .eq('id', roomId)
          .single();

        if (error) {
          console.error('Error fetching room after creation:', error);
          return null;
        }

        if (newRoom) {
          const mappedRoom = mapRoomData(newRoom);
          setRoom(mappedRoom);
          roomRef.current = mappedRoom;
          return roomId;
        }
      } catch (error) {
        console.error('Error in createRoom:', error);
        return null;
      }
    }
    return null;
  }, [createRoomAction, playerId]);

  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<boolean> => {
    const success = await joinRoomAction(roomId, playerName);
    if (success) {
      const { data: newRoom } = await supabase
        .from('game_rooms')
        .select('*, players(*)')
        .eq('id', roomId)
        .single();

      if (newRoom) {
        const mappedRoom = mapRoomData(newRoom);
        setRoom(mappedRoom);
        roomRef.current = mappedRoom;
      }
    }
    return success;
  }, [joinRoomAction]);

  const startGame = useCallback(async () => {
    if (!room) return;

    try {
      // First, update the room state to 'selecting'
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          state: GameState.Selecting,
          round: 1,
          category: null,
          secret_word: null,
          chameleon_id: null,
          timer: null
        })
        .eq('id', room.id);

      if (updateError) {
        console.error('Error updating room state:', updateError);
        toast({
          variant: "destructive",
          title: "Error starting game",
          description: updateError.message
        });
        return;
      }

      // Then call the start_game procedure
      const { error: startError } = await supabase.rpc('start_game', {
        room_id: room.id
      });

      if (startError) {
        console.error('Error in start_game procedure:', startError);
        toast({
          variant: "destructive",
          title: "Error starting game",
          description: startError.message
        });
        return;
      }

      // Update local state
      const updatedRoom = {
        ...room,
        state: GameState.Selecting,
        round: 1,
        category: undefined,
        secret_word: undefined,
        chameleon_id: undefined,
        timer: undefined
      };
      setRoom(updatedRoom);
      roomRef.current = updatedRoom;

      toast({
        title: "Game started!",
        description: "Select a category to begin."
      });
    } catch (error) {
      console.error('Error in startGame:', error);
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "An unexpected error occurred."
      });
    }
  }, [room]);

  const updateSettings = useCallback(async (newSettings: GameSettings) => {
    if (!room) return;

    try {
      // Update settings in the database using raw SQL
      const { error: updateError } = await supabase.rpc('update_room_settings', {
        room_id: room.id,
        new_settings: {
          ...newSettings,
          discussion_time: newSettings.discussion_time,
          time_per_round: newSettings.time_per_round,
          voting_time: newSettings.voting_time
        }
      });

      if (updateError) {
        console.error('Error updating settings:', updateError);
        toast({
          variant: "destructive",
          title: "Error updating settings",
          description: updateError.message
        });
        return;
      }

      // Update local state
      const updatedRoom = {
        ...room,
        settings: {
          ...room.settings,
          ...newSettings,
          discussion_time: newSettings.discussion_time,
          time_per_round: newSettings.time_per_round,
          voting_time: newSettings.voting_time
        }
      };
      setRoom(updatedRoom);
      roomRef.current = updatedRoom;

      toast({
        title: "Settings updated!",
        description: "Game settings have been successfully updated."
      });
    } catch (error) {
      console.error('Error in updateSettings:', error);
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: "An unexpected error occurred."
      });
    }
  }, [room]);

  // Context value
  const value = useMemo(() => ({
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    ...gameActions,
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName,
    updateSettings
  }), [
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    gameActions,
    isPlayerChameleon,
    remainingTime,
    playerName,
    updateSettings
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
});

GameProvider.displayName = 'GameProvider';

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
