import { supabase } from "@/integrations/supabase/client";
import { GameRoom, GameSettings, GameState, Player, WordCategory, GameResultType, VotingPhase, VotingOutcome, Vote, VotingRound } from '@/lib/types';
import { mapRoomData, DatabaseRoom } from '@/hooks/useGameRealtime';
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
      .select(`
        *,
        players!players_room_id_fkey(*),
        voted_out_player:players!game_rooms_voted_out_player_fkey(*)
      `)
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
      .eq('room_id', roomId)
      .eq('id', roomData.voted_out_player || '');

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
    const mappedRoom = mapRoomData(combinedData as DatabaseRoom);
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

const handleVotingResults = async (
  room: GameRoom,
  votingRound: VotingRound & { votes: Vote[] },
  roomId: string
): Promise<{ nextState: GameState; updateData?: Partial<DatabaseRoom> }> => {
  // Calculate vote counts more efficiently
  const voteCounts = new Map<string, number>();
  for (const vote of votingRound.votes) {
    voteCounts.set(vote.target_id, (voteCounts.get(vote.target_id) || 0) + 1);
  }

  const maxVotes = Math.max(...voteCounts.values());
  const votedPlayers = Array.from(voteCounts.entries())
    .filter(([_, count]) => count === maxVotes)
    .map(([id]) => id);

  if (votedPlayers.length === 1) {
    const votedOutPlayer = votedPlayers[0];
    const votedOutPlayerObj = room.players.find(p => p.id === votedOutPlayer);
    const isChameleon = votedOutPlayerObj?.role === PlayerRole.Chameleon;

    // Create round result
    const { error: resultError } = await supabase
      .from('round_results')
      .insert({
        round_id: votingRound.id,
        voted_out_player_id: votedOutPlayer,
        revealed_role: votedOutPlayerObj?.role || null,
        outcome: isChameleon ? VotingOutcome.ChameleonFound : VotingOutcome.ChameleonSurvived
      });

    if (resultError) throw resultError;

    // Update voting round
    await supabase
      .from('voting_rounds')
      .update({ 
        phase: VotingPhase.Results,
        end_time: new Date().toISOString()
      })
      .eq('id', votingRound.id);

    return {
      nextState: isChameleon ? GameState.Results : GameState.Presenting,
      updateData: isChameleon ? undefined : { round: room.round + 1 }
    };
  }

  // Handle tie - create new voting round
  const { error: newVotingError } = await supabase
    .from('voting_rounds')
    .insert({
      room_id: roomId,
      round_number: room.round,
      phase: VotingPhase.Voting,
      start_time: new Date().toISOString()
    });

  if (newVotingError) throw newVotingError;

  return { nextState: GameState.Voting };
};

// Add these helper functions at the top level
const createShuffledTurnOrder = (players: Player[]): string[] => {
  const shuffledPlayers = [...players];
  for (let i = shuffledPlayers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledPlayers[i], shuffledPlayers[j]] = [shuffledPlayers[j], shuffledPlayers[i]];
  }
  return shuffledPlayers.map(p => p.id);
};

const resetGameState = async (roomId: string): Promise<Partial<DatabaseRoom>> => {
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
    
  return { 
    state: GameState.Lobby,
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
    revealed_role: null,
    voted_out_player: null
  };
};

export const handleGameStateTransition = async (
  roomId: string,
  currentState: GameState,
  playerId: string,
  settings: GameSettings
): Promise<GameState | null> => {
  try {
    let determinedNextState: GameState | null = null;
    let updateData: Partial<DatabaseRoom> = {};

    // Get current room data
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select(`
        *,
        players!players_room_id_fkey(*),
        current_voting_round:voting_rounds!voting_rounds_room_id_fkey(*),
        current_round_result:round_results!round_results_round_id_fkey(*)
      `)
      .eq('id', roomId)
      .single();

    if (!roomData) return null;

    const room = mapRoomData(roomData as DatabaseRoom);

    switch (currentState) {
     case GameState.Lobby: {
       determinedNextState = GameState.Selecting;
       await assignRoles(roomId, room.players);
       
       updateData = { 
         state: determinedNextState,
         round: 1,
         presenting_timer: settings.presenting_time,
         current_turn: 0,
         turn_order: createShuffledTurnOrder(room.players),
         round_outcome: null,
         votes_tally: {},
         votes: {},
         results: [],
         last_updated: new Date().toISOString(),
         updated_at: new Date().toISOString()
       } as Partial<DatabaseRoom>;
       break;
     }
    
     case GameState.Selecting: {
       determinedNextState = GameState.Presenting;
       updateData = { 
         state: determinedNextState,
         presenting_timer: settings.presenting_time,
         current_turn: 0,
         turn_order: createShuffledTurnOrder(room.players),
         round_outcome: null, 
         votes_tally: {},
         votes: {},
         revealed_player_id: null,
         revealed_role: null,
         last_updated: new Date().toISOString(),
         updated_at: new Date().toISOString()
       } as Partial<DatabaseRoom>;
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
       
       // Create new voting round
       const { data: votingRound, error: votingError } = await supabase
         .from('voting_rounds')
         .insert({
           room_id: roomId,
           round_number: room.round,
           phase: VotingPhase.Voting,
           start_time: new Date().toISOString()
         })
         .select()
         .single();

       if (votingError) {
         console.error('Error creating voting round:', votingError);
         throw votingError;
       }

       updateData = { 
         state: nextStateConst,
         voting_timer: settings.voting_time,
         current_turn: 0,
         current_voting_round_id: votingRound.id,
         last_updated: new Date().toISOString()
       } as Partial<DatabaseRoom>;
       break;
     }
    
     case GameState.Voting: {
       const { data: votingRound, error: votingError } = await supabase
         .from('voting_rounds')
         .select('*, votes(*)')
         .eq('room_id', roomId)
         .eq('round_number', room.round)
         .single();

       if (votingError) throw votingError;

       const allVoted = room.players.every(player => 
         votingRound.votes.some((vote: Vote) => vote.voter_id === player.id)
       );

       if (allVoted) {
         const { nextState, updateData: voteUpdateData } = await handleVotingResults(room, votingRound, roomId);
         determinedNextState = nextState;
         if (voteUpdateData) updateData = voteUpdateData;
       }
       break;
     }
    
     case GameState.Results: {
       determinedNextState = GameState.Lobby;
       updateData = await resetGameState(roomId);
       break;
     }
    }

    if (determinedNextState) {
      const { error } = await supabase
        .from('game_rooms')
        .update({
          ...updateData,
          state: determinedNextState,
          last_updated: new Date().toISOString()
        })
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
