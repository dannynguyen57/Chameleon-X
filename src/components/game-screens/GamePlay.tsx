import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCircle2, Clock, MessageSquare, Lightbulb, Mic, X } from "lucide-react";
import { categories } from "@/lib/word-categories";
import ChatSystem from "./ChatSystem";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/integrations/supabase/client';

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId } = useGame();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isTurnDialogOpen, setIsTurnDialogOpen] = useState(false);
  const [turnDescription, setTurnDescription] = useState('');

  if (!room || !room.category) return null;

  const category = categories.find(c => c.name === room.category);
  const timePercentage = room.timer && settings?.discussion_time 
    ? (room.timer / settings.discussion_time) * 100
    : 0;

  const currentPlayer = room.players[room.current_turn || 0];
  const isCurrentPlayer = currentPlayer?.id === playerId;
  const isLastPlayer = room.current_turn === room.players.length - 1;

  const getPlayerRoleIcon = (role?: string) => {
    if (!role) return '👤';
    switch (role) {
      case 'chameleon': return '🦎';
      case 'mimic': return '🦜';
      case 'oracle': return '🔮';
      case 'jester': return '🎭';
      case 'spy': return '🕵️';
      case 'mirror': return '🪞';
      case 'whisperer': return '🤫';
      case 'timekeeper': return '⏱️';
      case 'illusionist': return '🎪';
      case 'guardian': return '🛡️';
      case 'trickster': return '🎯';
      default: return '👤';
    }
  };

  const handleSubmitTurn = async () => {
    if (!turnDescription.trim()) return;

    try {
      // Update the player's turn description
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

      // Move to next player or end the round
      if (isLastPlayer) {
        // End the round and move to voting
        await supabase
          .from('game_rooms')
          .update({ 
            state: 'voting',
            timer: settings.voting_time
          })
          .eq('id', room.id);
      } else {
        // Move to next player
        await supabase
          .from('game_rooms')
          .update({ 
            current_turn: (room.current_turn || 0) + 1,
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
    <div className="container mx-auto p-4 max-w-6xl">
      {/* Turn Dialog */}
      <Dialog open={isTurnDialogOpen} onOpenChange={setIsTurnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Turn to Describe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isPlayerChameleon 
                ? "You are the chameleon! Try to blend in by giving a vague description."
                : `Describe the word "${room.secret_word}" without saying it directly. Be creative!`}
            </p>
            <Textarea
              value={turnDescription}
              onChange={(e) => setTurnDescription(e.target.value)}
              placeholder="Type your description..."
              className="min-h-[100px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsTurnDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitTurn}>Submit</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Game Area */}
        <div className={`lg:col-span-2 space-y-6 ${isChatOpen ? 'hidden lg:block' : ''}`}>
          <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-2xl">Round {room.round} of {room.max_rounds}</CardTitle>
                  <CardDescription>
                    Category: <Badge variant="outline" className="ml-1">
                      {category?.emoji} {room.category}
                    </Badge>
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground mb-1 flex items-center justify-end">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{remainingTime || 0}s</span>
                  </div>
                  <Progress value={timePercentage} className="w-32 h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Current Player's Turn */}
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {getPlayerRoleIcon(currentPlayer?.role)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">
                        {isCurrentPlayer ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isCurrentPlayer 
                          ? "Click to describe the word"
                          : "Waiting for their description..."}
                      </p>
                      {currentPlayer?.turn_description && (
                        <p className="mt-2 text-sm italic">
                          "{currentPlayer.turn_description}"
                        </p>
                      )}
                    </div>
                  </div>
                  {isCurrentPlayer && !currentPlayer?.turn_description && (
                    <Button onClick={() => setIsTurnDialogOpen(true)}>
                      Describe Word
                    </Button>
                  )}
                </div>
              </div>

              {/* Players List */}
              <div>
                <h3 className="font-medium mb-3">Players Order</h3>
                <div className="grid gap-2">
                  {room.players.map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center gap-2 p-3 rounded-md ${
                        index === room.current_turn 
                          ? 'bg-primary/10 border-2 border-primary' 
                          : 'bg-card/60'
                      }`}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {getPlayerRoleIcon(player.role)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{player.name}</span>
                          {player.role && (
                            <Badge variant="outline" className="ml-2">
                              {player.role}
                            </Badge>
                          )}
                        </div>
                        {player.turn_description && (
                          <p className="text-xs text-muted-foreground mt-1 italic">
                            "{player.turn_description}"
                          </p>
                        )}
                        {index === room.current_turn && (
                          <p className="text-xs text-muted-foreground">
                            Currently speaking
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Game Tips */}
          <Card className="border border-secondary/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-lg">Game Tips</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
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
        <div className={`space-y-6 ${!isChatOpen ? 'hidden lg:block' : ''}`}>
          <ChatSystem />
        </div>
      </div>
    </div>
  );
}
