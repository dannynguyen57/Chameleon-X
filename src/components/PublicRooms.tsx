import { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGame } from '@/hooks/useGame';
import { GameRoom } from '@/lib/types';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Gamepad2, Settings2, PlusCircle, Search } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ServerCrash } from 'lucide-react';
import { motion } from 'framer-motion';

interface PublicRoomsProps {
  onSwitchTab?: (tab: string) => void;
}

export default function PublicRooms({ onSwitchTab }: PublicRoomsProps) {
  const [rooms, setRooms] = useState<GameRoom[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const { getPublicRooms, joinRoom, playerName: contextPlayerName, checkNameExists } = useGame();
  const navigate = useNavigate();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isSubscribedRef = useRef(false);

  // Load player name from context or localStorage when component mounts
  useEffect(() => {
    const savedName = localStorage.getItem('playerName') || contextPlayerName || '';
    setPlayerName(savedName);
  }, [contextPlayerName]);

  const fetchPublicRooms = useCallback(async (isInitial = false) => {
    if (!isInitial) setIsLoading(true);
    try {
      const { data: freshData, error: fetchError } = await supabase
        .from('game_rooms')
        .select(`
          *,
          players:players(*)
        `)
        .eq('state', 'lobby')
        .order('created_at', { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      if (freshData) {
        setRooms(freshData);
      } else {
        setRooms([]);
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setRooms([]);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch public rooms." });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Set up real-time subscriptions
  useEffect(() => {
    const setupChannel = async () => {
      try {
        // Clean up any existing subscription
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
          isSubscribedRef.current = false;
        }

        // Create a new channel
        const channel = supabase.channel('public_rooms_list', {
          config: {
            broadcast: { self: true },
            presence: { key: '' },
          },
        });

        // Set up event handlers
        channel
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'game_rooms',
              filter: 'state=eq.lobby'
            }, 
            () => {
              if (isSubscribedRef.current) {
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
            () => {
              if (isSubscribedRef.current) {
                fetchPublicRooms();
              }
            }
          )
          .on('broadcast', { event: 'sync' }, async (payload) => {
            if (isSubscribedRef.current && (
              payload.payload.action === 'player_left' || 
              payload.payload.action === 'room_deleted' ||
              payload.payload.action === 'player_joined'
            )) {
              fetchPublicRooms();
            }
          });

        // Subscribe to the channel only if not already subscribed
        if (!isSubscribedRef.current) {
          await channel.subscribe();
          channelRef.current = channel;
          isSubscribedRef.current = true;
        }
      } catch (error) {
        console.error('Error setting up channel:', error);
        toast({ 
          variant: "destructive", 
          title: "Connection Error", 
          description: "Could not connect to live room updates. Please refresh the page." 
        });
      }
    };

    // Initial fetch and setup
    fetchPublicRooms(true);
    setupChannel();

    return () => {
      isSubscribedRef.current = false;
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
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400"></div>
      </div>
    );
  }

  if (!rooms || rooms.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <div className="p-4 rounded-full bg-green-500/20 mb-4">
          <Gamepad2 className="h-12 w-12 text-green-400" />
        </div>
        <h3 className="text-xl font-semibold text-green-200 mb-2">No Public Rooms Available</h3>
        <p className="text-green-300 mb-6">Be the first to create a room and invite your friends!</p>
        <Button
          className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
          onClick={() => onSwitchTab?.('create')}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Room
        </Button>
      </motion.div>
    );
  }

  const selectedRoom = selectedRoomId ? rooms.find(room => room.id === selectedRoomId) : null;

  return (
    <div className="space-y-4">
      {rooms.map((room) => (
        <motion.div
          key={room.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-green-900/50 border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-500/20">
                    <Gamepad2 className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-200">Room {room.id}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-500/30">
                        <Users className="h-3 w-3 mr-1" />
                        {room.players.length}/{room.settings.max_players}
                      </Badge>
                      <Badge variant="outline" className="bg-teal-500/20 text-teal-300 border-teal-500/30">
                        <Clock className="h-3 w-3 mr-1" />
                        {room.settings.discussion_time}s
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                  onClick={() => openJoinDialog(room.id)}
                >
                  <Search className="h-4 w-4 mr-2" />
                  Join
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}

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