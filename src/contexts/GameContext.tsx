import React, { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings, GameMode, PlayerRole } from '@/lib/types';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

// Check if dev mode is enabled
const isDevMode = process.env.NEXT_PUBLIC_ENABLE_DEV_MODE === 'true';

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
  revealed_role: PlayerRole | null;
  revealed_player_id: string | null;
  round_outcome: string | null;
  votes_tally: { [playerId: string]: number } | null;
  turn_order: string[] | null;
  current_turn: number | null;
}

// Define DEFAULT_SETTINGS here and export it
export const DEFAULT_SETTINGS: GameSettings = {
  max_players: Number(import.meta.env.VITE_MAX_PLAYERS) || 10,
  discussion_time: 30,
  max_rounds: Number(import.meta.env.VITE_DEFAULT_MAX_ROUNDS) || 3,
  game_mode: 'classic',
  team_size: 2,
  chaos_mode: false,
  time_per_round: 30,
  voting_time: 30,
  roles: {
    classic: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Mimic],
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

// Export the type
export type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string, settings: GameSettings) => Promise<GameRoom | null>;
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
  setRoom: (room: GameRoom | null) => void;
};

// Export the context
export const GameContext = createContext<GameContextType | null>(null);

// Export the hook
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }: { children: React.ReactNode }) => {
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');
  const [isConnected, setIsConnected] = useState(false);

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

  const createRoom = useCallback(async (playerName: string, settings: GameSettings): Promise<GameRoom | null> => {
    const roomId = playerId.substring(0, 6).toUpperCase();
    const success = await createRoomAction(playerName, settings, roomId);
    
    if (success) {
      // Add retry logic to handle eventual consistency
      let retries = 3;
      let delay = 1000; // Start with 1 second delay

      while (retries > 0) {
        try {
          // First check if the room exists
          const { data: roomCheck, error: checkError } = await supabase
            .from('game_rooms')
            .select('id')
            .eq('id', roomId)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            console.error('Error checking room existence:', checkError);
            throw checkError;
          }

          if (!roomCheck) {
            // Room doesn't exist yet, wait and retry
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, delay));
              delay *= 2;
              continue;
            }
            throw new Error('Room not found after creation');
          }

          // Room exists, now fetch full data
          const { data: newRoom, error: fetchError } = await supabase
            .from('game_rooms')
            .select(`
              *,
              players (
                id,
                name,
                room_id,
                role,
                is_host,
                is_ready,
                turn_description,
                vote,
                last_active,
                last_updated,
                is_protected,
                vote_multiplier,
                special_word,
                special_ability_used
              )
            `)
            .eq('id', roomId)
            .single();

          if (fetchError) {
            console.error('Error fetching room data:', fetchError);
            throw fetchError;
          }

          if (newRoom) {
            const mappedRoom = mapRoomData(newRoom);
            setRoom(mappedRoom);
            roomRef.current = mappedRoom;
            return mappedRoom;
          }
        } catch (error) {
          console.error('Error in createRoom:', error);
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
            continue;
          }
          toast({
            variant: "destructive",
            title: "Error creating room",
            description: error instanceof Error ? error.message : "An unexpected error occurred"
          });
          return null;
        }
      }
    }
    return null;
  }, [createRoomAction, playerId]);

  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<boolean> => {
    const success = await joinRoomAction(roomId, playerName);
    if (success) {
      try {
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
          
          await supabase
            .from('players')
            .update({ 
              last_active: new Date().toISOString(),
              room_id: roomId
            })
            .eq('id', playerId);
            
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

  const value = useMemo(() => ({
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame: gameActions.startGame,
    selectCategory: gameActions.selectCategory,
    submitVote: gameActions.submitVote,
    nextRound: gameActions.nextRound,
    leaveRoom: gameActions.leaveRoom,
    resetGame: gameActions.resetGame,
    updateSettings: gameActions.updateSettings,
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName,
    setRoom
  }), [
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    gameActions,
    isPlayerChameleon,
    remainingTime,
    playerName,
    setRoom
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

GameProvider.displayName = 'GameProvider';
