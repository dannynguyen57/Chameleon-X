import { useState, useEffect, useRef } from 'react';
import { useGame } from "@/hooks/useGame";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCircle2, Settings, Copy, Users, Check, Clock, Gamepad2, Trophy, Crown, Star } from "lucide-react";
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
import { RealtimeChannel } from '@supabase/supabase-js';
import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

const PlayerReadyStatus = ({ 
  player, 
  isCurrentPlayer,
  onReadyToggle
}: { 
  player: Player;
  isCurrentPlayer: boolean;
  onReadyToggle: () => void;
}) => {
  // Removed console.log for cleaner output
  
  return (
    <Button 
      size="sm" 
      onClick={onReadyToggle}
      disabled={!isCurrentPlayer}
      className={cn(
        "h-7 px-3 text-xs flex items-center gap-1.5 transition-all duration-200 rounded-full shadow-sm",
        player.is_ready 
          ? "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white border border-green-600/50"
          : "bg-gray-600/50 hover:bg-gray-500/50 text-gray-300 border border-gray-700/50",
        !isCurrentPlayer && "opacity-60 cursor-not-allowed"
      )}
    >
      {player.is_ready ? (
        <>
          <Check className="w-3.5 h-3.5" />
          Ready
        </>
      ) : (
        <>
          <Clock className="w-3.5 h-3.5" />
          Not Ready
        </>
      )}
    </Button>
  );
};

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

export default function LobbyScreen() {
  const { room, startGame, playerId, setRoom } = useGame();
  const [showSettings, setShowSettings] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!room?.id) return;

    const setupChannel = async () => {
      try {
        // Clean up any existing subscription
        if (channelRef.current) {
          await supabase.removeChannel(channelRef.current);
          channelRef.current = null;
        }

        // Create a new channel for this room
        const channel = supabase.channel(`room:${room.id}`, {
          config: {
            broadcast: { self: true },
            presence: { key: '' },
          },
        });

        // Set up event handlers
        channel
          .on('postgres_changes', 
            { 
              event: '*', 
              schema: 'public', 
              table: 'players',
              filter: `room_id=eq.${room.id}`
            }, 
            async (payload) => {
              // Fetch fresh room data
              const { data: freshData, error: fetchError } = await supabase
                .from('game_rooms')
                .select(`
                  *,
                  players:players(*)
                `)
                .eq('id', room.id)
                .single();

              if (fetchError) {
                console.error('Error fetching fresh room data:', fetchError);
                return;
              }

              if (freshData) {
                const mappedRoom = mapRoomData(freshData as DatabaseRoom);
                setRoom(convertToExtendedRoom(mappedRoom));
              }
            }
          )
          .on('broadcast', { event: 'sync' }, async (payload) => {
            if (payload.payload.action === 'player_left' || 
                payload.payload.action === 'room_deleted' ||
                payload.payload.action === 'player_joined') {
              // Fetch fresh room data
              const { data: freshData, error: fetchError } = await supabase
                .from('game_rooms')
                .select(`
                  *,
                  players:players(*)
                `)
                .eq('id', room.id)
                .single();

              if (fetchError) {
                console.error('Error fetching fresh room data:', fetchError);
                return;
              }

              if (freshData) {
                const mappedRoom = mapRoomData(freshData as DatabaseRoom);
                setRoom(convertToExtendedRoom(mappedRoom));
              }
            }
          });

        // Subscribe to the channel
        await channel.subscribe();
        channelRef.current = channel;
      } catch (error) {
        console.error('Error setting up channel:', error);
      }
    };

    setupChannel();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current).catch(err => console.error("Error removing channel:", err));
        channelRef.current = null;
      }
    };
  }, [room?.id, setRoom]);

  // Add effect to handle initial room data fetch
  useEffect(() => {
    if (!room?.id) return;

    const fetchRoomData = async () => {
      try {
        // First check if we're already in the room
        const { data: playerData, error: playerError } = await supabase
          .from('players')
          .select('*')
          .eq('id', playerId)
          .eq('room_id', room.id)
          .maybeSingle(); // Use maybeSingle instead of single

        if (playerError) {
          console.error('Error checking player:', playerError);
          return;
        }

        // If player not found, try to rejoin the room
        if (!playerData) {
          console.log('Player not found in room, attempting to rejoin...');
          const { data: roomData, error: roomError } = await supabase
            .from('game_rooms')
            .select('*')
            .eq('id', room.id)
            .single();

          if (roomError || !roomData) {
            console.error('Error fetching room data:', roomError);
            return;
          }

          // Try to rejoin the room
          const { error: joinError } = await supabase
            .from('players')
            .insert({
              id: playerId,
              room_id: room.id,
              name: localStorage.getItem('playerName') || 'Player',
              is_host: false,
              is_ready: false,
              last_active: new Date().toISOString(),
              last_updated: new Date().toISOString()
            });

          if (joinError) {
            console.error('Error rejoining room:', joinError);
            return;
          }
        }

        // Then fetch the full room data
        const { data: freshData, error: fetchError } = await supabase
          .from('game_rooms')
          .select(`
            *,
            players:players(*)
          `)
          .eq('id', room.id)
          .single();

        if (fetchError) {
          console.error('Error fetching initial room data:', fetchError);
          return;
        }

        if (freshData) {
          const mappedRoom = mapRoomData(freshData as DatabaseRoom);
          setRoom(convertToExtendedRoom(mappedRoom));
        }
      } catch (error) {
        console.error('Error in fetchRoomData:', error);
      }
    };

    fetchRoomData();
  }, [room?.id, playerId, setRoom]);

  // Remove unnecessary console logs
  useEffect(() => {
    if (room) {
      const currentPlayer = room.players.find(p => p.id === playerId);
      if (currentPlayer) {
        // Only log if there's an issue
        if (!currentPlayer.is_ready && room.players.every(p => p.is_ready)) {
          console.warn('Current player not ready but others are:', {
            playerId: currentPlayer.id,
            name: currentPlayer.name,
            is_ready: currentPlayer.is_ready
          });
        }
      }
    }
  }, [room, playerId]);

  if (!room) return null;

  const isHost = playerId === room.host_id;
  const canStartGame = room.players.length >= 3;
  const allPlayersReady = room.players.every(p => p.is_ready);

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

  const getStartButtonText = () => {
    if (!canStartGame) return `Need ${3 - room.players.length} more player${3 - room.players.length > 1 ? 's' : ''}`;
    if (!allPlayersReady) return "Waiting for players...";
    return "Start Game";
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Main Game Lobby Card - Updated Styling */}
      <Card className="border-2 border-green-500/20 shadow-xl bg-green-950/70 backdrop-blur-lg overflow-hidden">
        <CardHeader className="p-4 sm:p-6 bg-gradient-to-b from-green-900/30 to-transparent border-b border-green-500/10">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2 text-green-100">
                <Gamepad2 className="h-6 w-6 text-green-300" />
                Game Lobby
              </CardTitle>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-2">
                <CardDescription className="text-green-300/80">
                  {isHost 
                    ? "Assemble your team and prepare for deduction!" 
                    : "Get ready, the game will start soon..."}
                </CardDescription>
                <Badge variant="secondary" className="w-fit bg-green-800/60 text-green-200 border-green-600/40">
                  {room.players.length}/{room.settings.max_players} Players
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyRoomCode}
                className="flex-1 sm:flex-none bg-green-800/50 border-green-600/40 text-green-300 hover:bg-green-700/50 hover:text-green-100 transition-all duration-200"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {isHost && (
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => setShowSettings(true)}
                  className="flex-1 sm:flex-none bg-green-800/50 border-green-600/40 text-green-300 hover:bg-green-700/50 hover:text-green-100 transition-all duration-200"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6">
          <div>
            <h3 className="font-medium mb-4 flex items-center gap-2 text-lg text-green-200">
              <Users className="h-5 w-5 text-green-300" />
              Player Roster
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {room.players.map((player: Player, index: number) => (
                <motion.div 
                  key={player.id} 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg transition-all duration-300",
                    player.id === playerId 
                      ? "bg-gradient-to-r from-green-500/20 to-teal-500/20 border border-green-500/30 shadow-md"
                      : "bg-green-950/50 border border-green-800/40 hover:bg-green-900/60",
                    "hover:shadow-lg"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
                    <Avatar className={cn("h-10 w-10 flex-shrink-0 border-2", player.is_ready ? "border-green-400" : "border-gray-600")}>
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 min-w-0 overflow-hidden">
                        <span className="font-medium truncate max-w-[calc(100%-80px)] text-green-100" title={player.name}>
                          {player.name}
                        </span>
                        {player.id === playerId && (
                          <Badge variant="outline" className="flex-shrink-0 text-xs bg-blue-500/20 text-blue-200 border-blue-500/30">
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {player.is_host && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Crown className="h-4 w-4 text-amber-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Room Host</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
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
        <CardFooter className="p-4 sm:p-6 border-t border-green-500/10 mt-4">
          {isHost ? (
            <Button 
              onClick={startGame} 
              disabled={!canStartGame || !allPlayersReady}
              size="lg"
              className={cn(
                "w-full transition-all duration-300 ease-in-out transform",
                (!canStartGame || !allPlayersReady)
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed shadow-inner"
                  : "bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white font-bold shadow-lg hover:scale-105 active:scale-95"
              )}
            >
              <Gamepad2 className="w-5 h-5 mr-2" />
              {getStartButtonText()}
            </Button>
          ) : (
            <div className="flex items-center justify-center w-full text-green-300/70 text-sm">
              <Clock className="w-4 h-4 mr-2 animate-pulse" />
              Waiting for host to start the game...
            </div>
          )}
        </CardFooter>
      </Card>

      {/* Game Rules Card - Consistent Styling */}
      <Card className="border-2 border-amber-500/20 shadow-lg bg-green-950/70 backdrop-blur-lg overflow-hidden">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-xl sm:text-2xl flex items-center gap-2 text-amber-300">
            <Star className="h-5 w-5 text-amber-400" />
            Gameplay Guide
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 text-green-200/90">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-medium text-amber-400 text-lg">Objective</h4>
              <ul className="list-disc list-inside space-y-2 text-sm sm:text-base">
                <li><strong className="text-amber-300">Regular Players:</strong> Identify and vote out the Chameleon(s).</li>
                <li><strong className="text-amber-300">Chameleon(s):</strong> Blend in, avoid detection, and guess the secret word if caught.</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="font-medium text-amber-400 text-lg">Game Flow</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base">
                <li>See the secret word (unless you're the Chameleon!).</li>
                <li>Describe the word creatively in turns.</li>
                <li>Discuss and analyze clues to find the outlier.</li>
                <li>Vote for the suspected Chameleon.</li>
                <li>Unmask the Chameleon or survive the round!</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
