import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameRoom, GameSettings, GameState, PlayerRole, Player } from '@/lib/types';
import { useEffect, useCallback } from 'react';
import { GamePhase } from '@/types/GamePhase';
import {
  fetchRoom,
  assignRoles,
  handleGameStateTransition,
  updatePlayer,
  getSimilarWord,
  DBPlayerData
} from '@/lib/gameLogic';
import { toast } from 'sonner';
import { mapRoomData, DatabaseRoom } from '@/hooks/useGameRealtime';
import { v4 as uuidv4 } from 'uuid';

// Helper functions are now in gameLogic.ts
// const calculateImposterCount = ...
// const calculateWordSimilarity = ...
// const fetchRoom = ...
// const assignRoles = ...
// type DBPlayerData = ...
// const handleGameStateTransition = ...
// const updatePlayer = ...

export const useGameActions = (
  playerId: string,
  room: GameRoom | null,
  settings: GameSettings,
  setRoom: (room: GameRoom | null) => void
) => {
  const { toast: useToastToast } = useToast();

  const submitWord = useCallback(async (word: string) => {
    if (!room || !playerId) return false;

    // Basic validation
    if (!word.trim()) {
      toast.error("Please enter a valid word or phrase.");
      return false;
    }

    // Check if it's the player's turn
    const currentTurnPlayerId = room.turn_order?.[room.current_turn ?? 0];
    if (currentTurnPlayerId && currentTurnPlayerId !== playerId) {
      toast.error("It's not your turn to submit a word.");
      return false;
    }

    try {
      await updatePlayer(playerId, room.id, { turn_description: word });
      
      const latestRoomData = await fetchRoom(room.id);
      if (!latestRoomData) {
        toast.error("Could not refresh game state after submission.");
        return false;
      }
      
      // Check if all players have submitted
      const allPlayersSubmitted = latestRoomData.players.every(p => p.turn_description);
      
      if (allPlayersSubmitted) {
        // Move to discussion phase
        await handleGameStateTransition(room.id, latestRoomData.state, settings, latestRoomData);
        toast.success("All players have submitted! Moving to discussion phase.");
      } else {
        // Move to next player's turn
        const nextTurnIndex = (room.current_turn ?? 0) + 1;
        const nextPlayerId = room.turn_order?.[nextTurnIndex];
        const nextPlayer = latestRoomData.players.find(p => p.id === nextPlayerId);
        
        if (nextPlayer) {
          toast.success(`Submitted! Now it's ${nextPlayer.name}'s turn.`);
        } else {
          toast.success("Submitted! Waiting for next player's turn.");
        }
      }
      
      const finalRoomState = await fetchRoom(room.id);
      setRoom(finalRoomState as GameRoom);
      return true;
      
    } catch (error: unknown) {
      let errorMessage = "An unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Error in submitWord:", error);
      toast.error(errorMessage);
      return false;
    }
  }, [room, playerId, settings, setRoom]);

  const updateSettings = async (newSettings: GameSettings) => {
    if (!room) return;

    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          settings: {
            ...room.settings,
            ...newSettings,
            discussion_time: newSettings.discussion_time,
            time_per_round: newSettings.time_per_round,
            voting_time: newSettings.voting_time
          },
          discussion_time: newSettings.discussion_time,
          time_per_round: newSettings.time_per_round,
          voting_time: newSettings.voting_time,
          timer: newSettings.discussion_time
        })
        .eq('id', room.id);

      if (error) throw error;
      
      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
    } catch (error) {
      toast.error("Error updating settings");
    }
  };

  const createRoom = async (playerName: string, settings: GameSettings, roomId: string): Promise<string | null> => {
    try {
      // Check if room already exists and is full
      const { data: existingRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking room:', fetchError);
        throw new Error(`Failed to check room: ${fetchError.message}`);
      }

      if (existingRoom) {
        const { count: playerCount } = await supabase
          .from('players')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId);

        if (playerCount && playerCount >= settings.max_players) {
          toast.error("Room is full");
          return null;
        }
      }

      // Create the host player first
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          name: playerName,
          is_host: true,
          is_ready: true,
          last_active: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (playerError) {
        console.error('Error creating player:', playerError);
        throw new Error(`Failed to create player: ${playerError.message}`);
      }

      // Then create the room
      const { error } = await supabase
        .from('game_rooms')
        .insert({
          id: roomId,
          host_id: playerId,
          state: 'lobby',
          settings: settings,
          max_players: settings.max_players,
          discussion_time: settings.discussion_time,
          max_rounds: settings.max_rounds,
          game_mode: settings.game_mode,
          team_size: settings.team_size,
          chaos_mode: settings.chaos_mode,
          time_per_round: settings.time_per_round,
          voting_time: settings.voting_time,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (error) {
        console.error('Error creating room:', error);
        throw new Error(`Failed to create room: ${error.message}`);
      }

      // Update the player with the room_id
      const { error: updateError } = await supabase
        .from('players')
        .update({ room_id: roomId })
        .eq('id', playerId);

      if (updateError) {
        console.error('Error updating player:', updateError);
        throw new Error(`Failed to update player: ${updateError.message}`);
      }

      // Return the room ID
      return roomId;
    } catch (error) {
      console.error('Error in createRoom:', error);
      return null;
    }
  };

  const joinRoom = async (
    roomId: string, 
    playerName: string,
    setPlayerId: (id: string) => void
  ): Promise<boolean> => {
    try {
      // Check if room exists and is full
      const { data: room, error: roomError } = await supabase
        .from('game_rooms')
        .select('settings')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('Error checking room:', roomError);
        toast.error("Room not found");
        return false;
      }

      const { count: playerCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (playerCount && playerCount >= room.settings.max_players) {
        toast.error("Room is full");
        return false;
      }

      // Generate a new player ID
      const newPlayerId = uuidv4();

      // Create the player
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          id: newPlayerId,
          name: playerName,
          room_id: roomId,
          is_host: false,
          is_ready: false,
          last_active: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (playerError) {
        toast.error("Error joining room");
        return false;
      }

      // Update the context with the new player ID
      setPlayerId(newPlayerId);

      return true;
    } catch (error) {
      console.error('Error in joinRoom:', error);
      toast.error("An error occurred while joining the room");
      return false;
    }
  };

  const startGame = async () => {
    if (!room) return;

    try {
      // Update room state to Selecting
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          state: GameState.Selecting,
          current_turn: 0,
          timer: room.settings.time_per_round
        })
        .eq('id', room.id);

      if (updateError) throw updateError;

      // Fetch updated room data
      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) {
        setRoom(updatedRoom);
      }
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error("Failed to start game. Please try again.");
    }
  };

  const selectCategory = async (category: string) => {
    if (!room || !room.players.length || room.state !== GameState.Selecting) return;

    try {
      const categoryData = categories.find(c => c.name === category);
      if (!categoryData?.words.length) {
        toast.error("Category has no words.");
        return;
      }
      
      const secretWord = categoryData.words[Math.floor(Math.random() * categoryData.words.length)];

      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ category: category, secret_word: secretWord, last_updated: new Date().toISOString() })
        .eq('id', room.id);
        
      if (updateError) throw updateError;

      const updatedRoomWithRoles = await fetchRoom(room.id);
      if (!updatedRoomWithRoles) throw new Error("Failed to fetch room after role assignment.");
      
      const chameleon = updatedRoomWithRoles.players.find(p => p.role === PlayerRole.Chameleon);
      const mimic = updatedRoomWithRoles.players.find(p => p.role === PlayerRole.Mimic);
      const spy = updatedRoomWithRoles.players.find(p => p.role === PlayerRole.Spy);
      
      const playerUpdates = [];
      if (spy && chameleon) {
          playerUpdates.push(supabase.from('players').update({ special_word: chameleon.id }).eq('id', spy.id));
      }
      if (mimic && secretWord && categoryData) {
          const similarWord = getSimilarWord(secretWord, categoryData.words);
          playerUpdates.push(supabase.from('players').update({ special_word: similarWord }).eq('id', mimic.id));
      }
      
      if (playerUpdates.length > 0) {
          await Promise.all(playerUpdates);
      }

      await handleGameStateTransition(room.id, GameState.Selecting, settings, updatedRoomWithRoles);

      const finalRoomState = await fetchRoom(room.id);
      if (finalRoomState) setRoom(finalRoomState);

    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.error("Error selecting category:", error);
      toast.error(errorMessage);
    }
  };

  const submitVote = async (votedPlayerId: string) => {
    if (!room || !playerId || room.state !== GameState.Voting) return;

    const voter = room.players.find(p => p.id === playerId);
    if (!voter || voter.vote) {
      toast.error("You have already submitted your vote.");
      return;
    }
    
    const targetPlayer = room.players.find(p => p.id === votedPlayerId);
    if (targetPlayer?.is_protected) {
       toast.error(`${targetPlayer.name} is protected.`);
       return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ vote: votedPlayerId, last_updated: new Date().toISOString() })
        .eq('id', playerId);

      if (error) throw error;

      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) setRoom(updatedRoom);
      
      toast.success(`You voted for ${targetPlayer?.name || 'a player'}.`);

    } catch (error: unknown) {
      let errorMessage = "Failed to submit vote.";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.error('Error submitting vote:', error);
      toast.error(errorMessage);
    }
  };

  const nextRound = async () => {
    if (!room || room.host_id !== playerId || room.state !== GameState.Results) return;

    try {
        await handleGameStateTransition(room.id, GameState.Results, settings, room);
        const updatedRoom = await fetchRoom(room.id);
        if(updatedRoom) setRoom(updatedRoom);
    } catch (error: unknown) {
        let errorMessage = "Could not start next round.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        console.error("Error starting next round:", error);
        toast.error(errorMessage);
    }
  };

  const cleanupRoom = async (roomId: string) => {
    try {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId);

      if (playersError) {
        console.error('Error checking room players:', playersError);
        return;
      }

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

  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!room?.id || !playerId) return;

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('state, host_id, players!players_room_id_fkey ( id, is_host )' )
        .eq('id', room.id)
        .single();

      if (roomError) {
        console.error('Error checking room state:', roomError);
        return;
      }

      if (roomData?.state !== GameState.Lobby) {
        toast.error("You cannot leave once the game has started");
        return;
      }

      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (deleteError) {
        console.error('Error leaving room:', deleteError);
        toast.error("Error leaving room");
        return;
      }
      
      const leavingPlayerIsHost = room.players.find(p => p.id === playerId)?.is_host;
      const remainingPlayers = room.players.filter(p => p.id !== playerId);

      if (leavingPlayerIsHost && remainingPlayers.length > 0) {
        const newHost = remainingPlayers[0];
        const { error: hostUpdateError } = await supabase
          .from('players')
          .update({ is_host: true })
          .eq('id', newHost.id);
          
        const { error: roomHostUpdateError } = await supabase
          .from('game_rooms')
          .update({ host_id: newHost.id })
          .eq('id', room.id);

        if (hostUpdateError || roomHostUpdateError) {
          console.error('Error assigning new host:', hostUpdateError || roomHostUpdateError);
        }
      } else if (remainingPlayers.length === 0) {
         await cleanupRoom(room.id);
      }

      setRoom(null);
      toast.success("You have successfully left the room");
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.error('Error in leaveRoom:', error);
      toast.error(errorMessage);
    }
  }, [room, playerId, setRoom]);

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
  }, [room, leaveRoom]);

  useEffect(() => {
    if (!room) return;

    const cleanupInterval = setInterval(async () => {
      try {
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

        if (inactivePlayers && inactivePlayers.length > 0) {
          const { error: deleteError } = await supabase
            .from('players')
            .delete()
            .in('id', inactivePlayers.map(p => p.id));

          if (deleteError) {
            console.error('Error removing inactive players:', deleteError);
            return;
          }

          await cleanupRoom(room.id);
        }
      } catch (error) {
        console.error('Error in periodic cleanup:', error);
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, [room]);

  const resetGame = async () => {
    if (!room) return;

    try {
      // Update the game room state
      const { error } = await supabase
        .from('game_rooms')
        .update({
          state: GameState.Lobby,
          round: 0,
          category: null,
          secret_word: null,
          chameleon_id: null,
          timer: null,
          current_turn: 0,
          turn_order: null,
          round_outcome: null,
          votes_tally: null,
          revealed_player_id: null,
          revealed_role: null
        })
        .eq('id', room.id);

      if (error) {
        toast.error("Error resetting game");
        return;
      }

      // Reset all player states to their initial values
      await supabase
        .from('players')
        .update({ 
          vote: null,
          turn_description: null,
          role: null,
          is_protected: false,
          vote_multiplier: 1,
          special_word: null,
          special_ability_used: false
        })
        .eq('room_id', room.id);

      // Mark all players as not ready for a new game
      await supabase
        .from('players')
        .update({ is_ready: false })
        .eq('room_id', room.id);
      
      // Update the host's ready status to true
      if (playerId === room.host_id) {
        await supabase
          .from('players')
          .update({ is_ready: true })
          .eq('id', playerId);
      }

      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) setRoom(updatedRoom);
      
      toast.success("Game has been reset. Players can join a new game.");
    } catch (err: unknown) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleRoleAbility = async (targetPlayerId: string | null = null) => {
    if (!room || !playerId) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.special_ability_used || !player.role) {
      console.warn("Cannot use special ability: Player not found, already used, or no role.");
      return; 
    }

    // Don't allow ability use in certain game states
    if (room.state === GameState.Lobby || room.state === GameState.Results || room.state === GameState.Ended) {
      toast.error("Cannot use abilities during this game phase.");
      return;
    }

    // Find target player if ID is provided
    const targetPlayer = targetPlayerId ? room.players.find(p => p.id === targetPlayerId) : null;

    try {
      // Mark the ability as used for the current player immediately
      await updatePlayer(playerId, room.id, { special_ability_used: true });

      // --- Role Specific Logic ---
      switch (player.role) {
        case PlayerRole.Guardian:
          if (!targetPlayerId) {
            toast.error("No target selected for protection.");
            // Revert the special_ability_used flag
            await updatePlayer(playerId, room.id, { special_ability_used: false });
            return; 
          }
          console.log(`Guardian ${player.name} protecting ${targetPlayerId}`);
          // Set is_protected on the target player
          await updatePlayer(targetPlayerId, room.id, { is_protected: true });
          toast.success("You protected a player from being eliminated this round.");
          break;

        case PlayerRole.Timekeeper:
          // Double vote power
          await updatePlayer(playerId, room.id, { vote_multiplier: 2 });
          toast.success("Your vote will count double this round.");
          break;

        case PlayerRole.Whisperer:
          if (!targetPlayerId) {
            toast.error("Please select a player to whisper to.");
            await updatePlayer(playerId, room.id, { special_ability_used: false });
            return;
          }
          
          if (!targetPlayer) {
            toast.error("Target player not found.");
            await updatePlayer(playerId, room.id, { special_ability_used: false });
            return;
          }
          
          // This should be handled in the UI by showing the secret word to the whisperer
          toast.success(`You whispered to ${targetPlayer.name}.`);
          break;

        case PlayerRole.Illusionist:
          if (!targetPlayerId) {
            toast.error("Please select a player to create an illusion for.");
            await updatePlayer(playerId, room.id, { special_ability_used: false });
            return;
          }
          
          // Double the target player's vote power
          await updatePlayer(targetPlayerId, room.id, { vote_multiplier: 2 });
          toast.success("You've enhanced a player's vote power.");
          break;

        case PlayerRole.Trickster:
          // Make own vote negative
          await updatePlayer(playerId, room.id, { vote_multiplier: -1 });
          toast.success("Your vote will count as negative this round, allowing you to protect a player.");
          break;

        case PlayerRole.Mirror:
          if (!targetPlayerId) {
            toast.error("Please select a player to mirror.");
            await updatePlayer(playerId, room.id, { special_ability_used: false });
            return;
          }
          
          // In a full implementation, this would reveal the player's role to the target
          // For simplicity, we'll just notify
          toast.success("You've revealed your role to the target player.");
          break;

        case PlayerRole.Spy:
          // Spy ability is passive - they already know the Chameleon
          toast.success("You're using your spy abilities to observe other players.");
          break;

        case PlayerRole.Jester:
          // Make own vote not count
          await updatePlayer(playerId, room.id, { vote_multiplier: 0 });
          toast.success("Your vote will be nullified this round, helping your plan to get voted out.");
          break;

        case PlayerRole.Oracle:
          // Oracle's ability is passive - they know the secret word
          toast.success("You've used your oracle abilities to gain insight.");
          break;

        case PlayerRole.Mimic:
          // Mimic's ability is passive - they have a similar word
          toast.success("Your mimic abilities are in effect.");
          break;

        case PlayerRole.Chameleon:
          // Chameleon doesn't have a special ability to use
          toast.error("As the Chameleon, you must blend in without special abilities.");
          await updatePlayer(playerId, room.id, { special_ability_used: false });
          return;

        default:
          console.log(`No special ability action defined for role: ${player.role}`);
          // Revert the special_ability_used flag if no action was taken
          await updatePlayer(playerId, room.id, { special_ability_used: false });
          return;
      }

      // Fetch the latest room state after ability use
      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) setRoom(updatedRoom);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('Error using special ability:', err);
      toast.error(err.message || "Failed to use special ability");
      // Attempt to revert the used flag if an error occurred during the process
      await updatePlayer(playerId, room.id, { special_ability_used: false });
    }
  };

  const fetchRoom = async (roomId: string): Promise<GameRoom | null> => {
    try {
      // First get the room data
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) throw roomError;
      if (!roomData) return null;

      // Then get the players in the room
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId);

      if (playersError) throw playersError;

      // Combine the data
      const combinedData = {
        ...roomData,
        players: playersData || []
      };

      // Use mapRoomData to convert the database response to GameRoom type
      return mapRoomData(combinedData as DatabaseRoom);
    } catch (error) {
      console.error('Error fetching room:', error);
      return null;
    }
  };

  const setPlayerRole = async (playerId: string, role: PlayerRole) => {
    if (!room) return false;

    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          role,
          last_updated: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (error) throw error;

      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) {
        setRoom(updatedRoom);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error setting player role:', error);
      toast.error("Failed to update player role");
      return false;
    }
  };

  return {
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitWord,
    submitVote,
    nextRound,
    leaveRoom,
    resetGame,
    updateSettings,
    handleRoleAbility,
    setPlayerRole
  };
};
