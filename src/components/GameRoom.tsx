import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, LogOut, Users, Gamepad2, Info, Share2, ChevronRight, Settings, Activity, CheckCircle, Clock, XCircle, Trophy, Vote, Star } from "lucide-react";
import LobbyScreen from "./game-screens/LobbyScreen";
import CategorySelection from "./game-screens/CategorySelection";
import GamePlay from "./game-screens/GamePlay";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { GameState } from "@/lib/types";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function GameRoom() {
  const { room, leaveRoom } = useGame();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showTip, setShowTip] = useState(true);

  // Game tips for contextual help
  const gameTips = [
    "Look for inconsistencies in players' descriptions to identify the Chameleon!",
    "As the Chameleon, listen carefully to others before giving your description.",
    "Be careful not to be too obvious with your hints, or the Chameleon might guess the word!",
    "Special roles can turn the tide of the game - use your abilities wisely!",
    "Pay attention to voting patterns - they might reveal who the Chameleon is!"
  ];
  
  const [currentTip] = useState(() => gameTips[Math.floor(Math.random() * gameTips.length)]);

  // Redirect if not in a room
  useEffect(() => {
    if (!room) {
      // Try to get the room from the URL
      const pathParts = window.location.pathname.split('/');
      const roomId = pathParts[pathParts.length - 1];
      
      if (roomId && roomId !== 'room') {
        // If we have a room ID in the URL but no room in context,
        // it means we need to wait for the room data to load
        setIsLoading(true);
        return;
      }
      
      // If no room ID in URL and no room in context, redirect to home
      navigate("/");
    } else {
      setIsLoading(false);
    }
  }, [room, navigate]);

  // Auto-hide tip after 10 seconds
  useEffect(() => {
    if (showTip) {
      const timer = setTimeout(() => {
        setShowTip(false);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [showTip]);

  if (isLoading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gradient-to-br from-green-900/50 to-teal-900/50">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative w-16 h-16 mb-4"
        >
          <motion.div 
            animate={{ 
              rotate: 360,
              transition: { duration: 2, repeat: Infinity, ease: "linear" }
            }}
            className="absolute inset-0 rounded-full border-4 border-t-green-500 border-r-green-300 border-b-green-200 border-l-transparent"
          />
          <Gamepad2 className="absolute inset-0 m-auto text-green-200 h-8 w-8" />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-green-200 font-medium"
        >
          Entering Game Room...
        </motion.p>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  const copyRoomId = () => {
    navigator.clipboard.writeText(room.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Room code copied!",
      description: "Share this code with your friends to join the game.",
    });
  };

  const handleLeaveRoom = async () => {
    await leaveRoom();
    navigate("/");
  };

  const isHost = room.host_id === room.players.find(p => p.id === room.host_id)?.id;
  
  const getStateInfo = (state: GameState): { label: string; color: string; icon: JSX.Element } => {
    switch (state) {
      case GameState.Lobby: return { label: "Lobby", color: "bg-blue-500/20 text-blue-300 border-blue-500/30", icon: <Users className="h-3 w-3" /> };
      case GameState.Selecting: return { label: "Selecting", color: "bg-purple-500/20 text-purple-300 border-purple-500/30", icon: <CheckCircle className="h-3 w-3" /> };
      case GameState.Presenting: return { label: "Presenting", color: "bg-amber-500/20 text-amber-300 border-amber-500/30", icon: <Clock className="h-3 w-3" /> };
      case GameState.Discussion: return { label: "Discussion", color: "bg-green-500/20 text-green-300 border-green-500/30", icon: <Activity className="h-3 w-3" /> };
      case GameState.Voting: return { label: "Voting", color: "bg-red-500/20 text-red-300 border-red-500/30", icon: <Vote className="h-3 w-3" /> };
      case GameState.Results: return { label: "Results", color: "bg-teal-500/20 text-teal-300 border-teal-500/30", icon: <Trophy className="h-3 w-3" /> };
      default: return { label: "Unknown", color: "bg-gray-500/20 text-gray-300 border-gray-500/30", icon: <XCircle className="h-3 w-3" /> };
    }
  };
  
  const stateInfo = getStateInfo(room.state);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900/60 to-teal-900/60 relative overflow-hidden">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-transparent to-transparent opacity-30 mix-blend-soft-light"></div>
      
      {/* Game Tip Banner */}
      <AnimatePresence>
        {showTip && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="bg-gradient-to-r from-amber-600/40 to-amber-800/40 border-b border-amber-500/20 backdrop-blur-sm py-2 shadow-md"
          >
            <div className="container mx-auto px-4 flex items-center justify-between">
              <div className="flex items-center">
                <Info className="text-amber-300 h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-amber-100 text-sm">{currentTip}</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowTip(false)}
                className="text-amber-100 hover:bg-amber-500/20"
              >
                Dismiss
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Room Header - Revamped */}
      <div className="sticky top-0 z-50 bg-gradient-to-b from-green-950/90 to-green-900/85 backdrop-blur-lg border-b border-green-500/20 shadow-xl">
        <div className="container mx-auto px-4 py-3">
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3"
          >
            {/* Left Section: Game Info */}
            <div className="flex items-center gap-3 flex-grow">
              <div className="p-2 rounded-full bg-gradient-to-br from-green-600/30 to-teal-600/30 border border-green-500/30 shadow-inner flex items-center justify-center">
                <Gamepad2 className="h-6 w-6 text-green-100" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl text-green-100 font-bold truncate mr-2">Room: {room.id}</h1>
                  <Badge variant="outline" className={cn("text-xs flex items-center gap-1.5 py-0.5 px-2 rounded-full", stateInfo.color)}>
                    {stateInfo.icon}
                    {stateInfo.label}
                  </Badge>
                  {room.round > 0 && (
                    <Badge variant="secondary" className="text-xs flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-green-800/60 text-green-200 border-green-600/40">
                      <Trophy className="h-3 w-3" />
                      Round {room.round}/{room.max_rounds || 3}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                   <Badge variant="secondary" className="text-xs flex items-center gap-1.5 py-0.5 px-2 rounded-full bg-green-800/60 text-green-200 border-green-600/40">
                    <Users className="h-3 w-3" />
                    {room.players.length}/{room.settings.max_players} Players
                  </Badge>
                  {/* Optional: Add host indicator if needed */}
                  {/* {isHost && <Badge>Host</Badge>} */}
                </div>
              </div>
            </div>
            
            {/* Right Section: Players & Actions */}
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
              {/* Player Avatar Stack (Enhanced) */}
              <div className="hidden sm:flex -space-x-3 mr-1">
                {room.players.slice(0, 4).map((player, i) => (
                  <Avatar key={player.id} className="border-2 border-green-950/80 h-9 w-9 shadow-md hover:scale-110 transition-transform duration-200 z-10 hover:z-20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                    <AvatarFallback className="text-xs bg-green-700 text-green-100">
                      {player.name[0]}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {room.players.length > 4 && (
                  <div className="h-9 w-9 rounded-full bg-green-800/80 border-2 border-green-950/80 flex items-center justify-center text-xs text-green-100 shadow-md z-0">
                    +{room.players.length - 4}
                  </div>
                )}
              </div>
              
              {/* Action Buttons (Enhanced) */}
              <Button 
                variant="outline" 
                size="sm"
                onClick={copyRoomId}
                className={cn(
                  "transition-all duration-200 border-green-500/30 hover:border-green-400/50 bg-green-800/50 hover:bg-green-700/60 text-green-200 shadow-sm hover:shadow-md",
                  copied && "bg-green-600/40 text-green-100 border-green-400/60"
                )}
              >
                <Share2 className="h-4 w-4 mr-1.5" />
                {copied ? "Copied!" : "Share"}
              </Button>
              
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleLeaveRoom}
                className="bg-gradient-to-r from-red-600/30 to-red-800/40 border border-red-500/30 hover:from-red-500/40 hover:to-red-700/50 text-red-100 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Leave
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Game Content */}
      <div className="container mx-auto p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={room.state}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {room.state === GameState.Lobby && <LobbyScreen />}
            {room.state === GameState.Selecting && <CategorySelection />}
            {(room.state === GameState.Presenting || 
              room.state === GameState.Discussion || 
              room.state === GameState.Voting || 
              room.state === GameState.Results) && (
              <GamePlay />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
