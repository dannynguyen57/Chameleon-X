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

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId } = useGame();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTurnDialogOpen, setIsTurnDialogOpen] = useState(false);
  const [turnDescription, setTurnDescription] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useGameSounds();

  const getPlayerRoleIcon = useMemo(() => (role?: string) => {
    // Always return a generic icon to hide roles
    return '👤';
  }, []);

  if (!room || !room.category) return null;

  const category = categories.find(c => c.name === room.category);
  const timePercentage = room.timer && settings?.discussion_time 
    ? (room.timer / settings.discussion_time) * 100
    : 0;

  const currentPlayer = room.players[room.current_turn || 0];
  const isCurrentPlayer = currentPlayer?.id === playerId;
  const isLastPlayer = room.current_turn === room.players.length - 1;

  // Sort players by their turn order
  const sortedPlayers = [...room.players].sort((a, b) => {
    const aIndex = room.players.findIndex(p => p.id === a.id);
    const bIndex = room.players.findIndex(p => p.id === b.id);
    return aIndex - bIndex;
  });

  const handleSubmitTurn = async () => {
    if (!turnDescription.trim()) return;

    try {
      const { error } = await supabase
        .from('players')
        .update({ 
          turn_description: turnDescription,
          last_active: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (error) {
        console.error('Error submitting turn:', error);
        return;
      }

      if (isLastPlayer) {
        await supabase
          .from('game_rooms')
          .update({ 
            state: 'voting',
            timer: settings.voting_time,
            current_turn: 0
          })
          .eq('id', room.id);
      } else {
        const nextTurn = (room.current_turn || 0) + 1;
        await supabase
          .from('game_rooms')
          .update({ 
            current_turn: nextTurn,
            timer: settings.discussion_time
          })
          .eq('id', room.id);
      }

      setIsTurnDialogOpen(false);
      setTurnDescription('');
    } catch (error) {
      console.error('Error in handleSubmitTurn:', error);
    }
  };

  return (
    <div className="container mx-auto p-1 sm:p-2 space-y-2 sm:space-y-4">
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
                {sortedPlayers.map((player) => (
                  <div key={player.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>👤</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{player.name}</span>
                        {player.id === playerId && (
                          <Badge variant="outline">
                            {isPlayerChameleon ? 'Chameleon' : 'Regular'}
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
                ))}
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
          <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
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
              </div>
            </CardHeader>
            <CardContent className="p-2 sm:p-4 space-y-2 sm:space-y-4">
              {/* Current Player's Turn */}
              <div className="bg-primary/10 p-2 sm:p-3 rounded-lg">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                      <AvatarFallback>👤</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm sm:text-base font-medium">
                        {isCurrentPlayer ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {isCurrentPlayer 
                          ? "Click to describe the word"
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
                      className="w-full sm:w-auto text-xs sm:text-sm"
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
                  className="bg-secondary/10 p-2 rounded-lg text-center"
                >
                  <p className="text-xs sm:text-sm font-medium">
                    {isPlayerChameleon 
                      ? "You are the Chameleon! Try to blend in..."
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
