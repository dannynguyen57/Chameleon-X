import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGame } from '@/contexts/GameContextProvider';
import { useNavigate } from 'react-router-dom';
import PublicRooms from '@/components/PublicRooms';
import { PlayerRole, GameMode } from '@/lib/types';
import { GameContextType } from '@/contexts/gameTypes';
import { Gamepad2, PlusCircle, Search, Crown, Users, Clock, Trophy } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { nanoid } from 'nanoid';
import { toast } from '@/components/ui/use-toast';

export default function Home() {
  console.log('Rendering Home component');
  
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const navigate = useNavigate();
  
  // Always call useGame unconditionally
  const gameContext = useGame();

  useEffect(() => {
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to initialize game. Please refresh the page."
      });
    }
  }, [error]);

  const handleCreateRoom = async () => {
    console.log('Creating room with player name:', playerName);
    if (!playerName || !gameContext?.createRoom) return;
    
    try {
      const newRoomId = await gameContext.createRoom(playerName, DEFAULT_SETTINGS);
      console.log('Room created with ID:', newRoomId);
      if (newRoomId && typeof newRoomId === 'string') {
        navigate(`/room/${newRoomId}`);
      }
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to create room. Please try again."
      });
    }
  };

  const handleJoinRoom = async () => {
    console.log('Joining room:', roomId, 'with player name:', playerName);
    if (!playerName || !roomId || !gameContext?.joinRoom) return;
    
    try {
      await gameContext.joinRoom(roomId, playerName);
      navigate(`/room/${roomId}`);
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join room. Please check the room code and try again."
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Chameleon X
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A thrilling social deduction game where you must describe words without saying them directly. Can you spot the chameleon?
          </p>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="bg-white/80 border-blue-100 shadow-lg animate-slide-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">10+</p>
                  <p className="text-sm text-gray-600">Active Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 border-green-100 shadow-lg animate-slide-in delay-100">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Clock className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">2 min</p>
                  <p className="text-sm text-gray-600">Average Game</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 border-amber-100 shadow-lg animate-slide-in delay-200">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Trophy className="h-8 w-8 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold text-gray-900">4</p>
                  <p className="text-sm text-gray-600">Game Modes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Game Actions */}
        <Tabs defaultValue="create" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80">
            <TabsTrigger value="create" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Room
            </TabsTrigger>
            <TabsTrigger value="join" className="data-[state=active]:bg-green-600 data-[state=active]:text-white">
              <Search className="h-4 w-4 mr-2" />
              Join Room
            </TabsTrigger>
            <TabsTrigger value="public" className="data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Gamepad2 className="h-4 w-4 mr-2" />
              Public Rooms
            </TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card className="bg-white/90 border-blue-100 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-600">
                  <Crown className="h-5 w-5" />
                  Create a New Room
                </CardTitle>
                <CardDescription>
                  Start a new game and invite your friends to join
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Button
                  onClick={handleCreateRoom}
                  disabled={!playerName}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  Create Room
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card className="bg-white/90 border-green-100 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <Search className="h-5 w-5" />
                  Join an Existing Room
                </CardTitle>
                <CardDescription>
                  Enter the room code to join your friends
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Enter your name"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Enter room code"
                    value={roomId}
                    onChange={(e) => setRoomId(e.target.value)}
                    className="bg-white"
                  />
                </div>
                <Button
                  onClick={handleJoinRoom}
                  disabled={!playerName || !roomId}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Join Room
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="public">
            <PublicRooms />
          </TabsContent>
        </Tabs>

        {/* How to Play */}
        <Card className="mt-8 bg-white/90 border-amber-100 shadow-lg animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl text-amber-600">How to Play</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-2 text-gray-700">
              <li className="hover:text-amber-600 transition-colors">Create a room and get a unique room code</li>
              <li className="hover:text-amber-600 transition-colors">Share the room code with friends</li>
              <li className="hover:text-amber-600 transition-colors">Anyone can join using the code from any device</li>
              <li className="hover:text-amber-600 transition-colors">No installation needed - just use a web browser</li>
              <li className="hover:text-amber-600 transition-colors">Works on phones, tablets, and computers</li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 