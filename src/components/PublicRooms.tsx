import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { GameRoom } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import { Clock, Users, Gamepad2, Settings2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

export default function PublicRooms() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { joinRoom } = useGame();

  useEffect(() => {
    const loadRooms = async () => {
      const { data, error } = await supabase
        .from('game_rooms')
        .select(`
          id,
          host_id,
          state,
          settings,
          max_players,
          discussion_time,
          max_rounds,
          game_mode,
          team_size,
          chaos_mode,
          time_per_round,
          voting_time,
          created_at,
          updated_at,
          last_updated,
          players!players_room_id_fkey (
            id,
            name,
            room_id,
            is_host,
            is_ready
          )
        `)
        .eq('state', 'lobby')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading rooms:', error);
        toast({
          variant: "destructive",
          title: "Error loading rooms",
          description: error.message
        });
        return;
      }

      if (data) {
        const mappedRooms = data.map(room => ({
          id: room.id,
          host_id: room.host_id,
          state: room.state,
          settings: room.settings,
          max_players: room.max_players,
          discussion_time: room.discussion_time,
          max_rounds: room.max_rounds,
          game_mode: room.game_mode,
          team_size: room.team_size,
          chaos_mode: room.chaos_mode,
          time_per_round: room.time_per_round,
          voting_time: room.voting_time,
          created_at: room.created_at,
          updated_at: room.updated_at,
          last_updated: room.last_updated,
          players: (room.players || []).map(player => ({
            id: player.id,
            name: player.name,
            room_id: player.room_id,
            is_host: player.is_host,
            is_ready: player.is_ready || false,
            vote: null,
            last_active: new Date().toISOString(),
            last_updated: new Date().toISOString()
          }))
        }));
        setRooms(mappedRooms);
      }
      setLoading(false);
    };

    loadRooms();

    // Subscribe to room changes
    const channel = supabase
      .channel('public_rooms')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms'
        },
        () => {
          loadRooms();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const handleJoinRoom = async (room: GameRoom) => {
    if (room.players.length >= room.settings.max_players) {
      toast({
        title: "Room is full",
        description: "This room has reached its maximum number of players.",
        variant: "destructive",
      });
      return;
    }

    const playerName = prompt("Enter your name:");
    if (!playerName) return;

    const success = await joinRoom(room.id, playerName);
    if (success) {
      toast({
        title: "Successfully joined room!",
        description: "You have joined the game room.",
      });
      setTimeout(() => {
        navigate(`/room/${room.id}`);
      }, 500);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-lg transition-all duration-200 w-full border-2 border-transparent hover:border-primary/20">
            <CardHeader className="p-3 sm:p-4">
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-semibold">Room {room.id}</span>
                <Badge 
                  variant={room.players.length >= room.settings.max_players ? "destructive" : "default"}
                  className="text-xs sm:text-sm"
                >
                  {room.players.length}/{room.settings.max_players} Players
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Created {new Date(room.created_at).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 flex-shrink-0 text-primary" />
                  <p className="text-xs sm:text-sm truncate">
                    <span className="font-medium">Mode:</span> {room.settings.game_mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 flex-shrink-0 text-primary" />
                  <p className="text-xs sm:text-sm truncate">
                    <span className="font-medium">Rounds:</span> {room.settings.max_rounds}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0 text-primary" />
                  <p className="text-xs sm:text-sm truncate">
                    <span className="font-medium">Time:</span> {room.settings.discussion_time}s
                  </p>
                </div>
                <Button
                  className="w-full mt-2 text-xs sm:text-sm h-8 sm:h-9"
                  onClick={() => handleJoinRoom(room)}
                  disabled={room.players.length >= room.settings.max_players}
                >
                  {room.players.length >= room.settings.max_players ? 'Room Full' : 'Join Room'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {rooms.length === 0 && (
          <div className="col-span-full text-center py-8">
            <p className="text-sm sm:text-base text-muted-foreground">No public rooms available. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
} 