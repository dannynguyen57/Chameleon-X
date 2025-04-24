import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGame } from '@/hooks/useGame';
import { useNavigate } from 'react-router-dom';
import PublicRooms from '@/components/PublicRooms';
import HomeHeader from '@/components/HomeHeader';
import { PlayerRole, GameMode } from '@/lib/types';
import { GameContextType } from '@/contexts/gameTypes';
import { Gamepad2, PlusCircle, Search, Crown, Users, Clock, Trophy, Sparkles, Shield, Lightbulb, MessageSquare, Heart, Vote } from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState('create');

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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-teal-900 to-blue-900 relative overflow-hidden">
      {/* Header */}
      <HomeHeader onSwitchTab={setActiveTab} />

      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('/images/chameleon-pattern.png')] opacity-10"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-green-500/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative container mx-auto max-w-6xl p-4">
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
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent"
            >
              Chameleon X
            </motion.h1>
          </motion.div>
          
          <motion.p 
            className="text-base sm:text-lg md:text-xl text-green-200 max-w-2xl mx-auto px-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            A thrilling social deduction game where you must describe words without saying them directly. Can you spot the chameleon?
          </motion.p>

          <motion.div 
            className="mt-8 flex flex-col sm:flex-row justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Input
                placeholder="Enter your name"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="bg-green-900/50 border-green-500/50 focus:border-green-400 focus:ring-green-400/20 text-white placeholder:text-green-300/50"
              />
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white"
                onClick={handleQuickJoin}
                disabled={!playerName.trim() || isQuickJoining}
              >
                {isQuickJoining ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Finding Room...
                  </>
                ) : (
                  "Quick Play"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>

        {/* Game Actions */}
        <motion.div 
          id="game-actions"
          className="mb-16"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 bg-green-900/50">
              <TabsTrigger 
                value="create" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-teal-500 data-[state=active]:text-white transition-all duration-300"
              >
                <PlusCircle className="h-4 w-4 mr-2" />
                Create Room
              </TabsTrigger>
              <TabsTrigger 
                value="join" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-teal-500 data-[state=active]:to-blue-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Search className="h-4 w-4 mr-2" />
                Join Room
              </TabsTrigger>
              <TabsTrigger 
                value="public" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-500 data-[state=active]:text-white transition-all duration-300"
              >
                <Gamepad2 className="h-4 w-4 mr-2" />
                Public Rooms
              </TabsTrigger>
            </TabsList>

            <TabsContent value="create">
              <Card className="bg-green-900/50 border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-green-500/20 to-teal-500/20 pb-8">
                  <CardTitle className="flex items-center gap-2 text-green-400">
                    <PlusCircle className="h-5 w-5" />
                    Create a New Room
                  </CardTitle>
                  <CardDescription className="mt-3 text-green-200">
                    Start a new game and invite your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-green-900/50 border-green-500/50 focus:border-green-400 focus:ring-green-400/20 text-white placeholder:text-green-300/50"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateRoom}
                    disabled={!playerName || isCreating}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white transition-all duration-300"
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
              <Card className="bg-teal-900/50 border-teal-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-teal-500/20 to-blue-500/20 pb-8">
                  <CardTitle className="flex items-center gap-2 text-teal-400">
                    <Search className="h-5 w-5" />
                    Join an Existing Room
                  </CardTitle>
                  <CardDescription className="mt-3 text-teal-200">
                    Enter the room code to join your friends
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter your name"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="bg-teal-900/50 border-teal-500/50 focus:border-teal-400 focus:ring-teal-400/20 text-white placeholder:text-teal-300/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Enter room code"
                      value={roomId}
                      onChange={(e) => setRoomId(e.target.value)}
                      className="bg-teal-900/50 border-teal-500/50 focus:border-teal-400 focus:ring-teal-400/20 text-white placeholder:text-teal-300/50"
                    />
                  </div>
                  <Button 
                    onClick={handleJoinRoom}
                    disabled={!playerName || !roomId || isJoining}
                    className="w-full bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-600 hover:to-blue-600 text-white transition-all duration-300"
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
              <Card className="bg-blue-900/50 border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 pb-8">
                  <CardTitle className="flex items-center gap-2 text-blue-400">
                    <Gamepad2 className="h-5 w-5" />
                    Public Rooms
                  </CardTitle>
                  <CardDescription className="mt-3 text-blue-200">
                    Join an existing public room or create your own
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <PublicRooms onSwitchTab={setActiveTab} />
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
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent">
            Game Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-green-900/50 border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-green-500/20 mb-4">
                    <Shield className="h-8 w-8 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-green-200">Multiple Roles</h3>
                  <p className="text-sm text-green-300">Play as different characters with unique abilities</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-teal-900/50 border-teal-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-teal-500/20 mb-4">
                    <Lightbulb className="h-8 w-8 text-teal-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-teal-200">Smart Gameplay</h3>
                  <p className="text-sm text-teal-300">Use strategy and deduction to win</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-blue-900/50 border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-blue-500/20 mb-4">
                    <MessageSquare className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-200">Real-time Chat</h3>
                  <p className="text-sm text-blue-300">Communicate with other players</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-900/50 border-purple-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center">
                  <div className="p-3 rounded-full bg-purple-500/20 mb-4">
                    <Heart className="h-8 w-8 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-purple-200">Easy to Play</h3>
                  <p className="text-sm text-purple-300">No installation needed, just open in browser</p>
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
          <Card className="bg-green-900/50 border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <Users className="h-8 w-8 text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-200">10+</p>
                  <p className="text-sm text-green-300">Active Players</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-teal-900/50 border-teal-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-teal-500/20">
                  <Clock className="h-8 w-8 text-teal-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-teal-200">2 min</p>
                  <p className="text-sm text-teal-300">Average Game</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-blue-900/50 border-blue-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-blue-500/20">
                  <Trophy className="h-8 w-8 text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-blue-200">4</p>
                  <p className="text-sm text-blue-300">Game Modes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* How to Play */}
        <motion.div 
          id="how-to-play"
          className="mt-16 scroll-mt-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2 }}
        >
          <Card className="bg-gradient-to-r from-green-900 to-teal-900 border-green-500/20 shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-6 sm:pb-8">
              <CardTitle className="text-2xl sm:text-3xl bg-gradient-to-r from-green-400 via-teal-400 to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-green-400" />
                How to Play
              </CardTitle>
              <CardDescription className="text-base sm:text-lg text-green-200 mt-2">
                Master the art of deception and deduction in this thrilling social game
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
                {/* Left Column - Game Rules */}
                <div className="space-y-6">
                  <div className="p-4 sm:p-6 rounded-lg bg-green-900 border border-green-500/20">
                    <h3 className="text-lg sm:text-xl font-semibold text-green-200 mb-4 flex items-center gap-2">
                      <Crown className="h-5 w-5 text-green-400" />
                      Game Rules
                    </h3>
                    <ul className="space-y-3 text-green-300">
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>One player is secretly assigned as the Chameleon</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>All players (except the Chameleon) know the secret word</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>Players take turns describing the word without saying it directly</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-green-400">•</span>
                        <span>The Chameleon must blend in and guess the word</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Right Column - Game Flow */}
                <div className="space-y-6">
                  <div className="p-4 sm:p-6 rounded-lg bg-teal-900 border border-teal-500/20">
                    <h3 className="text-lg sm:text-xl font-semibold text-teal-200 mb-4 flex items-center gap-2">
                      <Gamepad2 className="h-5 w-5 text-teal-400" />
                      Game Flow
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-teal-500/20">
                          <Users className="h-5 w-5 text-teal-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-teal-200">1. Join or Create a Room</h4>
                          <p className="text-sm text-teal-300">Get started by joining an existing room or creating your own</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-teal-500/20">
                          <MessageSquare className="h-5 w-5 text-teal-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-teal-200">2. Describe the Word</h4>
                          <p className="text-sm text-teal-300">Take turns describing the secret word without saying it directly</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-teal-500/20">
                          <Vote className="h-5 w-5 text-teal-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-teal-200">3. Vote and Discuss</h4>
                          <p className="text-sm text-teal-300">Vote for who you think is the Chameleon and discuss your suspicions</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Tips */}
              <div className="mt-6 sm:mt-8 p-4 sm:p-6 rounded-lg bg-blue-900 border border-blue-500/20">
                <h3 className="text-lg sm:text-xl font-semibold text-blue-200 mb-4 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-blue-400" />
                  Pro Tips
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-3 sm:p-4 rounded-lg bg-blue-900/50">
                    <h4 className="font-medium text-blue-200 mb-2">Be Subtle</h4>
                    <p className="text-sm text-blue-300">Give hints that are clear to regular players but vague to the Chameleon</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-blue-900/50">
                    <h4 className="font-medium text-blue-200 mb-2">Watch Reactions</h4>
                    <p className="text-sm text-blue-300">Pay attention to how players react to descriptions</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-blue-900/50">
                    <h4 className="font-medium text-blue-200 mb-2">Blend In</h4>
                    <p className="text-sm text-blue-300">If you're the Chameleon, try to match the style of other descriptions</p>
                  </div>
                  <div className="p-3 sm:p-4 rounded-lg bg-blue-900/50">
                    <h4 className="font-medium text-blue-200 mb-2">Stay Calm</h4>
                    <p className="text-sm text-blue-300">Don't panic if you're the Chameleon - use the discussion to gather clues</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
} 