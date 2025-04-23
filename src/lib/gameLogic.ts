import { supabase } from "@/integrations/supabase/client";
import { GameRoom, GameSettings, GameState, Player, WordCategory, GameResultType } from '@/lib/types';
import { mapRoomData, DatabaseRoom as MappedDatabaseRoom } from '@/hooks/useGameRealtime';
import { PlayerRole } from '@/types/PlayerRole';

// --- Exported Helper Functions & Types ---

export const calculateImposterCount = (playerCount: number): number => {
  if (playerCount >= 10) return 3;
  if (playerCount >= 7) return 2;
  return 1;
};

export const calculateWordSimilarity = (word1: string, word2: string): number => {
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

export const getSimilarWord = (secretWord: string, wordList: string[]): string => {
  // Filter out the secret word from the list
  const availableWords = wordList.filter(word => word.toLowerCase() !== secretWord.toLowerCase());
  
  // Calculate similarity scores for each word
  const wordScores = availableWords.map(word => ({
    word,
    score: calculateWordSimilarity(secretWord, word)
  }));
  
  // Sort by similarity score (descending)
  wordScores.sort((a, b) => b.score - a.score);
  
  // Return the most similar word that's not too similar (between 0.3 and 0.7 similarity)
  const suitableWord = wordScores.find(ws => ws.score >= 0.3 && ws.score <= 0.7);
  
  // If no suitable word found, return the most similar one
  return suitableWord?.word || wordScores[0]?.word || availableWords[0];
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
    const playerCount = players.length;
    if (playerCount === 0) return;
    
    // Get the current host ID from the room
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select('host_id')
      .eq('id', roomId)
      .single();

    if (roomError) {
      console.error('Error fetching room host:', roomError);
      throw roomError;
    }

    const hostId = roomData?.host_id;
    
    // Always ensure at least one Chameleon
    const imposterCount = Math.max(1, calculateImposterCount(playerCount));
    
    // Create the initial role pool with exact number of roles needed
    const rolePool: PlayerRole[] = [];
    
    // Add Chameleons first
    rolePool.push(...Array(imposterCount).fill(PlayerRole.Chameleon));
    
    // Add special roles based on player count
    if (playerCount > 4) rolePool.push(PlayerRole.Mimic);
    if (playerCount > 5) rolePool.push(PlayerRole.Oracle);
    if (playerCount > 6) rolePool.push(PlayerRole.Spy);
    if (playerCount > 7) rolePool.push(PlayerRole.Jester);
    
    // Fill remaining slots with Regular players
    const regularCount = playerCount - rolePool.length;
    rolePool.push(...Array(Math.max(0, regularCount)).fill(PlayerRole.Regular));
    
    // Ensure we have exactly the right number of roles
    if (rolePool.length !== playerCount) {
        console.error('Role pool size mismatch:', rolePool.length, 'vs', playerCount);
        throw new Error('Role pool size does not match player count');
    }
    
    // Fisher-Yates shuffle for better randomization
    for (let i = rolePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [rolePool[i], rolePool[j]] = [rolePool[j], rolePool[i]];
    }

    const updates = players.map((player, index) => ({
        id: player.id,
        room_id: roomId,
        name: player.name,
        role: rolePool[index],
        is_host: player.id === hostId,
        is_ready: false,
        last_updated: new Date().toISOString()
    }));

    // Batch update all players
    const { error } = await supabase
        .from('players')
        .upsert(updates, { onConflict: 'id' });

    if (error) {
        console.error('Error assigning roles (DB Upsert Failed):', error);
        throw error;
    }

    // Find all chameleon players
    const chameleonPlayers = updates.filter(p => p.role === PlayerRole.Chameleon);
    
    // Update room with the first chameleon's ID (maintaining existing behavior)
    if (chameleonPlayers.length > 0) {
        const { error: roomError } = await supabase
            .from('game_rooms')
            .update({ 
                chameleon_id: chameleonPlayers[0].id,
                chameleon_count: chameleonPlayers.length 
            })
            .eq('id', roomId);

        if (roomError) {
        console.error('Error updating room with chameleon info:', roomError);
            throw roomError;
        }
    }

    console.log('Roles assigned:', updates.map(u => `${players.find(p=>p.id===u.id)?.name}: ${u.role}`));
    console.log('Chameleon count:', chameleonPlayers.length);
  } catch (error) {
    console.error('Error in assignRoles:', error);
    throw error;
  }
};

export const updatePlayer = async (playerId: string, roomId: string, updates: Partial<Player>) => {
  try {
    const { error } = await supabase
      .from('players')
      .update({
        ...updates,
        last_updated: new Date().toISOString()
      })
      .eq('id', playerId)
      .eq('room_id', roomId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating player:', error);
    throw error;
  }
};

export const handleGameStateTransition = async (
  roomId: string,
  currentState: GameState,
  settings: GameSettings,
  room: GameRoom
) => {
  try {
    let updateData: Partial<GameRoom> = {};
    let determinedNextState: GameState | null = null;

    switch (currentState) {
     case GameState.Lobby: {
       const nextStateConst = GameState.Selecting;
       determinedNextState = nextStateConst;
       
       // Assign roles before transitioning to Selecting state
       await assignRoles(roomId, room.players);
       
       // Create random turn order with improved randomization
       const shuffledPlayers = [...room.players];
       // Use a more robust shuffle algorithm
       for (let i = shuffledPlayers.length - 1; i > 0; i--) {
         // Use a cryptographically secure random number if available
         const j = Math.floor((Math.random() * (i + 1)) * 1000) % (i + 1);
         [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
       }
       
       // Log the shuffled order for debugging
       console.log('Shuffled players for Lobby transition:', shuffledPlayers.map(p => ({ id: p.id, name: p.name, is_host: p.is_host })));
       
       updateData = { 
         state: nextStateConst,
         round: 1,
         presenting_timer: settings.presenting_time,
         current_turn: 0,
         turn_order: shuffledPlayers.map(p => p.id),
         round_outcome: null,
         votes_tally: {},
         votes: {},
         results: [],
         last_updated: new Date().toISOString(),
         updated_at: new Date().toISOString()
       };
       break;
     }
    
     case GameState.Selecting: {
       const nextStateConst = GameState.Presenting;
       determinedNextState = nextStateConst;
       
       // Create random turn order
       const shuffledPlayers = [...room.players];
       // Fisher-Yates shuffle algorithm for true randomness
       for (let i = shuffledPlayers.length - 1; i > 0; i--) {
         const j = Math.floor(Math.random() * (i + 1));
         [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
       }
       
       // Log the shuffled order for debugging
       console.log('Shuffled players for Selecting transition:', shuffledPlayers.map(p => ({ id: p.id, name: p.name, is_host: p.is_host })));
       
       updateData = { 
         state: nextStateConst,
         presenting_timer: settings.presenting_time,
         current_turn: 0,
         turn_order: shuffledPlayers.map(p => p.id),
         round_outcome: null, 
         votes_tally: {},
         votes: {},
         revealed_player_id: null,
         revealed_role: null,
         last_updated: new Date().toISOString(),
         updated_at: new Date().toISOString()
       };
       break;
     }
    
     case GameState.Presenting: {
       const allPlayersSubmitted = room.players.every(p => p.turn_description);
       if (allPlayersSubmitted) {
         const nextStateConst = GameState.Discussion;
         determinedNextState = nextStateConst;
         updateData = { 
           state: nextStateConst,
           discussion_timer: settings.discussion_time,
           current_turn: 0,
           last_updated: new Date().toISOString(),
           updated_at: new Date().toISOString()
         };
       } else {
         // Get the current turn index
         const currentTurnIndex = room.current_turn ?? 0;
         
         // Get the next turn index using the turn_order array length
         const nextTurnIndex = (currentTurnIndex + 1) % (room.turn_order?.length ?? 0);
         
         // Get the player ID for the next turn directly from turn_order
         const nextPlayerId = room.turn_order?.[nextTurnIndex];
         
         // Find the player's index in the room.players array
         const nextPlayerRoomIndex = room.players.findIndex(p => p.id === nextPlayerId);
         
         console.log('Turn progression:', {
           currentTurnIndex,
           nextTurnIndex,
           nextPlayerId,
           nextPlayerRoomIndex,
           turnOrder: room.turn_order,
           players: room.players.map(p => ({ id: p.id, name: p.name }))
         });
         
         updateData = { 
           current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
           presenting_timer: settings.presenting_time,
           discussion_timer: settings.discussion_time,
           last_updated: new Date().toISOString(),
           updated_at: new Date().toISOString()
         };
       }
       break;
     }
    
     case GameState.Discussion: {
       const nextStateConst = GameState.Voting;
       determinedNextState = nextStateConst;
       updateData = { 
         state: nextStateConst,
         voting_timer: settings.voting_time,
         current_turn: 0,
         votes_tally: {},
         votes: {},
         last_updated: new Date().toISOString(),
         updated_at: new Date().toISOString()
       };
       await supabase.from('players').update({ vote: null }).eq('room_id', roomId);
       break;
     }
    
     case GameState.Voting: {
       const nextStateConst = GameState.Results;
       determinedNextState = nextStateConst;
       
       // Calculate vote results
       const votes = room.players.reduce((acc, player) => {
         if (player.vote) {
           acc[player.vote] = (acc[player.vote] || 0) + 1;
         }
         return acc;
       }, {} as Record<string, number>);
       
       // Find the player with the most votes
       const maxVotes = Math.max(...Object.values(votes));
       const votedPlayers = Object.entries(votes)
         .filter(([_, count]) => count === maxVotes)
         .map(([id]) => id);
       
       // If there's a tie, no one is eliminated
       const eliminatedPlayerId = votedPlayers.length === 1 ? votedPlayers[0] : null;
       
       // Determine if the Chameleon was caught
       const isChameleonCaught = eliminatedPlayerId === room.chameleon_id;
       
       updateData = { 
         state: nextStateConst,
         presenting_timer: 0,
         discussion_timer: 0,
         voting_timer: 0,
         current_turn: 0,
         votes_tally: votes,
         round_outcome: isChameleonCaught ? GameResultType.ImposterCaught : GameResultType.InnocentVoted,
         revealed_player_id: eliminatedPlayerId,
         revealed_role: eliminatedPlayerId ? room.players.find(p => p.id === eliminatedPlayerId)?.role : null
       };
       break;
     }
    
     case GameState.Results: {
       const nextStateConst = GameState.Lobby;
       determinedNextState = nextStateConst;
       
       // Reset all player states
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
         .eq('room_id', roomId);
       
       updateData = { 
         state: nextStateConst,
         presenting_timer: 0,
         discussion_timer: 0,
         voting_timer: 0,
         current_turn: 0,
         turn_order: [],
         round: 1,
         category: undefined,
         secret_word: undefined,
         chameleon_id: undefined,
         round_outcome: null,
         votes_tally: {},
         votes: {},
         revealed_player_id: null,
         revealed_role: null
       };
       break;
     }
    }

    if (determinedNextState) {
      const { error } = await supabase
        .from('game_rooms')
        .update(updateData)
        .eq('id', roomId);

      if (error) {
        console.error('Error updating room state:', error);
        throw error;
      }
    }

    return determinedNextState;
  } catch (error) {
    console.error('Error in handleGameStateTransition:', error);
    throw error;
  }
};

export const isImposter = (role?: PlayerRole): boolean => {
  return role === PlayerRole.Chameleon || role === PlayerRole.Mimic;
};

export const specialRoles = [
  PlayerRole.Guardian,
  PlayerRole.Trickster,
  PlayerRole.Mimic,
  PlayerRole.Oracle,
  PlayerRole.Spy,
  PlayerRole.Jester,
  PlayerRole.Illusionist
] as const;

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
