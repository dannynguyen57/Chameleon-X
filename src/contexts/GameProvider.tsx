import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { GameRoom, GameSettings, GameMode, PlayerRole, Player, GameState } from '@/lib/types';
import { Room } from '@/types/Room';
import { mapRoomData, DatabaseRoom as MappedDatabaseRoom } from '@/hooks/useGameRealtime';
import { useGameTimer } from '@/hooks/useGameTimer';
import { useGameActions } from '@/hooks/useGameActions';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { GameContext, GameContextType, DEFAULT_SETTINGS } from './GameContext';

export const GameProvider = React.memo(({ children }: { children: React.ReactNode }) => {
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [playerName, setPlayerName] = useState<string>('');

  const roomRef = useRef<GameRoom | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const isPlayerChameleon = useMemo(() => 
    Boolean(room?.chameleon_id && playerId === room.chameleon_id),
    [room?.chameleon_id, playerId]
  );

  const gameActions = useGameActions(
    playerId,
    room as Room | null,
    settings,
    (newRoom) => setRoom(newRoom as GameRoom | null)
  );
  const { createRoom: createRoomAction, joinRoom: joinRoomAction } = gameActions;
  const remainingTime = useGameTimer(room?.id, room?.timer, room?.state, settings);

  const fetchRoom = useCallback(async (): Promise<GameRoom | null> => {
    if (!room?.id) return null;
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select('*, players (*)')
        .eq('id', room.id)
        .single();

      if (error) {
        console.error('Error fetching room:', error);
        return null;
      }
      if (data) {
        const mappedRoom = mapRoomData(data as MappedDatabaseRoom);
        const gameRoomData = mappedRoom as GameRoom;
        setRoom(gameRoomData);
        roomRef.current = gameRoomData;
        return gameRoomData;
      }
      return null;
    } catch (error) {
      console.error('Error in fetchRoom:', error);
      return null;
    }
  }, [room?.id]);

  useEffect(() => {
    if (!room?.id) return;
    
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channel = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_rooms', filter: `id=eq.${room.id}` }, async () => { await fetchRoom(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${room.id}` }, async () => { await fetchRoom(); })
      .on('broadcast', { event: 'sync' }, async () => { await fetchRoom(); })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          fetchRoom();
        }
      });

    channelRef.current = channel;

    const syncInterval = setInterval(fetchRoom, 5000);

    return () => {
      if (channelRef.current) {
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
         await fetchRoom();
         return success;
     }
     return null;
  }, [createRoomAction, fetchRoom, playerId]);

  const joinRoom = useCallback(async (roomId: string, playerName: string): Promise<boolean> => {
     const success = await joinRoomAction(roomId, playerName);
     if (success) {
         await fetchRoom();
         return true;
     }
     return false;
  }, [joinRoomAction, fetchRoom]);

  const startGame = useCallback(async () => {
      if (!room || room.host_id !== playerId || room.players.length < 3) return;
      await gameActions.startGame();
      await fetchRoom();
  }, [room, playerId, gameActions.startGame, fetchRoom]);
  
  const updateSettingsCb = useCallback(async (newSettings: GameSettings) => {
      await gameActions.updateSettings(newSettings);
      await fetchRoom();
  }, [gameActions.updateSettings, fetchRoom]);

  const value: GameContextType = useMemo(() => ({
    playerId,
    room,
    settings,
    createRoom,
    joinRoom,
    startGame,
    selectCategory: gameActions.selectCategory,
    submitVote: gameActions.submitVote,
    nextRound: gameActions.nextRound,
    leaveRoom: gameActions.leaveRoom,
    resetGame: gameActions.resetGame,
    updateSettings: updateSettingsCb,
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName,
    setRoom
  }), [
    playerId, room, settings, createRoom, joinRoom, startGame, gameActions,
    isPlayerChameleon, remainingTime, playerName, updateSettingsCb, setRoom
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
});

GameProvider.displayName = 'GameProvider'; 