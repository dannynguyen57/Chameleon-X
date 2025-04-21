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
import { Check, Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, Crown, Eye, EyeOff, Timer } from "lucide-react";

import ChatSystem from "./ChatSystem";
import DevModeSetup from '@/components/dev/DevModeSetup';
import GameHeader from './GameHeader';
import ResultsDisplay from './ResultsDisplay';
import { toast } from "@/components/ui/use-toast";

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
  const [description, setDescription] = useState('');
  const [isWordVisible, setIsWordVisible] = useState(false);
  const [isBlendingIn, setIsBlendingIn] = useState(false);
  const [isMimicking, setIsMimicking] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const [isSwappingVotes, setIsSwappingVotes] = useState(false);
  const [isDoublingVote, setIsDoublingVote] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [isViewingRoles, setIsViewingRoles] = useState(false);
  const [isActingSuspicious, setIsActingSuspicious] = useState(false);
  const [isGuiding, setIsGuiding] = useState(false);

  const { handleRoleAbility } = useGameActions(currentPlayer.id, room, room.settings, () => {});

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
      case 'viewRoles':
        setIsViewingRoles(true);
        await handleRoleAbility();
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
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg">
                {/* Time Left: {room.timer}s */}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* Role Abilities Section */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {isChameleon && (
              <>
                <Button 
                  onClick={() => handleAbilityUse('blendIn')}
                  disabled={isBlendingIn || currentPlayer.special_ability_used}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Blend In
                </Button>
                <Button 
                  onClick={() => handleAbilityUse('viewRoles')}
                  disabled={isViewingRoles || currentPlayer.special_ability_used}
                  className="flex items-center gap-2"
                  variant="secondary"
                >
                  <Eye className="w-4 h-4" />
                  View Roles
                </Button>
              </>
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
                    {player.name}
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
              <Label htmlFor="description">Your Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter your description..."
                disabled={!isWordVisible && !isChameleon}
                className="min-h-[100px]"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSubmitDescription}
                disabled={!description.trim() || !isCurrentPlayerTurn}
                className="flex-1"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Submit Description
              </Button>
              <Button 
                onClick={onSkipTurn}
                variant="outline"
                disabled={!isCurrentPlayerTurn}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Skip Turn
              </Button>
            </div>
          </div>

          {/* Role View */}
          {isViewingRoles && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                Player Roles
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {room.players.map((player: Player) => (
                  <div 
                    key={player.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted"
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                      <AvatarFallback>{player.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{player.name}</p>
                      <p className="text-xs text-muted-foreground">{player.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Add these new components at the top level
const GamePhaseIndicator = ({ room }: { room: GameRoom }) => {
  const phases = [
    { 
      state: GameState.Presenting, 
      label: "Presenting", 
      icon: <MessageSquare className="w-4 h-4" />,
      description: "Players take turns describing the word"
    },
    { 
      state: GameState.Discussion, 
      label: "Discussion", 
      icon: <Users className="w-4 h-4" />,
      description: "Discuss and identify the Chameleon"
    },
    { 
      state: GameState.Voting, 
      label: "Voting", 
      icon: <Vote className="w-4 h-4" />,
      description: "Vote for who you think is the Chameleon"
    },
    { 
      state: GameState.Results, 
      label: "Results", 
      icon: <Trophy className="w-4 h-4" />,
      description: "See who won the round"
    }
  ];

  return (
    <div className="relative">
      <motion.div 
        className="flex flex-col gap-4 p-4 bg-background/50 backdrop-blur-sm rounded-lg border border-primary/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-center gap-2">
          {phases.map((phase, index) => (
            <motion.div
              key={phase.state}
              className={cn(
                "flex items-center gap-1 px-3 py-1 rounded-full transition-all duration-300",
                room.state === phase.state
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              )}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              {phase.icon}
              <span className="text-sm font-medium">{phase.label}</span>
            </motion.div>
          ))}
        </div>
        
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            {phases.find(p => p.state === room.state)?.description}
          </p>
        </div>
      </motion.div>
      
      {/* Transition Overlay */}
      <AnimatePresence>
        {room.state === GameState.Discussion && (
          <motion.div
            className="absolute inset-0 bg-primary/5 backdrop-blur-sm rounded-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame } = useGame();
  const { submitWord, submitVote, nextRound, resetGame: resetGameAction } = useGameActions(playerId, room, settings, setRoom);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const hasVoted = Boolean(room?.votes?.[playerId]);
  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'false';

  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  if (!room) return null;

  const currentPlayer = room.players.find((p: Player) => p.id === playerId);
  if (!currentPlayer) return null;

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
        />
        
        {/* Game Phase Indicator */}
        <GamePhaseIndicator room={room} />
        
        <div className="grid grid-cols-12 gap-4">
          {/* Left Column - Player Info */}
          <div className="col-span-12 lg:col-span-3 space-y-4">
            <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {room?.players.map((player) => (
                    <div
                      key={player.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg",
                        player.id === playerId ? "bg-primary/10" : "bg-muted/50"
                      )}
                    >
                      <Avatar className="flex-shrink-0">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                        <AvatarFallback>{player.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium truncate" title={player.name}>
                            {truncateName(player.name)}
                          </span>
                          {player.id === playerId && (
                            <Badge variant="outline" className="flex-shrink-0">You</Badge>
                          )}
                        </div>
                        {player.turn_description && (
                          <p className="text-sm text-muted-foreground mt-1 truncate">
                            {player.turn_description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
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
            <AnimatePresence mode="sync">
              {/* Description Input */}
              {room?.state === GameState.Presenting && (
                <motion.div
                  key="description"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <CurrentTurnCard
                    room={room}
                    currentPlayer={currentPlayer}
                    onDescriptionSubmit={submitWord}
                    onSkipTurn={() => {}}
                  />
                </motion.div>
              )}

              {/* Discussion Phase UI */}
              {room?.state === GameState.Discussion && (
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
              {room?.state === GameState.Voting && (
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
              {room?.state === GameState.Results && (
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
                        toast({
                          title: "Final Scores",
                          description: (
                            <div className="space-y-2">
                              {sortedPlayers.map(([id, { name, score, role }]) => (
                                <div key={id} className="flex justify-between items-center">
                                  <span className="font-medium">{name}</span>
                                  <span className="text-muted-foreground">
                                    {score} points
                                    {role && ` (${role})`}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ),
                          duration: 10000
                        });

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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="w-5 h-5" />
                  Game Info
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Round</h4>
                    <p className="text-2xl font-bold">{room?.round || 1} / {room?.max_rounds || 3}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Time Remaining</h4>
                    <div className="flex items-center justify-center gap-2">
                      <Timer className="w-5 h-5 text-primary" />
                      <span className="text-lg font-semibold">
                        {formatTime(room.timer || 0)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                    <p className="text-lg font-semibold">
                      {room?.category?.name || "Not selected"}
                    </p>
                    {room?.category?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {/* {room.category.description} */}
                      </p>
                    )}
                  </div>
                  {room?.secret_word && room.state !== GameState.Selecting && !isPlayerChameleon && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Secret Word</h4>
                      <Badge variant="secondary" className="text-lg font-semibold px-3 py-1">
                        {room.secret_word}
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

