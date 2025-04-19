import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings, GameMode, PlayerRole } from '@/lib/types';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';
import { supabase } from '@/integrations/supabase/client';
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
  settings: GameSettings;
  category: string | null;
  secret_word: string | null;
  chameleon_id: string | null;
  timer: number | null;
  players: DatabasePlayer[];
}

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
  const reconnectAttempts = useRef<number>(0);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastUpdateRef = useRef<number>(0);

  // Effects
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  // Derived values
  const isPlayerChameleon = useMemo(() => 
    Boolean(room?.chameleon_id && playerId === room.chameleon_id),
    [room?.chameleon_id, playerId]
  );

  // Custom hooks
  const { createRoom: createRoomAction, joinRoom: joinRoomAction, ...gameActions } = useGameActions(
    playerId,
    room,
    settings,
    setRoom
  );
  const remainingTime = useGameTimer(room?.id, room?.timer, room?.state, settings);

  const fetchRoom = useCallback(async () => {
    if (!room?.id) return;

    try {
      console.log('Fetching room data for:', room.id);
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (*)
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
        const mappedRoom = mapRoomData(data as DatabaseRoom);
        setRoom(mappedRoom);
        roomRef.current = mappedRoom;
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
    
    // Clean up existing subscription if any
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
      .on('broadcast', { event: 'sync' }, async () => {
        console.log('Sync broadcast received');
        await fetchRoom();
      })
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          // Force an immediate fetch after successful subscription
          fetchRoom();
        }
      });

    channelRef.current = channel;

    // Add periodic sync check
    const syncInterval = setInterval(() => {
      fetchRoom();
    }, 2000); // Check every 2 seconds

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up subscription for room:', room.id);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      clearInterval(syncInterval);
    };
  }, [room?.id]);

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
          toast({
            variant: "destructive",
            title: "Error creating room",
            description: "Room was created but could not be loaded."
          });
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
        toast({
          variant: "destructive",
          title: "Error creating room",
          description: "An unexpected error occurred"
        });
        return null;
      }
    }
    return null;
  }, [createRoomAction, playerId]);

  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<boolean> => {
    const success = await joinRoomAction(roomId, playerName);
    if (success) {
      try {
        // Fetch room data immediately after joining
        const { data: newRoom, error } = await supabase
          .from('game_rooms')
          .select('*, players(*)')
          .eq('id', roomId)
          .single();

        if (error) {
          console.error('Error fetching room after joining:', error);
          toast({
            variant: "destructive",
            title: "Error joining room",
            description: "Could not load room data after joining."
          });
          return false;
        }

        if (newRoom) {
          const mappedRoom = mapRoomData(newRoom);
          setRoom(mappedRoom);
          roomRef.current = mappedRoom;
          
          // Update player's last_active timestamp
          await supabase
            .from('players')
            .update({ last_active: new Date().toISOString() })
            .eq('id', playerId)
            .eq('room_id', roomId);
            
          return true;
        }
      } catch (error) {
        console.error('Error in joinRoom:', error);
        toast({
          variant: "destructive",
          title: "Error joining room",
          description: "An unexpected error occurred while joining the room."
        });
        return false;
      }
    }
    return false;
  }, [joinRoomAction, playerId]);

  const startGame = useCallback(async () => {
    if (!room) {
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "No room found"
      });
      return;
    }

    // Check if player is host
    if (playerId !== room.host_id) {
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "Only the host can start the game"
      });
      return;
    }

    // Check minimum players
    if (room.players.length < 3) {
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "Need at least 3 players to start"
      });
      return;
    }

    // Check game state
    if (room.state !== 'lobby') {
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "Game is already in progress"
      });
      return;
    }

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
          timer: null,
          current_turn: 0,
          turn_order: room.players.map(p => p.id),
          last_updated: new Date().toISOString()
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

      // Broadcast game start to all players
      const channel = supabase.channel(`room:${room.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'game_start',
        payload: { timestamp: Date.now() }
      });

      // Update all players' last_active timestamp
      const { error: playersError } = await supabase
        .from('players')
        .update({ 
          last_active: new Date().toISOString(),
          turn_description: null,
          vote: null
        })
        .eq('room_id', room.id);

      if (playersError) {
        console.error('Error updating players:', playersError);
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

      // Force a room data refresh for all players
      await fetchRoom();

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
  }, [room, playerId, fetchRoom]);

  const updateSettings = useCallback(async (newSettings: GameSettings) => {
    if (!room) return;

    try {
      // Update settings in the database
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          settings: {
            ...room.settings,
            ...newSettings,
            discussion_time: newSettings.discussion_time,
            time_per_round: newSettings.time_per_round,
            voting_time: newSettings.voting_time
          }
        })
        .eq('id', room.id);

      if (updateError) {
        console.error('Error updating settings:', updateError);
        toast({
          variant: "destructive",
          title: "Error updating settings",
          description: updateError.message
        });
        return;
      }

      // Update local state immediately
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
