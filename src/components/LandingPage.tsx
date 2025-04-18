
import { useState, FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const { createRoom, joinRoom } = useGame();
  const [playerName, setPlayerName] = useState("");
  const [roomId, setRoomId] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleCreateRoom = (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    createRoom(playerName);
    navigate("/room");
  };

  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      setError("Please enter your name");
      return;
    }
    
    if (!roomId.trim()) {
      setError("Please enter a room code");
      return;
    }
    
    const success = joinRoom(roomId.toUpperCase(), playerName);
    if (success) {
      navigate("/room");
    } else {
      setError("Failed to join room. Please check the room code.");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
            Chameleon Undercover
          </h1>
          <p className="text-muted-foreground">
            The social deduction game where blending in is the key to victory
          </p>
        </div>

        <Card className="border-2 border-primary/20 shadow-lg">
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

        <div className="mt-8 p-6 bg-card rounded-lg border-2 border-secondary/20 shadow-lg">
          <h2 className="text-2xl font-bold mb-3">How to Play</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>Everyone gets a word except the Chameleon, who doesn't know it</li>
            <li>Players take turns describing the word without saying it</li>
            <li>The Chameleon must blend in and fake knowing the word</li>
            <li>Everyone votes on who they think the Chameleon is</li>
            <li>If caught, the Chameleon can still win by guessing the secret word</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
