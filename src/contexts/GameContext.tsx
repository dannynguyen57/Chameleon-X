
import React, { createContext, useContext, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Player, GameRoom, GameState, GameSettings } from '@/lib/types';
import { categories } from '@/lib/word-categories';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  discussionTime: 120,
  maxRounds: 3
};

type GameContextType = {
  playerId: string;
  room: GameRoom | null;
  settings: GameSettings;
  createRoom: (playerName: string) => Promise<void>;
  joinRoom: (roomId: string, playerName: string) => Promise<boolean>;
  startGame: () => Promise<void>;
  selectCategory: (categoryName: string) => Promise<void>;
  submitVote: (targetPlayerId: string) => Promise<void>;
  nextRound: () => Promise<void>;
  leaveRoom: () => Promise<void>;
  resetGame: () => Promise<void>;
  isPlayerChameleon: boolean;
  remainingTime: number | null;
  playerName: string;
  setPlayerName: (name: string) => void;
};

const GameContext = createContext<GameContextType>(null!);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [playerId] = useState(() => uuidv4());
  const [room, setRoom] = useState<GameRoom | null>(null);
  const [settings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [remainingTime, setRemainingTime] = useState<number | null>(null);
  const [playerName, setPlayerName] = useState<string>('');
  const { toast } = useToast();

  const isPlayerChameleon = !!(room?.chameleonId && playerId === room.chameleonId);

  useEffect(() => {
    if (!room) return;

    const roomChannel = supabase
      .channel(`room:${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${room.id}`,
        },
        async (payload) => {
          if (payload.new) {
            const { data: updatedRoom } = await supabase
              .from('game_rooms')
              .select('*, players(*)')
              .eq('id', room.id)
              .single();

            if (updatedRoom) {
              // Map players from database format to our Player type
              const mappedPlayers: Player[] = updatedRoom.players.map((player: any) => ({
                id: player.id,
                name: player.name,
                isHost: player.is_host,
                vote: player.vote
              }));

              // Map room data from database format to our GameRoom type
              const mappedRoom: GameRoom = {
                id: updatedRoom.id,
                hostId: updatedRoom.host_id,
                players: mappedPlayers,
                state: updatedRoom.state as GameState,
                category: updatedRoom.category || undefined,
                secretWord: updatedRoom.secret_word || undefined,
                chameleonId: updatedRoom.chameleon_id || undefined,
                timer: updatedRoom.timer || undefined,
                round: updatedRoom.round,
                maxRounds: updatedRoom.max_rounds
              };

              setRoom(mappedRoom);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [room?.id]);

  useEffect(() => {
    let timerId: number | undefined;
    
    if (room?.timer && room.timer > 0 && room.state === 'presenting') {
      setRemainingTime(room.timer);
      timerId = window.setInterval(async () => {
        const { error } = await supabase
          .from('game_rooms')
          .update({ timer: room.timer - 1 })
          .eq('id', room.id);

        if (error) {
          console.error('Error updating timer:', error);
        }
      }, 1000);
    } else {
      setRemainingTime(null);
    }
    
    return () => {
      if (timerId) clearInterval(timerId);
    };
  }, [room?.timer, room?.state, room?.id]);

  const createRoom = async (playerName: string) => {
    const roomId = uuidv4().substring(0, 6).toUpperCase();
    
    const { error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        id: roomId,
        host_id: playerId,
        state: 'lobby'
      });

    if (roomError) {
      toast({
        variant: "destructive",
        title: "Error creating room",
        description: roomError.message
      });
      return;
    }

    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        room_id: roomId,
        name: playerName,
        is_host: true
      });

    if (playerError) {
      toast({
        variant: "destructive",
        title: "Error joining room",
        description: playerError.message
      });
      return;
    }

    setPlayerName(playerName);
  };

  const joinRoom = async (roomId: string, playerName: string): Promise<boolean> => {
    const { data: existingRoom } = await supabase
      .from('game_rooms')
      .select('*, players(*)')
      .eq('id', roomId)
      .single();

    if (!existingRoom) {
      toast({
        variant: "destructive",
        title: "Room not found",
        description: "Please check the room code and try again."
      });
      return false;
    }

    const { error: playerError } = await supabase
      .from('players')
      .insert({
        id: playerId,
        room_id: roomId,
        name: playerName,
        is_host: false
      });

    if (playerError) {
      toast({
        variant: "destructive",
        title: "Error joining room",
        description: playerError.message
      });
      return false;
    }

    setPlayerName(playerName);
    return true;
  };

  const startGame = async () => {
    if (!room || room.players.length < 3) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        state: 'selecting',
        round: room.round + 1
      })
      .eq('id', room.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: error.message
      });
    }
  };

  const selectCategory = async (categoryName: string) => {
    if (!room) return;

    const selectedCategory = categories.find(c => c.name === categoryName);
    if (!selectedCategory) return;

    const randomWordIndex = Math.floor(Math.random() * selectedCategory.words.length);
    const secretWord = selectedCategory.words[randomWordIndex];
    const chameleonIndex = Math.floor(Math.random() * room.players.length);
    const chameleonId = room.players[chameleonIndex].id;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        state: 'presenting',
        category: selectedCategory.name,
        secret_word: secretWord,
        chameleon_id: chameleonId,
        timer: settings.discussionTime
      })
      .eq('id', room.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error selecting category",
        description: error.message
      });
    }
  };

  const submitVote = async (targetPlayerId: string) => {
    if (!room || !playerId) return;

    const { error } = await supabase
      .from('players')
      .update({ vote: targetPlayerId })
      .eq('id', playerId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error submitting vote",
        description: error.message
      });
      return;
    }

    const allVoted = room.players.every(p => p.vote);
    if (allVoted) {
      await supabase
        .from('game_rooms')
        .update({ state: 'results' })
        .eq('id', room.id);
    }
  };

  const nextRound = async () => {
    if (!room) return;

    if (room.round >= room.maxRounds) {
      await resetGame();
    } else {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          state: 'selecting',
          round: room.round + 1,
          category: null,
          secret_word: null,
          chameleon_id: null,
          timer: null
        })
        .eq('id', room.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error starting next round",
          description: error.message
        });
      }

      await supabase
        .from('players')
        .update({ vote: null })
        .eq('room_id', room.id);
    }
  };

  const leaveRoom = async () => {
    if (!room || !playerId) return;

    const { error } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error leaving room",
        description: error.message
      });
      return;
    }

    setRoom(null);
    setPlayerName('');
  };

  const resetGame = async () => {
    if (!room) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        state: 'lobby',
        round: 0,
        category: null,
        secret_word: null,
        chameleon_id: null,
        timer: null
      })
      .eq('id', room.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error resetting game",
        description: error.message
      });
      return;
    }

    await supabase
      .from('players')
      .update({ vote: null })
      .eq('room_id', room.id);
  };

  const value = {
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
    isPlayerChameleon,
    remainingTime,
    playerName,
    setPlayerName
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
