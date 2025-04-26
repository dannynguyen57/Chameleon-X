import { useState, useMemo, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// import { useGame } from "@/contexts/GameContextProvider";
import { useGame } from '@/hooks/useGame';
import { useGameActions } from "@/hooks/useGameActions";
import { convertToExtendedRoom } from '@/lib/roomUtils';
import { transitionGameState } from '@/lib/gameLogic';
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
import { Check, Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote as VoteIcon, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, Crown, Eye, EyeOff, Timer, UserCircle2, ChevronDown, ChevronUp, Loader2, List, Info } from "lucide-react";

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
      'p-3 rounded-lg border text-sm',
      theme.bg, theme.border, theme.text, theme.shadow, theme.hover
    )}>
      <div className="flex items-center gap-1.5">
        <span className="text-lg">{theme.icon}</span>
        <span className="font-semibold">{config.name}</span>
      </div>
      <p className="mt-1.5 text-xs opacity-80">{config.description}</p>
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
  onDescriptionSubmit: (description: string) => Promise<void>;
  remainingTime: { isActive: boolean; timeLeft: number };
  formatTime: (seconds: number) => string;
}

const CurrentTurnCard: React.FC<CurrentTurnCardProps> = ({ 
  room, 
  currentPlayer, 
  onDescriptionSubmit, 
  remainingTime,
  formatTime
}) => {
  const { playerId } = useGame();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBlendingIn, setIsBlendingIn] = useState(false);
  const [isMimicking, setIsMimicking] = useState(false);
  const [isProtecting, setIsProtecting] = useState(false);
  const [isSwappingVotes, setIsSwappingVotes] = useState(false);
  const [isDoublingVote, setIsDoublingVote] = useState(false);
  const [targetPlayer, setTargetPlayer] = useState<string | null>(null);
  const [isActingSuspicious, setIsActingSuspicious] = useState(false);
  const [isGuiding, setIsGuiding] = useState(false);

  const { handleRoleAbility } = useGameActions(playerId, room ? convertToExtendedRoom(room) : null, room?.settings, () => {});
  const { theme } = getRoleStyle(currentPlayer.role);

  const isChameleon = currentPlayer.role === PlayerRole.Chameleon;
  const isMimic = currentPlayer.role === PlayerRole.Mimic;
  const isOracle = currentPlayer.role === PlayerRole.Oracle;
  const isJester = currentPlayer.role === PlayerRole.Jester;
  const isSpy = currentPlayer.role === PlayerRole.Spy;
  const isGuardian = currentPlayer.role === PlayerRole.Guardian;
  const isTrickster = currentPlayer.role === PlayerRole.Trickster;
  const isIllusionist = currentPlayer.role === PlayerRole.Illusionist;

  const currentTurnPlayer = room.players.find(p => p.id === room.turn_order?.[room.current_turn || 0]);
  const isCurrentPlayerTurn = currentPlayer.id === currentTurnPlayer?.id;

  useEffect(() => {
    console.log('CurrentTurnCard State:', {
      isCurrentPlayerTurn,
      descriptionLength: description.trim().length,
      canSubmit: description.trim() && isCurrentPlayerTurn,
      isSubmitting,
      playerId,
      currentTurnPlayerId: currentTurnPlayer?.id,
      roomTurn: room.current_turn,
      roomTurnOrder: room.turn_order
    });
  }, [isCurrentPlayerTurn, description, isSubmitting, playerId, currentTurnPlayer, room.current_turn, room.turn_order]);

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

  const handleSubmitDescription = async () => {
    if (!description.trim() || !isCurrentPlayerTurn || isSubmitting) {
      console.warn('Submit blocked:', { description: description.trim(), isCurrentPlayerTurn, isSubmitting });
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onDescriptionSubmit(description);
      setDescription('');
    } catch (error) {
      console.error("Error submitting description:", error);
      toast.error("Failed to submit description.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipTurn = async () => {
    if (isCurrentPlayerTurn && !isSubmitting) {
      setIsSubmitting(true);
      try {
        await onDescriptionSubmit("skip");
        toast.success("Turn skipped successfully");
      } catch (error) {
        console.error('Error skipping turn:', error);
        toast.error("Failed to skip turn. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <motion.div 
      className="w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-amber-500/20 shadow-xl bg-green-950/70 backdrop-blur-lg overflow-hidden">
        <CardHeader className="p-4 sm:p-6 bg-gradient-to-b from-amber-900/30 to-transparent border-b border-amber-500/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="relative p-2 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/20 shadow-inner">
                <Clock className="w-6 h-6 text-amber-200" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-300 to-amber-500">
                  {isCurrentPlayerTurn ? "Your Turn!" : `${currentTurnPlayer?.name}'s Turn`}
                </span>
                <p className="text-sm sm:text-base text-amber-200/80">
                  {isCurrentPlayerTurn 
                    ? "Describe the secret word creatively!"
                    : `Waiting for ${currentTurnPlayer?.name || 'player'} to describe...`}
                </p>
              </div>
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-lg sm:text-xl transition-all duration-300 px-4 py-1.5 rounded-full shadow-md",
                "border-2 border-amber-600/50 bg-amber-900/60 text-amber-200",
                remainingTime.isActive && remainingTime.timeLeft <= 10 
                  ? "text-red-400 border-red-500/50 animate-pulse"
                  : ""
              )}
            >
              <Timer className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 mr-2",
                remainingTime.isActive && remainingTime.timeLeft <= 10 ? "text-red-400" : "text-amber-300"
              )} />
              {formatTime(remainingTime.timeLeft)}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {isChameleon && (
              <Button 
                onClick={() => handleAbilityUse('blendIn')}
                disabled={isBlendingIn || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-green-500/20 bg-green-500/5",
                  "hover:border-green-500/30 hover:bg-green-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <ShieldCheck className="w-4 h-4 text-green-500" />
                Blend In
              </Button>
            )}
            {isMimic && (
              <Button 
                onClick={() => handleAbilityUse('mimic')}
                disabled={isMimicking || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-purple-500/20 bg-purple-500/5",
                  "hover:border-purple-500/30 hover:bg-purple-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <Laugh className="w-4 h-4 text-purple-500" />
                Mimic
              </Button>
            )}
            {isOracle && (
              <Button 
                onClick={() => handleAbilityUse('guide')}
                disabled={isGuiding || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-blue-500/20 bg-blue-500/5",
                  "hover:border-blue-500/30 hover:bg-blue-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <Lightbulb className="w-4 h-4 text-blue-500" />
                Guide
              </Button>
            )}
            {isJester && (
              <Button 
                onClick={() => handleAbilityUse('actSuspicious')}
                disabled={isActingSuspicious || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-yellow-500/20 bg-yellow-500/5",
                  "hover:border-yellow-500/30 hover:bg-yellow-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <Crown className="w-4 h-4 text-yellow-500" />
                Act Suspicious
              </Button>
            )}
            {isSpy && (
              <Button 
                onClick={() => handleAbilityUse('protect')}
                disabled={isProtecting || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-red-500/20 bg-red-500/5",
                  "hover:border-red-500/30 hover:bg-red-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <Shield className="w-4 h-4 text-red-500" />
                Protect Chameleon
              </Button>
            )}
            {isGuardian && (
              <Button 
                onClick={() => handleAbilityUse('protect')}
                disabled={isProtecting || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-indigo-500/20 bg-indigo-500/5",
                  "hover:border-indigo-500/30 hover:bg-indigo-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <Shield className="w-4 h-4 text-indigo-500" />
                Protect Player
              </Button>
            )}
            {isTrickster && (
              <Button 
                onClick={() => handleAbilityUse('swapVotes')}
                disabled={isSwappingVotes || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-pink-500/20 bg-pink-500/5",
                  "hover:border-pink-500/30 hover:bg-pink-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <Award className="w-4 h-4 text-pink-500" />
                Swap Votes
              </Button>
            )}
            {isIllusionist && (
              <Button 
                onClick={() => handleAbilityUse('doubleVote')}
                disabled={isDoublingVote || currentPlayer.special_ability_used}
                className={cn(
                  "flex items-center gap-2",
                  "border-2",
                  "border-cyan-500/20 bg-cyan-500/5",
                  "hover:border-cyan-500/30 hover:bg-cyan-500/10",
                  "transition-all duration-200",
                  "hover:shadow-md"
                )}
                variant="secondary"
              >
                <EyeOff className="w-4 h-4 text-cyan-500" />
                Double Vote
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2 text-green-200">
              <Shield className="w-4 h-4 text-green-300" />
              Secret Word
            </h4>
            <div className={cn(
              "relative p-6 rounded-lg transition-all duration-200 border-2 hover:shadow-xl",
              isChameleon
                ? "bg-gradient-to-br from-red-800/20 to-red-950/30 border-red-500/30"
                : "bg-gradient-to-br from-green-800/20 to-green-950/30 border-green-500/30"
            )}>
              {isChameleon ? (
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <motion.div 
                    animate={{ opacity: [0.5, 1, 0.5] }} 
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-4xl font-bold tracking-widest text-red-400/60 filter blur-[2px]"
                  >
                    ??????
                  </motion.div>
                  <p className="text-sm text-red-200/80">
                    You are the <strong className="text-red-300">Chameleon</strong>! Blend in with your description.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 text-center">
                  <div className="text-4xl font-bold tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-green-300 to-teal-300">
                    {room.secret_word}
                  </div>
                  <p className="text-sm text-green-200/80">
                    Describe this word <strong className="text-green-100">without</strong> saying it directly!
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2 text-green-200">
                <MessageSquare className="w-4 h-4 text-green-300" />
                Your Clue
              </Label>
              <span className="text-xs text-green-300/70">
                {description.length}/200 characters
              </span>
            </div>
            <div className="relative">
              <Textarea
                id="description"
                value={description}
                onChange={(e) => !isSubmitting && setDescription(e.target.value.slice(0, 200))}
                placeholder={isChameleon ? "Craft your description carefully..." : "Give a clue about the secret word..."}
                disabled={!isCurrentPlayerTurn || isSubmitting}
                className={cn(
                  "min-h-[100px] sm:min-h-[120px] resize-none transition-all duration-200 text-base rounded-lg",
                  "border-2 border-green-700/50 bg-green-950/60 placeholder:text-green-300/50 text-green-100",
                  "focus:border-teal-500 focus:ring-2 focus:ring-teal-500/30 focus:bg-green-950/80",
                  !isCurrentPlayerTurn ? "opacity-60 cursor-not-allowed" : "hover:border-green-600/70"
                )}
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleSubmitDescription}
              disabled={!description.trim() || !isCurrentPlayerTurn || isSubmitting}
              size="lg"
              className={cn(
                "flex-1 transition-all duration-300 ease-in-out transform font-semibold text-sm sm:text-base py-3",
                (!description.trim() || !isCurrentPlayerTurn || isSubmitting)
                  ? "bg-gray-700 text-gray-400 cursor-not-allowed shadow-inner"
                  : "bg-gradient-to-r from-teal-500 to-green-500 hover:from-teal-600 hover:to-green-600 text-white shadow-lg hover:scale-[1.02] active:scale-95"
              )}
            >
              {isSubmitting && !description.includes("skip") ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
              ) : (
                <CheckCircle className="w-5 h-5 mr-2" />
              )}
              {isSubmitting && !description.includes("skip") ? "Submitting..." : "Submit Clue"}
            </Button>
            <Button 
              onClick={handleSkipTurn}
              variant="outline"
              size="lg"
              disabled={!isCurrentPlayerTurn || isSubmitting}
              className={cn(
                "transition-all duration-200 font-medium sm:flex-none py-4",
                "border-2 border-amber-600/50 bg-amber-900/40 hover:bg-amber-800/50 text-amber-200",
                "hover:border-amber-500/70 hover:shadow-md active:scale-95",
                (!isCurrentPlayerTurn || isSubmitting) ? "opacity-50 cursor-not-allowed" : ""
              )}
            >
              {isSubmitting && description === "skip" ? (
                 <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
              ) : (
                 <XCircle className="w-5 h-5 mr-2" /> 
              )}
               {isSubmitting && description === "skip" ? "Skipping..." : "Skip Turn"}
            </Button>
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
  // During results phase, only show role to the current player
  if (room.state === GameState.Results) {
    return playerId === currentPlayerId;
  }
  
  // During other phases, show role to the player themselves
  return playerId === currentPlayerId;
};

// Define a local interface for vote objects to avoid type conflicts
interface VoteObject {
  id: string;
  round_id: string;
  voter_id: string;
  target_id: string;
  created_at: string;
}

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame, startGame } = useGame();
  const { submitWord, submitVote, resetGame: resetGameAction, prepareNextPresentingPhase } = useGameActions(playerId, room ? convertToExtendedRoom(room) : null, settings, setRoom);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [isPlayersPanelOpen, setIsPlayersPanelOpen] = useState(false);
  const [isRolePanelOpen, setIsRolePanelOpen] = useState(false);
  
  // Combine derived and local state for immediate feedback
  const [localHasVoted, setLocalHasVoted] = useState(false);
  const actualHasVoted = room?.current_voting_round?.votes?.some(vote => vote.voter_id === playerId) || false;
  const displayHasVoted = localHasVoted || actualHasVoted;
  
  // Reset local state if the actual state changes (e.g., new round)
  useEffect(() => {
    setLocalHasVoted(actualHasVoted);
  }, [actualHasVoted]);

  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'false';
  const [isGameInfoOpen, setIsGameInfoOpen] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false); // Renamed for clarity

  const truncateName = (name: string, maxLength: number = 12) => {
    if (name.length <= maxLength) return name;
    return name.slice(0, maxLength) + '...';
  };

  // Add loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If room exists and is in a valid game state (not just Presenting/Lobby)
    if (room && room.state) { 
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
        <p className="text-muted-foreground">Player session expired or disconnected.</p>
        <Button onClick={() => window.location.reload()}>Reconnect</Button>
      </div>
    );
  }

  const currentTurnPlayer = room.players.find(p => p.id === room.turn_order?.[room.current_turn || 0]);
  if (!currentTurnPlayer) {
    // Handle missing turn player
    console.error('Turn player not found:', {
      currentTurn: room.current_turn,
      turnOrder: room.turn_order,
      players: room.players.map(p => ({ id: p.id, name: p.name }))
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-muted-foreground">Syncing game state...</p>
        <Button onClick={() => window.location.reload()}>Refresh</Button>
      </div>
    );
  }

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

  const handleVote = async () => { // Make async
    if (selectedVote && room && !isSubmittingVote) {
      setIsSubmittingVote(true);
      try {
        await submitVote(selectedVote);
        setLocalHasVoted(true); // Set local state immediately for UI feedback
        // No need to manually update room here, rely on subscription/context
      } catch (error) {
        // Handle potential error, maybe reset local state?
        console.error("Vote submission error:", error);
        // setLocalHasVoted(false); // Optional: reset on error
      } finally {
        setIsSubmittingVote(false);
      }
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

  const handleNextRound = async () => {
    if (!room) return;
    try {
      await transitionGameState(room.id, room.state, playerId, room.settings);
    } catch (error) {
      console.error('Error transitioning to next round:', error);
      toast.error('Failed to start next round. Please try again.');
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
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto p-0 space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          <div className="lg:col-span-3 space-y-4">
            <Card className="border border-green-700/30 shadow-md bg-green-950/60 backdrop-blur-sm">
              <CardHeader className="p-3 sm:p-4 border-b border-green-700/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-200">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                    Players
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-green-300 hover:bg-green-800/50 h-7 w-7"
                    onClick={() => setIsPlayersPanelOpen(!isPlayersPanelOpen)}
                  >
                    {isPlayersPanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <AnimatePresence>
                {(isPlayersPanelOpen || window.innerWidth >= 1024) && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <CardContent className="p-3 sm:p-4">
                        <div className="space-y-2">
                          {room.players.map((player) => (
                            <motion.div
                              key={player.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.2 }}
                              className={cn(
                                "flex items-center justify-between p-2 rounded-md transition-colors duration-200",
                                player.id === currentTurnPlayer?.id ? "bg-amber-500/10" : "",
                                player.id === playerId ? "ring-1 ring-teal-400/50 bg-teal-900/20" : "hover:bg-green-800/40"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className="relative flex-shrink-0">
                                  <Avatar className="h-8 w-8 border border-green-600/50">
                                    <AvatarImage 
                                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}&backgroundColor=b6e3f4,c0aede,d1f4dd,ffd5dc,ffdfbf`}
                                      alt={player.name}
                                    />
                                    <AvatarFallback className="bg-green-800 text-green-200 text-xs">
                                      {player.name[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  {player.id === currentTurnPlayer?.id && (
                                      <motion.div 
                                        className="absolute -top-1 -right-1 p-0.5 bg-amber-500 rounded-full shadow-md"
                                        animate={{ scale: [1, 1.2, 1]}} transition={{ repeat: Infinity, duration: 1.5}}
                                      >
                                        <Clock className="h-2.5 w-2.5 text-white" />
                                      </motion.div>
                                  )}
                                  {player.id === playerId && (
                                    <div className="absolute -bottom-1 -right-1 bg-teal-500 text-white rounded-full p-0.5">
                                      <UserCircle2 className="h-2.5 w-2.5" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium text-green-100 truncate max-w-[100px] sm:max-w-[120px]">{player.name}</span>
                                  {shouldShowRole(room, player.id, currentPlayer?.id) && player.role && (
                                    <span className="text-xs text-green-300/70">
                                      {player.role}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-xs bg-green-800/70 text-green-200 border-green-600/40">{player.score || 0} pts</Badge>
                            </motion.div>
                          ))}
                        </div>
                      </CardContent>
                   </motion.div>
                )}
               </AnimatePresence>
            </Card>

            <Card className="border border-green-700/30 shadow-md bg-green-950/60 backdrop-blur-sm">
              <CardHeader className="p-3 sm:p-4 border-b border-green-700/20">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-200">
                    <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                    Your Role
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden text-green-300 hover:bg-green-800/50 h-7 w-7"
                    onClick={() => setIsRolePanelOpen(!isRolePanelOpen)}
                  >
                    {isRolePanelOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
              </CardHeader>
              <AnimatePresence>
                {(isRolePanelOpen || window.innerWidth >= 1024) && (
                     <motion.div
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       transition={{ duration: 0.3 }}
                       style={{ overflow: 'hidden' }}
                     >
                       <CardContent className="p-3 sm:p-4">
                         <PlayerRoleDisplay player={currentPlayer} />
                         <p className="mt-3 text-xs sm:text-sm text-green-300/80 italic">
                           {getRoleTips(currentPlayer.role)}
                         </p>
                       </CardContent>
                    </motion.div>
                 )}
                </AnimatePresence>
             </Card>

            <Card className="border border-green-700/30 shadow-md bg-green-950/60 backdrop-blur-sm">
               <CardHeader className="p-3 sm:p-4 border-b border-green-700/20">
                  <div className="flex items-center justify-between">
                   <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-200">
                     <Info className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                     Game Info
                   </CardTitle>
                   <Button
                     variant="ghost"
                     size="icon"
                     className="lg:hidden text-green-300 hover:bg-green-800/50 h-7 w-7"
                     onClick={() => setIsGameInfoOpen(!isGameInfoOpen)}
                   >
                     {isGameInfoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                   </Button>
                 </div>
               </CardHeader>
               <AnimatePresence>
                {(isGameInfoOpen || window.innerWidth >= 1024) && (
                   <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                   >
                      <CardContent className="p-3 sm:p-4 space-y-3">
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-green-300/80">Round:</span>
                           <Badge variant="secondary" className="bg-green-800/70 text-green-200 border-green-600/40">
                              {room?.round || 1} / {room?.max_rounds || 3}
                           </Badge>
                         </div>
                         <div className="flex items-center justify-between text-sm">
                           <span className="text-green-300/80">Category:</span>
                           <Badge variant="secondary" className="bg-green-800/70 text-green-200 border-green-600/40 flex items-center gap-1">
                              {room?.category?.emoji && <span className="text-base">{room.category.emoji}</span>}
                              {room?.category?.name || "N/A"}
                           </Badge>
                         </div>
                      </CardContent>
                    </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </div>

          <div className="lg:col-span-6 space-y-4 sm:space-y-6">
            <AnimatePresence mode="sync">
              {room.state === GameState.Presenting && (
                 <motion.div
                  key="presenting-card"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {isCurrentPlayerTurn ? (
                    <CurrentTurnCard
                      room={room}
                      currentPlayer={currentPlayer}
                      onDescriptionSubmit={submitWord}
                      remainingTime={remainingTime}
                      formatTime={formatTime}
                    />
                  ) : (
                    <Card className="border-2 border-amber-500/20 shadow-lg bg-green-950/70 backdrop-blur-lg overflow-hidden">
                      <CardHeader className="p-4 sm:p-6">
                         <CardTitle className="flex items-center justify-center gap-2 text-amber-200">
                           <Clock className="w-5 h-5 text-amber-300" />
                           Waiting for {currentTurnPlayer?.name}'s Turn
                         </CardTitle>
                      </CardHeader>
                      <CardContent className="text-center py-8 px-4">
                         <motion.div 
                          animate={{ scale: [1, 1.1, 1]}} 
                          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut"}}
                          className="inline-block mb-4"
                         >
                            <Avatar className="h-20 w-20 border-4 border-amber-500/30 shadow-lg">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${currentTurnPlayer?.name}`} />
                              <AvatarFallback>{currentTurnPlayer?.name?.[0]}</AvatarFallback>
                            </Avatar>
                          </motion.div>
                        <p className="text-amber-200/80">
                          {currentTurnPlayer?.name} is thinking of a clue...
                        </p>
                        <Loader2 className="h-5 w-5 text-amber-300/70 animate-spin mt-4 mx-auto" />
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}

              {room.state === GameState.Presenting && (
                 <motion.div
                  key="submitted-words"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  exit={{ opacity: 0 }}
                >
                  <Card className="border border-green-700/30 shadow-md bg-green-950/60 backdrop-blur-sm">
                    <CardHeader className="p-3 sm:p-4 border-b border-green-700/20">
                      <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-200">
                        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                        Submitted Clues
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4">
                      <AnimatePresence>
                        {room.players
                          .filter(p => p.turn_description)
                          .length > 0 ? (
                            <motion.div layout className="grid gap-3">
                              {room.players
                                .filter(p => p.turn_description)
                                .map((player) => (
                                  <motion.div
                                    key={player.id}
                                    layout
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    transition={{ duration: 0.3 }}
                                    className={cn(
                                      "p-3 rounded-md border flex items-start gap-3",
                                      player.id === playerId ? "border-teal-500/40 bg-teal-900/20" : "border-green-800/50 bg-green-950/40"
                                    )}
                                  >
                                    <Avatar className="h-8 w-8 flex-shrink-0 mt-0.5">
                                      <AvatarImage 
                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`}
                                        alt={player.name}
                                      />
                                      <AvatarFallback className="text-xs">{player.name[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <p className="font-medium text-sm text-green-100">{player.name}</p>
                                        {player.id === playerId && (
                                          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-teal-500/20 text-teal-200 border-teal-500/30">You</Badge>
                                        )}
                                      </div>
                                      <p className="text-base text-green-200/90">
                                        "{player.turn_description}"
                                      </p>
                                    </div>
                                    <CheckCircle className="h-4 w-4 text-green-400/70 mt-1 flex-shrink-0" />
                                  </motion.div>
                                ))}
                             </motion.div>
                          ) : (
                            <p className="text-center text-sm text-green-300/70 py-4">No clues submitted yet...</p>
                          )
                        }
                        </AnimatePresence>
                        {room.players.filter(p => !p.turn_description).length > 0 && (
                          <div className="text-center text-xs text-green-300/60 mt-3">
                            Waiting for {room.players.filter(p => !p.turn_description).length} more players...
                          </div>
                        )}
                    </CardContent>
                  </Card>
                 </motion.div>
              )}

              {room.state === GameState.Discussion && (
                 <motion.div
                  key="discussion"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1}}
                  exit={{ opacity: 0 }}
                  className="flex flex-col gap-4 sm:gap-6 min-h-[60vh]"
                >
                 <Card className="border border-green-700/30 shadow-md bg-green-950/60 backdrop-blur-sm">
                     <CardHeader className="p-3 sm:p-4 border-b border-green-700/20">
                       <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-200">
                         <List className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                         Player Clues
                       </CardTitle>
                     </CardHeader>
                     <CardContent className="p-3 sm:p-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {room.players.map((player) => (
                          <Card key={player.id} className="p-3 bg-green-900/40 border border-green-700/40">
                            <div className="flex items-center gap-2">
                              <Avatar className="flex-shrink-0 h-8 w-8">
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                <AvatarFallback className="text-xs">{player.name[0]}</AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-sm text-green-100 truncate" title={player.name}>
                                  {player.name}
                                </h3>
                                <p className="text-xs text-green-300/80 truncate">
                                  {player.turn_description || "-"}
                                </p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                     </CardContent>
                   </Card>
                   <Card className="border border-green-700/30 shadow-md bg-green-950/60 backdrop-blur-sm flex-grow flex flex-col">
                     <CardHeader className="p-3 sm:p-4 border-b border-green-700/20 flex flex-row items-center justify-between">
                       <CardTitle className="flex items-center gap-2 text-base sm:text-lg text-green-200">
                         <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-green-300" />
                         Discussion Chat
                       </CardTitle>
                       <Badge 
                         variant="outline" 
                         className={cn(
                           "text-sm transition-all duration-300 px-3 py-1 rounded-full shadow-md",
                           "border-2 border-yellow-600/50 bg-yellow-900/60 text-yellow-200",
                           remainingTime.isActive && remainingTime.timeLeft <= 10 
                             ? "text-red-400 border-red-500/50 animate-pulse"
                             : ""
                         )}
                       >
                         <Clock className={cn(
                           "w-3 h-3 sm:w-4 sm:h-4 mr-1.5",
                           remainingTime.isActive && remainingTime.timeLeft <= 10 ? "text-red-400" : "text-yellow-300"
                         )} />
                         {formatTime(remainingTime.timeLeft)}
                       </Badge>
                     </CardHeader>
                     <CardContent className="p-0 flex-grow overflow-hidden h-[50vh] sm:h-[60vh] max-h-[600px]">
                       <ChatSystem key={`chat-${room.id}-${room.round}-${room.state}`} />
                     </CardContent>
                   </Card>
                </motion.div>
              )}

              {room.state === GameState.Voting && (
                <motion.div
                  key="voting"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4 sm:space-y-6"
                >
                  <Card className="border-2 border-purple-500/20 shadow-xl bg-green-950/70 backdrop-blur-lg overflow-hidden">
                    <CardHeader className="p-4 sm:p-6 bg-gradient-to-b from-purple-900/30 to-transparent border-b border-purple-500/10">
                      <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2 text-purple-200">
                        <VoteIcon className="w-6 text-purple-300" />
                         Vote for the Chameleon!
                       </CardTitle>
                      <CardDescription className="text-purple-300/80 pt-1">
                        {displayHasVoted 
                          ? "Vote cast! Waiting for others..." 
                          : "Carefully consider the clues and cast your vote!"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                       <div className="relative">
                         <div className="flex items-center justify-between mb-2">
                           <span className="text-sm text-purple-200/80">
                             Voting Progress
                           </span>
                           <Badge variant="secondary" className="bg-purple-500/20 border border-purple-500/30 text-purple-200">
                             {room.current_voting_round?.votes?.length || 0} / {room.players.length} votes
                           </Badge>
                         </div>
                         <div className="w-full h-3 bg-green-900/50 rounded-full overflow-hidden border border-purple-500/20">
                           <motion.div
                             className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500 ease-out"
                             initial={{ width: "0%" }}
                             animate={{ 
                               width: `${((room.current_voting_round?.votes?.length || 0) / room.players.length) * 100}%` 
                             }}
                           />
                         </div>
                         <div className="mt-1 text-xs text-purple-300/70 text-right">
                           {remainingTime.timeLeft > 0 && (
                             <span>{formatTime(remainingTime.timeLeft)}</span>
                           )}
                         </div>
                       </div>

                       {/* Show all players, adjust styling based on vote status */}
                       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                         {room.players
                           .filter(player => player.id !== playerId) // Always filter self
                           .map((player) => {
                             const voteCount = room.current_voting_round?.votes?.filter(vote => vote.target_id === player.id).length || 0;
                             // Determine if this player is the one the current user voted for (from actual room data)
                             const votedForByCurrentUser = actualHasVoted && room.current_voting_round?.votes?.find(vote => vote.voter_id === playerId)?.target_id === player.id;
                             // Is this the player currently selected in the UI (before vote confirmed)?
                             const isSelectedInUI = selectedVote === player.id;
                             
                             return (
                               <motion.div
                                 key={player.id}
                                 initial={{ opacity: 0, scale: 0.95 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 transition={{ duration: 0.3 }}
                                 className={cn(
                                    "relative", // Needed for absolute positioning of overlays/badges
                                    displayHasVoted && !votedForByCurrentUser ? "opacity-60 pointer-events-none" : ""
                                 )}
                               >
                                 <Card
                                   className={cn(
                                     "p-4 transition-all duration-200 overflow-hidden transform",
                                     "bg-green-900/40 border border-green-700/40", // Default state
                                     !displayHasVoted && "cursor-pointer hover:border-purple-500/70 hover:shadow-md hover:scale-[1.03]", // Hover state when voting active
                                     isSelectedInUI && !displayHasVoted && "border-purple-400 ring-2 ring-purple-400 ring-offset-2 ring-offset-green-950 scale-105 shadow-lg bg-gradient-to-br from-purple-600/30 to-purple-800/40", // Selected state
                                     votedForByCurrentUser && "border-purple-500 bg-purple-500/10 ring-1 ring-purple-400 scale-105 shadow-md", // Voted-for state
                                   )}
                                   // Only allow selection if the user hasn't voted yet
                                   onClick={() => !displayHasVoted && setSelectedVote(player.id)}
                                 >
                                   {/* Vote Count Badge (Always visible if votes > 0) */}
                                   {voteCount > 0 && (
                                     <motion.div
                                       initial={{ opacity: 0, y: -10 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       className="absolute top-2 right-2 z-10"
                                     >
                                       <Badge 
                                         variant="secondary"
                                         className="bg-purple-500/30 border border-purple-500/50 text-purple-100 font-semibold shadow-sm"
                                       >
                                         {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
                                       </Badge>
                                     </motion.div>
                                   )}

                                   {/* "Your Vote" Badge (Only if this player was voted for) */}
                                   {votedForByCurrentUser && (
                                     <motion.div
                                       initial={{ opacity: 0, x: -10 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       className="absolute top-2 left-2 z-10"
                                     >
                                       <Badge variant="outline" className="bg-purple-500/80 border border-purple-300 text-white text-xs px-1.5 py-0.5 shadow font-semibold">
                                         Your Vote
                                       </Badge>
                                     </motion.div>
                                   )}

                                   <div className="flex items-center gap-3 relative z-0"> {/* Ensure content is above potential overlays */}
                                     <Avatar className="h-12 w-12 border border-green-600/50">
                                       <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                       <AvatarFallback>{player.name[0]}</AvatarFallback>
                                     </Avatar>
                                     <div className="flex-1 min-w-0">
                                       <h3 className="font-semibold truncate text-green-100" title={player.name}>
                                         {truncateName(player.name)}
                                       </h3>
                                       <p className="text-sm text-green-300/70 truncate">
                                         {player.turn_description || "No description given"}
                                       </p>
                                     </div>
                                   </div>

                                   {/* Visual overlay/indicator when selected but not yet voted */}
                                   {isSelectedInUI && !displayHasVoted && (
                                     <motion.div
                                       initial={{ opacity: 0 }}
                                       animate={{ opacity: 1 }}
                                       className="absolute inset-0 bg-purple-500/10 flex items-center justify-center pointer-events-none rounded-lg border-2 border-purple-400"
                                     >
                                       <Badge variant="secondary" className="bg-purple-500/80 text-white font-semibold px-3 py-1 text-sm shadow-lg">
                                         Select
                                       </Badge>
                                     </motion.div>
                                   )}
                                 </Card>
                               </motion.div>
                             );
                           })}
                       </div>

                       {/* Confirm Vote Button */}
                       {!displayHasVoted && (
                         <motion.div
                           initial={{ opacity: 0, y: 10 }}
                           animate={{ opacity: 1, y: 0 }}
                           className="flex justify-center pt-4"
                         >
                           <Button
                             className="w-full max-w-md transition-all duration-300 ease-in-out transform bg-gradient-to-r from-purple-500 to-fuchsia-500 hover:from-purple-600 hover:to-fuchsia-600 text-white font-semibold shadow-lg hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
                             onClick={handleVote}
                             size="lg"
                             disabled={!selectedVote || isSubmittingVote}
                           >
                              {isSubmittingVote ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 
                              ) : (
                                <VoteIcon className="w-5 h-5 mr-2" />
                              )}
                              {isSubmittingVote ? "Voting..." : "Confirm Vote"}
                           </Button>
                         </motion.div>
                       )}

                       {/* Waiting State */}
                       {displayHasVoted && (
                         <motion.div
                           initial={{ opacity: 0 }}
                           animate={{ opacity: 1 }}
                           className="text-center space-y-4 pt-6"
                         >
                           <div className="flex items-center justify-center gap-2 text-purple-300">
                             <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-300 border-t-transparent" />
                             <p className="font-medium">Waiting for other players to vote...</p>
                           </div>
                           <p className="text-sm text-purple-300/70">
                             {room.players.length - (room.current_voting_round?.votes?.length || 0)} players remaining
                           </p>
                         </motion.div>
                       )}
                     </CardContent>
                   </Card>
                </motion.div>
              )}

              {room.state === GameState.Results && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1}}
                  exit={{ opacity: 0 }}
                >
                  <ResultsDisplay 
                    room={room} 
                    playerId={playerId}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

PlayerRoleDisplay.displayName = 'PlayerRoleDisplay';


