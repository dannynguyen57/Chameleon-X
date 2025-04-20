import { supabase } from "@/integrations/supabase/client";
import { GameRoom, GameSettings, GameState, PlayerRole, Player, WordCategory, GameResultType } from '@/lib/types';
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
   // ... implementation ...
    const playerCount = players.length;
    if (playerCount === 0) return;
    
    const imposterCount = calculateImposterCount(playerCount);
    
    const rolePool: PlayerRole[] = [
      ...Array(imposterCount).fill(PlayerRole.Chameleon),
      ...(playerCount > 4 ? Array(1).fill(PlayerRole.Mimic) : []),
      ...(playerCount > 5 ? Array(1).fill(PlayerRole.Oracle) : []), 
      ...(playerCount > 6 ? Array(1).fill(PlayerRole.Spy) : []), 
      ...(playerCount > 7 ? Array(1).fill(PlayerRole.Jester) : []), 
    ];

    const regularCount = playerCount - rolePool.length;
    rolePool.push(...Array(Math.max(0, regularCount)).fill(PlayerRole.Regular));

    const shuffledRoles = rolePool.sort(() => Math.random() - 0.5);

    const updates = players.map((player, index) => ({
      id: player.id,
      room_id: roomId,
      name: player.name,
      role: shuffledRoles[index % shuffledRoles.length], 
      last_updated: new Date().toISOString()
    }));

    const { error } = await supabase
      .from('players')
      .upsert(updates, { onConflict: 'id' });

    if (error) {
      console.error('Error assigning roles (DB Upsert Failed):', error);
      throw error;
    }
    console.log('Roles successfully assigned in DB:', updates.map(u => `${players.find(p=>p.id===u.id)?.name}: ${u.role}`));
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
    let determinedNextState: GameState | null = null;

    switch (currentState) {
     case GameState.Lobby: {
       const nextStateConst = GameState.Selecting;
       determinedNextState = nextStateConst;
       
       // Assign roles before transitioning to Selecting state
       await assignRoles(roomId, room.players);
       
       updateData = { 
         state: nextStateConst,
         round: 1,
         timer: settings.time_per_round,
         current_turn: 0,
         turn_order: room.players.map(p => p.id).sort(() => Math.random() - 0.5),
         round_outcome: null,
         votes_tally: null,
         votes: {},
         results: []
       };
       break;
     }
    
     case GameState.Selecting: {
       const nextStateConst = GameState.Presenting;
       determinedNextState = nextStateConst;
       updateData = { 
         state: nextStateConst,
         timer: settings.time_per_round,
         current_turn: 0,
         turn_order: room.players.map(p => p.id).sort(() => Math.random() - 0.5),
         round_outcome: null, 
         votes_tally: null,
         votes: {},
         revealed_player_id: null,
         revealed_role: null
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
           timer: settings.discussion_time,
           current_turn: 0 
         };
       } else {
         const currentTurnPlayerId = room.turn_order?.[room.current_turn ?? 0];
         const currentTurnOrderIndex = room.turn_order?.findIndex(id => id === currentTurnPlayerId) ?? room.current_turn ?? 0;
         const nextTurnOrderIndex = (currentTurnOrderIndex + 1) % (room.turn_order?.length || room.players.length);
         const nextPlayerId = room.turn_order?.[nextTurnOrderIndex];
         const nextPlayerRoomIndex = room.players.findIndex(p => p.id === nextPlayerId);
         
         updateData = { 
           current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
           timer: settings.time_per_round
         };
       }
       break;
     }
    
     case GameState.Discussion: {
       const nextStateConst = GameState.Voting;
       determinedNextState = nextStateConst;
       updateData = { 
         state: nextStateConst,
         timer: settings.voting_time,
         current_turn: 0,
         votes_tally: null,
         votes: {}
       };
       await supabase.from('players').update({ vote: null }).eq('room_id', roomId);
       break;
     }
    
     case GameState.Voting: { 
       const nextStateConst = GameState.Results;
       determinedNextState = nextStateConst;
       
       const votes: Record<string, number> = {};
       room.players.forEach(player => {
         if (player.vote) {
           const targetPlayer = room.players.find(p => p.id === player.vote);
           if (!targetPlayer?.is_protected) {
             votes[player.vote] = (votes[player.vote] || 0) + (player.vote_multiplier || 1);
           }
         }
       });

       // Determine voting result directly
       let calculatedMaxVotes = 0;
       let calculatedMostVotedId: string | null = null;
       let isTie = false;
       for (const playerId in votes) {
         if (votes[playerId] > calculatedMaxVotes) {
           calculatedMaxVotes = votes[playerId];
           calculatedMostVotedId = playerId;
           isTie = false; // Reset tie flag
         } else if (votes[playerId] === calculatedMaxVotes) {
           isTie = true;
         }
       }

       // Final calculation based on tie status
       const finalMostVotedId = isTie ? null : calculatedMostVotedId;
       const votedPlayer = finalMostVotedId ? room.players.find(p => p.id === finalMostVotedId) : null;
       const finalRevealedRole = votedPlayer?.role || null;

       let finalOutcome = 'tie';
       if (finalMostVotedId && votedPlayer) { // Ensure a player was actually voted
         if (votedPlayer.role === PlayerRole.Chameleon || votedPlayer.role === PlayerRole.Mimic) {
           finalOutcome = 'imposter_caught';
         } else if (votedPlayer.role === PlayerRole.Jester) {
           finalOutcome = 'jester_wins';
         } else {
           finalOutcome = 'innocent_voted';
         }
       } // If finalMostVotedId is null (tie), outcome remains 'tie'
       
       updateData = { 
         state: nextStateConst,
         timer: 30,
         round_outcome: finalOutcome === 'imposter_caught' ? GameResultType.ImposterCaught : 
                      finalOutcome === 'jester_wins' ? GameResultType.JesterWins : 
                      finalOutcome === 'innocent_voted' ? GameResultType.InnocentVoted : 
                      GameResultType.Tie,
         votes_tally: votes,
         revealed_player_id: finalMostVotedId,
         revealed_role: finalRevealedRole
       };
       break;
     }
    
     case GameState.Results: { 
       if (room.round >= room.max_rounds) {
         const nextStateConst = GameState.Ended;
         determinedNextState = nextStateConst;
         updateData = { state: nextStateConst, timer: undefined };
       } else {
         const nextStateConst = GameState.Selecting;
         determinedNextState = nextStateConst;
         // Reset player states for next round
         await supabase
           .from('players')
           .update({ 
             turn_description: null,
             vote: null,
             is_protected: false,
             vote_multiplier: 1,
             special_ability_used: false
           })
           .eq('room_id', roomId);
         
         updateData = {
           state: nextStateConst,
           round: room.round + 1,
           timer: settings.time_per_round,
           current_turn: 0,
           turn_order: room.players.map(p => p.id).sort(() => Math.random() - 0.5),
           round_outcome: null,
           votes_tally: null,
           revealed_player_id: null,
           revealed_role: null,
           votes: {}
         };
       }
       break;
     }
    
     default:
       console.error('Invalid state transition from:', currentState);
       return { error: new Error('Invalid state transition') };
   }

   if (Object.keys(updateData).length > 0) {
       if (updateData.state === undefined && determinedNextState !== null) {
           updateData.state = determinedNextState;
       }
       updateData.last_updated = new Date().toISOString();
       const { error } = await supabase
         .from('game_rooms')
         .update(updateData)
         .eq('id', roomId);
       
       if (error) {
           console.error(`Error transitioning state from ${currentState} to ${determinedNextState ?? 'unknown'}:`, error);
           return { error };
       }
   }
  
   return { data: { newState: determinedNextState } };
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
