import { useState, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// import { useGame } from "@/contexts/GameContextProvider";
import { useGame } from '@/hooks/useGame';
import { useGameActions } from "@/hooks/useGameActions";
// import { updatePlayer } from "@/lib/gameLogic";
import { Player, PlayerRole, GameState, GameRoom, GameResultType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getRoleTheme } from '@/lib/roleThemes';
import { isImposter } from '@/lib/gameLogic';
import { roleConfig } from '@/lib/roleConfig';
import { RoleTheme } from '@/lib/roleThemes';
import { RoleConfig } from '@/lib/roleConfig';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, Crown, Eye, EyeOff, Timer, UserCircle2, ChevronDown, ChevronUp } from "lucide-react";

import ChatSystem from "./ChatSystem";
import DevModeSetup from '@/components/dev/DevModeSetup';
import GameHeader from './GameHeader';
import ResultsDisplay from './ResultsDisplay';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface RoleStyle {
  theme: RoleTheme;
  config: RoleConfig;
}

// Helper functions
const getRoleStyle = (role: PlayerRole | undefined): RoleStyle => {
  const actualRole = role || PlayerRole.Regular;
  return {
    theme: getRoleTheme(actualRole),
    config: roleConfig[actualRole]
  };
};

// const getPlayerRoleIcon = (player: Player) => {
//   const theme = getRoleTheme(player.role);
//   return theme.icon;
// };

// Memoized Player Role Display Component
const PlayerRoleDisplay = memo(({ player }: { player: Player }) => {
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
            {config.abilities.map((ability: string, index: number) => (
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
});

interface CurrentTurnCardProps {
  room: GameRoom;
  currentPlayer: Player;
  onDescriptionSubmit: (description: string) => void;
  onSkipTurn: () => void;
}

const CurrentTurnCard: React.FC<CurrentTurnCardProps> = ({ 
  room, 
  currentPlayer, 
  onDescriptionSubmit, 
  onSkipTurn 
}) => {
  const { playerId } = useGame();
  const [description, setDescription] = useState('');
  const [isWordVisible, setIsWordVisible] = useState(false);
  const [isBlendingIn, setIsBlendingIn] = useState(false);
  const [isMimicking, setIsMimicking] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const [isSwappingVotes, setIsSwappingVotes] = useState(false);
  const [isDoublingVote, setIsDoublingVote] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [isActingSuspicious, setIsActingSuspicious] = useState(false);
  const [isGuiding, setIsGuiding] = useState(false);

  const { handleRoleAbility } = useGameActions(playerId, room, room.settings, () => {});
  const { theme } = getRoleStyle(currentPlayer.role);

  const isChameleon = currentPlayer.role === PlayerRole.Chameleon;
  const isMimic = currentPlayer.role === PlayerRole.Mimic;
  const isOracle = currentPlayer.role === PlayerRole.Oracle;
  const isJester = currentPlayer.role === PlayerRole.Jester;
  const isSpy = currentPlayer.role === PlayerRole.Spy;
  const isGuardian = currentPlayer.role === PlayerRole.Guardian;
  const isTrickster = currentPlayer.role === PlayerRole.Trickster;
  const isIllusionist = currentPlayer.role === PlayerRole.Illusionist;

  const currentTurnPlayer = room.players[room.current_turn || 0];
  const isCurrentPlayerTurn = currentPlayer.id === currentTurnPlayer?.id;

  const handleAbilityUse = async (ability: string) => {
    switch (ability) {
      case 'blendIn':
        setIsBlendingIn(true);
        await handleRoleAbility();
        break;
      case 'mimic':
        setIsMimicking(true);
        await handleRoleAbility();
        break;
      case 'protect':
        setIsProtecting(true);
        if (targetPlayer) {
          await handleRoleAbility(targetPlayer);
        }
        break;
      case 'swapVotes':
        setIsSwappingVotes(true);
        if (targetPlayer) {
          await handleRoleAbility(targetPlayer);
        }
        break;
      case 'doubleVote':
        setIsDoublingVote(true);
        if (targetPlayer) {
          await handleRoleAbility(targetPlayer);
        }
        break;
      case 'actSuspicious':
        setIsActingSuspicious(true);
        await handleRoleAbility();
        break;
      case 'guide':
        setIsGuiding(true);
        await handleRoleAbility();
        break;
    }
  };

  const handleTargetSelect = (playerId: string) => {
    setTargetPlayer(playerId);
  };

  const handleSubmitDescription = () => {
    if (description.trim() && isCurrentPlayerTurn) {
      onDescriptionSubmit(description);
      setDescription('');
    }
  };

  return (
    <motion.div 
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-6 h-6 text-primary" />
                <span className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  {isCurrentPlayerTurn ? "Your Turn!" : `${currentTurnPlayer?.name}'s Turn`}
                </span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground text-center sm:text-left">
                {isCurrentPlayerTurn 
                  ? "Describe the word without saying it directly"
                  : "Wait for your turn to describe the word"}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Role Abilities Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {isChameleon && (
              <Button 
                onClick={() => handleAbilityUse('blendIn')}
                disabled={isBlendingIn || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <ShieldCheck className="w-4 h-4" />
                Blend In
              </Button>
            )}
            {isMimic && (
              <Button 
                onClick={() => handleAbilityUse('mimic')}
                disabled={isMimicking || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Laugh className="w-4 h-4" />
                Mimic
              </Button>
            )}
            {isOracle && (
              <Button 
                onClick={() => handleAbilityUse('guide')}
                disabled={isGuiding || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Lightbulb className="w-4 h-4" />
                Guide
              </Button>
            )}
            {isJester && (
              <Button 
                onClick={() => handleAbilityUse('actSuspicious')}
                disabled={isActingSuspicious || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Crown className="w-4 h-4" />
                Act Suspicious
              </Button>
            )}
            {isSpy && (
              <Button 
                onClick={() => handleAbilityUse('protect')}
                disabled={isProtecting || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Shield className="w-4 h-4" />
                Protect Chameleon
              </Button>
            )}
            {isGuardian && (
              <Button 
                onClick={() => handleAbilityUse('protect')}
                disabled={isProtecting || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Shield className="w-4 h-4" />
                Protect Player
              </Button>
            )}
            {isTrickster && (
              <Button 
                onClick={() => handleAbilityUse('swapVotes')}
                disabled={isSwappingVotes || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <Award className="w-4 h-4" />
                Swap Votes
              </Button>
            )}
            {isIllusionist && (
              <Button 
                onClick={() => handleAbilityUse('doubleVote')}
                disabled={isDoublingVote || currentPlayer.special_ability_used}
                className="flex items-center gap-2"
                variant="secondary"
              >
                <EyeOff className="w-4 h-4" />
                Double Vote
              </Button>
            )}
          </div>

          {/* Target Selection */}
          {(isProtecting || isSwappingVotes || isDoublingVote) && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Select Target Player:</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {room.players.map((player: Player) => (
                  <Button
                    key={player.id}
                    onClick={() => handleTargetSelect(player.id)}
                    variant={targetPlayer === player.id ? "default" : "outline"}
                    disabled={player.id === currentPlayer.id}
                    className="flex items-center gap-2"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="font-medium">{player.name}</span>
                      {shouldShowRole(room, player.id, currentPlayer?.id) && player.role && (
                        <span className="text-xs text-muted-foreground">
                          {player.role}
                        </span>
                      )}
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Word Display */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Secret Word:</h4>
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              {isChameleon ? (
                <span className="text-2xl font-bold tracking-widest">??????</span>
              ) : (
                <>
                  <span className={cn(
                    "text-2xl font-bold tracking-widest transition-all duration-300",
                    isWordVisible ? "opacity-100" : "opacity-0"
                  )}>
                    {isWordVisible ? room.secret_word : '••••••••'}
                  </span>
                  <Button 
                    onClick={() => setIsWordVisible(!isWordVisible)}
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    {isWordVisible ? (
                      <>
                        <EyeOff className="w-4 h-4" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Description Input */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-sm font-medium">Your Description</Label>
                <span className="text-xs text-muted-foreground">
                  {description.length}/200 characters
                </span>
              </div>
              <div className="relative">
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                  placeholder={isChameleon ? "Try to blend in with your description..." : "Describe the word without saying it directly..."}
                  disabled={!isWordVisible && !isChameleon}
                  className={cn(
                    "min-h-[120px] resize-none transition-all duration-200",
                    "focus:ring-2 focus:ring-primary/20 focus:border-primary/50",
                    "placeholder:text-muted-foreground/50",
                    !isWordVisible && !isChameleon && "opacity-50 cursor-not-allowed"
                  )}
                />
                {!isWordVisible && !isChameleon && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-md">
                    <p className="text-sm text-muted-foreground">Show the word to start describing</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitDescription}
                disabled={!description.trim() || !isCurrentPlayerTurn}
                className={cn(
                  "flex-1 transition-all duration-200",
                  !description.trim() || !isCurrentPlayerTurn ? "opacity-50" : "hover:scale-[1.02]"
                )}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Description
              </Button>
              <Button 
                onClick={onSkipTurn}
                variant="outline"
                disabled={!isCurrentPlayerTurn}
                className={cn(
                  "transition-all duration-200",
                  !isCurrentPlayerTurn ? "opacity-50" : "hover:scale-[1.02]"
                )}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Skip Turn
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

interface GamePhaseIndicatorProps {
  room: GameRoom;
}

const GamePhaseIndicator: React.FC<GamePhaseIndicatorProps> = ({ room }) => {
  const getPhaseColor = (state: GameState) => {
    switch (state) {
      case GameState.Presenting:
        return "bg-blue-500";
      case GameState.Discussion:
        return "bg-yellow-500";
      case GameState.Voting:
        return "bg-purple-500";
      case GameState.Results:
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getPhaseText = (state: GameState) => {
    switch (state) {
      case GameState.Presenting:
        return "Presenting Phase";
      case GameState.Discussion:
        return "Discussion Phase";
      case GameState.Voting:
        return "Voting Phase";
      case GameState.Results:
        return "Results Phase";
      default:
        return "Unknown Phase";
    }
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <div className={`h-2 w-2 rounded-full ${getPhaseColor(room.state)}`} />
      <span className="text-sm font-medium">{getPhaseText(room.state)}</span>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const TurnIndicator = ({ isCurrentTurn }: { isCurrentTurn: boolean }) => (
  <motion.div
    className={cn(
      "absolute top-0 right-0 p-1 rounded-bl-lg",
      isCurrentTurn ? "bg-primary" : "bg-muted"
    )}
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    transition={{ duration: 0.2 }}
  >
    <Timer className="w-4 h-4 text-primary-foreground" />
  </motion.div>
);

// Helper function for role display
const shouldShowRole = (room: GameRoom, playerId: string, currentPlayerId?: string) => {
  return room.state === GameState.Results || playerId === currentPlayerId;
};

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame, startGame } = useGame();
  const { submitWord, submitVote, nextRound, resetGame: resetGameAction } = useGameActions(playerId, room, settings, setRoom);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [isPlayersPanelOpen, setIsPlayersPanelOpen] = useState(false);
  const [isRolePanelOpen, setIsRolePanelOpen] = useState(false);
  const hasVoted = Boolean(room?.votes?.[playerId]);
  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'false';
  const [isGameInfoOpen, setIsGameInfoOpen] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (room && room.state === GameState.Presenting) {
      setIsLoading(false);
    }
  }, [room]);

  // Add detailed logging for debugging
  useEffect(() => {
    console.log('Current Room State:', {
      roomId: room?.id,
      state: room?.state,
      players: room?.players?.map(p => ({ id: p.id, name: p.name })),
      currentPlayerId: playerId
    });
  }, [room, playerId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-muted-foreground">Loading game data...</p>
      </div>
    );
  }

  const currentPlayer = room.players.find((p: Player) => p.id === playerId);
  
  if (!currentPlayer) {
    console.error('Player not found in room:', {
      playerId,
      roomPlayers: room.players.map(p => ({ id: p.id, name: p.name })),
      roomId: room.id,
      roomState: room.state
    });
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Connecting to game...</p>
        <p className="text-sm text-muted-foreground">If this persists, try refreshing the page.</p>
      </div>
    );
  }

  const currentTurnPlayer = room.players[room.current_turn || 0];
  if (!currentTurnPlayer) return null;

  const isCurrentPlayerTurn = currentPlayer?.id === currentTurnPlayer?.id;

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

  const handleVote = () => {
    if (selectedVote && room) {
      submitVote(selectedVote);
    }
  };

  const handleStartGame = async () => {
    if (!room) return;
    setIsStarting(true);
    try {
      await startGame();
    } catch (error) {
      console.error('Error starting game:', error);
      toast.error("Failed to start game. Please try again.");
    } finally {
      setIsStarting(false);
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
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80">
      <div className="container mx-auto p-4 space-y-6">
        {/* Game Header */}
        <GameHeader
          roomName={room.id}
          category={room.category || null}
          playerRole={currentPlayer?.role}
          word={room.secret_word}
          roleTheme={getRoleTheme(currentPlayer?.role || PlayerRole.Regular)}
          timeLeft={remainingTime.timeLeft}
        />
        
        {/* Game Phase Indicator */}
        <GamePhaseIndicator room={room} />
        
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Player Info */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Players
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsPlayersPanelOpen(!isPlayersPanelOpen)}
                  >
                    {isPlayersPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn(
                "p-4",
                !isPlayersPanelOpen && "lg:block hidden"
              )}>
                <div className="space-y-2">
                  {room.players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg transition-all duration-200",
                        player.id === currentTurnPlayer?.id ? "bg-primary/10" : "",
                        player.id === playerId ? "ring-2 ring-primary" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10 border-2 border-primary/20">
                            <AvatarImage 
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=b6e3f4,c0aede,d1f4dd,ffd5dc,ffdfbf`}
                              alt={player.name}
                            />
                            <AvatarFallback className="bg-primary/10">
                              {player.name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          {player.id === playerId && (
                            <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                              <UserCircle2 className="h-3 w-3" />
                            </div>
                          )}
                          {player.is_host && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-yellow-900 rounded-full p-1">
                              <Crown className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">{player.name}</span>
                          {shouldShowRole(room, player.id, currentPlayer?.id) && player.role && (
                            <span className="text-xs text-muted-foreground">
                              {player.role}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="w-5 h-5" />
                    Your Role
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsRolePanelOpen(!isRolePanelOpen)}
                  >
                    {isRolePanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn(
                "p-4",
                !isRolePanelOpen && "lg:block hidden"
              )}>
                <PlayerRoleDisplay player={currentPlayer} />
                <p className="mt-4 text-sm text-muted-foreground">
                  {getRoleTips(currentPlayer.role)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Center Column - Main Game Area */}
          <div className="col-span-12 lg:col-span-6 space-y-4">
            <AnimatePresence mode="sync">
              {/* Description Input */}
              {room.state === GameState.Presenting && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-4"
                >
                  {isCurrentPlayerTurn ? (
                    <CurrentTurnCard
                      room={room}
                      currentPlayer={currentPlayer}
                      onDescriptionSubmit={submitWord}
                      onSkipTurn={async () => {
                        if (room && currentPlayer) {
                          try {
                            // Update the player's description to indicate skipped turn
                            const { error: updateError } = await supabase
                              .from('players')
                              .update({ 
                                turn_description: "[Skipped Turn]",
                                last_updated: new Date().toISOString()
                              })
                              .eq('id', currentPlayer.id)
                              .eq('room_id', room.id);

                            if (updateError) throw updateError;

                            // Move to next turn
                            const currentTurnIndex = room.current_turn ?? 0;
                            const nextTurnIndex = (currentTurnIndex + 1) % (room.turn_order?.length ?? 0);
                            const nextPlayerId = room.turn_order?.[nextTurnIndex];
                            const nextPlayerRoomIndex = room.players.findIndex(p => p.id === nextPlayerId);

                            const { error: roomError } = await supabase
                              .from('game_rooms')
                              .update({ 
                                current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                                timer: settings.time_per_round,
                                last_updated: new Date().toISOString()
                              })
                              .eq('id', room.id);

                            if (roomError) throw roomError;

                            // Update local state
                            setRoom({
                              ...room,
                              current_turn: nextPlayerRoomIndex >= 0 ? nextPlayerRoomIndex : 0,
                              timer: settings.time_per_round,
                              last_updated: new Date().toISOString()
                            });

                            toast.success("Turn skipped successfully");
                          } catch (error) {
                            console.error('Error skipping turn:', error);
                            toast.error("Failed to skip turn. Please try again.");
                          }
                        }
                      }}
                    />
                  ) : (
                    <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          Waiting for {currentTurnPlayer?.name}'s Turn
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-center text-muted-foreground">
                          {currentTurnPlayer?.name} is describing the word. Please wait for your turn.
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Submitted Words Display */}
                  <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Submitted Descriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3">
                        {room.players
                          .filter(p => p.turn_description)
                          .map((player) => (
                            <motion.div
                              key={player.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              className={cn(
                                "p-3 rounded-lg border",
                                player.id === playerId ? "border-primary/50 bg-primary/5" : "border-muted"
                              )}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                                    alt={player.name}
                                  />
                                  <AvatarFallback>{player.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{player.name}</p>
                                    {player.id === playerId && (
                                      <Badge variant="outline" className="text-xs">You</Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    "{player.turn_description}"
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 text-green-500">
                                  <CheckCircle className="h-4 w-4" />
                                </div>
                              </div>
                            </motion.div>
                          ))}
                        {room.players.filter(p => !p.turn_description).length > 0 && (
                          <div className="text-center text-sm text-muted-foreground">
                            Waiting for {room.players.filter(p => !p.turn_description).length} more players to submit...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Discussion Phase UI */}
              {room.state === GameState.Discussion && (
                <motion.div
                  key="discussion"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Descriptions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {room.players.map((player) => (
                            <Card key={player.id} className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar className="flex-shrink-0">
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                  <AvatarFallback>{player.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold truncate" title={player.name}>
                                    {truncateName(player.name)}
                                  </h3>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {player.turn_description || "No description yet"}
                                  </p>
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Chat System */}
                  <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
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
                </motion.div>
              )}

              {/* Voting UI */}
              {room.state === GameState.Voting && (
                <motion.div
                  key="voting"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Vote className="w-5 h-5" />
                        Vote for the Chameleon
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {room.players.map((player) => (
                          <Card
                            key={player.id}
                            className={cn(
                              "p-4 cursor-pointer transition-all duration-200",
                              selectedVote === player.id
                                ? "border-primary bg-primary/5"
                                : "hover:border-primary/50"
                            )}
                            onClick={() => !hasVoted && setSelectedVote(player.id)}
                          >
                            <div className="flex items-center gap-3">
                              <Avatar className="flex-shrink-0">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                <AvatarFallback>{player.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold truncate" title={player.name}>
                                  {truncateName(player.name)}
                                </h3>
                                <p className="text-sm text-muted-foreground truncate">
                                  {player.turn_description || "No description yet"}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                      {!hasVoted && selectedVote && (
                        <div className="mt-6 text-center">
                          <Button
                            className="w-full max-w-xs"
                            onClick={() => handleVote()}
                          >
                            Submit Vote
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Results UI */}
              {room.state === GameState.Results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <ResultsDisplay 
                    room={room} 
                    playerId={playerId}
                    onNextRound={async () => {
                      if (room.round >= room.max_rounds) {
                        // Show final scores
                        const finalScores = room.players.reduce((acc, player) => {
                          acc[player.id] = {
                            name: player.name,
                            score: player.score || 0,
                            role: player.role
                          };
                          return acc;
                        }, {} as Record<string, { name: string; score: number; role?: PlayerRole }>);

                        // Sort players by score
                        const sortedPlayers = Object.entries(finalScores)
                          .sort(([, a], [, b]) => b.score - a.score);

                        // Show final scores in a toast
                        toast(
                          `Final Scores\n${sortedPlayers.map(([id, { name, score, role }]) => 
                            `${name}: ${score} points${role ? ` (${role})` : ''}`
                          ).join('\n')}`
                        );

                        // Reset the game
                        await resetGameAction();
                      } else {
                        // Start next round
                        await nextRound();
                      }
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column - Game Info */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    Game Info
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setIsGameInfoOpen(!isGameInfoOpen)}
                  >
                    {isGameInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className={cn(
                "p-3 sm:p-4 space-y-4",
                !isGameInfoOpen && "lg:block hidden"
              )}>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Round</h4>
                    <Badge variant="outline" className="text-sm sm:text-base">
                      {room?.round || 1} / {room?.max_rounds || 3}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">
                      {room?.state === GameState.Presenting ? "Time to Describe" :
                       room?.state === GameState.Discussion ? "Discussion Time" :
                       room?.state === GameState.Voting ? "Voting Time" :
                       "Time"}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "text-sm sm:text-base transition-all duration-300",
                        remainingTime.timeLeft <= 10 ? "text-red-500 animate-pulse" : ""
                      )}
                    >
                      <Timer className={cn(
                        "w-3 h-3 sm:w-4 sm:h-4 mr-1",
                        remainingTime.timeLeft <= 10 ? "text-red-500" : ""
                      )} />
                      {formatTime(remainingTime.timeLeft)}
                    </Badge>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Category</h4>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary/10 border border-primary/20">
                        {room?.category?.emoji && (
                          <span className="text-lg">{room.category.emoji}</span>
                        )}
                        <span className="text-sm font-medium">
                          {room?.category?.name || "Not selected"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {room?.secret_word && room.state !== GameState.Selecting && !isPlayerChameleon && (
                    <div className="col-span-2 space-y-1">
                      <h4 className="text-xs sm:text-sm font-medium text-muted-foreground">Secret Word</h4>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-secondary/10 border border-secondary/20">
                          <span className="text-sm font-semibold tracking-wide">
                            {room.secret_word}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {room?.state === GameState.Lobby && currentPlayer?.is_host && (
              <div className="mt-4 text-center">
                <Button
                  onClick={handleStartGame}
                  disabled={!room.players.every(p => p.is_ready) || isStarting}
                  className="w-full max-w-xs"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Starting Game...
                    </>
                  ) : room.players.every(p => p.is_ready) 
                    ? "Start Game" 
                    : "Waiting for players to be ready..."}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


