
import { useEffect, useState } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { GameRoom, Player, GameState, ChatMessage, GameMode, GameSettings } from '@/lib/types';
import { useToast } from '@/components/ui/use-toast';

export const useGameRealtime = (
  roomId: string | undefined,
  setRoom: (room: GameRoom | null) => void,
  playerId: string
) => {
  const { toast } = useToast();
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Fetch initial room data
  useEffect(() => {
    if (!roomId) return;

    const fetchInitialData = async () => {
      try {
        // Fetch room data
        const { data: roomData, error: roomError } = await supabase
          .from('game_rooms')
          .select('*, players(*)')
          .eq('id', roomId)
          .single();
        
        if (roomError) throw roomError;
        
        if (roomData) {
          const mappedPlayers: Player[] = roomData.players.map((player: any) => ({
            id: player.id,
            name: player.name,
            isHost: player.is_host,
            vote: player.vote,
            isReady: player.is_ready,
            isProtected: player.is_protected,
            voteMultiplier: player.vote_multiplier,
            specialWord: player.special_word,
            specialAbilityUsed: player.special_ability_used,
            role: player.role,
            turnDescription: player.turn_description
          }));

          const mappedRoom: GameRoom = {
            id: roomData.id,
            hostId: roomData.host_id,
            players: mappedPlayers,
            state: roomData.state as GameState,
            category: roomData.category || undefined,
            secretWord: roomData.secret_word || undefined,
            chameleonId: roomData.chameleon_id || undefined,
            timer: roomData.timer || undefined,
            round: roomData.round || 0,
            maxRounds: roomData.max_rounds,
            gameMode: roomData.game_mode as GameMode,
            teamSize: roomData.team_size,
            chaosMode: roomData.chaos_mode,
            maxPlayers: roomData.max_players,
            discussionTime: roomData.discussion_time,
            timePerRound: roomData.time_per_round,
            votingTime: roomData.voting_time,
            settings: roomData.settings as GameSettings,
            currentTurn: roomData.current_turn,
            turnOrder: roomData.turn_order,
            revealedPlayerId: roomData.revealed_player_id,
            revealedRole: roomData.revealed_role,
            roundOutcome: roomData.round_outcome,
            votesTally: roomData.votes_tally as Record<string, number>,
            playerId: playerId // Add the current player ID to the room object
          };

          setRoom(mappedRoom);
        }

        // Fetch chat messages
        const { data: chatData, error: chatError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('room_id', roomId)
          .order('created_at', { ascending: true });

        if (chatError) throw chatError;
        
        if (chatData) {
          const mappedChat: ChatMessage[] = chatData.map((msg: any) => ({
            id: msg.id,
            playerId: msg.player_id,
            playerName: msg.player_name,
            content: msg.content,
            createdAt: msg.created_at,
            role: msg.role,
            isHint: msg.is_hint
          }));

          setChatMessages(mappedChat);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
        toast({
          variant: "destructive",
          title: "Error loading game",
          description: "Failed to load game data. Please try again."
        });
      }
    };

    fetchInitialData();
  }, [roomId, setRoom, toast, playerId]);

  // Set up real-time listeners
  useEffect(() => {
    if (!roomId) return;

    // Room changes subscription
    const roomChannel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`,
        },
        async (payload) => {
          if (payload.new) {
            const { data: updatedRoom } = await supabase
              .from('game_rooms')
              .select('*, players(*)')
              .eq('id', roomId)
              .single();

            if (updatedRoom) {
              // Map players from database format to our Player type
              const mappedPlayers: Player[] = updatedRoom.players.map((player: any) => ({
                id: player.id,
                name: player.name,
                isHost: player.is_host,
                vote: player.vote,
                isReady: player.is_ready,
                isProtected: player.is_protected,
                voteMultiplier: player.vote_multiplier,
                specialWord: player.special_word,
                specialAbilityUsed: player.special_ability_used,
                role: player.role,
                turnDescription: player.turn_description
              }));

              // Map room data from database format to our GameRoom type
              const mappedRoom: GameRoom = {
                id: updatedRoom.id,
                hostId: updatedRoom.host_id,
                players: mappedPlayers,
                state: updatedRoom.state as GameState,
                category: updatedRoom.category || undefined,
                secretWord: updatedRoom.secret_word || undefined,
                chameleonId: updatedRoom.chameleon_id || undefined,
                timer: updatedRoom.timer || undefined,
                round: updatedRoom.round || 0,
                maxRounds: updatedRoom.max_rounds,
                gameMode: updatedRoom.game_mode as GameMode,
                teamSize: updatedRoom.team_size,
                chaosMode: updatedRoom.chaos_mode,
                maxPlayers: updatedRoom.max_players,
                discussionTime: updatedRoom.discussion_time,
                timePerRound: updatedRoom.time_per_round,
                votingTime: updatedRoom.voting_time,
                settings: updatedRoom.settings as GameSettings,
                currentTurn: updatedRoom.current_turn,
                turnOrder: updatedRoom.turn_order,
                revealedPlayerId: updatedRoom.revealed_player_id,
                revealedRole: updatedRoom.revealed_role,
                roundOutcome: updatedRoom.round_outcome,
                votesTally: updatedRoom.votes_tally as Record<string, number>,
                playerId: playerId // Add the current player ID to the room object
              };

              setRoom(mappedRoom);
            }
          }
        }
      )
      .subscribe();

    // Players changes subscription
    const playersChannel = supabase
      .channel(`players:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          const { data: updatedRoom } = await supabase
            .from('game_rooms')
            .select('*, players(*)')
            .eq('id', roomId)
            .single();

          if (updatedRoom) {
            const mappedPlayers: Player[] = updatedRoom.players.map((player: any) => ({
              id: player.id,
              name: player.name,
              isHost: player.is_host,
              vote: player.vote,
              isReady: player.is_ready,
              isProtected: player.is_protected,
              voteMultiplier: player.vote_multiplier,
              specialWord: player.special_word,
              specialAbilityUsed: player.special_ability_used,
              role: player.role,
              turnDescription: player.turn_description
            }));

            const mappedRoom: GameRoom = {
              id: updatedRoom.id,
              hostId: updatedRoom.host_id,
              players: mappedPlayers,
              state: updatedRoom.state as GameState,
              category: updatedRoom.category || undefined,
              secretWord: updatedRoom.secret_word || undefined,
              chameleonId: updatedRoom.chameleon_id || undefined,
              timer: updatedRoom.timer || undefined,
              round: updatedRoom.round || 0,
              maxRounds: updatedRoom.max_rounds,
              gameMode: updatedRoom.game_mode as GameMode,
              teamSize: updatedRoom.team_size,
              chaosMode: updatedRoom.chaos_mode,
              maxPlayers: updatedRoom.max_players,
              discussionTime: updatedRoom.discussion_time,
              timePerRound: updatedRoom.time_per_round,
              votingTime: updatedRoom.voting_time,
              settings: updatedRoom.settings as GameSettings,
              currentTurn: updatedRoom.current_turn,
              turnOrder: updatedRoom.turn_order,
              revealedPlayerId: updatedRoom.revealed_player_id,
              revealedRole: updatedRoom.revealed_role,
              roundOutcome: updatedRoom.round_outcome,
              votesTally: updatedRoom.votes_tally as Record<string, number>,
              playerId: playerId // Add the current player ID to the room object
            };

            setRoom(mappedRoom);
          }
        }
      )
      .subscribe();

    // Chat messages subscription
    const chatChannel = supabase
      .channel(`chat:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMessage = payload.new as any;
            setChatMessages(prev => [...prev, {
              id: newMessage.id,
              playerId: newMessage.player_id,
              playerName: newMessage.player_name,
              content: newMessage.content,
              createdAt: newMessage.created_at,
              role: newMessage.role,
              isHint: newMessage.is_hint
            }]);
          }
        }
      )
      .subscribe();

    // Track player presence
    const presenceChannel = supabase
      .channel(`presence:${roomId}`)
      .on('presence', { event: 'sync' }, () => {
        updatePlayerActivity();
      })
      .subscribe();

    // Player activity tracking function
    const updatePlayerActivity = async () => {
      if (playerId && roomId) {
        await supabase
          .from('players')
          .update({ last_active: new Date().toISOString() })
          .eq('id', playerId)
          .eq('room_id', roomId);
      }
    };

    // Update player activity periodically
    const activityInterval = setInterval(updatePlayerActivity, 30000);

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playersChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(presenceChannel);
      clearInterval(activityInterval);
    };
  }, [roomId, playerId, setRoom]);

  return { chatMessages, setChatMessages };
};
