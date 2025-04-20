import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { useGame } from "@/contexts/GameContextProvider";
import { useGameActions } from "@/hooks/useGameActions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";

import { Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, Crown, Eye } from "lucide-react";

import { PlayerRole, Player, GameState, GameRoom, GameResultType } from "@/lib/types";
import { Room } from '@/types/Room';
import { cn } from "@/lib/utils";
import { categories, WordCategory } from "@/lib/word-categories";
import { getRoleTheme, getRoleDescription } from '@/lib/roleThemes';
import { isImposter } from '@/lib/gameLogic';
import { roleConfig } from '@/lib/roleConfig';

import ChatSystem from "./ChatSystem";
import GameHeader from "./GameHeader";
import DevMode from '@/components/dev/DevMode';
import DevModeSetup from '@/components/dev/DevModeSetup';

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame } = useGame();
  const [isTurnDialogOpen, setIsTurnDialogOpen] = useState(false);
  const [turnDescription, setTurnDescription] = useState('');
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'true';

  const { submitWord, nextRound, submitVote, startGame, handleRoleAbility } = useGameActions(playerId, room, settings, setRoom);

  // Add debug logging
  console.log('Dev Mode Environment Variable:', import.meta.env.VITE_ENABLE_DEV_MODE);
  console.log('Is Dev Mode Enabled:', import.meta.env.VITE_ENABLE_DEV_MODE === 'true');
  console.log('Is Dev Mode Open:', isDevModeOpen);

  const getPlayerRoleIcon = (player: Player) => {
    if (!player.role) return null;
    
    const roleStyle = roleConfig[player.role];
    if (!roleStyle) return null;

    const isCurrentPlayer = player.id === playerId;
    const isCurrentTurn = room?.current_turn !== undefined && 
                         room.turn_order?.[room.current_turn] === player.id;
    const hasTimedOut = player.timeout_at && new Date(player.timeout_at) < new Date();
    const playerIsImposter = player.role === PlayerRole.Chameleon || player.role === PlayerRole.Mimic;
    const isSpecial = player.role !== PlayerRole.Chameleon && player.role !== PlayerRole.Mimic;

    return (
      <div className="flex items-center gap-2">
        <div className={cn(
          "p-2 rounded-lg flex items-center gap-2",
          isCurrentPlayer ? "bg-primary/20" : "bg-muted",
          isCurrentTurn && "ring-2 ring-primary"
        )}>
          <span className={cn(
            "text-2xl",
            roleStyle.text
          )}>{roleStyle.icon}</span>
          <span className="text-sm font-medium">
            {isCurrentPlayer ? roleStyle.name : "Player"}
          </span>
        </div>
        {isCurrentTurn && (
          <Badge variant="secondary" className="animate-pulse">
            Current Turn
          </Badge>
        )}
        {hasTimedOut && (
          <Badge variant="destructive">Timed Out</Badge>
        )}
        {playerIsImposter && (
          <Badge variant="outline" className={cn(
            "border-red-500 text-red-500",
            isSpecial && "border-green-500 text-green-500"
          )}>
            {isSpecial ? "Special" : "Imposter"}
          </Badge>
        )}
      </div>
    );
  };

  const PlayerRoleDisplay = ({ player, isCurrentPlayer, isTurn, isProtected, isInvestigated, onProtect, onInvestigate }: {
    player: Player;
    isCurrentPlayer: boolean;
    isTurn: boolean;
    isProtected: boolean;
    isInvestigated: boolean;
    onProtect?: () => void;
    onInvestigate?: () => void;
  }) => {
    const getRoleStyle = (role: PlayerRole) => {
      if (!role) return roleConfig[PlayerRole.Regular];
      return roleConfig[role];
    };

    const roleStyle = getRoleStyle(player.role || PlayerRole.Regular);
    const roleDescription = getRoleDescription(player.role || PlayerRole.Regular);

    return (
      <Card className={`${roleStyle.bg} ${roleStyle.border} ${isCurrentPlayer ? 'ring-2 ring-white' : ''} ${isTurn ? 'ring-2 ring-yellow-500' : ''} ${isProtected ? 'ring-2 ring-green-500' : ''} ${isInvestigated ? 'ring-2 ring-purple-500' : ''} p-4 rounded-lg shadow-lg transition-all duration-300`}>
        <CardContent className="flex flex-col items-center gap-2">
          <div className="text-4xl mb-2">{roleStyle.icon}</div>
          <div className={`${roleStyle.text} font-bold text-lg`}>{player.name}</div>
          <div className={`${roleStyle.text} text-sm font-medium`}>{roleStyle.name}</div>
          <div className="text-xs text-muted-foreground text-center mt-2">{roleDescription}</div>
          {isTurn && (
            <Badge variant="secondary" className="mt-2 animate-pulse">
              Current Turn
            </Badge>
          )}
          {isProtected && (
            <Badge variant="outline" className="mt-2 border-green-500 text-green-500">
              Protected
            </Badge>
          )}
          {isInvestigated && (
            <Badge variant="outline" className="mt-2 border-purple-500 text-purple-500">
              Investigated
            </Badge>
          )}
          {onProtect && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={onProtect}
            >
              <Shield className="w-4 h-4 mr-2" />
              Protect
            </Button>
          )}
          {onInvestigate && (
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={onInvestigate}
            >
              <Search className="w-4 h-4 mr-2" />
              Investigate
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  // Add helper function for role-specific tips
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
    const roleTheme = getRoleTheme(playerRole);
    
    return (
      <Card className={cn(
        "border-2 shadow-lg overflow-hidden bg-gradient-to-r",
        roleTheme.gradient
      )}>
        <CardHeader className="p-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <CardTitle className="text-lg sm:text-xl">Round {room.round} of {room.max_rounds}</CardTitle>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-gray-900 bg-opacity-50 dark:bg-opacity-50 rounded-md">
                  <span className="text-xs sm:text-sm font-medium">Category:</span>
                  <Badge variant="outline" className="text-xs sm:text-sm bg-white/80 dark:bg-gray-800/80">
                    {category?.emoji} {room.category}
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

  const CurrentTurnCard = ({ currentPlayer }: { currentPlayer: Player }) => {
    if (!room) return null;
    const isCurrentPlayer = currentPlayer?.id === playerId;
    const playerRole = room.players.find(p => p.id === playerId)?.role;
    const roleTheme = getRoleTheme(playerRole);
    
    return (
      <Card className={cn(
        "border shadow-sm overflow-hidden",
        isCurrentPlayer && "ring-2 ring-primary/50"
      )}>
        <div className={cn(
          "h-1.5 w-full",
          roleTheme.button
        )}></div>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12 sm:h-14 sm:w-14 ring-2 ring-primary/30">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                  {getPlayerRoleIcon(currentPlayer)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-primary text-white rounded-full p-1 shadow-md">
                <span className="text-xs font-bold">!</span>
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="text-base sm:text-lg font-semibold flex items-center">
                {isCurrentPlayer ? (
                  <>
                    <span className="bg-gradient-to-r from-primary to-primary-600 bg-clip-text text-transparent">
                      Your Turn
                    </span>
                    <span className="ml-2 inline-block animate-bounce">👈</span>
                  </>
                ) : (
                  `${currentPlayer?.name}'s Turn`
                )}
              </h3>
              
              <p className="text-sm text-muted-foreground mt-1">
                {isCurrentPlayer 
                  ? (isPlayerChameleon 
                    ? "You are the Chameleon! Try to blend in with a convincing description..."
                    : `Describe the word "${room.secret_word}" without saying it directly.`)
                  : "Waiting for their description..."}
              </p>
              
              {currentPlayer?.turn_description ? (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-md">
                  <p className="text-sm italic">
                    "{currentPlayer.turn_description}"
                  </p>
                </div>
              ) : isCurrentPlayer ? (
                <Button 
                  onClick={() => setIsTurnDialogOpen(true)}
                  className={cn(
                    "mt-3 text-sm w-full sm:w-auto",
                    roleTheme.button
                  )}
                >
                  Describe Word
                </Button>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse"></div>
                  <span>Waiting for their input...</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const getPlayerById = (id: string): Player | undefined => {
    return room?.players.find(p => p.id === id);
  };

  const RoleAbilityFeedback = ({ player, room }: { player: Player; room: GameRoom }) => {
    const getAbilityFeedback = () => {
      if (player.role === PlayerRole.Guardian && player.protected_player_id) {
        const protectedPlayer = getPlayerById(player.protected_player_id);
        return protectedPlayer ? `Protected ${protectedPlayer.name}` : null;
      }
      if (player.role === PlayerRole.Oracle && player.investigated_player_id) {
        const investigatedPlayer = getPlayerById(player.investigated_player_id);
        return investigatedPlayer ? `Investigated ${investigatedPlayer.name}` : null;
      }
      return null;
    };

    return getAbilityFeedback() ? (
      <div className="text-sm text-muted-foreground">{getAbilityFeedback()}</div>
    ) : null;
  };

  const GamePhaseIndicator = ({ room, remainingTime }: { room: GameRoom; remainingTime: number | null }) => {
    const getPhaseColor = (phase: GameState) => {
      switch (phase) {
        case GameState.Lobby:
          return 'bg-blue-500/20 text-blue-500';
        case GameState.Selecting:
          return 'bg-yellow-500/20 text-yellow-500';
        case GameState.Presenting:
          return 'bg-green-500/20 text-green-500';
        case GameState.Discussion:
          return 'bg-purple-500/20 text-purple-500';
        case GameState.Voting:
          return 'bg-red-500/20 text-red-500';
        case GameState.Results:
          return 'bg-indigo-500/20 text-indigo-500';
        case GameState.Ended:
          return 'bg-gray-500/20 text-gray-500';
        default:
          return 'bg-gray-500/20 text-gray-500';
      }
    };

    const getPhaseDescription = (phase: GameState) => {
      switch (phase) {
        case GameState.Lobby:
          return 'Waiting for players to join';
        case GameState.Selecting:
          return 'Selecting word and roles';
        case GameState.Presenting:
          return 'Players are presenting their words';
        case GameState.Discussion:
          return 'Discussing and finding the chameleon';
        case GameState.Voting:
          return 'Vote for the suspected chameleon';
        case GameState.Results:
          return 'Round results';
        case GameState.Ended:
          return 'Game has ended';
        default:
          return 'Unknown phase';
      }
    };

    const getPhaseIcon = (phase: GameState) => {
      switch (phase) {
        case GameState.Lobby:
          return <Users className="h-6 w-6" />;
        case GameState.Selecting:
          return <Lightbulb className="h-6 w-6" />;
        case GameState.Presenting:
          return <MessageSquare className="h-6 w-6" />;
        case GameState.Discussion:
          return <Gamepad2 className="h-6 w-6" />;
        case GameState.Voting:
          return <Vote className="h-6 w-6" />;
        case GameState.Results:
          return <Trophy className="h-6 w-6" />;
        case GameState.Ended:
          return <CheckCircle className="h-6 w-6" />;
        default:
          return <XCircle className="h-6 w-6" />;
      }
    };

    return (
      <div className="flex items-center justify-between p-4 bg-card border rounded-lg">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-10 h-10 rounded-full flex items-center justify-center text-xl",
            getPhaseColor(room.state)
          )}>
            {getPhaseIcon(room.state)}
          </div>
          <div>
            <h3 className="font-medium capitalize">{room.state || GameState.Lobby}</h3>
            <p className="text-sm text-muted-foreground">
              {getPhaseDescription(room.state)}
            </p>
          </div>
        </div>
        {typeof remainingTime === 'number' && remainingTime > 0 && (
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{remainingTime}s</span>
          </div>
        )}
      </div>
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

  const currentCategory = useMemo(() => {
    if (!room?.category) return categories[0];
    const matchingCategory = categories.find(c => c.name === room.category);
    return matchingCategory || categories[0];
  }, [room?.category]);

  if (!room) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading game...</p>
      </div>
    </div>
  );

  if (!currentCategory && room.state === 'lobby') {
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
  
  if (!currentCategory && room.state !== 'lobby') return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="mt-4 text-destructive">Error loading category data.</p>
      </div>
  );

  const currentPlayer = room?.players.find(p => p.id === room?.turn_order?.[room?.current_turn ?? 0]);

  const isCurrentPlayer = currentPlayer?.id === playerId;
  const playerRole = room?.players.find(p => p.id === playerId)?.role;
  const roleTheme = getRoleTheme(playerRole);
  const voter = room?.players.find(p => p.id === playerId);

  const handleSubmitTurn = async () => {
    if (!room || !playerId || !turnDescription.trim() || !isCurrentPlayer) return;

    try {
      const success = await submitWord(turnDescription.trim());
      if (success) {
        setIsTurnDialogOpen(false);
        setTurnDescription('');
        
        toast({
          title: "Description submitted!",
          description: "Waiting for other players to submit their descriptions.",
        });
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

  // If in dev mode and no room is available, show the dev mode setup
  if (isDevMode && !room) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <DevModeSetup />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-4">
      <AnimatePresence>
        {room?.state === 'results' && <ResultsDisplay />}
      </AnimatePresence>
      
      <div className="max-w-7xl mx-auto space-y-6">
        <GameHeader 
          room={room} 
          category={currentCategory} 
        />
        <GamePhaseIndicator room={room} remainingTime={room.timer as number | null} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Game Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4 border border-slate-700 shadow-lg">
              <h2 className="text-lg font-bold mb-4">Game Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phase:</span>
                  <Badge variant="outline" className="bg-primary/20 text-primary">
                    {room?.state}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Time Left:</span>
                  <span className="text-xl font-bold text-primary">{remainingTime}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Players:</span>
                  <span className="text-xl font-bold">{room?.players.length}/{room?.max_players}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Center Column - Game Content */}
          <div className="lg:col-span-2 space-y-6">
            {room?.state === 'presenting' && (
              <div className="space-y-6">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 shadow-lg">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-primary/20 p-3 rounded-full">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">Current Turn</h2>
                      <p className="text-slate-400">{currentPlayer?.name}'s turn to describe</p>
                    </div>
                  </div>
                  
                  {currentPlayer?.id === playerId ? (
                    <div className="space-y-4">
                      <div className={cn(
                        "p-4 rounded-lg border",
                        isPlayerChameleon 
                          ? "bg-red-500/10 border-red-500/20" 
                          : "bg-primary/10 border-primary/20"
                      )}>
                        <p className="text-lg">
                          {isPlayerChameleon 
                            ? "You are the chameleon! Try to blend in by giving a vague description that sounds convincing."
                            : `Describe the word "${room.secret_word}" without saying it directly.`}
                        </p>
                      </div>
                      <Textarea
                        value={turnDescription}
                        onChange={(e) => setTurnDescription(e.target.value)}
                        placeholder="Type your description..."
                        className="min-h-[150px] text-lg bg-slate-800/50 border-slate-700 focus:border-primary"
                      />
                      <Button 
                        onClick={handleSubmitTurn}
                        className="w-full bg-primary hover:bg-primary/90 text-white"
                        disabled={!turnDescription.trim()}
                      >
                        Submit Description
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-400">Waiting for {currentPlayer?.name} to describe...</p>
                    </div>
                  )}
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 shadow-lg">
                  <h2 className="text-xl font-bold mb-4">Player Descriptions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {room.players.map((player) => {
                      const roleColor = roleConfig[player.role || PlayerRole.Regular];
                      return (
                        <div 
                          key={player.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            player.id === playerId ? "border-primary" : roleColor.border,
                            player.id === playerId ? "bg-primary/10" : roleColor.bg
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn("text-2xl", roleColor.icon)}>{getPlayerRoleIcon(player)}</div>
                            <div>
                              <p className={cn("font-medium", roleColor.text)}>{player.name}</p>
                              {player.id === playerId && (
                                <span className="text-xs text-primary">(You)</span>
                              )}
                            </div>
                          </div>
                          {player.turn_description ? (
                            <p className="text-slate-300 italic">"{player.turn_description}"</p>
                          ) : (
                            <p className="text-slate-500">Waiting for description...</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {room?.state === 'discussion' && (
              <div className="space-y-6">
                <div className="bg-amber-500/10 backdrop-blur-sm rounded-xl p-6 border border-amber-500/20 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-amber-500/20 p-3 rounded-full">
                      <MessageSquare className="h-6 w-6 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-amber-500">Discussion Time!</h2>
                      <p className="text-amber-400">Discuss who you think is the imposter!</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 border border-slate-700 shadow-lg">
                  <h2 className="text-xl font-bold mb-4">Player Descriptions</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {room.players.map((player) => {
                      const roleColor = roleConfig[player.role || PlayerRole.Regular];
                      return (
                        <div 
                          key={player.id}
                          className={cn(
                            "p-4 rounded-lg border",
                            player.id === playerId ? "border-primary" : roleColor.border,
                            player.id === playerId ? "bg-primary/10" : roleColor.bg
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn("text-2xl", roleColor.icon)}>{getPlayerRoleIcon(player)}</div>
                            <div>
                              <p className={cn("font-medium", roleColor.text)}>{player.name}</p>
                              {player.id === playerId && (
                                <span className="text-xs text-primary">(You)</span>
                              )}
                            </div>
                          </div>
                          <p className="text-slate-300 italic">"{player.turn_description}"</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {room?.state === 'voting' && (
              <div className="space-y-6">
                <div className="bg-rose-500/10 backdrop-blur-sm rounded-xl p-6 border border-rose-500/20 shadow-lg">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="bg-rose-500/20 p-3 rounded-full">
                      <Vote className="h-6 w-6 text-rose-500" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-rose-500">Voting Time!</h2>
                      <p className="text-rose-400">Vote for who you think is the imposter!</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {room.players.map(p => {
                    const roleColor = roleConfig[p.role || PlayerRole.Regular];
                    const playerHasVoted = !!room.players.find(voter => voter.id === p.id)?.vote;
                    return (
                      <Button
                        key={p.id}
                        variant={voter?.vote === p.id ? "default" : "outline"}
                        onClick={() => submitVote(p.id)}
                        disabled={p.id === playerId || !!voter?.vote || p.is_protected}
                        className={cn(
                          "relative flex flex-col items-center justify-center h-40 p-4 text-center transition-all duration-200",
                          p.id === playerId && "opacity-50 cursor-not-allowed",
                          voter?.vote === p.id && "bg-primary hover:bg-primary/90",
                          p.is_protected && "opacity-60 cursor-not-allowed bg-emerald-500/10",
                          !voter?.vote && !p.is_protected && roleColor.bg
                        )}
                      >
                        {playerHasVoted && voter?.id !== p.id && (
                          <Badge 
                            variant="secondary" 
                            className="absolute top-2 left-2 text-xs px-2 h-6 bg-slate-700 text-slate-300"
                          >
                            Voted
                          </Badge>
                        )}
                        <div className={cn("text-5xl mb-3", roleColor.icon)}>{getPlayerRoleIcon(p)}</div>
                        <span className={cn("text-lg font-medium", roleColor.text)}>{p.name}</span>
                        {voter?.vote === p.id && (
                          <span className="text-sm text-primary mt-2">Your Vote</span>
                        )}
                        {p.id === playerId && (
                          <span className="text-sm text-slate-400 mt-2">(You)</span>
                        )}
                        {p.is_protected && (
                          <ShieldCheck className="h-5 w-5 absolute top-2 right-2 text-emerald-500" />
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Chat */}
          {room?.state !== 'lobby' && room?.state !== 'ended' && (
            <div className="lg:col-span-1">
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700 shadow-lg h-[calc(100vh-200px)]">
                <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-t-xl"></div>
                <div className="p-4 h-full">
                  <ChatSystem />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dev Mode Button */}
      {isDevMode && (
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="default"
            size="lg"
            onClick={() => setIsDevModeOpen(!isDevModeOpen)}
            className="bg-gradient-to-r from-primary to-primary-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
          >
            {isDevModeOpen ? 'Close Dev Mode' : 'Open Dev Mode'}
          </Button>
          {isDevModeOpen && <DevMode />}
        </div>
      )}
    </div>
  );
}
const GameStatus = ({ room, playerId }: { room: Room | null; playerId: string }) => {
  const currentPhase = room?.state;
  const currentPlayer = room?.players.find(p => p.id === playerId);
  const isCurrentTurn = room?.current_turn === room?.players.findIndex(p => p.id === playerId);
  const remainingTime = room?.timer || 0;
  const playerCount = room?.players.length || 0;
  const maxPlayers = room?.max_players || 0;
  const round = room?.round || 0;
  const totalRounds = room?.max_rounds || 0;
  const category = room?.category || '';
  const secretWord = room?.secret_word || '';
  const isChameleon = currentPlayer?.role === PlayerRole.Chameleon;

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'selecting': return 'bg-blue-500/20 text-blue-500';
      case 'presenting': return 'bg-purple-500/20 text-purple-500';
      case 'discussion': return 'bg-yellow-500/20 text-yellow-500';
      case 'voting': return 'bg-red-500/20 text-red-500';
      case 'results': return 'bg-green-500/20 text-green-500';
      default: return 'bg-gray-500/20 text-gray-500';
    }
  };

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case 'selecting': return 'Selecting category and assigning roles...';
      case 'presenting': return 'Players are describing the word';
      case 'discussion': return 'Discuss and find the Chameleon!';
      case 'voting': return 'Vote for who you think is the Chameleon';
      case 'results': return 'Round results';
      default: return 'Waiting for game to start...';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'selecting': return '🎲';
      case 'presenting': return '🎤';
      case 'discussion': return '💬';
      case 'voting': return '🗳️';
      case 'results': return '';
      default: return '⌛';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-2 rounded-full",
                  getPhaseColor(currentPhase || '')
                )}>
                  {getPhaseIcon(currentPhase || '')}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-400">Current Phase</h3>
                  <p className="text-lg font-bold text-white capitalize">
                    {currentPhase?.replace('_', ' ')}
                  </p>
                </div>
              </div>
              {isCurrentTurn && (
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-yellow-400" />
                  <span className="text-2xl font-bold text-yellow-400">
                    {remainingTime}s
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Round</h3>
                <p className="text-lg font-bold text-white">
                  {round} / {totalRounds}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-400">Players</h3>
                <p className="text-lg font-bold text-white">
                  {playerCount} / {maxPlayers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-400">Category</h3>
              <p className="text-lg font-bold text-white">{category}</p>
            </div>
            {!isChameleon && (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">Secret Word</h3>
                <p className="text-lg font-bold text-white">{secretWord}</p>
              </div>
            )}
            {isChameleon && (
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-400">Your Role</h3>
                <p className="text-lg font-bold text-red-400">Chameleon</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

