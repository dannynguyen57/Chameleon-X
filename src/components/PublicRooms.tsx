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
          round,
          created_at,
          updated_at,
          last_updated,
          max_players,
          discussion_time,
          max_rounds,
          game_mode,
          team_size,
          chaos_mode,
          time_per_round,
          voting_time,
          settings,
          players (
            id,
            name,
            room_id
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
          host_id: room.host_id || '',
          state: room.state,
          round: room.round || 0,
          created_at: room.created_at,
          updated_at: room.updated_at || new Date().toISOString(),
          last_updated: room.last_updated || new Date().toISOString(),
          max_players: room.max_players || 10,
          discussion_time: room.discussion_time || 120,
          max_rounds: room.max_rounds || 3,
          game_mode: room.game_mode || 'classic',
          team_size: room.team_size || 2,
          chaos_mode: room.chaos_mode || false,
          time_per_round: room.time_per_round || 60,
          voting_time: room.voting_time || 30,
          players: (room.players || []).map(player => ({
            id: player.id,
            name: player.name,
            room_id: player.room_id,
            isHost: player.id === room.host_id,
            vote: null,
            last_active: new Date().toISOString(),
            last_updated: new Date().toISOString()
          })),
          settings: {
            max_players: room.max_players || 10,
            discussion_time: room.discussion_time || 120,
            max_rounds: room.max_rounds || 3,
            game_mode: room.game_mode || 'classic',
            team_size: room.team_size || 2,
            chaos_mode: room.chaos_mode || false,
            time_per_round: room.time_per_round || 60,
            voting_time: room.voting_time || 30,
            roles: room.settings?.roles || {},
            special_abilities: room.settings?.special_abilities || false
          }
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
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Room {room.id}</span>
                <Badge variant={room.players.length >= room.settings.max_players ? "destructive" : "default"}>
                  {room.players.length}/{room.settings.max_players} Players
                </Badge>
              </CardTitle>
              <CardDescription>
                Created {new Date(room.created_at).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  <p className="text-sm">
                    <span className="font-medium">Mode:</span> {room.settings.game_mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4" />
                  <p className="text-sm">
                    <span className="font-medium">Rounds:</span> {room.settings.max_rounds}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <p className="text-sm">
                    <span className="font-medium">Time:</span> {room.settings.discussion_time}s
                  </p>
                </div>
                <Button
                  className="w-full"
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
            <p className="text-muted-foreground">No public rooms available. Create one to get started!</p>
          </div>
        )}
      </div>
    </div>
  );
} 