
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { categories } from '@/lib/word-categories';
import { GameRoom, GameSettings, PlayerRole, GameMode } from '@/lib/types';

const DEFAULT_SETTINGS: GameSettings = {
  maxPlayers: 10,
  discussionTime: 120,
  maxRounds: 3,
  gameMode: 'classic',
  teamSize: 2,
  chaosMode: false,
  timePerRound: 60,
  votingTime: 30
};

export const useGameActions = (
  playerId: string,
  room: GameRoom | null,
  settings: GameSettings
) => {
  const { toast } = useToast();

  const createRoom = async (playerName: string): Promise<boolean> => {
    const roomId = playerId.substring(0, 6).toUpperCase();
    
    // Use normalized settings or defaults
    const normalizedSettings = {
      max_players: settings.maxPlayers || DEFAULT_SETTINGS.maxPlayers,
      discussion_time: settings.discussionTime || DEFAULT_SETTINGS.discussionTime,
      max_rounds: settings.maxRounds || DEFAULT_SETTINGS.maxRounds,
      game_mode: settings.gameMode || DEFAULT_SETTINGS.gameMode,
      team_size: settings.teamSize || DEFAULT_SETTINGS.teamSize,
      chaos_mode: settings.chaosMode || DEFAULT_SETTINGS.chaosMode,
      time_per_round: settings.timePerRound || DEFAULT_SETTINGS.timePerRound,
      voting_time: settings.votingTime || DEFAULT_SETTINGS.votingTime
    };
    
    try {
      // Create the game room
      const { error: roomError } = await supabase
        .from('game_rooms')
        .insert({
          id: roomId,
          host_id: playerId,
          state: 'lobby',
          round: 0,
          max_rounds: normalizedSettings.max_rounds,
          discussion_time: normalizedSettings.discussion_time,
          game_mode: normalizedSettings.game_mode,
          team_size: normalizedSettings.team_size,
          max_players: normalizedSettings.max_players,
          chaos_mode: normalizedSettings.chaos_mode,
          time_per_round: normalizedSettings.time_per_round,
          voting_time: normalizedSettings.voting_time,
          settings: settings
        });

      if (roomError) {
        toast({
          variant: "destructive",
          title: "Error creating room",
          description: roomError.message
        });
        return false;
      }

      // Add host player
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          room_id: roomId,
          name: playerName,
          is_host: true,
          is_ready: true
        });

      if (playerError) {
        toast({
          variant: "destructive",
          title: "Error joining room",
          description: playerError.message
        });
        return false;
      }

      // Add welcome message to chat
      await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          player_name: 'Game',
          content: `Room ${roomId} created! Welcome to Chameleon X, ${playerName}!`,
          role: 'system'
        });

      return true;
    } catch (error) {
      console.error("Error in createRoom:", error);
      toast({
        variant: "destructive",
        title: "Error creating room",
        description: "An unexpected error occurred. Please try again."
      });
      return false;
    }
  };

  const joinRoom = async (roomId: string, playerName: string): Promise<boolean> => {
    try {
      const { data: existingRoom, error: roomError } = await supabase
        .from('game_rooms')
        .select('*, players(*)')
        .eq('id', roomId)
        .single();

      if (roomError) {
        toast({
          variant: "destructive",
          title: "Room not found",
          description: "Please check the room code and try again."
        });
        return false;
      }

      if (!existingRoom) {
        toast({
          variant: "destructive",
          title: "Room not found",
          description: "Please check the room code and try again."
        });
        return false;
      }

      // Check if room is in lobby state
      if (existingRoom.state !== 'lobby') {
        toast({
          variant: "destructive",
          title: "Game already started",
          description: "Cannot join a game that has already started."
        });
        return false;
      }

      // Check if room is full
      if (existingRoom.players.length >= existingRoom.max_players) {
        toast({
          variant: "destructive",
          title: "Room is full",
          description: "This room has reached its maximum player capacity."
        });
        return false;
      }

      // Add player to room
      const { error: playerError } = await supabase
        .from('players')
        .insert({
          id: playerId,
          room_id: roomId,
          name: playerName,
          is_host: false,
          is_ready: false
        });

      if (playerError) {
        toast({
          variant: "destructive",
          title: "Error joining room",
          description: playerError.message
        });
        return false;
      }

      // Add join message to chat
      await supabase
        .from('chat_messages')
        .insert({
          room_id: roomId,
          player_name: 'Game',
          content: `${playerName} has joined the room!`,
          role: 'system'
        });

      return true;
    } catch (error) {
      console.error("Error in joinRoom:", error);
      toast({
        variant: "destructive",
        title: "Error joining room",
        description: "An unexpected error occurred. Please try again."
      });
      return false;
    }
  };

  const sendChatMessage = async (message: string, isHint: boolean = false): Promise<boolean> => {
    if (!room || !playerId) return false;
    
    try {
      const playerName = room.players.find(p => p.id === playerId)?.name || 'Unknown';
      
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          room_id: room.id,
          player_id: playerId,
          player_name: playerName,
          content: message,
          is_hint: isHint
        });

      if (error) {
        console.error("Error sending message:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in sendChatMessage:", error);
      return false;
    }
  };

  const togglePlayerReady = async (): Promise<boolean> => {
    if (!room || !playerId) return false;
    
    try {
      const player = room.players.find(p => p.id === playerId);
      if (!player) return false;
      
      const { error } = await supabase
        .from('players')
        .update({ is_ready: !player.isReady })
        .eq('id', playerId);

      if (error) {
        console.error("Error toggling ready state:", error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error("Error in togglePlayerReady:", error);
      return false;
    }
  };

  const startGame = async () => {
    if (!room || room.players.length < 3) {
      toast({
        variant: "destructive",
        title: "Cannot start game",
        description: "Need at least 3 players to start."
      });
      return;
    }

    // Check if all players are ready
    const notReadyPlayers = room.players.filter(p => !p.isReady);
    if (notReadyPlayers.length > 0) {
      toast({
        variant: "destructive",
        title: "Cannot start game",
        description: "All players must be ready to start."
      });
      return;
    }

    try {
      // Get player IDs in a random order for turn sequence
      const shuffledPlayerIds = [...room.players.map(p => p.id)];
      for (let i = shuffledPlayerIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPlayerIds[i], shuffledPlayerIds[j]] = [shuffledPlayerIds[j], shuffledPlayerIds[i]];
      }

      // Assign roles based on game mode
      let playerRoles: Record<string, PlayerRole> = {};
      
      if (room.gameMode === 'classic') {
        // In classic mode, only assign a chameleon
        playerRoles = room.players.reduce((acc, player) => {
          acc[player.id] = 'standard';
          return acc;
        }, {} as Record<string, PlayerRole>);
      } else {
        // In other modes, assign special roles
        const roleCount = {
          detective: room.gameMode === 'chaos' ? 2 : 1,
          protector: 1,
          deceiver: room.gameMode === 'chaos' ? 1 : 0
        };
        
        const availableRoles: PlayerRole[] = [];
        
        // Add roles to the pool
        for (let i = 0; i < roleCount.detective; i++) availableRoles.push('detective');
        for (let i = 0; i < roleCount.protector; i++) availableRoles.push('protector');
        for (let i = 0; i < roleCount.deceiver; i++) availableRoles.push('deceiver');
        
        // Fill remaining spots with standard role
        while (availableRoles.length < room.players.length - 1) {
          availableRoles.push('standard');
        }
        
        // Shuffle roles
        for (let i = availableRoles.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [availableRoles[i], availableRoles[j]] = [availableRoles[j], availableRoles[i]];
        }
        
        // Assign roles to players (except the chameleon who'll be selected later)
        playerRoles = room.players.reduce((acc, player, index) => {
          acc[player.id] = 'standard'; // Default value that will be updated
          return acc;
        }, {} as Record<string, PlayerRole>);
      }
      
      // Update the game room to selecting state
      const { error } = await supabase
        .from('game_rooms')
        .update({
          state: 'selecting',
          round: 1,
          turn_order: shuffledPlayerIds,
          current_turn: 0
        })
        .eq('id', room.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error starting game",
          description: error.message
        });
      }
      
      // Send a notification to the chat
      await sendChatMessage("Game has started! Choose a category...", false);
    } catch (error) {
      console.error("Error in startGame:", error);
      toast({
        variant: "destructive",
        title: "Error starting game",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const updateGameSettings = async (newSettings: Partial<GameSettings>) => {
    if (!room) return;
    
    try {
      // Merge with existing settings
      const updatedSettings = {
        ...settings,
        ...newSettings
      };
      
      const { error } = await supabase
        .from('game_rooms')
        .update({
          settings: updatedSettings,
          max_players: newSettings.maxPlayers || settings.maxPlayers,
          discussion_time: newSettings.discussionTime || settings.discussionTime,
          max_rounds: newSettings.maxRounds || settings.maxRounds,
          game_mode: newSettings.gameMode || settings.gameMode,
          team_size: newSettings.teamSize || settings.teamSize,
          chaos_mode: newSettings.chaosMode || settings.chaosMode,
          time_per_round: newSettings.timePerRound || settings.timePerRound,
          voting_time: newSettings.votingTime || settings.votingTime
        })
        .eq('id', room.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error updating settings",
          description: error.message
        });
      } else {
        toast({
          title: "Settings updated",
          description: "Game settings have been updated successfully."
        });
      }
    } catch (error) {
      console.error("Error in updateGameSettings:", error);
      toast({
        variant: "destructive",
        title: "Error updating settings",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const selectCategory = async (categoryName: string) => {
    if (!room) return;

    try {
      const selectedCategory = categories.find(c => c.name === categoryName);
      if (!selectedCategory) {
        toast({
          variant: "destructive",
          title: "Invalid category",
          description: "Selected category not found."
        });
        return;
      }

      const randomWordIndex = Math.floor(Math.random() * selectedCategory.words.length);
      const secretWord = selectedCategory.words[randomWordIndex];
      
      // Choose a chameleon
      const chameleonIndex = Math.floor(Math.random() * room.players.length);
      const chameleonId = room.players[chameleonIndex].id;

      const { error } = await supabase
        .from('game_rooms')
        .update({
          state: 'presenting',
          category: selectedCategory.name,
          secret_word: secretWord,
          chameleon_id: chameleonId,
          timer: room.timePerRound,
          current_turn: 0
        })
        .eq('id', room.id);

      if (error) {
        toast({
          variant: "destructive",
          title: "Error selecting category",
          description: error.message
        });
        return;
      }

      // Send category selection message to chat
      await sendChatMessage(`Category selected: ${selectedCategory.name}`, true);
    } catch (error) {
      console.error("Error in selectCategory:", error);
      toast({
        variant: "destructive",
        title: "Error selecting category",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const submitTurnDescription = async (description: string) => {
    if (!room || !playerId) return;
    
    try {
      // Update player's turn description
      const { error: playerError } = await supabase
        .from('players')
        .update({ turn_description: description })
        .eq('id', playerId)
        .eq('room_id', room.id);
      
      if (playerError) {
        toast({
          variant: "destructive",
          title: "Error submitting description",
          description: playerError.message
        });
        return;
      }
      
      // Send the description to chat
      await sendChatMessage(description, false);
      
      // Check if this was the last player's turn
      if (room.turnOrder && room.currentTurn !== undefined) {
        const nextTurn = room.currentTurn + 1;
        
        if (nextTurn < room.turnOrder.length) {
          // Move to next player's turn
          await supabase
            .from('game_rooms')
            .update({ current_turn: nextTurn })
            .eq('id', room.id);
        } else {
          // All players have had their turn, move to discussion phase
          await supabase
            .from('game_rooms')
            .update({
              state: 'discussion',
              timer: room.discussionTime
            })
            .eq('id', room.id);
            
          // Send phase change notification to chat
          await sendChatMessage("All players have described. Discussion phase started!", true);
        }
      }
    } catch (error) {
      console.error("Error in submitTurnDescription:", error);
      toast({
        variant: "destructive",
        title: "Error submitting description",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const moveToVotingPhase = async () => {
    if (!room) return;
    
    try {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          state: 'voting',
          timer: room.votingTime
        })
        .eq('id', room.id);
        
      if (error) {
        toast({
          variant: "destructive",
          title: "Error moving to voting phase",
          description: error.message
        });
        return;
      }
      
      // Send phase change notification to chat
      await sendChatMessage("Discussion ended. It's time to vote for who you think is the Chameleon!", true);
    } catch (error) {
      console.error("Error in moveToVotingPhase:", error);
      toast({
        variant: "destructive",
        title: "Error moving to voting phase",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const submitVote = async (targetPlayerId: string) => {
    if (!room || !playerId) return;

    try {
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

      // Check if everyone has voted
      const { data: updatedPlayers, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', room.id);
        
      if (playersError) {
        console.error("Error fetching updated players:", playersError);
        return;
      }
      
      const allVoted = updatedPlayers.every(p => p.vote);
      
      if (allVoted) {
        // Calculate vote tallies
        const voteCounts: Record<string, number> = {};
        updatedPlayers.forEach(player => {
          if (player.vote) {
            const voteMultiplier = player.vote_multiplier || 1;
            voteCounts[player.vote] = (voteCounts[player.vote] || 0) + voteMultiplier;
          }
        });
        
        // Find player with most votes
        let mostVotedId = '';
        let maxVotes = 0;
        
        Object.entries(voteCounts).forEach(([playerId, votes]) => {
          if (votes > maxVotes) {
            mostVotedId = playerId;
            maxVotes = votes;
          }
        });
        
        // Determine outcome
        const chameleonCaught = mostVotedId === room.chameleonId;
        const roundOutcome = chameleonCaught ? 'chameleon_caught' : 'chameleon_escaped';
        
        // Move to results phase
        await supabase
          .from('game_rooms')
          .update({
            state: 'results',
            votes_tally: voteCounts,
            revealed_player_id: mostVotedId,
            revealed_role: 'chameleon',
            round_outcome: roundOutcome
          })
          .eq('id', room.id);
          
        // Send results notification to chat
        const resultMessage = chameleonCaught 
          ? "The Chameleon has been caught!" 
          : "The Chameleon has escaped detection!";
        await sendChatMessage(resultMessage, true);
      }
    } catch (error) {
      console.error("Error in submitVote:", error);
      toast({
        variant: "destructive",
        title: "Error submitting vote",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const submitChameleonGuess = async (secretWordGuess: string): Promise<boolean> => {
    if (!room || !room.secretWord) return false;
    
    try {
      const isCorrect = secretWordGuess.toLowerCase().trim() === room.secretWord.toLowerCase().trim();
      const outcome = isCorrect ? 'chameleon_correct_guess' : 'chameleon_wrong_guess';
      
      await supabase
        .from('game_rooms')
        .update({ round_outcome: outcome })
        .eq('id', room.id);
        
      // Send guess result to chat
      const resultMessage = isCorrect
        ? `The Chameleon correctly guessed the secret word: ${room.secretWord}!`
        : `The Chameleon's guess was incorrect. The secret word was: ${room.secretWord}.`;
      await sendChatMessage(resultMessage, true);
      
      return isCorrect;
    } catch (error) {
      console.error("Error in submitChameleonGuess:", error);
      toast({
        variant: "destructive",
        title: "Error submitting guess",
        description: "An unexpected error occurred. Please try again."
      });
      return false;
    }
  };

  const nextRound = async () => {
    if (!room) return;

    try {
      if (room.round >= room.maxRounds) {
        await resetGame();
      } else {
        // Reset for next round
        await supabase
          .from('game_rooms')
          .update({
            state: 'selecting',
            round: room.round + 1,
            category: null,
            secret_word: null,
            chameleon_id: null,
            timer: null,
            revealed_player_id: null,
            revealed_role: null,
            round_outcome: null,
            votes_tally: null,
            current_turn: 0
          })
          .eq('id', room.id);

        // Reset player votes and turn descriptions
        await supabase
          .from('players')
          .update({ 
            vote: null,
            turn_description: null,
            special_ability_used: false
          })
          .eq('room_id', room.id);
          
        // Send round notification to chat
        await sendChatMessage(`Round ${room.round + 1} is starting!`, true);
      }
    } catch (error) {
      console.error("Error in nextRound:", error);
      toast({
        variant: "destructive",
        title: "Error starting next round",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const useSpecialAbility = async (targetPlayerId?: string) => {
    if (!room || !playerId) return;
    
    try {
      const player = room.players.find(p => p.id === playerId);
      if (!player || player.specialAbilityUsed) return;
      
      if (player.role === 'detective') {
        // Detective can see if a player is the chameleon
        if (targetPlayerId) {
          const isTargetChameleon = targetPlayerId === room.chameleonId;
          
          // Detectives can only check once per game
          await supabase
            .from('players')
            .update({ special_ability_used: true })
            .eq('id', playerId);
            
          // Send private message to detective
          const message = isTargetChameleon 
            ? "Your investigation reveals that this player IS the Chameleon!"
            : "Your investigation reveals that this player is NOT the Chameleon.";
          
          await sendChatMessage(`Detective: ${message}`, false);
          
          toast({
            title: "Ability used",
            description: message
          });
        }
      } else if (player.role === 'protector') {
        // Protector can protect a player from being voted out
        if (targetPlayerId) {
          // Update the target player's protection status
          await supabase
            .from('players')
            .update({ is_protected: true })
            .eq('id', targetPlayerId);
            
          // Mark ability as used
          await supabase
            .from('players')
            .update({ special_ability_used: true })
            .eq('id', playerId);
            
          toast({
            title: "Ability used",
            description: "You have protected a player from being voted out."
          });
        }
      } else if (player.role === 'deceiver') {
        // Deceiver can get double vote power
        await supabase
          .from('players')
          .update({ 
            vote_multiplier: 2,
            special_ability_used: true 
          })
          .eq('id', playerId);
          
        toast({
          title: "Ability used",
          description: "Your vote now counts twice!"
        });
      }
    } catch (error) {
      console.error("Error in useSpecialAbility:", error);
      toast({
        variant: "destructive",
        title: "Error using ability",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const leaveRoom = async () => {
    if (!room || !playerId) return;

    try {
      // Check if player is host and if there are other players
      const isHost = playerId === room.hostId;
      const otherPlayers = room.players.filter(p => p.id !== playerId);
      
      if (isHost && otherPlayers.length > 0) {
        // Select a new host
        const newHostId = otherPlayers[0].id;
        
        // Update room with new host
        await supabase
          .from('game_rooms')
          .update({ host_id: newHostId })
          .eq('id', room.id);
          
        // Update player to be host
        await supabase
          .from('players')
          .update({ is_host: true })
          .eq('id', newHostId);
          
        // Get player name
        const playerName = room.players.find(p => p.id === playerId)?.name || 'Host';
        
        // Send host change notification to chat
        await supabase
          .from('chat_messages')
          .insert({
            room_id: room.id,
            player_name: 'Game',
            content: `${playerName} (host) has left the room. ${otherPlayers[0].name} is now the host.`,
            role: 'system'
          });
      } else if (isHost && otherPlayers.length === 0) {
        // If host is the only player, delete the room
        await supabase
          .from('game_rooms')
          .delete()
          .eq('id', room.id);
      } else {
        // Not host, just remove the player
        const playerName = room.players.find(p => p.id === playerId)?.name || 'A player';
        
        // Send leave notification to chat
        await supabase
          .from('chat_messages')
          .insert({
            room_id: room.id,
            player_name: 'Game',
            content: `${playerName} has left the room.`,
            role: 'system'
          });
      }
      
      // Remove the player
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
      }
    } catch (error) {
      console.error("Error in leaveRoom:", error);
      toast({
        variant: "destructive",
        title: "Error leaving room",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  const resetGame = async () => {
    if (!room) return;

    try {
      // Reset game to lobby state
      const { error } = await supabase
        .from('game_rooms')
        .update({
          state: 'lobby',
          round: 0,
          category: null,
          secret_word: null,
          chameleon_id: null,
          timer: null,
          revealed_player_id: null,
          revealed_role: null,
          round_outcome: null,
          votes_tally: null,
          current_turn: 0,
          turn_order: null
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

      // Reset all players
      await supabase
        .from('players')
        .update({ 
          vote: null,
          turn_description: null,
          is_ready: false,
          is_protected: false,
          vote_multiplier: 1,
          special_ability_used: false,
          special_word: null,
          role: null
        })
        .eq('room_id', room.id);
        
      // Send game end notification to chat
      await sendChatMessage("Game has ended! Return to lobby.", true);
    } catch (error) {
      console.error("Error in resetGame:", error);
      toast({
        variant: "destructive",
        title: "Error resetting game",
        description: "An unexpected error occurred. Please try again."
      });
    }
  };

  return {
    createRoom,
    joinRoom,
    sendChatMessage,
    togglePlayerReady,
    startGame,
    updateGameSettings,
    selectCategory,
    submitTurnDescription,
    moveToVotingPhase,
    submitVote,
    submitChameleonGuess,
    nextRound,
    useSpecialAbility,
    leaveRoom,
    resetGame
  };
};
