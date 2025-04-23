import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGame } from '@/hooks/useGame';
import { useNavigate } from 'react-router-dom';
import PublicRooms from '@/components/PublicRooms';
import { PlayerRole, GameMode } from '@/lib/types';
import { GameContextType } from '@/contexts/gameTypes';
import { Gamepad2, PlusCircle, Search, Crown, Users, Clock, Trophy, Sparkles, Shield, Lightbulb, MessageSquare, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DEFAULT_SETTINGS } from '@/lib/constants';
import { nanoid } from 'nanoid';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

export default function Home() {
  console.log('Rendering Home component');
  
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isQuickJoining, setIsQuickJoining] = useState(false);
  const navigate = useNavigate();
  
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
    
    setIsCreating(true);
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
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    console.log('Joining room:', roomId, 'with player name:', playerName);
    if (!playerName || !roomId || !gameContext?.joinRoom) return;
    
    setIsJoining(true);
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
    } finally {
      setIsJoining(false);
    }
  };

  const handleQuickJoin = async () => {
    if (!playerName.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter your name first."
      });
      return;
    }

    setIsQuickJoining(true);
    try {
      const rooms = await gameContext.getPublicRooms();
      const availableRooms = rooms.filter(room => 
        room.players.length < room.settings.max_players
      );

      if (availableRooms.length === 0) {
        toast({
          variant: "destructive",
          title: "No Rooms Available",
          description: "No public rooms are available. Why not create one?"
        });
        return;
      }

      // Select a random room from available rooms
      const randomRoom = availableRooms[Math.floor(Math.random() * availableRooms.length)];
      
      // Check if name exists in the room
      const nameExists = await gameContext.checkNameExists(randomRoom.id, playerName);
      if (nameExists) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "This name is already in use. Please choose a different name."
        });
        return;
      }

      // Join the random room
      const success = await gameContext.joinRoom(randomRoom.id, playerName);
      if (success) {
        navigate(`/room/${randomRoom.id}`);
      }
    } catch (error) {
      console.error('Error joining random room:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to join a random room. Please try again."
      });
    } finally {
      setIsQuickJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-green-50 p-4">
      <div className="container mx-auto max-w-6xl">
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-8 animate-fade-in"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            className="flex flex-col items-center gap-6"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <img 
              src="/images/chameleon.png" 
              alt="Chameleon" 
              className="w-32 h-32 sm:w-40 sm:h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 object-contain animate-bounce-slow"
            />
            <motion.h1 
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent"
            >
              Chameleon X
            </motion.h1>
          </motion.div>
          <motion.p 
            className="text-base sm:text-lg md:text-xl text-gray-600 max-w-2xl mx-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            A thrilling social deduction game where you must describe words without saying them directly. Can you spot the chameleon?
          </motion.p>
        </motion.div>

        {/* Game Actions */}
        <motion.div 
          id="game-actions"
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Tabs defaultValue="create" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-white/80">
              <TabsTrigger 
                value="create" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-cyan-600 data-[state=active]:text-white transition-all duration-300"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Room
              </TabsTrigger>
              <TabsTrigger 
                value="join" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-teal-600 data-[state=active]:text-white transition-all duration-300"
              >
                <Search className="h-4 w-4 mr-2" />
                Join Room
              </TabsTrigger>
              <TabsTrigger 
                value="public" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-600 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all duration-300"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Public Rooms
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <Card className="bg-white/90 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 pb-8">
                  <CardTitle className="flex items-center gap-2 text-blue-600">
                    <PlusCircle className="h-5 w-5" />
                    Create a New Room
                  </CardTitle>
                  <CardDescription className="mt-3">
                    Start a new game and invite your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-white border-blue-100 focus:border-blue-300 focus:ring-blue-200"
                    />
                  </div>
                  <Button
                    onClick={handleCreateRoom}
                    disabled={!playerName.trim() || isCreating}
                    className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white transition-all duration-300"
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Creating Room...
                      </>
                    ) : (
                      "Create Room"
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="join">
              <Card className="bg-white/90 border-cyan-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-cyan-50 to-teal-50 pb-8">
                  <CardTitle className="flex items-center gap-2 text-cyan-600">
                    <Search className="h-5 w-5" />
                    Join an Existing Room
                  </CardTitle>
                  <CardDescription className="mt-3">
                    Enter the room code to join your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-white border-cyan-100 focus:border-cyan-300 focus:ring-cyan-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter room code"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="bg-white border-cyan-100 focus:border-cyan-300 focus:ring-cyan-200"
                    />
                  </div>
                  <Button
                    onClick={handleJoinRoom}
                    disabled={!playerName || !roomId || isJoining}
                    className="w-full bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white transition-all duration-300"
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="public">
              <Card className="bg-white/90 border-teal-100 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 pb-8">
                  <CardTitle className="flex items-center gap-2 text-teal-600">
                    <Gamepad2 className="h-5 w-5" />
                    Public Rooms
                  </CardTitle>
                  <CardDescription className="mt-3">
                    Join an existing public room or create your own
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <PublicRooms />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Feature Highlights */}
        <motion.div 
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Game Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-white/80 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-blue-100 mb-4">
                    <Shield className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Multiple Roles</h3>
                  <p className="text-sm text-gray-600">Play as different characters with unique abilities</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 border-purple-100 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-purple-100 mb-4">
                    <Lightbulb className="h-8 w-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Smart Gameplay</h3>
                  <p className="text-sm text-gray-600">Use strategy and deduction to win</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 border-green-100 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-green-100 mb-4">
                    <MessageSquare className="h-8 w-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Real-time Chat</h3>
                  <p className="text-sm text-gray-600">Communicate with other players</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/80 border-amber-100 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-amber-100 mb-4">
                    <Heart className="h-8 w-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Easy to Play</h3>
                  <p className="text-sm text-gray-600">No installation needed, just open in browser</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          <Card className="bg-white/80 border-blue-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">10+</p>
                  <p className="text-sm text-gray-600">Active Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 border-cyan-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-cyan-100">
                  <Clock className="h-8 w-8 text-cyan-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">2 min</p>
                  <p className="text-sm text-gray-600">Average Game</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-white/80 border-teal-100 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-teal-100">
                  <Trophy className="h-8 w-8 text-teal-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-gray-900">4</p>
                  <p className="text-sm text-gray-600">Game Modes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to Play */}
        <motion.div 
          className="mt-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <Card className="bg-white/90 border-amber-100 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl text-amber-600 flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                How to Play
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <div className="p-3 rounded-full bg-blue-100 w-fit">
                    <Crown className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold">Create a Room</h3>
                  <p className="text-sm text-gray-600">Get a unique room code to share with friends</p>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-full bg-purple-100 w-fit">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold">Invite Friends</h3>
                  <p className="text-sm text-gray-600">Share the room code with your friends</p>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-full bg-green-100 w-fit">
                    <Gamepad2 className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold">Start Playing</h3>
                  <p className="text-sm text-gray-600">Join from any device with a web browser</p>
                </div>
                <div className="space-y-2">
                  <div className="p-3 rounded-full bg-amber-100 w-fit">
                    <Trophy className="h-6 w-6 text-amber-600" />
                  </div>
                  <h3 className="font-semibold">Win Together</h3>
                  <p className="text-sm text-gray-600">Work together to find the chameleon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 