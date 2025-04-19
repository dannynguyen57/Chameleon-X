import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Lightbulb, Trophy, Gamepad2, Users, Menu, X } from "lucide-react";
import { categories } from "@/lib/word-categories";
import ChatSystem from "./ChatSystem";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';
import { GameAnimations } from "./GameAnimations";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { PlayerRole } from "@/lib/types";
import { GamePhase } from '@/types/GamePhase';
import { gameService } from '@/services';
import { useGameActions } from "@/hooks/useGameActions";
import { toast } from "@/components/ui/use-toast";

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom } = useGame();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTurnDialogOpen, setIsTurnDialogOpen] = useState(false);
  const [turnDescription, setTurnDescription] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useGameSounds();

  const { submitWord } = useGameActions(playerId, room, settings, setRoom);

  const getPlayerRoleIcon = useMemo(() => (role?: string) => {
    // Only show role icon to the player themselves
    if (playerId === room?.players.find(p => p.id === playerId)?.id) {
      switch (role) {
        case PlayerRole.Chameleon:
          return '🦎';
        case PlayerRole.Mimic:
          return '🔄';
        case PlayerRole.Oracle:
          return '🔍';
        case PlayerRole.Jester:
          return '🤡';
        case PlayerRole.Spy:
          return '🕵️';
        case PlayerRole.Mirror:
          return '🪞';
        case PlayerRole.Whisperer:
          return '🗣️';
        case PlayerRole.Timekeeper:
          return '⏱️';
        case PlayerRole.Illusionist:
          return '🎭';
        case PlayerRole.Guardian:
          return '🛡️';
        case PlayerRole.Trickster:
          return '🎪';
        case PlayerRole.Regular:
        default:
          return '👤';
      }
    }
    return '👤';
  }, [playerId, room?.players]);

  const getRoleTheme = useMemo(() => (role?: string) => {
    // Only show role theme to the player themselves
    if (playerId === room?.players.find(p => p.id === playerId)?.id) {
      switch (role) {
        case PlayerRole.Chameleon:
          return {
            bg: "bg-red-50/50 dark:bg-red-950/20",
            border: "border-red-500/20",
            button: "bg-red-500 hover:bg-red-600",
            card: "bg-red-100/50 dark:bg-red-900/20",
            text: "text-red-500 dark:text-red-400",
            icon: "🦎",
            name: "Chameleon"
          };
        case PlayerRole.Mimic:
          return {
            bg: "bg-purple-50/50 dark:bg-purple-950/20",
            border: "border-purple-500/20",
            button: "bg-purple-500 hover:bg-purple-600",
            card: "bg-purple-100/50 dark:bg-purple-900/20",
            text: "text-purple-500 dark:text-purple-400",
            icon: "🔄",
            name: "Mimic"
          };
        case PlayerRole.Oracle:
          return {
            bg: "bg-blue-50/50 dark:bg-blue-950/20",
            border: "border-blue-500/20",
            button: "bg-blue-500 hover:bg-blue-600",
            card: "bg-blue-100/50 dark:bg-blue-900/20",
            text: "text-blue-500 dark:text-blue-400",
            icon: "🔍",
            name: "Oracle"
          };
        case PlayerRole.Jester:
          return {
            bg: "bg-yellow-50/50 dark:bg-yellow-950/20",
            border: "border-yellow-500/20",
            button: "bg-yellow-500 hover:bg-yellow-600",
            card: "bg-yellow-100/50 dark:bg-yellow-900/20",
            text: "text-yellow-500 dark:text-yellow-400",
            icon: "🤡",
            name: "Jester"
          };
        case PlayerRole.Spy:
          return {
            bg: "bg-gray-50/50 dark:bg-gray-950/20",
            border: "border-gray-500/20",
            button: "bg-gray-500 hover:bg-gray-600",
            card: "bg-gray-100/50 dark:bg-gray-900/20",
            text: "text-gray-500 dark:text-gray-400",
            icon: "🕵️",
            name: "Spy"
          };
        case PlayerRole.Mirror:
          return {
            bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
            border: "border-indigo-500/20",
            button: "bg-indigo-500 hover:bg-indigo-600",
            card: "bg-indigo-100/50 dark:bg-indigo-900/20",
            text: "text-indigo-500 dark:text-indigo-400",
            icon: "🪞",
            name: "Mirror"
          };
        case PlayerRole.Whisperer:
          return {
            bg: "bg-pink-50/50 dark:bg-pink-950/20",
            border: "border-pink-500/20",
            button: "bg-pink-500 hover:bg-pink-600",
            card: "bg-pink-100/50 dark:bg-pink-900/20",
            text: "text-pink-500 dark:text-pink-400",
            icon: "🗣️",
            name: "Whisperer"
          };
        case PlayerRole.Timekeeper:
          return {
            bg: "bg-cyan-50/50 dark:bg-cyan-950/20",
            border: "border-cyan-500/20",
            button: "bg-cyan-500 hover:bg-cyan-600",
            card: "bg-cyan-100/50 dark:bg-cyan-900/20",
            text: "text-cyan-500 dark:text-cyan-400",
            icon: "⏱️",
            name: "Timekeeper"
          };
        case PlayerRole.Illusionist:
          return {
            bg: "bg-violet-50/50 dark:bg-violet-950/20",
            border: "border-violet-500/20",
            button: "bg-violet-500 hover:bg-violet-600",
            card: "bg-violet-100/50 dark:bg-violet-900/20",
            text: "text-violet-500 dark:text-violet-400",
            icon: "🎭",
            name: "Illusionist"
          };
        case PlayerRole.Guardian:
          return {
            bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
            border: "border-emerald-500/20",
            button: "bg-emerald-500 hover:bg-emerald-600",
            card: "bg-emerald-100/50 dark:bg-emerald-900/20",
            text: "text-emerald-500 dark:text-emerald-400",
            icon: "🛡️",
            name: "Guardian"
          };
        case PlayerRole.Trickster:
          return {
            bg: "bg-amber-50/50 dark:bg-amber-950/20",
            border: "border-amber-500/20",
            button: "bg-amber-500 hover:bg-amber-600",
            card: "bg-amber-100/50 dark:bg-amber-900/20",
            text: "text-amber-500 dark:text-amber-400",
            icon: "🎪",
            name: "Trickster"
          };
        case PlayerRole.Regular:
        default:
          return {
            bg: "bg-green-50/50 dark:bg-green-950/20",
            border: "border-green-500/20",
            button: "bg-green-500 hover:bg-green-600",
            card: "bg-green-100/50 dark:bg-green-900/20",
            text: "text-green-500 dark:text-green-400",
            icon: "👤",
            name: "Regular"
          };
      }
    }
    return {
      bg: "",
      border: "border-primary/20",
      button: "",
      card: "bg-primary/10",
      text: "",
      icon: "👤",
      name: "Player"
    };
  }, [playerId, room?.players]);

  if (!room || !room.category) return null;

  const category = categories.find(c => c.name === room.category);
  const timePercentage = room.timer && settings?.discussion_time 
    ? (room.timer / settings.discussion_time) * 100
    : 0;

  const currentPlayer = room.players[room.current_turn || 0];
  const isCurrentPlayer = currentPlayer?.id === playerId;
  const isLastPlayer = room.current_turn === room.players.length - 1;
  const playerRole = room.players.find(p => p.id === playerId)?.role;
  const roleTheme = getRoleTheme(playerRole);

  // Sort players by their turn order
  const sortedPlayers = [...room.players].sort((a, b) => {
    const aIndex = room.players.findIndex(p => p.id === a.id);
    const bIndex = room.players.findIndex(p => p.id === b.id);
    return aIndex - bIndex;
  });

  const handleSubmitTurn = async () => {
    if (!room || !playerId || !turnDescription.trim()) return;

    try {
      // Use submitWord from useGameActions
      const success = await submitWord(turnDescription.trim());
      if (success) {
        setIsTurnDialogOpen(false);
        setTurnDescription('');
        
        // Check if all players have submitted their descriptions
        const allPlayersSubmitted = room.players.every(p => p.turn_description);
        if (allPlayersSubmitted) {
          // Move to discussion phase
          await gameService.updateGamePhase(room.id, GamePhase.Discussion);
        }
      }
    } catch (error) {
      console.error('Error submitting turn:', error);
      toast({
        variant: "destructive",
        title: "Error submitting turn",
        description: "Failed to submit your turn. Please try again."
      });
    }
  };

  return (
    <div className={cn(
      "container mx-auto p-1 sm:p-2 space-y-2 sm:space-y-4",
      roleTheme.bg
    )}>
      {/* Mobile Menu Button */}
      <div className="lg:hidden flex justify-between items-center mb-2">
        <Button 
          variant="outline" 
          size="icon"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={cn(
            "transition-transform duration-200",
            isMenuOpen ? "rotate-90" : ""
          )}
        >
          <Menu className="h-4 w-4" />
        </Button>
        {room.state === 'presenting' && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{remainingTime}s</span>
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="lg:hidden fixed inset-0 bg-background/95 z-50"
          >
            <div className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Game Info</h2>
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  <span>Round {room.round}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5 text-primary" />
                  <span className="capitalize">{room.settings?.game_mode}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-sm">
                    {category?.emoji} {room.category}
                  </Badge>
                  {!isPlayerChameleon && room.secret_word && (
                    <Badge variant="secondary" className="text-sm">
                      Word: {room.secret_word}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="font-medium">Players</h3>
                {sortedPlayers.map((player) => {
                  const playerRoleTheme = getRoleTheme(player.role);
                  return (
                    <div key={player.id} className={cn(
                      "flex items-center gap-2 p-2 rounded-lg",
                      playerRoleTheme.card
                    )}>
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>{playerRoleTheme.icon}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.name}</span>
                          {player.id === playerId && (
                            <Badge variant={playerRole === PlayerRole.Chameleon ? "destructive" : playerRole === PlayerRole.Oracle ? "default" : "outline"}>
                              {playerRoleTheme.name}
                            </Badge>
                          )}
                          {player.id === room.host_id && (
                            <Badge variant="secondary">Host</Badge>
                          )}
                        </div>
                        {player.turn_description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{player.turn_description}"
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => {
                  setIsChatOpen(!isChatOpen);
                  setIsMenuOpen(false);
                }}
              >
                {isChatOpen ? 'Hide Chat' : 'Show Chat'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-4">
        <div className={`lg:col-span-2 space-y-2 sm:space-y-4 ${isChatOpen ? 'hidden lg:block' : ''}`}>
          <Card className={cn(
            "border-2 shadow-lg overflow-hidden",
            roleTheme.border
          )}>
            <CardHeader className="p-2 sm:p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-lg sm:text-xl">Round {room.round} of {room.max_rounds}</CardTitle>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    <span className="text-xs sm:text-sm text-muted-foreground">Category:</span>
                    <Badge variant="outline" className="text-xs sm:text-sm">
                      {category?.emoji} {room.category}
                    </Badge>
                    {!isPlayerChameleon && room.secret_word && (
                      <Badge variant="secondary" className="text-xs sm:text-sm">
                        Word: {room.secret_word}
                      </Badge>
                    )}
                  </div>
                </div>
                {room.state === 'presenting' && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{remainingTime}s</span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-4">
              {/* Current Player's Turn */}
              <div className={cn(
                "p-2 sm:p-3 rounded-lg",
                roleTheme.card
              )}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarFallback>{getPlayerRoleIcon(currentPlayer?.role)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm sm:text-base font-medium">
                        {isCurrentPlayer ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {isCurrentPlayer 
                          ? (isPlayerChameleon 
                              ? "You are the Chameleon! Try to blend in..."
                              : playerRole === PlayerRole.Oracle
                                ? "You are a Detective! Give a clear hint about the word."
                                : "Click to describe the word")
                          : "Waiting for their description..."}
                      </p>
                      {currentPlayer?.turn_description && (
                        <p className="mt-1 text-xs sm:text-sm italic">
                          "{currentPlayer.turn_description}"
                        </p>
                      )}
                    </div>
                  </div>
                  {isCurrentPlayer && !currentPlayer?.turn_description && (
                    <Button 
                      onClick={() => setIsTurnDialogOpen(true)} 
                      className={cn(
                        "w-full sm:w-auto text-xs sm:text-sm",
                        roleTheme.button
                      )}
                    >
                      Describe Word
                    </Button>
                  )}
                </div>
              </div>

              {/* Player Descriptions */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Player Descriptions</h4>
                <div className="space-y-2">
                  {sortedPlayers.map((player) => (
                    player.turn_description && (
                      <div key={player.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/10">
                        <Avatar className="h-6 w-6 mt-1">
                          <AvatarFallback>👤</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{player.name}</p>
                          <p className="text-xs text-muted-foreground italic">
                            "{player.turn_description}"
                          </p>
                        </div>
                      </div>
                    )
                  ))}
                </div>
              </div>

              {/* Game State Banner */}
              {room.state === 'presenting' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className={cn(
                    "p-2 rounded-lg text-center",
                    roleTheme.card
                  )}
                >
                  <p className="text-xs sm:text-sm font-medium">
                    {isPlayerChameleon 
                      ? "You are the Chameleon! Try to blend in by giving a vague description that could fit any word in this category. 🦎"
                      : playerRole === PlayerRole.Oracle
                        ? `You are a Detective! The word is "${room.secret_word}". Give a clear hint without saying it directly! 🔍`
                        : `The word is "${room.secret_word}". Describe it without saying it!`}
                  </p>
                </motion.div>
              )}
            </CardContent>
          </Card>

          {/* Game Tips */}
          <Card className="border border-secondary/20">
            <CardHeader className="p-2 sm:p-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                <CardTitle className="text-sm sm:text-base">Game Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4">
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm text-muted-foreground">
                <li>Give clear but indirect hints about the word</li>
                <li>Pay attention to other players' descriptions</li>
                <li>Try to spot inconsistencies in others' hints</li>
                <li>Use the chat to discuss and share ideas</li>
                <li>Mark your messages as hints when giving clues</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Chat Area */}
        <div className={`space-y-2 sm:space-y-4 ${!isChatOpen ? 'hidden lg:block' : ''}`}>
          <ChatSystem />
        </div>
      </div>

      {/* Turn Dialog */}
      <Dialog open={isTurnDialogOpen} onOpenChange={setIsTurnDialogOpen}>
        <DialogContent className="sm:max-w-[425px] p-4">
          <DialogHeader>
            <DialogTitle className="text-lg">Your Turn to Describe</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {isPlayerChameleon 
                ? "You are the chameleon! Try to blend in by giving a vague description."
                : `Describe the word "${room.secret_word}" without saying it directly. Be creative!`}
            </p>
            <Textarea
              value={turnDescription}
              onChange={(e) => setTurnDescription(e.target.value)}
              placeholder="Type your description..."
              className="min-h-[80px] sm:min-h-[100px] text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsTurnDialogOpen(false)}
                className="text-xs sm:text-sm"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitTurn}
                className="text-xs sm:text-sm"
              >
                Submit
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
