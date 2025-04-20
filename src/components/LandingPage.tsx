
import { useState, FormEvent, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus2, Share2, Globe2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type PublicRoom = {
  id: string;
  playerCount: number;
  state: string;
  gameMode: string;
  createdAt: string;
};

export default function LandingPage() {
  const { createRoom, joinRoom, setPlayerName: setContextPlayerName } = useGame();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const navigate = useNavigate();

  // Fetch public rooms
  useEffect(() => {
    const fetchPublicRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const { data, error } = await supabase
          .from('game_rooms')
          .select('id, state, game_mode, created_at')
          .eq('state', 'lobby')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;

        if (data) {
          // For each room, get the player count
          const roomsWithPlayerCount = await Promise.all(
            data.map(async (room) => {
              const { count, error: countError } = await supabase
                .from('players')
                .select('*', { count: 'exact' })
                .eq('room_id', room.id);

              return {
                id: room.id,
                playerCount: countError ? 0 : (count || 0),
                state: room.state,
                gameMode: room.game_mode,
                createdAt: room.created_at
              };
            })
          );

          setPublicRooms(roomsWithPlayerCount);
        }
      } catch (err) {
        console.error("Error fetching public rooms:", err);
      } finally {
        setIsLoadingRooms(false);
      }
    };

    fetchPublicRooms();
    
    // Set up a timer to refresh the list every 15 seconds
    const interval = setInterval(fetchPublicRooms, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      setContextPlayerName(playerName);
      await createRoom(playerName);
      navigate("/room");
    } catch (err) {
      console.error("Error creating room:", err);
      setError("Failed to create room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!roomId.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      setContextPlayerName(playerName);
      const success = await joinRoom(roomId.toUpperCase(), playerName);
      if (success) {
        navigate("/room");
      } else {
        setError("Failed to join room. Please check the room code.");
      }
    } catch (err) {
      console.error("Error joining room:", err);
      setError("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinPublicRoom = async (roomId: string) => {
    if (!playerName.trim()) {
      setError("Please enter your name first");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      setContextPlayerName(playerName);
      const success = await joinRoom(roomId, playerName);
      if (success) {
        navigate("/room");
      } else {
        setError("Failed to join room. It may be full or no longer available.");
      }
    } catch (err) {
      console.error("Error joining public room:", err);
      setError("Failed to join room. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format time difference
  const formatTimeDiff = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    if (diffMs < 60000) return "Just now";
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2 logo-animate">
            Chameleon X
          </h1>
          <p className="text-muted-foreground">
            The social deduction game where blending in is the key to victory
          </p>
          
          <div className="flex justify-center gap-4 mt-4 mb-6">
            <div className="text-center animate-bounce-slow">
              <Users className="h-12 w-12 text-primary mb-2" />
              <p className="text-sm">Play with Friends</p>
            </div>
            <div className="text-center animate-bounce-slow delay-100">
              <UserPlus2 className="h-12 w-12 text-secondary mb-2" />
              <p className="text-sm">Easy to Join</p>
            </div>
            <div className="text-center animate-bounce-slow delay-200">
              <Share2 className="h-12 w-12 text-accent mb-2" />
              <p className="text-sm">Share & Play</p>
            </div>
          </div>
        </div>

        {/* Name input shown above tabs */}
        <div className="mb-4">
          <Label htmlFor="global-name" className="text-sm font-medium">Your Name</Label>
          <Input
            id="global-name"
            placeholder="Enter your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="mt-1"
          />
        </div>

        <Card className="border-2 border-primary/20 shadow-lg animate-scale-in">
          <Tabs defaultValue="create">
            <TabsList className="grid grid-cols-3 mb-4">
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="join">Join</TabsTrigger>
              <TabsTrigger value="public">Public Rooms</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateRoom}>
                <CardHeader>
                  <CardTitle>Create a New Game</CardTitle>
                  <CardDescription>
                    Start a new room and invite your friends to join
                  </CardDescription>
                </CardHeader>

                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !playerName.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Room...
                      </>
                    ) : "Create Room"}
                  </Button>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </CardFooter>
              </form>
            </TabsContent>

            <TabsContent value="join">
              <form onSubmit={handleJoinRoom}>
                <CardHeader>
                  <CardTitle>Join an Existing Game</CardTitle>
                  <CardDescription>
                    Enter a room code to join your friends
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="room-id">Room Code</Label>
                    <Input
                      id="room-id"
                      placeholder="Enter room code"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={isLoading || !playerName.trim() || !roomId.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining Room...
                      </>
                    ) : "Join Room"}
                  </Button>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </CardFooter>
              </form>
            </TabsContent>
            
            <TabsContent value="public">
              <CardHeader>
                <CardTitle>Join a Public Room</CardTitle>
                <CardDescription>
                  Find active games you can join immediately
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {isLoadingRooms ? (
                  <div className="py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Loading rooms...</p>
                  </div>
                ) : publicRooms.length > 0 ? (
                  <div className="grid gap-2">
                    {publicRooms.map(room => (
                      <Button 
                        key={room.id}
                        variant="outline"
                        className="flex justify-between h-auto py-2 px-3"
                        onClick={() => handleJoinPublicRoom(room.id)}
                        disabled={isLoading || !playerName.trim()}
                      >
                        <div className="flex items-center">
                          <Globe2 className="h-4 w-4 mr-2 text-primary" />
                          <span>{room.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {room.playerCount}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimeDiff(room.createdAt)}
                          </span>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <p className="text-muted-foreground">No public rooms available</p>
                    <p className="text-sm mt-2">Create your own room to start playing!</p>
                  </div>
                )}
              </CardContent>
              
              {error && (
                <CardFooter>
                  <p className="text-red-500 text-sm">{error}</p>
                </CardFooter>
              )}
            </TabsContent>
          </Tabs>
        </Card>

        <div className="mt-8 p-6 bg-card rounded-lg border-2 border-secondary/20 shadow-lg animate-fade-in">
          <h2 className="text-2xl font-bold mb-3">How to Play Online</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li className="hover:text-primary transition-colors">Create a room and get a unique room code</li>
            <li className="hover:text-primary transition-colors">Share the room code with friends</li>
            <li className="hover:text-primary transition-colors">Anyone can join using the code from any device</li>
            <li className="hover:text-primary transition-colors">No installation needed - just use a web browser</li>
            <li className="hover:text-primary transition-colors">Works on phones, tablets, and computers</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
