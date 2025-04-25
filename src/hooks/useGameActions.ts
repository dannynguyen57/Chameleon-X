import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameSettings, GameState, PlayerRole, Player, WordCategory, VotingPhase, VotingOutcome, GameResultType, Vote } from '@/lib/types';
import { ExtendedGameRoom } from '@/contexts/GameContextProvider';
import { convertToExtendedRoom } from '@/lib/roomUtils';
import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { mapRoomData, DatabaseRoom } from '@/hooks/useGameRealtime';
import {
  transitionGameState,
  updatePlayer,
  assignRoles,
  getSimilarWord,
  // DBPlayerData
} from '@/lib/gameLogic';
import { getRandomWord } from '../lib/utils';
import { GamePhase as GamePhaseType } from '@/types/GamePhase';
import { DEFAULT_ROLES } from '@/lib/constants';

// Helper functions are now in gameLogic.ts
// const calculateImposterCount = ...
// const calculateWordSimilarity = ...
// const fetchRoom = ...
// const assignRoles = ...
// type DBPlayerData = ...
// const handleGameStateTransition = ...
// const updatePlayer = ...

const DEBUG = import.meta.env.DEV;

const log = {
  debug: (...args: unknown[]) => {
    if (DEBUG) console.log('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (DEBUG) console.info('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (DEBUG) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    console.error('[ERROR]', ...args);
  }
};

export const useGameActions = (
  playerId: string,
  room: ExtendedGameRoom | null,
  settings: GameSettings,
  setRoom: (room: ExtendedGameRoom | null) => void
) => {
  const submitWord = useCallback(async (word: string) => {
    if (!room || !playerId || !room.turn_order || typeof room.current_turn !== 'number') return;

    try {
      // Get the current player's index in the turn order
      const currentPlayerIndex = room.turn_order.indexOf(playerId);
      if (currentPlayerIndex === -1) return;

      // Calculate the next player's index
      const nextPlayerIndex = (currentPlayerIndex + 1) % room.turn_order.length;

      // First update the player's description in the players table
      const { error: playerUpdateError } = await supabase
        .from('players')
        .update({
          turn_description: word === "" ? "[Time Out]" : word === "skip" ? "[Skipped Turn]" : word,
          last_updated: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (playerUpdateError) throw playerUpdateError;

      // Then update the current turn in the game_rooms table
      const { error: roomUpdateError } = await supabase
        .from('game_rooms')
        .update({
          current_turn: nextPlayerIndex,
          last_updated: new Date().toISOString()
        })
        .eq('id', room.id);

      if (roomUpdateError) throw roomUpdateError;

      // Prepare broadcast payload
      const broadcastPayload = {
        action: 'description_submitted',
        playerId,
        description: word === "" ? "[Time Out]" : word === "skip" ? "[Skipped Turn]" : word,
        timestamp: new Date().toISOString(),
        roomId: room.id,
        isTimeout: word === "",
        isSkipped: word === "skip",
        currentTurn: nextPlayerIndex,
        turnOrder: room.turn_order
      };

      // Send broadcasts in parallel
      await Promise.all([
        supabase.channel(`room:${room.id}`).send({
          type: 'broadcast',
          event: 'sync',
          payload: broadcastPayload
        }),
        supabase.channel('public_rooms').send({
          type: 'broadcast',
          event: 'sync',
          payload: broadcastPayload
        })
      ]);

      // Fetch and update local state immediately
      const { data: updatedRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*, players!players_room_id_fkey (*)')
        .eq('id', room.id)
        .single();

      if (fetchError) throw fetchError;

      if (updatedRoom) {
        const mappedRoom = mapRoomData(updatedRoom as DatabaseRoom);
        setRoom(convertToExtendedRoom(mappedRoom));
      }
    } catch (error) {
      log.error('Error submitting word:', error);
      toast.error("Failed to submit description. Please try again.");
    }
  }, [room, playerId, setRoom]);

  const updateSettings = async (newSettings: GameSettings) => {
    if (!room) return false;

    try {
      log.info('Current room settings:', room.settings);
      log.info('New settings to apply:', newSettings);
      
      // First, validate the settings
      if (!newSettings || typeof newSettings !== 'object') {
        throw new Error('Invalid settings object');
      }

      // Ensure all required fields are present and valid
      const validatedSettings = {
        ...newSettings,
        max_players: Math.max(3, Math.min(20, newSettings.max_players || 10)),
        max_rounds: Math.max(1, Math.min(5, newSettings.max_rounds || 3)),
        discussion_time: Math.max(30, Math.min(300, newSettings.discussion_time || 120)),
        presenting_time: Math.max(30, Math.min(180, newSettings.presenting_time || 60)),
        voting_time: Math.max(10, Math.min(60, newSettings.voting_time || 30)),
        team_size: Math.max(2, Math.min(5, newSettings.team_size || 2)),
        game_mode: newSettings.game_mode || 'classic',
        chaos_mode: Boolean(newSettings.chaos_mode),
        special_abilities: Boolean(newSettings.special_abilities),
        roles: newSettings.roles || DEFAULT_ROLES
      };

      // Update both settings object and individual fields in one query
      const { data: updatedData, error: updateError } = await supabase
        .from('game_rooms')
        .update({
          settings: validatedSettings,
          max_players: validatedSettings.max_players,
          max_rounds: validatedSettings.max_rounds,
          game_mode: validatedSettings.game_mode,
          team_size: validatedSettings.team_size,
          chaos_mode: validatedSettings.chaos_mode,
          discussion_time: validatedSettings.discussion_time,
          presenting_time: validatedSettings.presenting_time,
          voting_time: validatedSettings.voting_time,
          last_updated: new Date().toISOString()
        })
        .eq('id', room.id)
        .select('*, players!players_room_id_fkey (*)')
        .single();

      if (updateError) {
        log.error('Error updating settings:', updateError);
        throw updateError;
      }

      log.info('Settings updated in database:', updatedData);

      if (updatedData) {
        // Force a fresh fetch of the room data
        const { data: freshData, error: fetchError } = await supabase
          .from('game_rooms')
          .select('*, players!players_room_id_fkey (*)')
          .eq('id', room.id)
          .single();

        if (fetchError) {
          log.error('Error fetching fresh room data:', fetchError);
          throw new Error('Failed to verify settings update');
        }

        if (freshData) {
          const mappedRoom = mapRoomData(freshData as DatabaseRoom);
          const extendedRoom = convertToExtendedRoom(mappedRoom);
          setRoom(extendedRoom);
          
          // Verify the settings were actually updated
          if (JSON.stringify(freshData.settings) !== JSON.stringify(validatedSettings)) {
            log.warn('Settings mismatch detected:', {
              expected: validatedSettings,
              actual: freshData.settings
            });
            throw new Error('Settings update verification failed');
          }
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      log.error('Error updating settings:', error);
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to update settings');
      }
      return false;
    }
  };

  const createRoom = async (playerName: string, settings: GameSettings, roomId: string): Promise<string | null> => {
    try {
      log.info('Creating room with ID:', roomId, 'and player:', playerName);
      
      // Check if room already exists
      const { data: existingRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*')
        .eq('id', roomId)
        .maybeSingle();

      if (fetchError) {
        log.error('Error checking room:', fetchError);
        throw new Error(`Failed to check room: ${fetchError.message}`);
      }

      // If room exists, check if it's full
      if (existingRoom) {
        log.info('Room already exists, checking if full');
        const { data: players, error: playersError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId);
          
        if (playersError) {
          log.error('Error checking players:', playersError);
          throw new Error(`Failed to check players: ${playersError.message}`);
        }
        
        const playerCount = players ? players.length : 0;
        log.info('Player count:', playerCount, 'Max players:', settings.max_players);
        
        if (playerCount >= settings.max_players) {
          log.info('Room is full');
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
        log.error('Error checking existing player:', playerCheckError);
        throw new Error(`Failed to check existing player: ${playerCheckError.message}`);
      }

      // If player exists, delete their old record
      if (existingPlayer) {
        log.info('Player exists in another room, deleting old record');
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', playerId);

        if (deleteError) {
          log.error('Error deleting old player record:', deleteError);
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
          presenting_time: settings.presenting_time,
          voting_time: settings.voting_time,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_updated: new Date().toISOString()
        });

      if (roomError) {
        log.error('Error creating room:', roomError);
        throw new Error(`Failed to create room: ${roomError.message}`);
      }
      
      log.info('Room created successfully, adding player:', playerId);

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
        log.error('Error creating player:', playerError);
        // Clean up the room if player creation fails
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);
        throw new Error(`Failed to create player: ${playerError.message}`);
      }
      
      log.info('Player added successfully:', playerId);

      // Return the room ID
      return roomId;
    } catch (error) {
      log.error('Error in createRoom:', error);
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
        log.error('Error fetching room:', roomError);
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
        log.error('Error checking existing player:', playerCheckError);
        toast.error("Failed to check existing player. Please try again.");
        return false;
      }

      // If player exists in another room, delete their old record
      if (existingPlayer && existingPlayer.room_id !== roomId) {
        log.info('Player exists in another room, deleting old record');
        const { error: deleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', playerId);

        if (deleteError) {
          log.error('Error deleting old player record:', deleteError);
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
        log.error('Error creating player:', playerError);
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
        log.error('Error updating room timestamp:', roomUpdateError);
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
        log.error('Error fetching updated room:', fetchError);
        toast.error("Failed to join room. Please try again.");
        return false;
      }

      // Update local state
      setRoom(updatedRoom as ExtendedGameRoom);
      return true;
    } catch (error) {
      log.error('Error in joinRoom:', error);
      toast.error("An unexpected error occurred. Please try again.");
      return false;
    }
  };

  const startGame = async (room: ExtendedGameRoom) => {
    try {
      log.debug('startGame called', { roomId: room?.id, playerId });

      if (!room) {
        throw new Error('No room provided');
      }

      // First, check if all players are ready
      const allPlayersReady = room.players.every(player => player.is_ready);
      if (!allPlayersReady) {
        log.info('Not all players are ready:', room.players.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready })));
        toast.error("All players must be ready to start the game");
        return;
      }

      // Create random turn order
      const shuffledPlayers = [...room.players];
      // Fisher-Yates shuffle algorithm for true randomness
      for (let i = shuffledPlayers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
      }
      
      const turnOrder = shuffledPlayers.map(p => p.id);
      const firstPlayerId = turnOrder[0];

      log.info('Starting game with turn order:', {
        turnOrder,
        firstPlayerId,
        players: shuffledPlayers.map(p => ({ id: p.id, name: p.name }))
      });

      // Reset all player states and set first player's turn
      const { error: resetError } = await supabase
        .from('players')
        .update({ 
          turn_description: null,
          vote: null,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1,
          is_turn: false,
          last_updated: new Date().toISOString()
        })
        .eq('room_id', room.id);

      if (resetError) {
        log.error('Error resetting player states:', resetError);
        throw resetError;
      }

      // Set first player's turn
      const { error: firstPlayerError } = await supabase
        .from('players')
        .update({ is_turn: true })
        .eq('id', firstPlayerId)
        .eq('room_id', room.id);

      if (firstPlayerError) {
        log.error('Error setting first player turn:', firstPlayerError);
        throw firstPlayerError;
      }

      // Update the room state to 'selecting' with turn order
      const { error: stateUpdateError } = await supabase
        .from('game_rooms')
        .update({ 
          state: GameState.Selecting,
          round: 1,
          current_turn: 0,
          turn_order: turnOrder,
          presenting_timer: settings.presenting_time,
          discussion_timer: settings.discussion_time,
          voting_timer: settings.voting_time,
          last_updated: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)
        .eq('host_id', playerId);

      if (stateUpdateError) {
        log.error('Error updating room state:', stateUpdateError);
        throw stateUpdateError;
      }

      log.info('Assigning roles to players');

      // Assign roles to all players
      await assignRoles(room.id, room.players);

      log.info('Sending broadcast messages');

      // Force a broadcast to all players
      const channel = supabase.channel(`room:${room.id}`);
      log.info('Sending broadcast to room channel:', room.id);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          action: 'game_started',
          roomId: room.id,
          newState: GameState.Selecting,
          turnOrder,
          currentTurn: 0,
          timestamp: new Date().toISOString()
        }
      });

      // Also send to public_rooms channel
      const publicChannel = supabase.channel('public_rooms');
      log.info('Sending broadcast to public rooms channel');
      await publicChannel.send({
        type: 'broadcast',
        event: 'sync',
        payload: { 
          action: 'game_state_changed',
          newState: GameState.Selecting,
          roomId: room.id,
          round: 1,
          currentTurn: 0,
          turnOrder,
          timestamp: new Date().toISOString()
        }
      });

      log.info('Fetching updated room data');

      // Fetch the updated room data
      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) {
        log.info('Updating local room state with:', updatedRoom);
        setRoom(updatedRoom);
        
        // Only navigate if we're not already on the correct page
        if (!window.location.pathname.includes(`/room/${room.id}`)) {
          window.location.href = `/room/${room.id}`;
        }
      } else {
        log.error('Failed to fetch updated room data');
        toast.error("Failed to start game. Please try again.");
      }

      // Show success toast
      toast.success("Game started! Host is selecting a category.");
    } catch (error) {
      log.error('Error starting game:', error);
      toast.error("Failed to start game. Please try again.");
      throw error;
    }
  };

  const selectCategory = async (category: WordCategory) => {
    if (!room) {
      log.error('No room found in selectCategory');
      return;
    }

    try {
      log.debug('Starting category selection:', {
        roomId: room.id,
        category: category.name,
        currentState: room.state
      });

      const secretWord = getRandomWord(category);
      log.debug('Generated secret word:', secretWord);

      // Use the existing turn order instead of creating a new one
      const turnOrder = room.turn_order || [];
      const currentTurn = 0;
      
      // Prepare all updates in one object
      const updates = {
        category: category.name,
        state: GameState.Presenting,
        secret_word: secretWord,
        presenting_timer: settings.presenting_time,
        discussion_timer: settings.discussion_time,
        voting_timer: settings.voting_time,
        current_turn: 0,
        turn_order: turnOrder,
        updated_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      // Update the room in the database
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update(updates)
        .eq('id', room.id);

      if (updateError) {
        log.error('Error updating room:', updateError);
        throw updateError;
      }

      log.info('Room updated successfully with turn order:', turnOrder);

      // Update local state immediately with the full category object
      setRoom({
        ...room,
        ...updates,
        category: category
      });

      // Prepare broadcast payload
      const broadcastPayload = {
        action: 'category_selected',
        roomId: room.id,
        newState: GameState.Presenting,
        currentTurn,
        turnOrder,
        secretWord,
        category: category.name,
        presenting_timer: settings.presenting_time,
        discussion_timer: settings.discussion_time,
        voting_timer: settings.voting_time,
        timestamp: new Date().toISOString()
      };

      // Send broadcasts in parallel
      await Promise.all([
        supabase.channel(`room:${room.id}`).send({
          type: 'broadcast',
          event: 'sync',
          payload: broadcastPayload
        }),
        supabase.channel('public_rooms').send({
          type: 'broadcast',
          event: 'sync',
          payload: broadcastPayload
        })
      ]);

      log.info('Broadcasts sent successfully');

      // Add a small delay to ensure the database update has propagated
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch fresh data to ensure consistency
      const freshRoom = await fetchRoom(room.id);
      if (freshRoom) {
        log.info('Fetched updated room data:', {
          roomId: freshRoom.id,
          state: freshRoom.state,
          category: freshRoom.category?.name,
          currentTurn: freshRoom.current_turn,
          turnOrder: freshRoom.turn_order,
          secretWord: freshRoom.secret_word,
          discussion_timer: freshRoom.discussion_timer,
          presenting_timer: freshRoom.presenting_timer,
          voting_timer: freshRoom.voting_timer
        });
        setRoom(freshRoom);
      }

      // Show toast for first player's turn
      const firstPlayer = room.players.find(p => p.id === turnOrder[0]);
      if (firstPlayer) {
        toast.success(`It's ${firstPlayer.name}'s turn to describe the word!`);
      }

    } catch (error) {
      log.error('Error selecting category:', error);
      toast.error("Failed to select category. Please try again.");
    }
  };

  const submitVote = async (votedPlayerId: string) => {
    if (!room || !playerId || !room.current_voting_round_id) return;
    const currentVotingRoundId = room.current_voting_round_id;
    const currentRoomId = room.id;

    try {
      // Submit vote
      const { error: voteError } = await supabase.from('votes').insert({
        round_id: currentVotingRoundId,
        voter_id: playerId,
        target_id: votedPlayerId
      });
      if (voteError) throw voteError;

      // Broadcast the vote to update progress bars faster
      await supabase.channel(`room:${currentRoomId}`).send({
        type: 'broadcast', event: 'sync',
        payload: { action: 'player_voted', roomId: currentRoomId, voterId: playerId, targetId: votedPlayerId, roundId: currentVotingRoundId }
      });

      // Fetch the updated vote count
      const { data: updatedVotes, error: countError, count } = await supabase
        .from('votes').select('id', { count: 'exact', head: true }).eq('round_id', currentVotingRoundId);
      if (countError) console.error('Error fetching vote count:', countError);
      
      // Fetch player count separately for robustness
      const { data: playersData, error: playerFetchError } = await supabase
        .from('players').select('id', { count: 'exact', head: true }).eq('room_id', currentRoomId);
      if (playerFetchError) console.error('Error fetching player count:', playerFetchError);

      const voteCount = count ?? (room.current_voting_round?.votes?.length || 0) + 1; 
      const playerCount = playersData?.length ?? room.players.length;
      log.info(`Vote submitted. Current count: ${voteCount}/${playerCount}`);

      // Check if all players have voted
      if (playerCount > 0 && voteCount >= playerCount) { // Ensure playerCount > 0
        log.info('All players have voted. Processing results...');
        const { nextState: resultsState, gameShouldEnd, updateData, error: resultsError } = await processVotingResults(currentRoomId, currentVotingRoundId);
        
        if (resultsError) {
          console.error('Error processing voting results immediately:', resultsError);
          toast.error("Error processing results.")
        } else {
          // Update room state to Results first
          const { error: roomUpdateError } = await supabase.from('game_rooms').update({
            ...updateData // Contains state=Results, outcome, voted player etc.
          }).eq('id', currentRoomId);
          if (roomUpdateError) throw roomUpdateError;
          
          // Send broadcast to sync state change to Results
          await supabase.channel(`room:${currentRoomId}`).send({
            type: 'broadcast', event: 'sync',
            payload: { action: 'voting_complete', roomId: currentRoomId, newState: GameState.Results }
          });

          // Fetch final state locally to update UI
          const finalRoomState = await fetchRoom(currentRoomId);
          if (finalRoomState) setRoom(finalRoomState);

          // IMPORTANT: The transition *after* Results is handled by ResultsDisplay timeout or a separate mechanism
          // This action's responsibility ends with setting the state to Results.
        }
      } else {
         // Still waiting for votes, fetch intermediate state to update vote counts
         const updatedRoom = await fetchRoom(currentRoomId);
         if (updatedRoom) setRoom(updatedRoom);
      }

    } catch (error: unknown) {
      log.error('Error submitting vote:', error);
      toast.error((error as Error).message || "Failed to submit vote.");
    }
  };

  const fetchRoom = useCallback(async (roomId: string): Promise<ExtendedGameRoom | null> => {
    try {
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`*,
          players:players(*),
          current_voting_round:voting_rounds!game_rooms_current_voting_round_id_fkey(*, votes(*)),
          current_round_result:round_results!round_results_round_id_fkey(*)
        `)
        .eq('id', roomId)
        .single();

      if (error) throw error;
      if (!data) return null;

      // Map the data to our ExtendedGameRoom type
      const mappedRoom = mapRoomData(data as DatabaseRoom);
      return convertToExtendedRoom(mappedRoom);
    } catch (error) {
      log.error('Error fetching room:', error);
      return null;
    }
  }, []);

  const resetGame = useCallback(async () => {
    if (!room) return;

    try {
      await supabase.from('game_rooms').update({
        state: GameState.Lobby, round: 0, category: null, secret_word: null,
        chameleon_id: null, timer: null, current_turn: 0, turn_order: null,
        round_outcome: null, votes_tally: null, revealed_player_id: null,
        revealed_role: null, current_voting_round_id: null, 
        voted_out_player: null, // Ensure this is reset
        presenting_timer: 0, discussion_timer: 0, voting_timer: 0 // Reset timers
      }).eq('id', room.id);

      await supabase.from('players').update({ 
        vote: null, turn_description: null, role: null, is_protected: false, 
        vote_multiplier: 1, special_word: null, special_ability_used: false,
        is_ready: false, is_turn: false // Reset ready & turn status
      }).eq('room_id', room.id);
      
      if (playerId === room.host_id) { // Host is auto-ready
        await supabase.from('players').update({ is_ready: true }).eq('id', playerId);
      }

      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) setRoom(updatedRoom);
      
      // Send broadcast for reset
      await supabase.channel(`room:${room.id}`).send({
         type: 'broadcast', event: 'sync',
         payload: { action: 'game_reset', roomId: room.id, newState: GameState.Lobby }
      });
      toast.success("Game reset to lobby.");
    } catch (err: unknown) {
      toast.error("Failed to reset game.");
    }
  }, [room, playerId, fetchRoom, setRoom]);

  const prepareNextPresentingPhase = useCallback(async () => {
    if (!room) return;
    const currentRoomId = room.id;
    const votedOutPlayerId = room.voted_out_player;
    try {
      log.info('Preparing next presenting phase for round:', room.round);
      const remainingPlayers = votedOutPlayerId 
          ? room.players.filter(p => p.id !== votedOutPlayerId) 
          : [...room.players];
      if (remainingPlayers.length === 0) {
         await resetGame(); 
         return;
      }
      
      // Check 1v1 win condition
      if (remainingPlayers.length === 2) {
        const chameleon = remainingPlayers.find(p => p.role === PlayerRole.Chameleon);
        if (chameleon) {
          log.info("Chameleon wins (1v1)!");
          await supabase.from('game_rooms').update({
             state: GameState.Ended,
             round_outcome: GameResultType.ChameleonSurvived // Mark how round ended before 1v1 win
          }).eq('id', currentRoomId);
          await supabase.channel(`room:${currentRoomId}`).send({
            type: 'broadcast', event: 'sync',
            payload: { action: 'game_over', roomId: currentRoomId, newState: GameState.Ended }
          });
          const finalRoom = await fetchRoom(currentRoomId);
          if(finalRoom) setRoom(finalRoom);
          return;
        }
      }

      // Create new turn order with remaining players
      const shuffledRemaining = [...remainingPlayers];
      for (let i = shuffledRemaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledRemaining[i], shuffledRemaining[j]] = [shuffledRemaining[j], shuffledRemaining[i]];
      }
      const nextTurnOrder = shuffledRemaining.map(p => p.id);
      const firstPlayerId = nextTurnOrder[0];
      await supabase.from('players')
        .update({ turn_description: null, vote: null, is_turn: false, special_ability_used: false, is_protected: false, vote_multiplier: 1, last_updated: new Date().toISOString() })
        .in('id', remainingPlayers.map(p => p.id));
      if (firstPlayerId) {
        await supabase.from('players').update({ is_turn: true }).eq('id', firstPlayerId);
      } else {
          log.error("Could not determine first player for next turn");
          await resetGame();
          return;
      }
      const { error: roomUpdateError } = await supabase.from('game_rooms')
        .update({
          state: GameState.Presenting,
          current_turn: 0, 
          turn_order: nextTurnOrder,
          presenting_timer: settings.presenting_time,
          discussion_timer: settings.discussion_time, 
          voting_timer: settings.voting_time, 
          voted_out_player: null, 
          revealed_player_id: null,
          revealed_role: null,
          round_outcome: null,
          current_voting_round_id: null,
          last_updated: new Date().toISOString()
        })
        .eq('id', currentRoomId);
      if (roomUpdateError) throw roomUpdateError;
      await supabase.channel(`room:${currentRoomId}`).send({
        type: 'broadcast', event: 'sync',
        payload: { action: 'continue_round', roomId: currentRoomId, newState: GameState.Presenting, round: room.round, turnOrder: nextTurnOrder, currentTurn: 0 }
      });
      const updatedRoom = await fetchRoom(currentRoomId);
      if (updatedRoom) setRoom(updatedRoom);
      const firstPlayerName = firstPlayerId ? remainingPlayers.find(p=>p.id === firstPlayerId)?.name : 'Next player';
      toast.info(`Continuing round ${room.round}. ${firstPlayerName}'s turn.`);

    } catch(error) {
      log.error("Error preparing next presenting phase:", error);
      toast.error("Failed to continue the round.");
    }
  }, [room, settings, resetGame, fetchRoom, setRoom]);

  const nextRound = useCallback(async () => {
    log.warn("nextRound is deprecated. Use prepareNextPresentingPhase or resetGame.");
    // Decide based on current state if we need to reset or continue
    if (room?.state === GameState.Results) {
        if (room.round_outcome === VotingOutcome.ChameleonFound || room.round >= room.max_rounds) {
            await resetGame(); // Game ends
        } else {
            await prepareNextPresentingPhase(); // Continue same round
        }
    } else {
        log.error("Cannot call nextRound from state:", room?.state);
    }
  }, [room, prepareNextPresentingPhase, resetGame]);

  const cleanupRoom = async (roomId: string) => {
    try {
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', roomId);

      if (playersError) {
        log.error('Error checking room players:', playersError);
        return;
      }

      if (!players || players.length === 0) {
        const { error: deleteError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', roomId);

        if (deleteError) {
          log.error('Error deleting empty room:', deleteError);
          toast.error("Failed to clean up empty room");
        }
      }
    } catch (error) {
      log.error('Error in cleanupRoom:', error);
      toast.error("An error occurred while cleaning up the room");
    }
  };

  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!room?.id || !playerId) {
      log.error('leaveRoom: Missing room or playerId', { room, playerId });
      return;
    }

    try {
      log.debug('leaveRoom: Starting room leave process', { roomId: room.id, playerId });

      // First check if the room is in a valid state for leaving
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('state, host_id, players!players_room_id_fkey ( id, is_host )' )
        .eq('id', room.id)
        .single();

      if (roomError) {
        log.error('leaveRoom: Error checking room state:', roomError);
        toast("Failed to leave room. Please try again.");
        return;
      }

      if (roomData?.state !== GameState.Lobby) {
        log.info('leaveRoom: Cannot leave - game has started', { roomState: roomData?.state });
        toast("You cannot leave once the game has started");
        return;
      }

      log.debug('leaveRoom: Deleting player', { playerId, roomId: room.id });

      // Delete the player
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (deleteError) {
        log.error('leaveRoom: Error deleting player:', deleteError);
        toast("Failed to leave room. Please try again.");
        return;
      }
      
      const leavingPlayerIsHost = room.players.find(p => p.id === playerId)?.is_host;
      const remainingPlayers = room.players.filter(p => p.id !== playerId);

      if (leavingPlayerIsHost && remainingPlayers.length > 0) {
        log.debug('leaveRoom: Assigning new host', { 
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
          log.error('leaveRoom: Error assigning new host:', hostUpdateError || roomHostUpdateError);
        }
      }

      // Check if there are any remaining players
      const { data: remainingPlayersData, error: remainingPlayersError } = await supabase
        .from('players')
        .select('id')
        .eq('room_id', room.id);

      if (remainingPlayersError) {
        log.error('leaveRoom: Error checking remaining players:', remainingPlayersError);
        return;
      }

      // If no players left, delete the room
      if (!remainingPlayersData || remainingPlayersData.length === 0) {
        log.debug('leaveRoom: No players remaining, deleting room', { roomId: room.id });

        const { error: deleteRoomError } = await supabase
          .from('game_rooms')
          .delete()
          .eq('id', room.id);

        if (deleteRoomError) {
          log.error('leaveRoom: Error deleting empty room:', deleteRoomError);
          toast("Failed to clean up empty room");
          return;
        }

        // Send broadcast messages to force immediate updates
        await Promise.all([
          supabase.channel(`room:${room.id}`).send({
            type: 'broadcast',
            event: 'sync',
            payload: { 
              action: 'room_deleted', 
              roomId: room.id,
              timestamp: new Date().toISOString()
            }
          }),
          supabase.channel('public_rooms_list').send({
            type: 'broadcast',
            event: 'sync',
            payload: { 
              action: 'room_deleted', 
              roomId: room.id,
              timestamp: new Date().toISOString()
            }
          }),
          supabase.channel('public_rooms').send({
            type: 'broadcast',
            event: 'sync',
            payload: { 
              action: 'room_deleted', 
              roomId: room.id,
              timestamp: new Date().toISOString()
            }
          })
        ]);

        setRoom(null);
        toast("You have successfully left the room and it has been deleted");
        return;
      }

      log.debug('leaveRoom: Updating room timestamp', { 
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
        log.error('leaveRoom: Error updating room timestamp:', roomUpdateError);
      }

      // Send broadcast messages to force immediate updates
      await Promise.all([
        supabase.channel(`room:${room.id}`).send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            action: 'player_left', 
            playerId,
            roomId: room.id,
            timestamp: new Date().toISOString(),
            remainingPlayers: remainingPlayersData.length
          }
        }),
        supabase.channel('public_rooms_list').send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            action: 'player_left', 
            playerId,
            roomId: room.id,
            timestamp: new Date().toISOString(),
            remainingPlayers: remainingPlayersData.length
          }
        }),
        supabase.channel('public_rooms').send({
          type: 'broadcast',
          event: 'sync',
          payload: { 
            action: 'player_left', 
            playerId,
            roomId: room.id,
            timestamp: new Date().toISOString(),
            remainingPlayers: remainingPlayersData.length
          }
        })
      ]);

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
        log.error('leaveRoom: Error fetching updated room:', fetchError);
      }

      setRoom(null);
      toast("You have successfully left the room");
    } catch (error: unknown) {
      let errorMessage = "An unexpected error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      log.error('leaveRoom: Error in leaveRoom:', error);
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
          log.error('Error checking inactive players:', inactiveError);
          return;
        }

        if (inactivePlayers && inactivePlayers.length > 0) {
          const { error: deleteError } = await supabase
            .from('players')
            .delete()
            .in('id', inactivePlayers.map(p => p.id));

          if (deleteError) {
            log.error('Error removing inactive players:', deleteError);
            return;
          }

          await cleanupRoom(room.id);
        }
      } catch (error) {
        log.error('Error in periodic cleanup:', error);
      }
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, [room]);

  const handleRoleAbility = async (targetPlayerId?: string) => {
    if (!room || !playerId) return;

    const currentPlayer = room.players.find(p => p.id === playerId);
    if (!currentPlayer || currentPlayer.special_ability_used || !currentPlayer.role) {
      log.warn("Cannot use special ability: Player not found, already used, or no role.");
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
          if (targetPlayerId) {
            // View Roles ability - Show one random role
            const targetPlayer = room.players.find(p => p.id === targetPlayerId);
            if (targetPlayer) {
              // Get a random role from the game's role pool
              const rolePool = room.settings.roles[room.settings.game_mode];
              const randomRole = rolePool[Math.floor(Math.random() * rolePool.length)];
              toast.success(`You sense that ${targetPlayer.name} might be a ${randomRole}`);
            }
          } else {
            // Blend In ability - Get a hint about the word
            const category = room.category;
            if (category) {
              // Get a random word from the same category
              const similarWord = getSimilarWord(room.secret_word || '', category.words);
              toast.success(`You sense the word might be related to "${similarWord}"`);
            }
          }
          break;
        default:
          log.info(`No special ability action defined for role: ${currentPlayer.role}`);
          // Revert the special_ability_used flag if no action was taken
          await updatePlayer(playerId, room.id, { special_ability_used: false });
          return;
      }

      // Fetch the latest room state after ability use
      const updatedRoom = await fetchRoom(room.id);
      if (updatedRoom) setRoom(updatedRoom);

    } catch (error: unknown) {
      const err = error as Error;
      log.error('Error using special ability:', err);
      toast.error(err.message || "Failed to use special ability");
      // Attempt to revert the used flag if an error occurred during the process
      await updatePlayer(playerId, room.id, { special_ability_used: false });
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
      log.error('Error setting player role:', error);
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
        log.error('Error fetching room:', roomError);
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
      log.error('Error checking name:', error);
      toast.error("An unexpected error occurred. Please try again.");
      return false;
    }
  };

  // const getPublicRooms = async (): Promise<ExtendedGameRoom[]> => {
  //   try {
  //     const { data, error } = await supabase
  //       .from('game_rooms')
  //       .select(`
  //         *,
  //         players!players_room_id_fkey(*)
  //       `)
  //       .eq('state', 'lobby')
  //       .order('created_at', { ascending: false });

  //     if (error) throw error;
  //     if (!data) return [];

  //     return data.map(room => convertToExtendedRoom(mapRoomData(room as DatabaseRoom)));
  //   } catch (error) {
  //     console.error('Error fetching public rooms:', error);
  //     return [];
  //   }
  // };

  return {
    createRoom,
    joinRoom,
    startGame,
    selectCategory,
    submitVote,
    prepareNextPresentingPhase,
    leaveRoom,
    resetGame,
    handleRoleAbility,
    setPlayerRole,
    submitWord,
    nextRound,
    updateSettings,
    checkNameExists,
    // getPublicRooms
  };
};

// Helper function to process voting results (can be expanded later)
const processVotingResults = async (roomId: string, votingRoundId: string): Promise<{ 
  nextState: GameState; // State *after* results are shown
  gameShouldEnd: boolean;
  updateData: Partial<DatabaseRoom>; // Data to set when entering Results state
  error: string | null 
}> => {
  try {
    const { data: roomData } = await supabase
      .from('game_rooms').select('*, players!players_room_id_fkey(*)').eq('id', roomId).single();
    const { data: votesData } = await supabase
      .from('votes').select('*').eq('round_id', votingRoundId);
    if (!roomData || !votesData) throw new Error('Missing room or vote data');
    const currentRoom = mapRoomData(roomData as DatabaseRoom);
    const votes = votesData as Vote[];
    const voteCounts = new Map<string, number>();
    votes.forEach(vote => {
      const voter = currentRoom.players.find(p => p.id === vote.voter_id);
      const multiplier = voter?.vote_multiplier || 1;
      voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + multiplier);
    });
    let maxVotes = -1; 
    let votedOutPlayerId: string | null = null;
    let tie = false;
    currentRoom.players.forEach(player => {
        if (!voteCounts.has(player.id)) { voteCounts.set(player.id, 0); }
    });
    for (const [playerId, count] of voteCounts.entries()) {
      const player = currentRoom.players.find(p => p.id === playerId);
      if (player?.is_protected) continue;
      if (count > maxVotes) {
        maxVotes = count; votedOutPlayerId = playerId; tie = false;
      } else if (count === maxVotes && maxVotes > 0) { tie = true; }
    }
    if (tie) { votedOutPlayerId = null; }
    const votedPlayer = votedOutPlayerId ? currentRoom.players.find(p => p.id === votedOutPlayerId) : null;
    const revealedRole = votedPlayer?.role || null;
    const isChameleonVoted = revealedRole === PlayerRole.Chameleon;
    const isJesterVoted = revealedRole === PlayerRole.Jester; 
    const isLastRound = currentRoom.round >= currentRoom.max_rounds;

    // Determine VotingOutcome (for round_results table)
    let votingOutcome: VotingOutcome;
    if (votedOutPlayerId) {
      // NOTE: Jester win isn't a VotingOutcome, handle via GameResultType
      votingOutcome = isChameleonVoted ? VotingOutcome.ChameleonFound 
                    : VotingOutcome.ChameleonSurvived;
    } else {
      votingOutcome = VotingOutcome.Tie;
    }

    // Determine GameResultType for the round (for game_rooms.round_outcome)
    let roundGameResult: GameResultType | null;
    if (votedOutPlayerId) {
        if (isJesterVoted) {
            roundGameResult = GameResultType.JesterWins; // Jester wins!
        } else if (isChameleonVoted) {
            roundGameResult = GameResultType.ChameleonFound; // Or PlayersWin?
        } else {
            roundGameResult = GameResultType.InnocentVoted; // Chameleon survived this round
        }
    } else {
        roundGameResult = GameResultType.Tie;
    }

    // Determine if the game actually ends based on GameResultType and round number
    const gameShouldEnd = isLastRound || roundGameResult === GameResultType.ChameleonFound || roundGameResult === GameResultType.JesterWins;
    
    // Determine the state *after* the results are shown
    const nextStateAfterResults = gameShouldEnd ? GameState.Ended : GameState.Presenting;
    
    // Update voting_rounds table
    await supabase.from('voting_rounds').update({ phase: VotingPhase.Results, end_time: new Date().toISOString() }).eq('id', votingRoundId);
        
    // Create round_results table entry (using VotingOutcome)
    const { error: resultError } = await supabase.from('round_results').insert({
      round_id: votingRoundId,
      voted_out_player_id: votedOutPlayerId,
      revealed_role: revealedRole,
      outcome: votingOutcome // Store the specific voting outcome (Found, Survived, Tie)
    });
    if (resultError) throw resultError;

    // Prepare update data for game_rooms table to transition TO Results state
    const roomUpdateData: Partial<DatabaseRoom> = {
      state: GameState.Results, 
      voting_timer: 0,
      round_outcome: roundGameResult, // Store the derived GameResultType for the round
      voted_out_player: votedOutPlayerId,
      revealed_player_id: votedOutPlayerId, 
      revealed_role: revealedRole,
      last_updated: new Date().toISOString()
    };

    // Return the intended next state AFTER results display
    return { nextState: nextStateAfterResults, gameShouldEnd, updateData: roomUpdateData, error: null };

  } catch (error) {
    console.error("Error processing voting results:", error);
    return { nextState: GameState.Voting, gameShouldEnd: false, updateData: {}, error: (error as Error).message };
  }
}

