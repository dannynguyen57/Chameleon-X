import { useState, useEffect } from 'react';
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCircle2, Settings, Copy, Users, Check, Clock, Gamepad2, Trophy } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import GameSettings from './GameSettings';
import { toast } from '@/components/ui/use-toast';
import { Player, GameRoom } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { mapRoomData } from '@/hooks/useGameRealtime';
import { DatabaseRoom } from '@/hooks/useGameRealtime';
import { convertToExtendedRoom } from '@/lib/roomUtils';

const PlayerReadyStatus = ({ 
  player, 
  isCurrentPlayer,
  onReadyToggle
}: { 
  player: Player;
  isCurrentPlayer: boolean;
  onReadyToggle: () => void;
}) => {
  console.log('PlayerReadyStatus render:', { 
    playerId: player.id, 
    isCurrentPlayer, 
    isReady: player.is_ready,
    name: player.name 
  });
  
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
    console.log('LobbyScreen render:', { 
      playerId, 
      room: room ? {
        id: room.id,
        state: room.state,
        players: room.players.map(p => ({ 
          id: p.id, 
          name: p.name, 
          is_ready: p.is_ready 
        }))
      } : null 
    });
  }, [playerId, room]);

  // Add effect to handle room updates
  useEffect(() => {
    if (room) {
      console.log('Room state updated:', {
        id: room.id,
        players: room.players.map(p => ({
          id: p.id,
          name: p.name,
          is_ready: p.is_ready
        }))
      });
    }
  }, [room]);

  // Add effect to handle player ready status changes
  useEffect(() => {
    if (room) {
      const currentPlayer = room.players.find(p => p.id === playerId);
      if (currentPlayer) {
        console.log('Current player ready status:', {
          playerId: currentPlayer.id,
          name: currentPlayer.name,
          is_ready: currentPlayer.is_ready
        });
      }
    }
  }, [room, playerId]);

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

    let newReadyStatus: boolean;
    try {
      const currentPlayer = room.players.find(p => p.id === playerId);
      if (!currentPlayer) {
        console.error('handleReadyToggle: Current player not found', { playerId, players: room.players });
        return;
      }

      newReadyStatus = !currentPlayer.is_ready;
      console.log('handleReadyToggle: Toggling ready status', { 
        playerId, 
        currentReadyStatus: currentPlayer.is_ready,
        newReadyStatus
      });

      // Update local state first for immediate feedback
      const updatedPlayers = room.players.map(p => 
        p.id === playerId 
          ? { ...p, is_ready: newReadyStatus }
          : p
      );

      setRoom({
        ...room,
        players: updatedPlayers,
        last_updated: new Date().toISOString()
      });

      // Update the database
      const { error } = await supabase
        .from('players')
        .update({ 
          is_ready: newReadyStatus,
          last_updated: new Date().toISOString()
        })
        .eq('id', playerId)
        .eq('room_id', room.id);

      if (error) {
        console.error('handleReadyToggle: Error updating player', error);
        throw error;
      }

      // Send broadcast to all clients using the persistent channel
      const channel = supabase.channel(`room:${room.id}`);
      await channel.send({
        type: 'broadcast',
        event: 'sync',
        payload: {
          action: 'player_ready_changed',
          roomId: room.id,
          playerId: playerId,
          isReady: newReadyStatus,
          timestamp: new Date().toISOString()
        }
      });

      // Force a re-fetch to ensure consistency
      const { data: roomData, error: fetchError } = await supabase
        .from('game_rooms')
        .select('*, players!players_room_id_fkey (*)')
        .eq('id', room.id)
        .single();

      if (fetchError) {
        console.error('Error fetching room after update:', fetchError);
        return;
      }

      if (roomData) {
        const mappedRoom = mapRoomData(roomData as DatabaseRoom);
        setRoom(convertToExtendedRoom(mappedRoom));
      }

      // Show toast
      toast({
        title: newReadyStatus ? "You are ready to play!" : "You are no longer ready",
        description: newReadyStatus ? "Waiting for other players..." : "You can toggle your ready status again.",
      });
    } catch (error) {
      console.error('Error toggling ready status:', error);
      // Revert local state on error
      if (room) {
        setRoom({
          ...room,
          players: room.players.map(p => 
            p.id === playerId 
              ? { ...p, is_ready: !newReadyStatus }
              : p
          ),
          last_updated: new Date().toISOString()
        });
      }
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
    <div className="space-y-6 max-w-4xl mx-auto p-4">
      <Card className="border-2 border-primary/20 shadow-lg bg-gradient-to-br from-background to-background/80">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2">
                <Gamepad2 className="h-6 w-6 text-primary" />
                Game Lobby
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                <CardDescription>
                  {isHost 
                    ? "You are the host. Start the game when everyone has joined." 
                    : "Waiting for the host to start the game..."}
                </CardDescription>
                <Badge variant="outline" className="w-fit">
                  {room.players.length}/{room.settings.max_players} Players
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyRoomCode}
                className="flex-1 sm:flex-none hover:bg-primary/10 hover:text-primary transition-all duration-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isHost && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowSettings(true)}
                  className="flex-1 sm:flex-none hover:bg-primary/10 hover:text-primary transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 space-y-6">
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Players
            </h3>
            <div className="grid gap-3">
              {room.players.map((player: Player) => (
                <motion.div 
                  key={player.id} 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex items-center justify-between p-3 sm:p-4 rounded-lg transition-all duration-200",
                    player.id === playerId ? "bg-primary/10" : "bg-card/60",
                    "hover:shadow-md hover:scale-[1.01]"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <Avatar className="h-10 w-10 flex-shrink-0">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <span className="font-medium truncate max-w-[60px] sm:max-w-[100px] md:max-w-[150px]" title={player.name}>
                          {player.name}
                        </span>
                        {player.id === playerId && (
                          <Badge variant="outline" className="flex-shrink-0 text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0 ml-1 sm:ml-2">
                    {player.is_host && (
                      <Badge variant="secondary" className="flex gap-1 whitespace-nowrap text-xs sm:text-sm">
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
        <CardFooter className="p-4 sm:p-6">
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Game Rules
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-amber-500 text-lg">How to Play</h4>
              <ol className="list-decimal list-inside space-y-3 text-sm sm:text-base">
                <li>One player will be randomly chosen as the Chameleon.</li>
                <li>Everyone except the Chameleon will see the secret word.</li>
                <li>Take turns describing the secret word without saying it directly.</li>
                <li>The Chameleon must pretend to know the word!</li>
                <li>After everyone has spoken, vote on who you think is the Chameleon.</li>
                <li>If caught, the Chameleon gets one chance to guess the word to win.</li>
              </ol>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-amber-500 text-lg">Tips & Strategies</h4>
              <ul className="list-disc list-inside space-y-3 text-sm sm:text-base">
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
