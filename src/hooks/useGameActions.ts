import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameRoom, GameSettings, GameState, PlayerRole, Player, WordCategory } from '@/lib/types';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { mapRoomData, DatabaseRoom } from '@/hooks/useGameRealtime';
import {
  handleGameStateTransition,
  updatePlayer,
  assignRoles,
  getSimilarWord,
  // DBPlayerData
} from '@/lib/gameLogic';
import { getRandomWord } from '../lib/utils';
import { GamePhase as GamePhaseType } from '@/types/GamePhase';

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
  const submitWord = useCallback(async (word: string) => {
    if (!room || !playerId || !room.turn_order || typeof room.current_turn !== 'number') return;

    try {
      // Update the player's description
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          turn_description: word,
          last_updated: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (updateError) throw updateError;

      // Send broadcast to all players
      const channel = supabase.channel(`room:${room.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          action: 'description_submitted',
          playerId,
          description: word,
          timestamp: new Date().toISOString()
        }
      });

      // Fetch updated room data to ensure we have the latest state
      const { data: updatedRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*, players!players_room_id_fkey (*)')
        .eq('id', room.id)
        .single();

      if (fetchError) throw fetchError;

      if (updatedRoom) {
        const mappedRoom = mapRoomData(updatedRoom as DatabaseRoom);
        setRoom(mappedRoom);
      }

      // Check if all players have submitted their descriptions
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('turn_description')
        .eq('room_id', room.id);

      if (playersError) throw playersError;

      const allPlayersSubmitted = players?.every(p => p.turn_description);
      if (allPlayersSubmitted) {
        // Update room state to discussion phase
        const { error: stateError } = await supabase
          .from('game_rooms')
          .update({ 
            state: GameState.Discussion,
            last_updated: new Date().toISOString()
          })
          .eq('id', room.id);

        if (stateError) throw stateError;

        // Send broadcast for state change
        await channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: {
            action: 'game_state_changed',
            newState: GameState.Discussion,
            roomId: room.id
          }
        });
      }
    } catch (error) {
      console.error('Error submitting word:', error);
      toast.error("Failed to submit description. Please try again.");
    }
  }, [room, playerId, setRoom]);

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
        toast.success("Game settings updated successfully!");
      }
    } catch (error) {
      toast.error("Error updating settings");
    }
  };

  const createRoom = async (playerName: string, settings: GameSettings, roomId: string): Promise<string | null> => {
    try {
      console.log('Creating room with ID:', roomId, 'and player:', playerName);
      
      // Check if room already exists
      const { data: existingRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (fetchError) {
        console.error('Error checking room:', fetchError);
        throw new Error(`Failed to check room: ${fetchError.message}`);
      }

      // If room exists, check if it's full
      if (existingRoom) {
        console.log('Room already exists, checking if full');
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId);
          
        if (playersError) {
          console.error('Error checking players:', playersError);
          throw new Error(`Failed to check players: ${playersError.message}`);
        }
        
        const playerCount = players ? players.length : 0;
        console.log('Player count:', playerCount, 'Max players:', settings.max_players);
        
        if (playerCount >= settings.max_players) {
          console.log('Room is full');
          toast.error("Room is full");
          return null;
        }
      }

      // Check if player already exists in any room
      const { data: existingPlayer, error: playerCheckError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (playerCheckError) {
        console.error('Error checking existing player:', playerCheckError);
        throw new Error(`Failed to check existing player: ${playerCheckError.message}`);
      }

      // If player exists, delete their old record
      if (existingPlayer) {
        console.log('Player exists in another room, deleting old record');
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', playerId);

        if (deleteError) {
          console.error('Error deleting old player record:', deleteError);
          throw new Error(`Failed to delete old player record: ${deleteError.message}`);
        }
      }

      // Create the room first
      const { error: roomError } = await supabase
        .from('game_rooms')
        .upsert({
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

      if (roomError) {
        console.error('Error creating room:', roomError);
        throw new Error(`Failed to create room: ${roomError.message}`);
      }
      
      console.log('Room created successfully, adding player:', playerId);

      // Then create the host player
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          name: playerName,
          room_id: roomId,
          is_host: true,
          is_ready: true,
          last_active: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (playerError) {
        console.error('Error creating player:', playerError);
        // Clean up the room if player creation fails
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);
        throw new Error(`Failed to create player: ${playerError.message}`);
      }
      
      console.log('Player added successfully:', playerId);

      // Return the room ID
      return roomId;
    } catch (error) {
      console.error('Error in createRoom:', error);
      if (error instanceof Error) {
        toast.error(`Failed to create room: ${error.message}`);
      } else {
        toast.error('Failed to create room');
      }
      return null;
    }
  };

  const joinRoom = async (roomId: string, playerName: string): Promise<boolean> => {
    try {
      // Validate room ID
      if (!roomId || typeof roomId !== 'string') {
        toast.error("Please provide a valid room ID.");
        return false;
      }

      // Validate player name
      if (!playerName || typeof playerName !== 'string') {
        toast.error("Please provide a valid player name.");
        return false;
      }

      // Trim and validate name length
      const trimmedName = playerName.trim();
      if (trimmedName.length === 0) {
        toast.error("Player name cannot be empty.");
        return false;
      }

      if (trimmedName.length > 20) {
        toast.error("Player name must be 20 characters or less.");
        return false;
      }

      // Check for duplicate names (case-insensitive)
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players(*)
        `)
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('Error fetching room:', roomError);
        toast.error("Failed to join room. Please try again.");
        return false;
      }

      if (!roomData) {
        toast.error("Room not found");
        return false;
      }

      // Verify the room has a valid host
      if (!roomData.host_id) {
        toast.error("Invalid room: No host found");
        return false;
      }

      // Check if player name already exists in the room
      if (roomData.players?.some((p: Player) => 
        p.name.toLowerCase().trim() === trimmedName.toLowerCase()
      )) {
        toast.error("This name is already in use in this room. Please choose a different name.");
        return false;
      }

      // Check if player exists in any room
      const { data: existingPlayer, error: playerCheckError } = await supabase
        .from('players')
        .select('*')
        .eq('id', playerId)
        .maybeSingle();

      if (playerCheckError) {
        console.error('Error checking existing player:', playerCheckError);
        toast.error("Failed to check existing player. Please try again.");
        return false;
      }

      // If player exists in another room, delete their old record
      if (existingPlayer && existingPlayer.room_id !== roomId) {
        console.log('Player exists in another room, deleting old record');
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', playerId);

        if (deleteError) {
          console.error('Error deleting old player record:', deleteError);
          toast.error("Failed to delete old player record. Please try again.");
          return false;
        }
      }

      // Create new player with existing playerId
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          name: trimmedName,
          room_id: roomId,
          is_host: false, // Ensure new players are never hosts
          is_ready: true,
          last_active: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (playerError) {
        console.error('Error creating player:', playerError);
        toast.error("Failed to join room. Please try again.");
        return false;
      }

      // Update the room's last_updated timestamp and player_count
      const { error: roomUpdateError } = await supabase
        .from('game_rooms')
        .update({ 
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          player_count: (roomData.players?.length || 0) + 1
        })
        .eq('id', roomId);

      if (roomUpdateError) {
        console.error('Error updating room timestamp:', roomUpdateError);
      }

      // Send a broadcast message to force immediate updates for all players
      const channel = supabase.channel(`room:${roomId}`);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: { 
          action: 'player_joined',
          playerId: playerId,
          playerName: trimmedName,
          roomId: roomId
        }
      });

      // Also send a broadcast to the public_rooms channel
      const publicChannel = supabase.channel('public_rooms');
      await publicChannel.send({
        type: 'broadcast',
        event: 'sync',
        payload: { 
          action: 'player_joined',
          playerId: playerId,
          playerName: trimmedName,
          roomId: roomId
        }
      });

      // Fetch updated room data
      const { data: updatedRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players(*)
        `)
        .eq('id', roomId)
        .single();

      if (fetchError || !updatedRoom) {
        console.error('Error fetching updated room:', fetchError);
        toast.error("Failed to join room. Please try again.");
        return false;
      }

      // Update local state
      setRoom(updatedRoom as GameRoom);
      return true;
    } catch (error) {
      console.error('Error in joinRoom:', error);
      toast.error("An unexpected error occurred. Please try again.");
      return false;
    }
  };

  const startGame = async (room: GameRoom) => {
    try {
      console.log('startGame called', { roomId: room?.id, playerId });

      if (!room) {
        throw new Error('No room provided');
      }

      // First, check if all players are ready
      const allPlayersReady = room.players.every(player => player.is_ready);
      if (!allPlayersReady) {
        console.log('Not all players are ready:', room.players.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready })));
        toast.error("All players must be ready to start the game");
        return;
      }

      console.log('Starting game, updating room state to selecting');

      // Update the room state to 'selecting' and reset all player states
      const { error: stateUpdateError } = await supabase
        .from('game_rooms')
        .update({ 
          state: GameState.Selecting,
          round: 1,
          current_turn: 0,
          timer: settings.time_per_round,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id);

      if (stateUpdateError) {
        console.error('Error updating room state:', stateUpdateError);
        throw stateUpdateError;
      }

      console.log('Resetting player states');

      // Reset all player states
      const { error: resetError } = await supabase
        .from('players')
        .update({ 
          turn_description: null,
          vote: null,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1,
          last_updated: new Date().toISOString()
        })
        .eq('room_id', room.id);

      if (resetError) {
        console.error('Error resetting player states:', resetError);
        throw resetError;
      }

      console.log('Assigning roles to players');

      // Assign roles to all players
      await assignRoles(room.id, room.players);

      console.log('Sending broadcast messages');

      // Force a broadcast to all players
      const channel = supabase.channel(`room:${room.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          action: 'game_started',
          roomId: room.id,
          newState: GameState.Selecting,
          timestamp: new Date().toISOString()
        }
      });

      // Also send to public_rooms channel
      const publicChannel = supabase.channel('public_rooms');
      await publicChannel.send({
        type: 'broadcast',
        event: 'sync',
        payload: { 
          action: 'game_state_changed',
          newState: GameState.Selecting,
          roomId: room.id,
          round: 1,
          currentTurn: 0,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Fetching updated room data');

      // Fetch the updated room data
      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) {
        console.log('Updating local room state with:', updatedRoom);
        setRoom(updatedRoom);
        
        // Only navigate if we're not already on the correct page
        if (!window.location.pathname.includes(`/room/${room.id}`)) {
          window.location.href = `/room/${room.id}`;
        }
      } else {
        console.error('Failed to fetch updated room data');
        toast.error("Failed to start game. Please try again.");
      }

      // Show success toast
      toast.success("Game started! Host is selecting a category.");
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error("Failed to start game. Please try again.");
      throw error;
    }
  };

  const selectCategory = async (category: WordCategory) => {
    if (!room) {
      console.log('No room found in selectCategory');
      return;
    }

    try {
      console.log('Starting category selection:', {
        roomId: room.id,
        category: category.name,
        currentState: room.state
      });

      const secretWord = getRandomWord(category);
      console.log('Generated secret word:', secretWord);

      // Create completely random turn order (including host)
      const shuffledPlayers = [...room.players];
      for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
      }
      const turnOrder = shuffledPlayers.map(p => p.id);
      const currentTurn = 0;
      
      // Update the room in the database
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({ 
          category: category.name,
          state: GameState.Presenting,
          secret_word: secretWord,
          timer: settings.time_per_round,
          discussion_timer: settings.discussion_time,
          current_turn: currentTurn,
          turn_order: turnOrder,
          updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', room.id);

      if (updateError) {
        console.error('Error updating room:', updateError);
        throw updateError;
      }

      console.log('Room updated successfully');

      // Update local state immediately
      setRoom({
        ...room,
        category: category,
        state: GameState.Presenting,
        secret_word: secretWord,
        timer: settings.time_per_round,
        discussion_timer: settings.discussion_time,
        current_turn: currentTurn,
        turn_order: turnOrder,
        updated_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      });

      // Force a broadcast to all players with complete room state
      const channel = supabase.channel(`room:${room.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          action: 'category_selected',
          roomId: room.id,
          newState: GameState.Presenting,
          currentTurn,
          turnOrder,
          secretWord,
          category: category.name,
          timer: settings.time_per_round,
          discussionTimer: settings.discussion_time,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Broadcast sent to room channel');

      // Also send to public_rooms channel
      const publicChannel = supabase.channel('public_rooms');
      await publicChannel.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          action: 'category_selected',
          roomId: room.id,
          newState: GameState.Presenting,
          currentTurn,
          turnOrder,
          secretWord,
          category: category.name,
          timer: settings.time_per_round,
          discussionTimer: settings.discussion_time,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Broadcast sent to public rooms channel');

      // Add a small delay to ensure the database update has propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh data to ensure consistency
      const freshRoom = await fetchRoom(room.id);
      if (freshRoom) {
        console.log('Fetched updated room data:', {
          roomId: freshRoom.id,
          state: freshRoom.state,
          category: freshRoom.category?.name,
          currentTurn: freshRoom.current_turn,
          turnOrder: freshRoom.turn_order,
          secretWord: freshRoom.secret_word,
          discussionTimer: freshRoom.discussion_timer
        });
        setRoom(freshRoom);
      }

      // Show toast for first player's turn
      const firstPlayer = room.players.find(p => p.id === turnOrder[0]);
      if (firstPlayer) {
        toast.success(`It's ${firstPlayer.name}'s turn to describe the word!`);
      }

    } catch (error) {
      console.error('Error selecting category:', error);
      toast.error("Failed to select category. Please try again.");
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
    if (targetPlayer?.isProtected) {
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
          toast.error("Failed to clean up empty room");
        }
      }
    } catch (error) {
      console.error('Error in cleanupRoom:', error);
      toast.error("An error occurred while cleaning up the room");
    }
  };

  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!room?.id || !playerId) {
      console.error('leaveRoom: Missing room or playerId', { room, playerId });
      return;
    }

    try {
      console.log('leaveRoom: Starting room leave process', { roomId: room.id, playerId });

      // First check if the room is in a valid state for leaving
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('state, host_id, players!players_room_id_fkey ( id, is_host )' )
        .eq('id', room.id)
        .single();

      if (roomError) {
        console.error('leaveRoom: Error checking room state:', roomError);
        toast("Failed to leave room. Please try again.");
        return;
      }

      if (roomData?.state !== GameState.Lobby) {
        console.log('leaveRoom: Cannot leave - game has started', { roomState: roomData?.state });
        toast("You cannot leave once the game has started");
        return;
      }

      console.log('leaveRoom: Deleting player', { playerId, roomId: room.id });

      // Delete the player
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (deleteError) {
        console.error('leaveRoom: Error deleting player:', deleteError);
        toast("Failed to leave room. Please try again.");
        return;
      }
      
      const leavingPlayerIsHost = room.players.find(p => p.id === playerId)?.is_host;
      const remainingPlayers = room.players.filter(p => p.id !== playerId);

      if (leavingPlayerIsHost && remainingPlayers.length > 0) {
        console.log('leaveRoom: Assigning new host', { 
          newHostId: remainingPlayers[0].id,
          remainingPlayers: remainingPlayers.length 
        });

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
          console.error('leaveRoom: Error assigning new host:', hostUpdateError || roomHostUpdateError);
        }
      }

      // Check if there are any remaining players
      const { data: remainingPlayersData, error: remainingPlayersError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id);

      if (remainingPlayersError) {
        console.error('leaveRoom: Error checking remaining players:', remainingPlayersError);
        return;
      }

      // If no players left, delete the room
      if (!remainingPlayersData || remainingPlayersData.length === 0) {
        console.log('leaveRoom: No players remaining, deleting room', { roomId: room.id });

        const { error: deleteRoomError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', room.id);

        if (deleteRoomError) {
          console.error('leaveRoom: Error deleting empty room:', deleteRoomError);
          toast("Failed to clean up empty room");
          return;
        }

        // Send a broadcast message to force immediate updates
        const channel = supabase.channel(`room:${room.id}`);
        await channel.send({
          type: 'broadcast',
          event: 'sync',
          payload: { action: 'room_deleted', roomId: room.id }
        });

        setRoom(null);
        toast("You have successfully left the room and it has been deleted");
        return;
      }

      console.log('leaveRoom: Updating room timestamp', { 
        roomId: room.id,
        remainingPlayers: remainingPlayersData.length 
      });

      // Update the room's last_updated timestamp and player_count
      const { error: roomUpdateError } = await supabase
        .from('game_rooms')
        .update({ 
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          player_count: remainingPlayersData.length
        })
        .eq('id', room.id);

      if (roomUpdateError) {
        console.error('leaveRoom: Error updating room timestamp:', roomUpdateError);
      }

      // Send a broadcast message to force immediate updates
      const channel = supabase.channel(`room:${room.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: { action: 'player_left', playerId }
      });

      console.log('leaveRoom: Fetching updated room data', { roomId: room.id });

      // Fetch the latest room data before setting room to null
      const { data: updatedRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players(*)
        `)
        .eq('id', room.id)
        .single();

      if (fetchError) {
        console.error('leaveRoom: Error fetching updated room:', fetchError);
      }

      setRoom(null);
      toast("You have successfully left the room");
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
          errorMessage = error.message;
      }
      console.error('leaveRoom: Error in leaveRoom:', error);
      toast(errorMessage);
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

  const handleRoleAbility = async (targetPlayerId?: string) => {
    if (!room || !playerId) return;

    const currentPlayer = room.players.find(p => p.id === playerId);
    if (!currentPlayer || currentPlayer.special_ability_used || !currentPlayer.role) {
      console.warn("Cannot use special ability: Player not found, already used, or no role.");
      return; 
    }

    // Don't allow ability use in certain game states
    if (room.state === GameState.Lobby || room.state === GameState.Results || room.state === GameState.Ended) {
      toast.error("Cannot use abilities during this game phase.");
      return;
    }

    try {
      // Mark the ability as used for the current player immediately
      await updatePlayer(playerId, room.id, { special_ability_used: true });

      // Handle role-specific abilities
      switch (currentPlayer.role) {
        case PlayerRole.Guardian:
          if (targetPlayerId) {
            // Update target player's isProtected flag
            await updatePlayer(targetPlayerId, room.id, { isProtected: true });
          }
          break;
        case PlayerRole.Trickster:
          if (targetPlayerId) {
            // Swap votes between current player and target
            const targetPlayer = room.players.find(p => p.id === targetPlayerId);
            if (targetPlayer) {
              await updatePlayer(playerId, room.id, { vote: targetPlayer.vote });
              await updatePlayer(targetPlayerId, room.id, { vote: currentPlayer.vote });
            }
          }
          break;
        case PlayerRole.Illusionist:
          if (targetPlayerId) {
            // Double target player's vote multiplier
          await updatePlayer(targetPlayerId, room.id, { vote_multiplier: 2 });
          }
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
          console.log(`No special ability action defined for role: ${currentPlayer.role}`);
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
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`*,
          players:players(*)
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Map the data to our GameRoom type
      return mapRoomData(data as DatabaseRoom);
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

  const checkNameExists = async (roomId: string, playerName: string): Promise<boolean> => {
    try {
      // Validate room ID
      if (!roomId || typeof roomId !== 'string') {
        toast.error("Please provide a valid room ID.");
        return false;
      }

      // Validate player name
      if (!playerName || typeof playerName !== 'string') {
        toast.error("Please provide a valid player name.");
        return false;
      }

      // Trim and validate name length
      const trimmedName = playerName.trim();
      if (trimmedName.length === 0) {
        toast.error("Player name cannot be empty.");
        return false;
      }

      if (trimmedName.length > 20) {
        toast.error("Player name must be 20 characters or less.");
        return false;
      }

      // Check for duplicate names (case-insensitive)
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (roomError) {
        console.error('Error fetching room:', roomError);
        toast.error("Failed to check room. Please try again.");
        return false;
      }

      if (!roomData) {
        toast.error("Room not found");
        return false;
      }

      return roomData.players?.some((p: Player) => 
        p.name.toLowerCase().trim() === trimmedName.toLowerCase()
      );
    } catch (error) {
      console.error('Error checking name:', error);
      toast.error("An unexpected error occurred. Please try again.");
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
    setPlayerRole,
    checkNameExists
  };
};

