import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings, GameMode } from '@/lib/types';
import { useGameRealtime } from '@/hooks/useGameRealtime';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: Number(import.meta.env.VITE_MAX_PLAYERS) || 10,
  discussionTime: Number(import.meta.env.VITE_DEFAULT_DISCUSSION_TIME) || 120,
  maxRounds: Number(import.meta.env.VITE_DEFAULT_MAX_ROUNDS) || 3,
  gameMode: 'classic',
  teamSize: 2,
  chaosMode: false,
  timePerRound: Number(import.meta.env.VITE_DEFAULT_TIME_PER_ROUND) || 60,
  votingTime: Number(import.meta.env.VITE_DEFAULT_VOTING_TIME) || 30
};

type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string, settings: GameSettings) => Promise<boolean>;
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

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');
  const roomRef = useRef<GameRoom | null>(null);

  const isPlayerChameleon = useMemo(() => 
    !!(room?.chameleonId && playerId === room.chameleonId),
    [room?.chameleonId, playerId]
  );

  const { createRoom: createRoomAction, joinRoom: joinRoomAction, ...gameActions } = useGameActions(playerId, room, settings);
  useGameRealtime(room?.id, setRoom);
  const remainingTime = useGameTimer(room?.id, room?.timer, room?.state);

  const createRoom = useCallback(async (playerName: string, settings: GameSettings): Promise<boolean> => {
    const success = await createRoomAction(playerName, settings);
    if (success) {
      const roomId = playerId.substring(0, 6).toUpperCase();
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
      const { error: startError } = await supabase.rpc('start_game', {
        room_id: room.id
      });

      if (startError) {
        console.error('Error starting game:', startError);
        toast({
          variant: "destructive",
          title: "Error starting game",
          description: startError.message
        });
        return;
      }

      const updatedRoom = {
        ...room,
        state: GameState.CategorySelection,
        round: 1
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
    setPlayerName
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
    playerName
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
