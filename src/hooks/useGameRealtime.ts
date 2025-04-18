
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { GameRoom, Player } from '@/lib/types';

export const useGameRealtime = (
  roomId: string | undefined,
  setRoom: (room: GameRoom | null) => void
) => {
  useEffect(() => {
    if (!roomId) return;

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
                vote: player.vote
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
                round: updatedRoom.round,
                maxRounds: updatedRoom.max_rounds
              };

              setRoom(mappedRoom);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, setRoom]);
};
