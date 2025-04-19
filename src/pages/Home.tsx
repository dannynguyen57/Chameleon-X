import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGame } from '@/hooks/useGame';
import { useNavigate } from 'react-router-dom';
import PublicRooms from '@/components/PublicRooms';
import { PlayerRole } from '@/lib/types';
import { Gamepad2, PlusCircle, Search, Crown, Users, Clock, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const { createRoom, joinRoom, playerId } = useGame();
  const navigate = useNavigate();

  const handleCreateRoom = async () => {
    if (!playerName) return;
    const newRoomId = await createRoom(playerName, {
      max_players: 10,
      discussion_time: 120,
      max_rounds: 3,
      game_mode: 'classic',
      team_size: 2,
      chaos_mode: false,
      time_per_round: 60,
      voting_time: 30,
      special_abilities: false,
      roles: {
        classic: [PlayerRole.Regular, PlayerRole.Chameleon],
        creative: [
          PlayerRole.Regular,
          PlayerRole.Chameleon,
          PlayerRole.Mimic,
          PlayerRole.Oracle,
          PlayerRole.Jester,
          PlayerRole.Spy,
          PlayerRole.Mirror,
          PlayerRole.Whisperer,
          PlayerRole.Timekeeper,
          PlayerRole.Illusionist,
          PlayerRole.Guardian,
          PlayerRole.Trickster
        ],
        team: [
          PlayerRole.Regular,
          PlayerRole.Chameleon,
          PlayerRole.Mimic,
          PlayerRole.Guardian
        ],
        chaos: [
          PlayerRole.Regular,
          PlayerRole.Chameleon,
          PlayerRole.Mimic,
          PlayerRole.Jester,
          PlayerRole.Spy,
          PlayerRole.Mirror
        ]
      }
    });
    if (newRoomId) {
      navigate(`/room/${newRoomId}`);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName || !roomId) return;
    const success = await joinRoom(roomId, playerName);
    if (success) {
      setTimeout(() => {
        navigate(`/room/${roomId}`);
      }, 500);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 to-secondary/20 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Chameleon X
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A thrilling social deduction game where you must describe words without saying them directly. Can you spot the chameleon?
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">10+</p>
                  <p className="text-sm text-muted-foreground">Active Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-secondary/5 border-secondary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-secondary" />
                <div>
                  <p className="text-2xl font-bold">2 min</p>
                  <p className="text-sm text-muted-foreground">Average Game</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Trophy className="h-8 w-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">4</p>
                  <p className="text-sm text-muted-foreground">Game Modes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Actions */}
        <Tabs defaultValue="public" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="public" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Public Rooms
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Room
            </TabsTrigger>
            <TabsTrigger value="join" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Join Room
            </TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            <PublicRooms />
          </TabsContent>

          <TabsContent value="create">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Create a New Room
                </CardTitle>
                <CardDescription>
                  Start a new game and invite your friends to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="create-name" className="text-sm font-medium">
                    Your Name
                  </label>
                  <Input
                    id="create-name"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  onClick={handleCreateRoom}
                  disabled={!playerName}
                >
                  Create Room
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Join an Existing Room
                </CardTitle>
                <CardDescription>
                  Enter the room ID to join a game
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="join-name" className="text-sm font-medium">
                    Your Name
                  </label>
                  <Input
                    id="join-name"
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="room-id" className="text-sm font-medium">
                    Room ID
                  </label>
                  <Input
                    id="room-id"
                    placeholder="Enter room ID"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="bg-background/50"
                  />
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
                  onClick={handleJoinRoom}
                  disabled={!playerName || !roomId}
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 