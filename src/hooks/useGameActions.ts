import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameRoom, GameSettings } from '@/lib/types';

export const useGameActions = (
  playerId: string,
  room: GameRoom | null,
  settings: GameSettings
) => {
  const { toast } = useToast();

  const createRoom = async (playerName: string, settings: GameSettings): Promise<boolean> => {
    const roomId = playerId.substring(0, 6).toUpperCase();
    
    const { error: roomError } = await supabase
      .from('game_rooms')
      .insert({
        id: roomId,
        host_id: playerId,
        state: 'lobby',
        max_rounds: settings.maxRounds,
        discussion_time: settings.discussionTime,
        game_mode: settings.gameMode,
        max_players: settings.maxPlayers,
        team_size: settings.teamSize || 2,
        chaos_mode: settings.chaosMode || false,
        time_per_round: settings.timePerRound || 60,
        voting_time: settings.votingTime || 30
      });

    if (roomError) {
      toast({
        variant: "destructive",
        title: "Error creating room",
        description: roomError.message
      });
      return false;
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
      return false;
    }

    return true;
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

    try {
      // Delete the player from the room
      const { error: playerError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (playerError) {
        toast({
          variant: "destructive",
          title: "Error leaving room",
          description: playerError.message
        });
        return;
      }

      // Check if this was the last player
      const { data: remainingPlayers } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id);

      if (!remainingPlayers || remainingPlayers.length === 0) {
        // If no players left, delete the room
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', room.id);
      } else {
        // If host left, assign new host
        if (playerId === room.hostId) {
          const newHost = remainingPlayers[0];
          await supabase
            .from('game_rooms')
            .update({ host_id: newHost.id })
            .eq('id', room.id);
        }

        // Reset game state to lobby if game was in progress
        if (room.state !== 'lobby') {
          await supabase
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

          // Clear all votes
          await supabase
            .from('players')
            .update({ vote: null })
            .eq('room_id', room.id);
        }
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error leaving room",
        description: "An unexpected error occurred"
      });
    }
  };

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
        max_rounds: newSettings.maxRounds,
        discussion_time: newSettings.discussionTime,
        game_mode: newSettings.gameMode,
        max_players: newSettings.maxPlayers,
        team_size: newSettings.teamSize,
        chaos_mode: newSettings.chaosMode,
        time_per_round: newSettings.timePerRound,
        voting_time: newSettings.votingTime
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
