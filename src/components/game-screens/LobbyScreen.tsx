import { useState, useEffect } from 'react';
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCircle2, Settings, Copy, Users, Check, Clock, Gamepad2, Trophy } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import GameSettings from './GameSettings';
import { toast } from '@/components/ui/use-toast';
import { Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const PlayerReadyStatus = ({ 
  player, 
  isCurrentPlayer,
  onReadyToggle
}: { 
  player: Player;
  isCurrentPlayer: boolean;
  onReadyToggle: () => void;
}) => {
  console.log('PlayerReadyStatus render:', { playerId: player.id, isCurrentPlayer, isReady: player.is_ready });
  
  return (
    <Button 
      size="sm" 
      onClick={onReadyToggle}
      disabled={!isCurrentPlayer}
      className={cn(
        "h-6 px-2 text-xs flex items-center gap-1 transition-colors",
        player.is_ready 
          ? "bg-green-500 hover:bg-green-600 text-white" 
          : "bg-muted hover:bg-muted/80 text-muted-foreground",
        !isCurrentPlayer && "opacity-50 cursor-not-allowed"
      )}
    >
      {player.is_ready ? (
        <>
          <Check className="w-3 h-3" />
          Ready
        </>
      ) : (
        <>
          <Clock className="w-3 h-3" />
          Not Ready
        </>
      )}
    </Button>
  );
};

export default function LobbyScreen() {
  const { room, startGame, playerId, setRoom } = useGame();
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    console.log('LobbyScreen render:', { playerId, room: room ? {
      id: room.id,
      state: room.state,
      players: room.players.map(p => ({ id: p.id, name: p.name, is_ready: p.is_ready }))
    } : null });
  }, [playerId, room]);

  if (!room) return null;

  const isHost = playerId === room.host_id;
  const canStartGame = room.players.length >= 3;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.id || '');
    toast({
      title: "Room code copied!",
      description: "Share this code with your friends to join the game.",
    });
  };

  const handleReadyToggle = async () => {
    console.log('handleReadyToggle called', { 
      room: room ? { id: room.id, state: room.state } : null,
      playerId,
      currentPlayer: room?.players.find(p => p.id === playerId)
    });

    if (!room || !playerId) {
      console.error('handleReadyToggle: Missing room or playerId', { room, playerId });
      return;
    }

    try {
      const currentPlayer = room.players.find(p => p.id === playerId);
      if (!currentPlayer) {
        console.error('handleReadyToggle: Current player not found', { playerId, players: room.players });
        return;
      }

      console.log('handleReadyToggle: Toggling ready status', { 
        playerId, 
        currentReadyStatus: currentPlayer.is_ready,
        newReadyStatus: !currentPlayer.is_ready 
      });

      const { error } = await supabase
        .from('players')
        .update({ 
          is_ready: !currentPlayer.is_ready,
          last_updated: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (error) {
        console.error('handleReadyToggle: Error updating player', error);
        throw error;
      }

      // Update local state
      setRoom({
        ...room,
        players: room.players.map(p => 
          p.id === playerId 
            ? { ...p, is_ready: !currentPlayer.is_ready }
            : p
        )
      });

      // Show toast
      toast({
        title: currentPlayer.is_ready ? "You are no longer ready" : "You are ready to play!",
        description: currentPlayer.is_ready ? "You can toggle your ready status again." : "Waiting for other players...",
      });
    } catch (error) {
      console.error('Error toggling ready status:', error);
      toast({
        title: "Failed to update ready status",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  if (showSettings) {
    return <GameSettings onClose={() => setShowSettings(false)} />;
  }

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background to-background/80">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-primary" />
                Game Lobby
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-2">
                {isHost 
                  ? "You are the host. Start the game when everyone has joined." 
                  : "Waiting for the host to start the game..."}
                <Badge variant="outline" className="ml-2">
                  {room.players.length}/{room.settings.max_players} Players
                </Badge>
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyRoomCode}
                className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isHost && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowSettings(true)}
                  className="hover:bg-primary/10 hover:text-primary transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Players
            </h3>
            <div className="grid gap-2">
              {room.players.map((player: Player) => (
                <motion.div 
                  key={player.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md transition-all duration-200",
                    player.id === playerId ? "bg-primary/10" : "bg-card/60",
                    "hover:shadow-md hover:scale-[1.01]"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{player.name}</span>
                    {player.id === playerId && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {player.is_host && (
                      <Badge variant="secondary" className="flex gap-1">
                        <ShieldCheck className="h-3 w-3" /> Host
                      </Badge>
                    )}
                    <PlayerReadyStatus 
                      player={player} 
                      isCurrentPlayer={player.id === playerId}
                      onReadyToggle={handleReadyToggle}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isHost ? (
            <Button 
              onClick={startGame} 
              disabled={!canStartGame || !room.players.every(p => p.is_ready)}
              className={cn(
                "w-full transition-all duration-200",
                !canStartGame || !room.players.every(p => p.is_ready)
                  ? "opacity-50"
                  : "hover:scale-[1.02]"
              )}
            >
              {!canStartGame 
                ? "Need at least 3 players to start"
                : !room.players.every(p => p.is_ready)
                ? "Waiting for all players to be ready..."
                : "Start Game"}
            </Button>
          ) : (
            <p className="text-center w-full text-muted-foreground">
              Waiting for host to start the game...
            </p>
          )}
        </CardFooter>
      </Card>

      <Card className="border border-secondary/20 bg-gradient-to-br from-background to-background/80">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Game Rules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium text-amber-500">How to Play</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>One player will be randomly chosen as the Chameleon.</li>
                <li>Everyone except the Chameleon will see the secret word.</li>
                <li>Take turns describing the secret word without saying it directly.</li>
                <li>The Chameleon must pretend to know the word!</li>
                <li>After everyone has spoken, vote on who you think is the Chameleon.</li>
                <li>If caught, the Chameleon gets one chance to guess the word to win.</li>
              </ol>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-amber-500">Tips & Strategies</h4>
              <ul className="list-disc list-inside space-y-2">
                <li>Give subtle hints that don't reveal the word directly</li>
                <li>Watch for players who seem uncertain or hesitant</li>
                <li>As the Chameleon, listen carefully to others' descriptions</li>
                <li>Coordinate with other players to catch the Chameleon</li>
                <li>Use your special abilities strategically</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
