import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameRoom, GameSettings } from '@/lib/types';
import { useEffect, useCallback } from 'react';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { PlayerRole } from '@/lib/types';
import { Player } from '@/lib/types';

export const useGameActions = (
  playerId: string,
  room: GameRoom | null,
  settings: GameSettings,
  setRoom: (room: GameRoom | null) => void
) => {
  const { toast } = useToast();

  const fetchRoom = async () => {
    if (!room?.id) return;

    try {
      const { data: roomData, error } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (
            id,
            name,
            role,
            is_host,
            turn_description,
            vote,
            last_active,
            last_updated
          )
        `)
        .eq('id', room.id)
        .single();

      if (error) {
        console.error('Error fetching room:', error);
        return;
      }

      if (roomData) {
        const mappedRoom = mapRoomData(roomData);
        setRoom(mappedRoom);
      }
    } catch (error) {
      console.error('Error in fetchRoom:', error);
    }
  };

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

      if (data) {
        // Immediately fetch updated room data
        const { data: roomData, error: fetchError } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players (
              id,
              name,
              role,
              is_host,
              turn_description,
              vote,
              last_active,
              last_updated
            )
          `)
          .eq('id', roomId)
          .single();

        if (fetchError) {
          console.error('Error fetching room after join:', fetchError);
          toast({
            variant: "destructive",
            title: "Error joining room",
            description: "Could not load room data after joining."
          });
          return false;
        }

        if (roomData) {
          const mappedRoom = mapRoomData(roomData);
          setRoom(mappedRoom);

          // Update player's last_active timestamp
          await supabase
            .from('players')
            .update({ 
              last_active: new Date().toISOString(),
              last_updated: new Date().toISOString()
            })
            .eq('id', playerId)
            .eq('room_id', roomId);

          // Broadcast sync event to all players
          await supabase
            .channel(`room:${roomId}`)
            .send({
              type: 'broadcast',
              event: 'sync',
              payload: { playerId }
            });

          // Force an immediate room data refresh
          await fetchRoom();

          return true;
        }
      }

      return false;
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

    try {
      // Get all categories and their words
      const allWords = categories.flatMap(category => 
        category.words.map(word => ({ category: category.name, word }))
      );

      // Shuffle all words
      const shuffledWords = [...allWords].sort(() => Math.random() - 0.5);

      // Select a random word from the shuffled list
      const selectedWord = shuffledWords[Math.floor(Math.random() * shuffledWords.length)];
      const secretWord = selectedWord.word;
      const selectedCategory = selectedWord.category;

      // Randomly select the chameleon
      const chameleonIndex = Math.floor(Math.random() * room.players.length);
      const chameleonId = room.players[chameleonIndex].id;

      // Get available roles for current game mode
      const availableRoles = room.settings.roles?.[room.settings.game_mode] || [PlayerRole.Regular, PlayerRole.Chameleon];
      
      // First update all players' roles and words
      const playerUpdates = room.players.map(player => {
        let role = PlayerRole.Regular;
        let specialWord = secretWord;
        const specialAbilityUsed = false;

        // Assign roles based on game mode
        if (room.settings.game_mode === 'classic') {
          role = player.id === chameleonId ? PlayerRole.Chameleon : PlayerRole.Regular;
        } else {
          // For other modes, randomly assign roles from available roles
          const randomRoleIndex = Math.floor(Math.random() * availableRoles.length);
          role = availableRoles[randomRoleIndex];
          
          // Handle special words and abilities for each role
          switch (role) {
            case PlayerRole.Mimic: {
              // Find a similar word from the same category
              const similarWords = allWords.filter(w => 
                w.category === selectedCategory && 
                w.word !== secretWord
              );
              if (similarWords.length > 0) {
                specialWord = similarWords[Math.floor(Math.random() * similarWords.length)].word;
              }
              break;
            }
            case PlayerRole.Chameleon:
              specialWord = ''; // Doesn't know the word
              break;
            case PlayerRole.Oracle:
              // Oracle knows the word and can see who the chameleon is
              specialWord = secretWord;
              break;
            case PlayerRole.Jester:
              // Jester wins if voted as chameleon
              specialWord = secretWord;
              break;
            case PlayerRole.Spy:
              // Spy knows the word but must pretend they don't
              specialWord = secretWord;
              break;
            case PlayerRole.Mirror:
              // Mirror must repeat what the previous player said
              specialWord = secretWord;
              break;
            case PlayerRole.Whisperer:
              // Whisperer can secretly communicate with one other player
              specialWord = secretWord;
              break;
            case PlayerRole.Timekeeper:
              // Timekeeper can extend or reduce the timer once
              specialWord = secretWord;
              break;
            case PlayerRole.Illusionist:
              // Illusionist can make one player's vote count double
              specialWord = secretWord;
              break;
            case PlayerRole.Guardian:
              // Guardian can protect one player from being voted
              specialWord = secretWord;
              break;
            case PlayerRole.Trickster:
              // Trickster can swap roles with another player once
              specialWord = secretWord;
              break;
            case PlayerRole.Regular:
            default:
              specialWord = secretWord;
              break;
          }
        }

        return {
          id: player.id,
          role,
          specialWord,
          specialAbilityUsed,
          turn_description: null,
          vote: null,
          last_active: new Date().toISOString()
        };
      });

      for (const update of playerUpdates) {
        const { error: playerError } = await supabase
          .from('players')
          .update({
            role: update.role,
            special_word: update.specialWord,
            special_ability_used: update.specialAbilityUsed,
            turn_description: update.turn_description,
            vote: update.vote,
            last_active: update.last_active
          })
          .eq('id', update.id)
          .eq('room_id', room.id);

        if (playerError) {
          console.error('Error updating player roles:', playerError);
          toast({
            variant: "destructive",
            title: "Error updating player roles",
            description: playerError.message
          });
          return;
        }
      }

      // Then update the room state and game setup
      const { data: updatedRoom, error } = await supabase
        .from('game_rooms')
        .update({
          state: 'presenting',
          category: selectedCategory,
          secret_word: secretWord,
          chameleon_id: chameleonId,
          timer: settings.discussion_time,
          current_turn: 0,
          turn_order: room.players.map(p => p.id),
          round: room.round || 1,
          last_updated: new Date().toISOString()
        })
        .eq('id', room.id)
        .select(`
          *,
          players (
            id,
            name,
            room_id,
            role,
            is_host,
            turn_description,
            vote,
            last_active,
            last_updated
          )
        `)
        .single();

      if (error) {
        toast({
          variant: "destructive",
          title: "Error selecting category",
          description: error.message
        });
        return;
      }

      if (!updatedRoom) {
        toast({
          variant: "destructive",
          title: "Error selecting category",
          description: "No room data returned"
        });
        return;
      }

      // Update local room state immediately
      const mappedRoom = mapRoomData(updatedRoom);
      setRoom(mappedRoom);

      toast({
        title: "Game Started!",
        description: "The word has been selected. Regular players know the word, while the chameleon must blend in!"
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

  const submitWord = useCallback(async (word: string) => {
    const handleError = (error: Error | { message: string }, action: string) => {
      console.error(`Error in ${action}:`, error);
      toast({
        variant: "destructive",
        title: `Failed to ${action}`,
        description: error.message || 'Unknown error'
      });
      return false;
    };

    if (!room || !playerId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Game room or player not found"
      });
      return false;
    }

    try {
      const currentPlayer = room.players.find(p => p.id === playerId);
      if (!currentPlayer) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Player not found in game"
        });
        return false;
      }

      if (room.state !== 'presenting') {
        toast({
          variant: "destructive",
          title: "Cannot submit word",
          description: "Game is not in presenting phase"
        });
        return false;
      }

      if (currentPlayer.turn_description) {
        toast({
          variant: "destructive",
          title: "Already submitted",
          description: "You have already submitted your word"
        });
        return false;
      }

      // Update player's turn description
      const { error: updateError } = await supabase
        .from('players')
        .update({ 
          turn_description: word,
          last_active: new Date().toISOString(),
          last_updated: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (updateError) {
        return handleError(updateError, 'update player word');
      }

      // Check if all players have submitted
      const allPlayersSubmitted = room.players.every(p => p.turn_description);
      if (allPlayersSubmitted) {
        // Move to discussion phase first
        const { error: discussionError } = await supabase
          .from('game_rooms')
          .update({ 
            state: 'discussion',
            timer: settings.discussion_time,
            last_updated: new Date().toISOString()
          })
          .eq('id', room.id);

        if (discussionError) {
          return handleError(discussionError, 'update game state to discussion');
        }

        // Set up a timer to move to voting phase after discussion
        setTimeout(async () => {
          const { error: votingError } = await supabase
            .from('game_rooms')
            .update({ 
              state: 'voting',
              timer: settings.voting_time,
              last_updated: new Date().toISOString()
            })
            .eq('id', room.id);

          if (votingError) {
            console.error('Error moving to voting phase:', votingError);
          }
        }, settings.discussion_time * 1000);
      } else {
        // Find the next player who hasn't described yet
        let nextIndex = -1;
        for (let i = 0; i < room.players.length; i++) {
          const player = room.players[i];
          if (!player.turn_description) {
            nextIndex = i;
            break;
          }
        }

        // If no player found without description, something went wrong
        if (nextIndex === -1) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find next player"
          });
          return false;
        }

        // Force refresh room data before updating turn
        const { data: updatedRoom, error: fetchError } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players (
              id,
              name,
              room_id,
              role,
              is_host,
              turn_description,
              vote,
              last_active,
              last_updated
            )
          `)
          .eq('id', room.id)
          .single();

        if (fetchError) {
          return handleError(fetchError, 'fetch updated room data');
        }

        if (updatedRoom) {
          const mappedRoom = mapRoomData(updatedRoom);
          setRoom(mappedRoom);

          // Update turn only after confirming the current state
          const { error: turnError } = await supabase
            .from('game_rooms')
            .update({ 
              current_turn: nextIndex,
              timer: settings.discussion_time,
              last_updated: new Date().toISOString()
            })
            .eq('id', room.id);

          if (turnError) {
            return handleError(turnError, 'update next player turn');
          }
        }
      }

      // Force refresh room data
      const { data: finalRoom, error: finalError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (
            id,
            name,
            room_id,
            role,
            is_host,
            turn_description,
            vote,
            last_active,
            last_updated
          )
        `)
        .eq('id', room.id)
        .single();

      if (finalError) {
        return handleError(finalError, 'fetch final room data');
      }

      if (finalRoom) {
        const mappedRoom = mapRoomData(finalRoom);
        setRoom(mappedRoom);
      }

      toast({
        title: "Success",
        description: "Word submitted successfully!"
      });
      return true;
    } catch (error) {
      return handleError(error, 'submit word');
    }
  }, [room, playerId, settings, setRoom, toast]);

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

  const leaveRoom = useCallback(async (): Promise<void> => {
    if (!room?.id) return;

    try {
      // First check if the game has started
      const { data: roomData, error: roomError } = await supabase
        .from('game_rooms')
        .select('state')
        .eq('id', room.id)
        .single();

      if (roomError) {
        console.error('Error checking room state:', roomError);
        return;
      }

      // Only allow leaving if the game hasn't started
      if (roomData?.state !== 'lobby') {
        toast({
          variant: "destructive",
          title: "Cannot leave",
          description: "You cannot leave once the game has started"
        });
        return;
      }

      // Remove the player
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (deleteError) {
        console.error('Error leaving room:', deleteError);
        toast({
          variant: "destructive",
          title: "Error leaving room",
          description: deleteError.message
        });
        return;
      }

      // If the leaving player was the host, update the room
      if (room.players.find(p => p.id === playerId)?.isHost) {
        const { error: updateError } = await supabase
          .from('game_rooms')
          .update({ host_id: null })
          .eq('id', room.id);

        if (updateError) {
          console.error('Error updating room host:', updateError);
        }
      }

      toast({
        title: "Left room",
        description: "You have successfully left the room"
      });
    } catch (error) {
      console.error('Error in leaveRoom:', error);
      toast({
        variant: "destructive",
        title: "Error leaving room",
        description: "An unexpected error occurred"
      });
    }
  }, [room, playerId, toast]);

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
  }, [room, leaveRoom]);

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

    try {
      // Update the room settings
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          settings: {
            ...newSettings,
            discussion_time: newSettings.discussion_time,
            voting_time: newSettings.voting_time,
            game_mode: newSettings.game_mode,
            max_rounds: newSettings.max_rounds,
            max_players: newSettings.max_players,
            team_size: newSettings.team_size,
            chaos_mode: newSettings.chaos_mode,
            time_per_round: newSettings.time_per_round
          },
          timer: newSettings.discussion_time,
          last_updated: new Date().toISOString()
        })
        .eq('id', room.id);

      if (updateError) {
        toast({
          variant: "destructive",
          title: "Error updating settings",
          description: updateError.message
        });
        return;
      }

      // Update all players' roles based on new settings
      const availableRoles = newSettings.roles?.[newSettings.game_mode] || [PlayerRole.Regular];
      const defaultRole = availableRoles.includes(PlayerRole.Regular) ? PlayerRole.Regular : availableRoles[0];
      
      const { error: roleError } = await supabase
        .from('players')
        .update({
          role: defaultRole,
          last_updated: new Date().toISOString()
        })
        .eq('room_id', room.id);

      if (roleError) {
        toast({
          variant: "destructive",
          title: "Error updating roles",
          description: roleError.message
        });
        return;
      }

      // Force refresh room data to get updated settings
      const { data: updatedRoom, error: fetchError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players (
            id,
            name,
            room_id,
            role,
            is_host,
            turn_description,
            vote,
            last_active,
            last_updated
          )
        `)
        .eq('id', room.id)
        .single();

      if (fetchError) {
        toast({
          variant: "destructive",
          title: "Error fetching updated settings",
          description: fetchError.message
        });
        return;
      }

      if (updatedRoom) {
        const mappedRoom = mapRoomData(updatedRoom);
        setRoom(mappedRoom);
      }

      toast({
        title: "Settings Updated",
        description: "Game settings have been successfully updated"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: "An unexpected error occurred"
      });
    }
  };

  const handleSpecialAbility = async (roomId: string, playerId: string, targetPlayerId?: string) => {
    if (!room) return;

    const player = room.players.find(p => p.id === playerId);
    if (!player || player.specialAbilityUsed) return;

    try {
      let newTimer: number;
      let targetPlayer: Player | undefined;

      switch (player.role) {
        case PlayerRole.Timekeeper:
          // Extend or reduce timer by 30 seconds
          newTimer = (room.timer || 0) + 30;
          await supabase
            .from('game_rooms')
            .update({ timer: newTimer })
            .eq('id', roomId);
          break;

        case PlayerRole.Illusionist:
          // Make target player's vote count double
          if (!targetPlayerId) return;
          await supabase
            .from('players')
            .update({ vote_multiplier: 2 })
            .eq('id', targetPlayerId)
            .eq('room_id', roomId);
          break;

        case PlayerRole.Guardian:
          // Protect target player from being voted
          if (!targetPlayerId) return;
          await supabase
            .from('players')
            .update({ is_protected: true })
            .eq('id', targetPlayerId)
            .eq('room_id', roomId);
          break;

        case PlayerRole.Trickster:
          // Swap roles with target player
          if (!targetPlayerId) return;
          targetPlayer = room.players.find(p => p.id === targetPlayerId);
          if (!targetPlayer) return;

          await supabase
            .from('players')
            .update([
              { id: playerId, role: targetPlayer.role, special_word: targetPlayer.specialWord },
              { id: targetPlayerId, role: player.role, special_word: player.specialWord }
            ])
            .eq('room_id', roomId);
          break;

        case PlayerRole.Whisperer:
          // Send secret message to target player
          if (!targetPlayerId) return;
          // This will be handled in the chat system
          break;
      }

      // Mark ability as used
      await supabase
        .from('players')
        .update({ special_ability_used: true })
        .eq('id', playerId)
        .eq('room_id', roomId);

      // Refresh room data
      await fetchRoom();
    } catch (error) {
      console.error('Error using special ability:', error);
      toast({
        variant: "destructive",
        title: "Error using ability",
        description: "Failed to use special ability"
      });
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
    handleSpecialAbility
  };
};
