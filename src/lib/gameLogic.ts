import { supabase } from "@/integrations/supabase/client";
import { GameRoom, GameSettings, GameState, PlayerRole, Player } from '@/lib/types';
import { mapRoomData, DatabaseRoom as MappedDatabaseRoom } from '@/hooks/useGameRealtime';

// --- Exported Helper Functions & Types ---

export const calculateImposterCount = (playerCount: number): number => {
  if (playerCount >= 10) return 3;
  if (playerCount >= 7) return 2;
  return 1;
};

export const calculateWordSimilarity = (word1: string, word2: string): number => {
  // ... implementation ...
  const w1 = word1.toLowerCase();
  const w2 = word2.toLowerCase();
  
  if (w1.length === w2.length) {
    let similarChars = 0;
    for (let i = 0; i < w1.length; i++) {
      if (w1[i] === w2[i]) similarChars++;
    }
    return similarChars / w1.length;
  }
  
  const shorter = w1.length < w2.length ? w1 : w2;
  const longer = w1.length < w2.length ? w2 : w1;
  
  let maxSimilarity = 0;
  for (let i = 0; i <= longer.length - shorter.length; i++) {
    let similarChars = 0;
    for (let j = 0; j < shorter.length; j++) {
      if (shorter[j] === longer[i + j]) similarChars++;
    }
    maxSimilarity = Math.max(maxSimilarity, similarChars / shorter.length);
  }
  
  return maxSimilarity;
};

export const fetchRoom = async (roomId: string): Promise<GameRoom | null> => {
  try {
    console.log('Fetching room:', roomId);
    
    // First get the room data
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('Error fetching room data:', roomError);
      throw roomError;
    }
    
    if (!roomData) {
      console.error('No room data found for ID:', roomId);
      return null;
    }

    console.log('Room data found:', roomData);

    // Then get the players in the room
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .eq('room_id', roomId);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw playersError;
    }

    console.log('Players data found:', playersData);

    // Combine the data
    const combinedData = {
      ...roomData,
      players: playersData || []
    };

    console.log('Combined data:', combinedData);

    // Use mapRoomData to convert the database response to GameRoom type
    const mappedRoom = mapRoomData(combinedData as MappedDatabaseRoom);
    console.log('Mapped room:', mappedRoom);
    
    return mappedRoom;
  } catch (error) {
    console.error('Error in fetchRoom:', error);
    return null;
  }
};

export const assignRoles = async (roomId: string, players: Player[]) => {
  try {
    // Get the room settings
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('settings')
      .eq('id', roomId)
      .single();

    if (roomError) throw roomError;
    if (!roomData?.settings) throw new Error('Room settings not found');

    const settings = roomData.settings;
    
    // Ensure we have the required roles
    let availableRoles = settings.roles?.[settings.game_mode] || [];
    
    // Make sure Chameleon is included
    if (!availableRoles.includes(PlayerRole.Chameleon)) {
      availableRoles = [PlayerRole.Chameleon, ...availableRoles];
    }
    
    // If no roles are defined, use defaults
    if (availableRoles.length === 0) {
      availableRoles = [PlayerRole.Regular, PlayerRole.Chameleon];
    }
    
    // Shuffle players
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    // Assign roles based on game mode
    let roleAssignments = [];
    
    // Make sure there's at least one Chameleon
    let hasChameleon = false;
    
    if (settings.game_mode === 'classic') {
      // Classic mode: Ensure one Chameleon, rest are Regular
      roleAssignments = shuffledPlayers.map((player, index) => {
        const role = index === 0 ? PlayerRole.Chameleon : PlayerRole.Regular;
        if (role === PlayerRole.Chameleon) hasChameleon = true;
        
        return {
          id: player.id,
          role,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1
        };
      });
    } else if (settings.game_mode === 'creative') {
      // Creative mode: Distribute roles evenly, ensure one Chameleon
      roleAssignments = shuffledPlayers.map((player, index) => {
        // Ensure first role is Chameleon
        let role: PlayerRole;
        if (index === 0) {
          role = PlayerRole.Chameleon;
          hasChameleon = true;
        } else {
          // Skip Chameleon when cycling through available roles for other players
          const availableWithoutChameleon = availableRoles.filter(r => r !== PlayerRole.Chameleon);
          role = availableWithoutChameleon[(index - 1) % availableWithoutChameleon.length];
        }
        
        return {
          id: player.id,
          role,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1
        };
      });
    } else if (settings.game_mode === 'team') {
      // Team mode: one Chameleon per team
      const teamSize = settings.team_size || 2;
      roleAssignments = shuffledPlayers.map((player, index) => {
        const role = index % teamSize === 0 ? PlayerRole.Chameleon : PlayerRole.Regular;
        if (role === PlayerRole.Chameleon) hasChameleon = true;
        
        return {
          id: player.id,
          role,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1
        };
      });
    } else if (settings.game_mode === 'chaos') {
      // Chaos mode: Random roles, but ensure at least one Chameleon
      roleAssignments = shuffledPlayers.map((player, index) => {
        // First player is always Chameleon in chaos mode
        if (index === 0) {
          hasChameleon = true;
          return {
            id: player.id,
            role: PlayerRole.Chameleon,
            special_ability_used: false,
            is_protected: false,
            vote_multiplier: 1
          };
        }
        
        // For others, pick a random role (not Chameleon)
        const availableWithoutChameleon = availableRoles.filter(r => r !== PlayerRole.Chameleon);
        const role = availableWithoutChameleon[Math.floor(Math.random() * availableWithoutChameleon.length)];
        
        return {
          id: player.id,
          role,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1
        };
      });
    } else {
      // Default: Ensure one Chameleon, rest are Regular
      roleAssignments = shuffledPlayers.map((player, index) => {
        const role = index === 0 ? PlayerRole.Chameleon : PlayerRole.Regular;
        if (role === PlayerRole.Chameleon) hasChameleon = true;
        
        return {
          id: player.id,
          role,
          special_ability_used: false,
          is_protected: false,
          vote_multiplier: 1
        };
      });
    }
    
    // Safety check: If somehow no Chameleon was assigned, force one
    if (!hasChameleon && roleAssignments.length > 0) {
      roleAssignments[0].role = PlayerRole.Chameleon;
    }

    // Update players with their roles - use upsert to handle all updates at once
    const { error: updateError } = await supabase
      .from('players')
      .upsert(roleAssignments.map(assignment => ({
        id: assignment.id,
        role: assignment.role,
        special_ability_used: assignment.special_ability_used,
        is_protected: assignment.is_protected,
        vote_multiplier: assignment.vote_multiplier,
        last_updated: new Date().toISOString()
      })));

    if (updateError) throw updateError;

    // Always update chameleon_id in the room
    const chameleon = roleAssignments.find(a => a.role === PlayerRole.Chameleon);
    if (chameleon) {
      console.log(`Setting chameleon_id to ${chameleon.id}`);
      const { error: roomUpdateError } = await supabase
        .from('game_rooms')
        .update({ 
          chameleon_id: chameleon.id,
          last_updated: new Date().toISOString()
        })
        .eq('id', roomId);

      if (roomUpdateError) throw roomUpdateError;
    }

    return roleAssignments;
  } catch (error) {
    console.error('Error assigning roles:', error);
    throw error;
  }
};

export type DBPlayerData = { // Export type if needed elsewhere
  id: string; name: string; is_host: boolean; vote: string | null;
  role: string | null; turn_description: string | null; last_active: string;
  last_updated: string; room_id: string; is_protected: boolean | null;
  vote_multiplier: number | null; special_word: string | null;
  special_ability_used: boolean | null;
};

export const handleGameStateTransition = async (
  roomId: string,
  currentState: GameState,
  settings: GameSettings,
  room: GameRoom
) => {
    let updateData: Partial<GameRoom> = {};

    // Validate settings
    if (!settings || !settings.time_per_round || !settings.discussion_time || !settings.voting_time) {
        throw new Error('Invalid game settings');
    }

    switch (currentState) {
        case GameState.Lobby: {
            // Validate minimum players
            if (room.players.length < 3) {
                throw new Error('Need at least 3 players to start the game');
            }
            
            // Assign roles before transitioning to Selecting
            await assignRoles(roomId, room.players);
            
            updateData = {
                state: GameState.Selecting,
                round: 1,
                timer: settings.time_per_round,
                current_turn: 0,
                turn_order: room.players.map(p => p.id).sort(() => Math.random() - 0.5),
                round_outcome: null,
                votes_tally: null,
                revealed_player_id: null,
                revealed_role: null
            };
            break;
        }

        case GameState.Selecting: {
            // Check if all players have submitted descriptions
            const allSubmitted = room.players.every(p => p.turn_description);
            if (!allSubmitted) {
                throw new Error('Not all players have submitted their descriptions');
            }
            
            updateData = {
                state: GameState.Discussion,
                timer: settings.discussion_time
            };
            break;
        }

        case GameState.Presenting: {
            // Check if all players have presented
            const allPresented = room.players.every(p => p.turn_description);
            if (!allPresented) {
                throw new Error('Not all players have presented');
            }
            
            updateData = {
                state: GameState.Discussion,
                timer: settings.discussion_time
            };
            break;
        }

        case GameState.Discussion: {
            updateData = {
                state: GameState.Voting,
                timer: settings.voting_time,
                votes_tally: {}
            };
            break;
        }

        case GameState.Voting: {
            // Calculate votes and determine outcome
            const votes = room.players.reduce((acc, player) => {
                if (player.vote) {
                    acc[player.vote] = (acc[player.vote] || 0) + (player.vote_multiplier || 1);
                }
                return acc;
            }, {} as Record<string, number>);

            const maxVotes = Math.max(...Object.values(votes));
            const votedPlayers = Object.entries(votes)
                .filter(([_, count]) => count === maxVotes)
                .map(([id]) => id);

            let outcome;
            if (votedPlayers.length === 1) {
                const votedPlayer = room.players.find(p => p.id === votedPlayers[0]);
                if (votedPlayer?.is_protected) {
                    outcome = 'protected';
                } else if (votedPlayer?.role === PlayerRole.Chameleon) {
                    outcome = 'chameleon_caught';
                } else {
                    outcome = 'wrong_vote';
                }
            } else {
                outcome = 'tie';
            }

            updateData = {
                state: GameState.Results,
                votes_tally: votes,
                round_outcome: outcome,
                revealed_player_id: votedPlayers[0],
                revealed_role: room.players.find(p => p.id === votedPlayers[0])?.role
            };
            break;
        }

        case GameState.Results: {
            // Check if game should end or continue to next round
            if (room.round >= settings.max_rounds) {
                updateData = {
                    state: GameState.Ended
                };
            } else {
                // Reset player states for next round
                await Promise.all(room.players.map(player => 
                    updatePlayer(player.id, roomId, {
                        turn_description: null,
                        vote: null,
                        is_protected: false,
                        vote_multiplier: 1,
                        special_ability_used: false
                    })
                ));

                updateData = {
                    state: GameState.Selecting,
                    round: room.round + 1,
                    timer: settings.time_per_round,
                    current_turn: 0,
                    turn_order: room.players.map(p => p.id).sort(() => Math.random() - 0.5),
                    round_outcome: null,
                    votes_tally: null,
                    revealed_player_id: null,
                    revealed_role: null
                };
            }
            break;
        }

        default:
            throw new Error(`Invalid state transition from: ${currentState}`);
    }

    // Update room state
    updateData.last_updated = new Date().toISOString();
    const { error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', roomId);

    if (error) {
        console.error(`Error transitioning state from ${currentState} to ${updateData.state}:`, error);
        throw error;
    }

    return { data: { newState: updateData.state } };
};

export const updatePlayer = async (
  playerId: string,
  roomId: string,
  updates: Partial<Player>
) => {
  // ... implementation ...
    const { error } = await supabase
    .from('players')
    .update({ 
      ...updates,
      last_active: new Date().toISOString(),
      last_updated: new Date().toISOString()
    })
    .eq('id', playerId)
    .eq('room_id', roomId);

  if (error) throw error;
};

// Utility function (if not already external)
export const getSimilarWord = (word: string, wordList: string[]): string => {
   // ... implementation ...
    const similarWords = wordList.filter(w => {
      if (w === word) return false;
      const similarity = calculateWordSimilarity(word, w); // Calls local helper
      return similarity >= 0.3 && similarity <= 0.7;
    });

    if (similarWords.length > 0) {
      return similarWords[Math.floor(Math.random() * similarWords.length)];
    }

    const randomWords = wordList.filter(w => w !== word);
    return randomWords[Math.floor(Math.random() * randomWords.length)];
};

export const isImposter = (role?: PlayerRole): boolean => {
  return role === PlayerRole.Chameleon || role === PlayerRole.Mimic;
};

export async function handleRoleAbility(
  room: GameRoom,
  player: Player,
  targetPlayerId?: string
): Promise<{ success: boolean; message: string }> {
  if (!room || !player) {
    return { success: false, message: 'Invalid room or player data' };
  }

  if (player.special_ability_used) {
    return { success: false, message: 'You have already used your special ability this round' };
  }

  const { data: roomData, error: roomError } = await supabase
    .from('game_rooms')
    .select('*')
    .eq('id', room.id)
    .single();

  if (roomError || !roomData) {
    return { success: false, message: 'Failed to fetch room data' };
  }

  const { data: playerData, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', player.id)
    .single();

  if (playerError || !playerData) {
    return { success: false, message: 'Failed to fetch player data' };
  }

  const updateData: Partial<Player> = { special_ability_used: true };
  let success = false;
  let message = '';

  switch (player.role) {
    case PlayerRole.Guardian:
      if (!targetPlayerId) {
        return { success: false, message: 'Please select a player to protect' };
      }
      await supabase
        .from('players')
        .update({ is_protected: true })
        .eq('id', targetPlayerId);
      
      success = true;
      message = 'You have protected a player from being eliminated this round';
      break;

    case PlayerRole.Timekeeper:
      updateData.vote_multiplier = 2;
      success = true;
      message = 'Your vote will count double this round';
      break;

    case PlayerRole.Whisperer:
      if (!targetPlayerId) {
        return { success: false, message: 'Please select a player to whisper to' };
      }
      updateData.special_word = targetPlayerId;
      success = true;
      message = 'You can now see the target player\'s word';
      break;

    case PlayerRole.Illusionist:
      if (!targetPlayerId) {
        return { success: false, message: 'Please select a player to create an illusion for' };
      }
      await supabase
        .from('players')
        .update({ vote_multiplier: 2 })
        .eq('id', targetPlayerId);
      
      success = true;
      message = 'You have created an illusion for the target player';
      break;

    case PlayerRole.Trickster:
      updateData.vote_multiplier = -1;
      success = true;
      message = 'Your vote will count as negative this round';
      break;

    case PlayerRole.Mirror:
      if (!targetPlayerId) {
        return { success: false, message: 'Please select a player to mirror' };
      }
      updateData.special_word = targetPlayerId;
      success = true;
      message = 'You have revealed your role to the target player';
      break;

    case PlayerRole.Spy:
      success = true;
      message = 'You can now see all players\' words';
      break;

    case PlayerRole.Jester:
      updateData.vote_multiplier = 0;
      success = true;
      message = 'Your vote will not count this round';
      break;

    default:
      return { success: false, message: 'Your role does not have a special ability' };
  }

  const { error: updateError } = await supabase
    .from('players')
    .update(updateData)
    .eq('id', player.id);

  if (updateError) {
    return { success: false, message: 'Failed to update player data' };
  }

  return { success, message };
}

// Add other necessary imports if mapRoomData or types are needed here
