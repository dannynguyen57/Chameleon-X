import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useGame } from "@/contexts/GameContextProvider";
import { useGameActions } from "@/hooks/useGameActions";
import { updatePlayer } from "@/lib/gameLogic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

import { Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, Crown, Eye } from "lucide-react";

import { Player, PlayerRole, GameState, GameRoom, GameResultType } from "@/lib/types";
import { Room } from '@/types/Room';
import { cn } from "@/lib/utils";
import { categories, WordCategory } from "@/lib/word-categories";
import { getRoleTheme } from '@/lib/roleThemes';
import { isImposter } from '@/lib/gameLogic';
import { roleConfig } from '@/lib/roleConfig';
import { RoleTheme } from '@/lib/roleThemes';
import { RoleConfig } from '@/lib/roleConfig';

import ChatSystem from "./ChatSystem";
import GameHeader from "./GameHeader";
import DevMode from '@/components/dev/DevMode';
import DevModeSetup from '@/components/dev/DevModeSetup';

interface RoleStyle {
  theme: RoleTheme;
  config: RoleConfig;
}

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame } = useGame();
  const [isTurnDialogOpen, setIsTurnDialogOpen] = useState(false);
  const [turnDescription, setTurnDescription] = useState('');
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWord, setShowWord] = useState(false);
  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'true';

  const { submitWord, nextRound, submitVote, startGame, handleRoleAbility } = useGameActions(playerId, room, settings, setRoom);

  if (!room) return null;

  const currentPlayer = room.players.find(p => p.id === playerId);
  if (!currentPlayer) return null;

  const currentTurnPlayer = room.players[room.current_turn || 0];
  if (!currentTurnPlayer) return null;

  const getPlayerRoleIcon = (player: Player) => {
    const theme = getRoleTheme(player.role);
    return theme.icon;
  };

  const getRoleStyle = (role: PlayerRole | undefined): RoleStyle => {
    const actualRole = role || PlayerRole.Regular;
    return {
      theme: getRoleTheme(actualRole),
      config: roleConfig[actualRole]
    };
  };

  const PlayerRoleDisplay = ({ player }: { player: Player }) => {
    const { theme, config } = getRoleStyle(player.role);
    return (
      <div className={cn(
        'p-4 rounded-lg border',
        theme.bg,
        theme.border,
        theme.text,
        theme.shadow,
        theme.hover
      )}>
        <div className="flex items-center gap-2">
          <span className="text-2xl">{theme.icon}</span>
          <span className="font-semibold">{config.name}</span>
        </div>
        <p className="mt-2 text-sm opacity-80">{config.description}</p>
        {config.abilities && (
          <div className="mt-4">
            <h4 className="text-sm font-medium mb-2">Abilities:</h4>
            <ul className="text-sm space-y-1">
              {config.abilities.map((ability, index) => (
                <li key={index} className="flex items-center gap-2">
                  <span className="text-xs">•</span>
                  {ability}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const getRoleTips = (role?: PlayerRole): string => {
    switch (role) {
      case PlayerRole.Chameleon:
        return "Tip: Listen carefully to clues and try to blend in with your description!";
      case PlayerRole.Mimic:
        return "Tip: Use your similar word knowledge to create convincing descriptions!";
      case PlayerRole.Oracle:
        return "Tip: Guide others subtly without revealing you know the word!";
      case PlayerRole.Spy:
        return "Tip: Help others find the Chameleon without being too obvious!";
      case PlayerRole.Jester:
        return "Tip: Try to get others to vote for you by being suspicious!";
      case PlayerRole.Mirror:
        return "Tip: Use other players' descriptions to your advantage!";
      case PlayerRole.Whisperer:
        return "Tip: Share information secretly with other players!";
      case PlayerRole.Timekeeper:
        return "Tip: Control the pace of the game with your time abilities!";
      case PlayerRole.Illusionist:
        return "Tip: Create confusion with your illusion abilities!";
      case PlayerRole.Guardian:
        return "Tip: Protect players from being voted out!";
      case PlayerRole.Trickster:
        return "Tip: Use your tricks to manipulate the game!";
      default:
        return "Tip: Pay attention to others' descriptions and look for inconsistencies!";
    }
  };

  const GameHeader = ({ room, category }: { 
    room: GameRoom; 
    category: WordCategory; 
  }) => {
    const playerRole = room.players.find(p => p.id === playerId)?.role;
    const { theme } = getRoleStyle(playerRole);
    
    return (
      <Card className={cn(
        "border-2 shadow-lg overflow-hidden",
        theme.bg,
        theme.border
      )}>
        <CardHeader className="p-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Round {room.round} of {room.max_rounds}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 rounded-md">
                  <span className="text-xs sm:text-sm font-medium">Category:</span>
                  <Badge variant="outline" className="text-xs sm:text-sm bg-white/80 dark:bg-gray-800/80">
                    {category.emoji} {category.name}
                  </Badge>
                </div>
                
                {!isPlayerChameleon && room.secret_word && (
                  <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 rounded-md">
                    <span className="text-xs sm:text-sm font-medium">Secret Word:</span>
                    <Badge variant="secondary" className="text-xs sm:text-sm bg-primary/20 text-primary font-bold animate-pulse">
                      {room.secret_word}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>
    );
  };

  const CurrentTurnCard = ({ currentPlayer, isSubmitting, setIsSubmitting, showWord, setShowWord }: { 
    currentPlayer: Player;
    isSubmitting: boolean;
    setIsSubmitting: (value: boolean) => void;
    showWord: boolean;
    setShowWord: (value: boolean) => void;
  }) => {
    const { room, playerId } = useGame();
    const [description, setDescription] = useState("");
    const roleStyle = getRoleStyle(currentPlayer.role);
    const isCurrentPlayer = currentPlayer.id === playerId;
    const isImposterPlayer = isImposter(currentPlayer.role);
    const isHost = playerId === room?.host_id;

    if (!room) return null;

    const handleSubmitTurn = async () => {
      if (!description.trim()) return;
      setIsSubmitting(true);
      try {
        await submitWord(description);
        setDescription("");
      } catch (error) {
        console.error("Error submitting turn:", error);
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <Card className={cn(
        "border-2 shadow-lg transition-all duration-200",
        roleStyle.theme.border,
        roleStyle.theme.bg
      )}>
        <CardHeader>
          <CardTitle className={cn("flex items-center gap-2", roleStyle.theme.text)}>
            <span className={cn("text-2xl", roleStyle.theme.icon)}>
              {getPlayerRoleIcon(currentPlayer)}
            </span>
            {currentPlayer.name}'s Turn
          </CardTitle>
          <CardDescription className={cn(roleStyle.theme.text)}>
            {isCurrentPlayer ? "It's your turn to describe the word!" : "Waiting for description..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCurrentPlayer && (
            <>
              <div className="space-y-2">
                <Label className={cn(roleStyle.theme.text)}>Your Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the word without saying it directly..."
                  className={cn(
                    "min-h-[100px]",
                    roleStyle.theme.border,
                    roleStyle.theme.bg
                  )}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleSubmitTurn}
                  disabled={isSubmitting || !description.trim()}
                  className={cn(
                    "flex-1",
                    roleStyle.theme.button,
                    roleStyle.theme.text
                  )}
                >
                  {isSubmitting ? "Submitting..." : "Submit Description"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowWord(!showWord)}
                  className={cn(
                    roleStyle.theme.border,
                    roleStyle.theme.text
                  )}
                >
                  {showWord ? "Hide Word" : "Show Word"}
                </Button>
              </div>
              {showWord && (
                <div className={cn(
                  "p-4 rounded-lg text-center font-bold",
                  roleStyle.theme.border,
                  roleStyle.theme.bg
                )}>
                  <p className={cn(roleStyle.theme.text)}>
                    {isImposterPlayer ? "You are the imposter!" : `Word: ${room.secret_word}`}
                  </p>
                </div>
              )}
            </>
          )}
          {!isCurrentPlayer && (
            <div className="text-center">
              <p className={cn("text-muted-foreground", roleStyle.theme.text)}>
                Waiting for {currentPlayer.name} to describe the word...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const ResultsDisplay = () => {
    if (!room) return null;
    const { round_outcome, revealed_player_id, revealed_role } = room;
    const revealedPlayer = revealed_player_id ? room.players.find(p => p.id === revealed_player_id) : null;
    
    let title = "Round Complete";
    let description = "The round has ended.";
    let icon = <CheckCircle className="h-10 w-10 text-yellow-500" />;

    if (round_outcome === GameResultType.ImposterCaught) {
      title = "Imposter Caught!";
      description = `${revealedPlayer?.name} (${revealed_role}) was the imposter! Good job, team!`;
      icon = <CheckCircle className="h-10 w-10 text-green-500" />;
    } else if (round_outcome === GameResultType.InnocentVoted) {
      title = "Oops! Wrong Person!";
      description = `${revealedPlayer?.name} (${revealed_role}) was innocent! The imposter is still among us...`;
      icon = <XCircle className="h-10 w-10 text-red-500" />;
    } else if (round_outcome === GameResultType.JesterWins) {
      title = "Jester Wins!";
      description = `${revealedPlayer?.name} the Jester tricked you into voting for them!`;
      icon = <Smile className="h-10 w-10 text-yellow-500" />;
    } else if (round_outcome === GameResultType.Tie) {
      title = "It's a Tie!";
      description = "No one was voted out. The imposter remains hidden!";
      icon = <Users className="h-10 w-10 text-gray-500" />;
    }
    
    const isLastRound = room.round >= room.max_rounds;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <Card className="w-full max-w-lg shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3">{icon}</div>
            <CardTitle className="text-2xl font-bold">{title}</CardTitle>
            <p className="text-muted-foreground mt-1">{description}</p>
          </CardHeader>
          <CardContent className="space-y-3 divide-y divide-gray-200 dark:divide-gray-700">
            {room.votes_tally && Object.keys(room.votes_tally).length > 0 && (
              <div className="text-sm pt-3">
                <h4 className="font-semibold mb-2 text-center">Votes Received:</h4>
                <ul className="space-y-1 max-h-40 overflow-y-auto px-4">
                    {Object.entries(room.votes_tally)
                        .sort(([, aVotes], [, bVotes]) => bVotes - aVotes)
                        .map(([votedId, count]) => {
                            const p = room.players.find(pl => pl.id === votedId);
                            return (
                                <li key={votedId} className="flex justify-between items-center text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    <span>{p?.name || 'Unknown'}</span>
                                    <Badge variant={p?.id === revealed_player_id ? "destructive" : "secondary"}>
                                        {count} vote{count > 1 ? 's' : ''}
                                    </Badge>
                                </li>
                            );
                        })}
                </ul>
              </div>
            )}
            
            <div className="text-sm pt-3">
                <h4 className="font-semibold mb-2 text-center">Voting Breakdown:</h4>
                <ul className="space-y-1 max-h-48 overflow-y-auto px-2 sm:px-4">
                    {Object.entries(room.votes || {}).map(([voterId, votedId]) => {
                        const voter = room.players.find(p => p.id === voterId);
                        const voted = room.players.find(p => p.id === votedId);
                        return (
                            <li key={voterId} className="flex justify-between items-center text-xs bg-gray-100 dark:bg-gray-800/50 px-2 py-1.5 rounded">
                                <span className="font-medium">{voter?.name || 'Unknown'}</span>
                                <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                    <span>voted for</span>
                                    <span className="font-medium">{voted?.name || 'Unknown'}</span>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {(isLastRound || room.host_id === playerId) && (
              <div className="pt-3">
                  <Button 
                    onClick={() => nextRound()} 
                    className="w-full font-semibold"
                    disabled={room.host_id !== playerId}
                  >
                    {isLastRound ? "View Final Scores" : "Start Next Round"} 
                    {room.host_id !== playerId && " (Waiting for Host)"}
                  </Button>
             </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const handleVote = async (votedPlayerId: string) => {
    if (!room || !playerId) return;
    
    try {
      await updatePlayer(playerId, room.id, {
        vote: votedPlayerId
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  };

  if (!room) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading game...</p>
      </div>
    </div>
  );

  if (!currentPlayer && room.state === 'lobby') {
      return (
         <div className="container mx-auto p-3 sm:p-4 space-y-4">
             <div className="text-center p-6 bg-gray-100 dark:bg-gray-800 rounded-lg">
                 <h3 className="font-semibold">Waiting for players...</h3>
                  <p className="text-sm text-muted-foreground mt-2">{room.players.length} / {room.max_players} players</p>
                 {room.host_id === playerId && (
                     <Button onClick={startGame} className="mt-4">Start Game</Button>
                 )}
             </div>
         </div>
      );
  }
  
  if (!currentPlayer && room.state !== 'lobby') return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="mt-4 text-destructive">Error loading category data.</p>
      </div>
  );

  const playerRole = room?.players.find(p => p.id === playerId)?.role;
  const roleTheme = getRoleTheme(playerRole || PlayerRole.Regular);

  // If in dev mode and no room is available, show the dev mode setup
  if (isDevMode && !room) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <DevModeSetup />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {room.category && <GameHeader room={room} category={room.category} />}
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-4">
          {/* Left Column - Game Status & Player Role */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  Game Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Round</span>
                    <Badge variant="secondary">{room.round} / {room.max_rounds}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Phase</span>
                    <Badge>{room.state}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Time Left</span>
                    <Badge variant="outline">{remainingTime}s</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="w-5 h-5" />
                  Your Role
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PlayerRoleDisplay player={currentPlayer} />
                <p className="mt-4 text-sm text-muted-foreground">
                  {getRoleTips(currentPlayer.role)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Main Game Area */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Current Turn
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CurrentTurnCard 
                  currentPlayer={currentTurnPlayer}
                  isSubmitting={isSubmitting}
                  setIsSubmitting={setIsSubmitting}
                  showWord={showWord}
                  setShowWord={setShowWord}
                />
              </CardContent>
            </Card>

            {room.state === GameState.Voting && (
              <Card className="border shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Vote className="w-5 h-5" />
                    Vote for the Chameleon
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {room.players.map(player => (
                      <Button
                        key={player.id}
                        variant={room.votes?.[playerId] === player.id ? "secondary" : "outline"}
                        className="w-full"
                        onClick={() => handleVote(player.id)}
                        disabled={player.id === playerId || Boolean(room.votes?.[playerId])}
                      >
                        {player.name}
                        {room.votes?.[playerId] === player.id && (
                          <Check className="ml-2 w-4 h-4" />
                        )}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {room.state === GameState.Results && (
              <ResultsDisplay />
            )}
          </div>

          {/* Right Column - Players & Chat */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {room.players.map(player => (
                    <div
                      key={player.id}
                      className={cn(
                        "p-2 rounded-lg",
                        player.id === playerId ? "bg-primary/10" : "bg-muted",
                        player.id === room.turn_order?.[room.current_turn || 0] && "ring-2 ring-primary"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback>{player.name[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{player.name}</p>
                          {player.turn_description && (
                            <p className="text-xs text-muted-foreground truncate">
                              "{player.turn_description}"
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Chat
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ChatSystem />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

