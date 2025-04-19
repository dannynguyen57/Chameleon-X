import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameRoom, GameSettings } from '@/lib/types';
import { useEffect } from 'react';
import { mapRoomData } from '@/hooks/useGameRealtime';

export const useGameActions = (
  playerId: string,
  room: GameRoom | null,
  settings: GameSettings,
  setRoom: (room: GameRoom | null) => void
) => {
  const { toast } = useToast();

  const createRoom = async (playerName: string, settings: GameSettings): Promise<string | null> => {
    const roomId = playerId.substring(0, 6).toUpperCase();
    
    try {
      // Use a transaction to ensure atomicity
      const { data: room, error } = await supabase.rpc('create_game_room', {
        p_room_id: roomId,
        p_host_id: playerId,
        p_player_name: playerName,
        p_settings: settings
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error creating room",
          description: error.message
        });
        return null;
      }

      return roomId;
    } catch (error) {
      console.error('Error in createRoom:', error);
      toast({
        variant: "destructive",
        title: "Error creating room",
        description: "An unexpected error occurred"
      });
      return null;
    }
  };

  const joinRoom = async (roomId: string, playerName: string): Promise<boolean> => {
    try {
      // Use a stored procedure for atomic operations
      const { data, error } = await supabase.rpc('join_game_room', {
        p_room_id: roomId,
        p_player_id: playerId,
        p_player_name: playerName
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Error joining room",
          description: error.message
        });
        return false;
      }

      return data;
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        variant: "destructive",
        title: "Error joining room",
        description: "An unexpected error occurred while joining the room."
      });
      return false;
    }
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

    try {
      // Update the room state and game setup
      const { data: updatedRoom, error } = await supabase
        .from('game_rooms')
        .update({
          state: 'presenting',
          category: selectedCategory.name,
          secret_word: secretWord,
          chameleon_id: chameleonId,
          timer: settings.discussion_time,
          current_turn: 0,
          turn_order: room.players.map(p => p.id),
          round: room.round || 1,
          last_updated: new Date().toISOString()
        })
        .eq('id', room.id)
        .select()
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Error selecting category",
          description: error.message
        });
        return;
      }

      // Update all players' roles and reset their descriptions
      const playerUpdates = room.players.map(player => ({
        id: player.id,
        role: player.id === chameleonId ? 'chameleon' : 'regular',
        turn_description: null,
        vote: null,
        last_active: new Date().toISOString()
      }));

      for (const update of playerUpdates) {
        const { error: playerError } = await supabase
          .from('players')
          .update({
            role: update.role,
            turn_description: update.turn_description,
            vote: update.vote,
            last_active: update.last_active
          })
          .eq('id', update.id)
          .eq('room_id', room.id);

        if (playerError) {
          toast({
            variant: "destructive",
            title: "Error updating player roles",
            description: playerError.message
          });
          return;
        }
      }

      // Update local room state immediately
      if (updatedRoom) {
        const mappedRoom = mapRoomData(updatedRoom);
        setRoom(mappedRoom);
      }

      toast({
        title: "Category selected!",
        description: "The game has started. Regular players know the word, while the chameleon must blend in!"
      });
    } catch (error) {
      console.error('Error in selectCategory:', error);
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "An unexpected error occurred while setting up the game."
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

    if (room.round >= room.max_rounds) {
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

  const cleanupRoom = async (roomId: string) => {
    try {
      // Check if room is empty
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId);

      if (playersError) {
        console.error('Error checking room players:', playersError);
        return;
      }

      // If room is empty, delete it
      if (!players || players.length === 0) {
        const { error: deleteError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);

        if (deleteError) {
          console.error('Error deleting empty room:', deleteError);
        }
      }
    } catch (error) {
      console.error('Error in cleanupRoom:', error);
    }
  };

  const leaveRoom = async () => {
    if (!room) return;

    try {
      // Remove player from the room
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (deleteError) {
        console.error('Error removing player:', deleteError);
        return;
      }

      // Clean up the room if it's empty
      await cleanupRoom(room.id);
    } catch (error) {
      console.error('Error in leaveRoom:', error);
    }
  };

  // Add cleanup on window close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (room) {
        await leaveRoom();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [room, playerId]);

  // Add periodic cleanup check
  useEffect(() => {
    if (!room) return;

    const cleanupInterval = setInterval(async () => {
      try {
        // Check for inactive players (no activity in last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        
        const { data: inactivePlayers, error: inactiveError } = await supabase
          .from('players')
          .select('id')
          .eq('room_id', room.id)
          .lt('last_active', fiveMinutesAgo);

        if (inactiveError) {
          console.error('Error checking inactive players:', inactiveError);
          return;
        }

        // Remove inactive players
        if (inactivePlayers && inactivePlayers.length > 0) {
          const { error: deleteError } = await supabase
            .from('players')
            .delete()
            .in('id', inactivePlayers.map(p => p.id));

          if (deleteError) {
            console.error('Error removing inactive players:', deleteError);
            return;
          }

          // Clean up the room if it's empty
          await cleanupRoom(room.id);
        }
      } catch (error) {
        console.error('Error in periodic cleanup:', error);
      }
    }, 60000); // Check every minute

    return () => clearInterval(cleanupInterval);
  }, [room]);

  const resetGame = async () => {
    if (!room) return;

    try {
      // Reset game state to lobby
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

      // Clear all votes
      await supabase
        .from('players')
        .update({ vote: null })
        .eq('room_id', room.id);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error resetting game",
        description: "An unexpected error occurred"
      });
    }
  };

  const updateSettings = async (newSettings: GameSettings) => {
    if (!room) return;

    const { error } = await supabase
      .from('game_rooms')
      .update({
        max_rounds: newSettings.max_rounds,
        discussion_time: newSettings.discussion_time,
        game_mode: newSettings.game_mode,
        max_players: newSettings.max_players,
        team_size: newSettings.team_size,
        chaos_mode: newSettings.chaos_mode,
        time_per_round: newSettings.time_per_round,
        voting_time: newSettings.voting_time
      })
      .eq('id', room.id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: error.message
      });
    }
  };

  return {
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitVote,
    nextRound,
    leaveRoom,
    resetGame,
    updateSettings
  };
};
