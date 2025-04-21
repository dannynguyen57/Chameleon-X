import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/hooks/useGame';
import { GameRoom } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Gamepad2, Settings2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function PublicRooms() {
  const [rooms, setRooms] = useState<GameRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const { getPublicRooms, joinRoom, playerName: contextPlayerName } = useGame();
  const navigate = useNavigate();

  // Load player name from context or localStorage when component mounts
  useEffect(() => {
    const savedName = localStorage.getItem('playerName') || contextPlayerName || '';
    setPlayerName(savedName);
  }, [contextPlayerName]);

  // Define fetchRooms function with useCallback to prevent infinite loops
  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPublicRooms();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    } finally {
      setLoading(false);
    }
  }, [getPublicRooms]);

  useEffect(() => {
    fetchRooms();
    
    // Set up periodic refresh
    const intervalId = setInterval(fetchRooms, 5000);
    
    return () => clearInterval(intervalId);
  }, [fetchRooms]);

  const openJoinDialog = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsJoinDialogOpen(true);
  };

  const handleJoinRoom = async () => {
    if (!selectedRoomId || !playerName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your name to join the room."
      });
      return;
    }

    try {
      // Save the player name to localStorage for future use
      localStorage.setItem('playerName', playerName);
      
      // Sanitize the room ID to ensure it only contains valid characters
      const cleanRoomId = selectedRoomId.replace(/[^a-zA-Z0-9-]/g, '');
      
      // If the room ID changed after sanitizing, show a warning
      if (cleanRoomId !== selectedRoomId) {
        console.warn(`Room ID was sanitized from ${selectedRoomId} to ${cleanRoomId}`);
      }
      
      // Check if the room still exists and is not full before joining
      const roomsData = await getPublicRooms();
      const roomToJoin = roomsData.find((room: GameRoom) => room.id === cleanRoomId);
      
      if (!roomToJoin) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This room no longer exists."
        });
        // Refresh the rooms list
        fetchRooms();
        setIsJoinDialogOpen(false);
        return;
      }
      
      if (roomToJoin.players.length >= roomToJoin.settings.max_players) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This room is now full. Please choose another room."
        });
        // Refresh the rooms list
        fetchRooms();
        setIsJoinDialogOpen(false);
        return;
      }
      
      await joinRoom(cleanRoomId, playerName);
      setIsJoinDialogOpen(false);
      navigate(`/room/${cleanRoomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join the room. Please try again."
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const selectedRoom = selectedRoomId ? rooms.find(room => room.id === selectedRoomId) : null;

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
                  onClick={() => openJoinDialog(room.id)}
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

      {/* Join Room Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Room</DialogTitle>
            <DialogDescription>
              Enter your name to join {selectedRoom?.id ? `Room ${selectedRoom.id}` : 'the room'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsJoinDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoinRoom}
              disabled={!playerName.trim()}
            >
              Join Room
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 