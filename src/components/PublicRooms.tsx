import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/hooks/useGame';
import { GameRoom } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Gamepad2, Settings2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServerCrash } from 'lucide-react';

export default function PublicRooms() {
  const [rooms, setRooms] = useState<GameRoom[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { getPublicRooms, joinRoom, playerName: contextPlayerName, checkNameExists } = useGame();
  const navigate = useNavigate();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Load player name from context or localStorage when component mounts
  useEffect(() => {
    const savedName = localStorage.getItem('playerName') || contextPlayerName || '';
    setPlayerName(savedName);
  }, [contextPlayerName]);

  const fetchPublicRooms = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsLoading(true); // Show loader on subsequent fetches
    try {
      const data = await getPublicRooms();
      setRooms(data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]); // Set to empty array on error
      toast({ variant: "destructive", title: "Error", description: "Could not fetch public rooms." });
    } finally {
      setIsLoading(false);
    }
  }, [getPublicRooms]);

  // Set up real-time subscriptions
  useEffect(() => {
    let isSubscribed = true;

    // Initial fetch
    fetchPublicRooms(true);

    // Clean up any existing subscription
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase.channel('public_rooms_list', {
      config: {
        broadcast: { self: true },
        presence: { key: '' },
      },
    });

    // Subscribe to game_rooms changes
    channel
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'game_rooms',
          filter: 'state=eq.lobby'
        }, 
        (payload) => {
          console.log('New room created:', payload);
          if (isSubscribed) {
            fetchPublicRooms();
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: 'DELETE', 
          schema: 'public', 
          table: 'game_rooms',
          filter: 'state=eq.lobby'
        }, 
        (payload) => {
          console.log('Room deleted:', payload);
          if (isSubscribed) {
            fetchPublicRooms();
          }
        }
      )
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'players',
          filter: 'room_id=not.is.null'
        }, 
        (payload) => {
          console.log('Player change detected:', payload);
          if (isSubscribed) {
            fetchPublicRooms();
          }
        }
      )
      .subscribe((status) => {
        console.log('PublicRooms Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to public rooms channel');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error('PublicRooms Subscription failed:', status);
          if (isSubscribed) {
            setIsLoading(false);
            setRooms([]);
            toast({ 
              variant: "destructive", 
              title: "Connection Error", 
              description: "Could not connect to live room updates. Please refresh the page." 
            });
          }
        }
      });

    channelRef.current = channel;

    return () => {
      isSubscribed = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(err => console.error("Error removing channel:", err));
        channelRef.current = null;
      }
    };
  }, [fetchPublicRooms]);

  const openJoinDialog = (roomId: string) => {
    setSelectedRoomId(roomId);
    setIsJoinDialogOpen(true);
    setPlayerName('');
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

    setIsJoining(true);
    try {
      // Check if name exists in the room
      const nameExists = await checkNameExists(selectedRoomId, playerName);
      if (nameExists) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This name is already in use in this room. Please choose a different name."
        });
        return;
      }

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
        fetchPublicRooms();
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
        fetchPublicRooms();
        setIsJoinDialogOpen(false);
        return;
      }
      
      const success = await joinRoom(cleanRoomId, playerName);
      if (success) {
        setIsJoinDialogOpen(false);
        navigate(`/room/${cleanRoomId}`);
      } else {
        setIsJoinDialogOpen(false);
      }
    } catch (error) {
      console.error('Error joining room:', error);
      setIsJoinDialogOpen(false);
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <p className="ml-3 text-muted-foreground">Loading public rooms...</p>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <Alert className="border-amber-200 bg-amber-50 text-amber-800">
        <ServerCrash className="h-4 w-4 !text-amber-600" />
        <AlertTitle className="!text-amber-900">No Rooms Found</AlertTitle>
        <AlertDescription className="!text-amber-700">
          There are currently no public rooms available. Why not create one?
        </AlertDescription>
      </Alert>
    );
  }

  const selectedRoom = selectedRoomId ? rooms.find(room => room.id === selectedRoomId) : null;

  return (
    <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {rooms.map((room) => (
          <Card 
            key={room.id} 
            className="hover:shadow-lg transition-all duration-200 w-full border-2 border-transparent hover:border-cyan-200 bg-white/90"
          >
            <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-cyan-50 to-teal-50">
              <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
                <span className="text-base sm:text-lg font-semibold text-cyan-600">Room {room.id}</span>
                <Badge 
                  variant={room.players.length >= room.settings.max_players ? "destructive" : "default"}
                  className="text-xs sm:text-sm bg-cyan-500 hover:bg-cyan-600 text-white"
                >
                  {room.players.length}/{room.settings.max_players} Players
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-cyan-600/70">
                Created {new Date(room.created_at).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-2.5 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                  <p className="text-xs sm:text-sm truncate">
                    <span className="font-medium">Mode:</span> {room.settings.game_mode}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                  <p className="text-xs sm:text-sm truncate">
                    <span className="font-medium">Rounds:</span> {room.settings.max_rounds}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 flex-shrink-0 text-cyan-500" />
                  <p className="text-xs sm:text-sm truncate">
                    <span className="font-medium">Time:</span> {room.settings.discussion_time}s
                  </p>
                </div>
                <Button
                  className="w-full mt-2 text-xs sm:text-sm h-8 sm:h-9 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white transition-all duration-300"
                  onClick={() => openJoinDialog(room.id)}
                  disabled={room.players.length >= room.settings.max_players}
                >
                  {room.players.length >= room.settings.max_players ? 'Room Full' : 'Join Room'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Join Room Dialog */}
      <Dialog open={isJoinDialogOpen} onOpenChange={setIsJoinDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-cyan-600">Join Room</DialogTitle>
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
              className="border-cyan-100 focus:border-cyan-300 focus:ring-cyan-200"
            />
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsJoinDialogOpen(false)}
              disabled={isJoining}
              className="border-cyan-200 hover:bg-cyan-50"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleJoinRoom}
              disabled={!playerName.trim() || isJoining}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white transition-all duration-300"
            >
              {isJoining ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Joining Room...
                </>
              ) : (
                "Join Room"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 