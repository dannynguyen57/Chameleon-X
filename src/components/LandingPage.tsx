import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useGame } from "@/hooks/useGame.ts";
import { useNavigate } from "react-router-dom";
import { Users, UserPlus2, Share2 } from "lucide-react";

export default function LandingPage() {
  const { createRoom, joinRoom } = useGame();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = async (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    const success = await createRoom(playerName, {
      max_players: 10,
      discussion_time: 120,
      max_rounds: 3,
      game_mode: 'classic',
      team_size: 2,
      chaos_mode: false,
      time_per_round: 60,
      voting_time: 30
    });
    if (success) {
      navigate("/room");
    } else {
      setError("Failed to create room. Please try again.");
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
    
    try {
      const success = await joinRoom(roomId.toUpperCase(), playerName);
      if (success) {
        navigate("/room");
      } else {
        setError("Failed to join room. Please check the room code.");
      }
    } catch (err) {
      setError("An error occurred while joining the room. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2 logo-animate">
            Chameleon Undercover
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

        <Card className="border-2 border-primary/20 shadow-lg animate-scale-in">
          <Tabs defaultValue="create">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="create">Create Game</TabsTrigger>
              <TabsTrigger value="join">Join Game</TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <form onSubmit={handleCreateRoom}>
                <CardHeader>
                  <CardTitle>Create a New Game</CardTitle>
                  <CardDescription>
                    Start a new room and invite your friends to join
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                  </div>
                </CardContent>

                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full">
                    Create Room
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
                    <Label htmlFor="join-name">Your Name</Label>
                    <Input
                      id="join-name"
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                    />
                  </div>
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
                  <Button type="submit" className="w-full">
                    Join Room
                  </Button>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                </CardFooter>
              </form>
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
