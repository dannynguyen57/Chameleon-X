import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, HelpCircle, AlertTriangle, Info, BookOpen } from "lucide-react";
import { categories, WordCategory } from "@/lib/word-categories";
import ChatSystem from "./ChatSystem";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useGameSounds } from "@/hooks/useGameSounds";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { PlayerRole, Player, GameState } from "@/lib/types";
import { useGameActions } from "@/hooks/useGameActions";
import { toast } from "@/components/ui/use-toast";
import { Room } from '@/types/Room';
import DevMode from '@/components/dev/DevMode';
import DevModeSetup from '@/components/dev/DevModeSetup';
import { getRoleTheme, getRoleDescription } from '@/lib/roleThemes';
import { isImposter } from '@/lib/gameLogic';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { GameTutorial } from "./GameTutorial";
import { getRoleTip } from '@/lib/game-helpers';

const roleConfig: Record<PlayerRole, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  name: string;
}> = {
  [PlayerRole.Regular]: {
    bg: 'bg-gradient-to-br from-blue-900/50 to-blue-800/30',
    border: 'border-blue-500/50',
    text: 'text-blue-200',
    icon: '👤',
    name: 'Regular'
  },
  [PlayerRole.Chameleon]: {
    bg: 'bg-gradient-to-br from-red-900/50 to-red-800/30',
    border: 'border-red-500/50',
    text: 'text-red-200',
    icon: '🦎',
    name: 'Chameleon'
  },
  [PlayerRole.Mimic]: {
    bg: 'bg-gradient-to-br from-orange-900/50 to-orange-800/30',
    border: 'border-orange-500/50',
    text: 'text-orange-200',
    icon: '🎭',
    name: 'Mimic'
  },
  [PlayerRole.Oracle]: {
    bg: 'bg-gradient-to-br from-purple-900/50 to-purple-800/30',
    border: 'border-purple-500/50',
    text: 'text-purple-200',
    icon: '🔮',
    name: 'Oracle'
  },
  [PlayerRole.Jester]: {
    bg: 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/30',
    border: 'border-yellow-500/50',
    text: 'text-yellow-200',
    icon: '🤡',
    name: 'Jester'
  },
  [PlayerRole.Spy]: {
    bg: 'bg-gradient-to-br from-gray-900/50 to-gray-800/30',
    border: 'border-gray-500/50',
    text: 'text-gray-200',
    icon: '🕵️',
    name: 'Spy'
  },
  [PlayerRole.Mirror]: {
    bg: 'bg-gradient-to-br from-cyan-900/50 to-cyan-800/30',
    border: 'border-cyan-500/50',
    text: 'text-cyan-200',
    icon: '🪞',
    name: 'Mirror'
  },
  [PlayerRole.Whisperer]: {
    bg: 'bg-gradient-to-br from-pink-900/50 to-pink-800/30',
    border: 'border-pink-500/50',
    text: 'text-pink-200',
    icon: '🤫',
    name: 'Whisperer'
  },
  [PlayerRole.Timekeeper]: {
    bg: 'bg-gradient-to-br from-amber-900/50 to-amber-800/30',
    border: 'border-amber-500/50',
    text: 'text-amber-200',
    icon: '⌛',
    name: 'Timekeeper'
  },
  [PlayerRole.Illusionist]: {
    bg: 'bg-gradient-to-br from-indigo-900/50 to-indigo-800/30',
    border: 'border-indigo-500/50',
    text: 'text-indigo-200',
    icon: '🎩',
    name: 'Illusionist'
  },
  [PlayerRole.Guardian]: {
    bg: 'bg-gradient-to-br from-green-900/50 to-green-800/30',
    border: 'border-green-500/50',
    text: 'text-green-200',
    icon: '🛡️',
    name: 'Guardian'
  },
  [PlayerRole.Trickster]: {
    bg: 'bg-gradient-to-br from-rose-900/50 to-rose-800/30',
    border: 'border-rose-500/50',
    text: 'text-rose-200',
    icon: '🃏',
    name: 'Trickster'
  }
} as const;

type PlayerRoleDisplayProps = {
  player: Player & { is_investigated?: boolean };
  isTurn: boolean;
  onProtect?: () => void;
  onInvestigate?: () => void;
};

const PlayerRoleDisplay = ({ player, isTurn, onProtect, onInvestigate }: PlayerRoleDisplayProps) => {
  const { playerId } = useGame();
  const isCurrentPlayer = player.id === playerId;
  const config = roleConfig[player.role || PlayerRole.Regular];

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        isCurrentPlayer ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-primary/50",
        isTurn && "animate-pulse"
      )}
    >
      <div className={cn(
        "absolute inset-0 opacity-20",
        config.bg
      )} />
      
      <CardHeader className="relative z-10 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              config.bg,
              "shadow-lg"
            )}>
              {config.icon}
            </div>
            <div>
              <CardTitle className={cn(
                "text-lg font-bold flex items-center gap-2",
                config.text
              )}>
                {player.name}
                {isCurrentPlayer && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
              </CardTitle>
              {isCurrentPlayer && (
                <CardDescription className={config.text}>
                  {getRoleDescription(player.role)}
                </CardDescription>
              )}
            </div>
          </div>
          {isTurn && (
            <Badge variant="secondary" className="animate-pulse">
              Current Turn
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="relative z-10 p-4">
        {isCurrentPlayer && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={cn("text-sm font-medium", config.text)}>
                {getRoleTip(player.role)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {player.is_protected && (
                <Badge variant="outline" className="bg-green-500/20 text-green-200 border-green-500/30">
                  Protected
                </Badge>
              )}
              {player.vote_multiplier && player.vote_multiplier !== 1 && (
                <Badge variant="outline" className="bg-purple-500/20 text-purple-200 border-purple-500/30">
                  Vote x{player.vote_multiplier}
                </Badge>
              )}
            </div>
          </div>
        )}
        
        {player.turn_description && (
          <div className="mt-3 p-2 rounded bg-black/20 border border-white/10">
            <p className={cn(
              "text-sm italic",
              isCurrentPlayer ? config.text : "text-white/80"
            )}>
              "{player.turn_description}"
            </p>
          </div>
        )}
      </CardContent>

      {isCurrentPlayer && (onProtect || onInvestigate) && (
        <CardFooter className="relative z-10 p-4 flex gap-2">
          {onProtect && (
            <Button
              variant="outline"
              size="sm"
              onClick={onProtect}
              className={cn(
                "bg-green-500/20 text-green-200 border-green-500/30",
                "hover:bg-green-500/30 transition-colors"
              )}
            >
              Protect
            </Button>
          )}
          {onInvestigate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onInvestigate}
              className={cn(
                "bg-blue-500/20 text-blue-200 border-blue-500/30",
                "hover:bg-blue-500/30 transition-colors"
              )}
            >
              Investigate
            </Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
};

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame } = useGame();
  const [isTurnDialogOpen, setIsTurnDialogOpen] = useState(false);
  const [turnDescription, setTurnDescription] = useState('');
  const [isDevModeOpen, setIsDevModeOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'true';
  useGameSounds();

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
    room: Room; 
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
                <AvatarImage 
                  src={`/avatars/${currentPlayer?.avatar_id || 1}.png`} 
                  alt={currentPlayer?.name || "Player"} 
                />
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

  const PlayerDescriptionsSection = ({ players }: { players: Player[] }) => {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Player Descriptions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(player => (
            <PlayerRoleDisplay
              key={player.id}
              player={player}
              isTurn={room?.current_turn !== undefined && room?.turn_order?.[room.current_turn] === player.id}
              onProtect={() => handleRoleAbility(player.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  const getPlayerById = (id: string): Player | undefined => {
    return room?.players.find(p => p.id === id);
  };

  const RoleAbilityFeedback = ({ player, room }: { player: Player; room: Room }) => {
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

  const GamePhaseIndicator = ({ room, remainingTime }: { room: Room; remainingTime: number | null }) => {
    const getPhaseColor = (phase: GameState) => {
      switch (phase) {
        case GameState.Lobby:
          return {
            bg: 'bg-gradient-to-br from-gray-900/60 to-gray-800/40',
            border: 'border-gray-500/60',
            text: 'text-gray-200',
            accent: 'bg-gray-500/30'
          };
        case GameState.Selecting:
          return {
            bg: 'bg-gradient-to-br from-blue-900/60 to-blue-800/40',
            border: 'border-blue-500/60',
            text: 'text-blue-200',
            accent: 'bg-blue-500/30'
          };
        case GameState.Presenting:
          return {
            bg: 'bg-gradient-to-br from-green-900/60 to-green-800/40',
            border: 'border-green-500/60',
            text: 'text-green-200',
            accent: 'bg-green-500/30'
          };
        case GameState.Discussion:
          return {
            bg: 'bg-gradient-to-br from-yellow-900/60 to-yellow-800/40',
            border: 'border-yellow-500/60',
            text: 'text-yellow-200',
            accent: 'bg-yellow-500/30'
          };
        case GameState.Voting:
          return {
            bg: 'bg-gradient-to-br from-red-900/60 to-red-800/40',
            border: 'border-red-500/60',
            text: 'text-red-200',
            accent: 'bg-red-500/30'
          };
        case GameState.Results:
          return {
            bg: 'bg-gradient-to-br from-purple-900/60 to-purple-800/40',
            border: 'border-purple-500/60',
            text: 'text-purple-200',
            accent: 'bg-purple-500/30'
          };
        case GameState.Ended:
          return {
            bg: 'bg-gradient-to-br from-gray-900/60 to-gray-800/40',
            border: 'border-gray-500/60',
            text: 'text-gray-200',
            accent: 'bg-gray-500/30'
          };
        default:
          return {
            bg: 'bg-gradient-to-br from-gray-900/60 to-gray-800/40',
            border: 'border-gray-500/60',
            text: 'text-gray-200',
            accent: 'bg-gray-500/30'
          };
      }
    };

    const getPhaseIcon = (phase: GameState) => {
      switch (phase) {
        case GameState.Lobby:
          return <Users className="w-8 h-8" />;
        case GameState.Selecting:
          return <Lightbulb className="w-8 h-8" />;
        case GameState.Presenting:
          return <MessageSquare className="w-8 h-8" />;
        case GameState.Discussion:
          return <Gamepad2 className="w-8 h-8" />;
        case GameState.Voting:
          return <Vote className="w-8 h-8" />;
        case GameState.Results:
          return <Trophy className="w-8 h-8" />;
        case GameState.Ended:
          return <CheckCircle className="w-8 h-8" />;
        default:
          return <XCircle className="w-8 h-8" />;
      }
    };

    const getPhaseDescription = (phase: GameState) => {
      switch (phase) {
        case GameState.Lobby:
          return "Players are gathering in the lobby, waiting for the host to start the game.";
        case GameState.Selecting:
          return "The host is selecting a category and secret word for this round.";
        case GameState.Presenting:
          return "Each player must provide a one-word clue that describes the secret word.";
        case GameState.Discussion:
          return "Discuss everyone's clues and try to identify who doesn't know the secret word!";
        case GameState.Voting:
          return "Cast your vote for who you believe is the Chameleon or other impostor role.";
        case GameState.Results:
          return "The votes are tallied! See if the group identified the correct player.";
        case GameState.Ended:
          return "The game has concluded. Check the final scores and see who won!";
        default:
          return "Unknown game phase";
      }
    };

    const getPhaseInstructions = (phase: GameState) => {
      let isPlayerTurn;
      let voteStatus;
      const voter = room.players.find(p => p.id === playerId);
      
      switch (phase) {
        case GameState.Lobby:
          return "Invite others to join using the room code or wait for the host to start.";
        case GameState.Selecting:
          return room.host_id === playerId 
            ? "Choose a category and word for this round." 
            : "Wait for the host to select a category and word.";
        case GameState.Presenting:
          isPlayerTurn = room.players[room.current_turn]?.id === playerId;
          return isPlayerTurn 
            ? "It's your turn! Enter a one-word clue that describes the secret word." 
            : `Waiting for ${room.players[room.current_turn]?.name} to enter their clue.`;
        case GameState.Discussion:
          return "Use the clues to identify the Chameleon. Special roles: use your abilities!";
        case GameState.Voting:
          voteStatus = voter?.vote;
          return voteStatus 
            ? "You've cast your vote. Waiting for others to vote..." 
            : "Select a player you think is the Chameleon or impostor.";
        case GameState.Results:
          return room.host_id === playerId 
            ? "Review the results and click 'Next Round' when ready." 
            : "Review the results. Waiting for the host to start the next round.";
        case GameState.Ended:
          return "Game over! Check the final scores and see who performed best.";
        default:
          return "";
      }
    };

    // Get additional phase context
    const getPhaseContext = (phase: GameState) => {
      let votesCount;
      
      switch (phase) {
        case GameState.Lobby:
          return `${room.players.length}/${room.max_players} players`;
        case GameState.Selecting:
          return room.category ? `Category: ${room.category}` : 'No category selected yet';
        case GameState.Presenting:
          return `Player ${room.current_turn + 1}/${room.players.length}: ${room.players[room.current_turn]?.name}`;
        case GameState.Discussion:
          return `Round ${room.round}/${room.max_rounds}`;
        case GameState.Voting:
          votesCount = room.players.filter(p => p.vote).length;
          return `${votesCount}/${room.players.length} votes cast`;
        case GameState.Results:
          return room.round_outcome || 'Results pending';
        case GameState.Ended:
          return 'Final scores';
        default:
          return '';
      }
    };

    const calculateTimePercentage = () => {
      if (remainingTime === null) return 0;
      
      let totalTime = 0;
      switch(room.state) {
        case GameState.Presenting:
          totalTime = room.settings.time_per_round || 30;
          break;
        case GameState.Discussion:
          totalTime = room.settings.discussion_time || 30;
          break;
        case GameState.Voting:
          totalTime = room.settings.voting_time || 30;
          break;
        default:
          return 0;
      }
      
      const percentage = (remainingTime / totalTime) * 100;
      return Math.max(0, Math.min(100, percentage));
    };

    const colors = getPhaseColor(room.state);
    const timePercentage = calculateTimePercentage();
    const isTimeCritical = remainingTime !== null && remainingTime <= 10;
    const phaseContext = getPhaseContext(room.state);

    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={`${colors.bg} ${colors.border} border-2 rounded-lg shadow-xl overflow-hidden transition-all duration-300`}>
          {remainingTime !== null && (
            <div className="w-full h-2 bg-gray-800/70">
              <motion.div 
                className={`h-full ${isTimeCritical ? 'bg-red-500' : 'bg-green-500'}`} 
                initial={{ width: '100%' }}
                animate={{ width: `${timePercentage}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            </div>
          )}
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${colors.accent} backdrop-blur-sm ${colors.text} shadow-inner border ${colors.border}`}>
                  {getPhaseIcon(room.state)}
                </div>
                <div>
                  <CardTitle className={`text-xl font-bold ${colors.text}`}>
                    {room.state.charAt(0).toUpperCase() + room.state.slice(1)} Phase
                  </CardTitle>
                  <CardDescription className={`text-sm font-medium ${colors.text} opacity-90`}>
                    {getPhaseDescription(room.state)}
                  </CardDescription>
                </div>
              </div>
              {remainingTime !== null && (
                <div 
                  className={`flex items-center gap-2 ${isTimeCritical ? 'animate-pulse' : ''} px-3 py-2 rounded-full ${colors.accent} backdrop-blur-sm`}
                >
                  <Clock className={`w-5 h-5 ${isTimeCritical ? 'text-red-300' : colors.text}`} />
                  <span className={`text-lg font-bold ${isTimeCritical ? 'text-red-300' : colors.text}`}>
                    {remainingTime}s
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <div className={`w-full h-0.5 ${colors.accent}`}></div>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`${colors.accent} ${colors.text} border-none`}>
                  {phaseContext}
                </Badge>
                {room.category && room.state !== GameState.Lobby && (
                  <Badge variant="outline" className={`${colors.accent} ${colors.text} border-none flex items-center gap-1.5`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Category: {room.category}</span>
                  </Badge>
                )}
              </div>
              
              <div className={`${colors.accent} rounded-lg p-3 text-sm ${colors.text}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Info className="w-4 h-4" />
                  <span className="font-medium">Instructions:</span>
                </div>
                <p>{getPhaseInstructions(room.state)}</p>
              </div>

              {room.state === GameState.Presenting && (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="w-6 h-6">
                    <AvatarFallback>{room.players[room.current_turn]?.name?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <p className={`text-sm ${colors.text}`}>
                    Current player: <span className="font-semibold">{room.players[room.current_turn]?.name}</span>
                  </p>
                </div>
              )}
              
              {room.state === GameState.Voting && voter?.vote && (
                <div className="flex items-center gap-2 mt-1">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <p className={`text-sm ${colors.text}`}>
                    You voted for: <span className="font-semibold">
                      {room.players.find(p => p.id === voter.vote)?.name || 'Unknown'}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const ResultsDisplay = () => {
    if (!room || room.state !== 'results') return null;

    const { round_outcome, revealed_player_id, revealed_role, votes_tally } = room;
    const revealedPlayer = room.players.find(p => p.id === revealed_player_id);

    const voteDetails = room.players
        .map(voter => {
            const votedForPlayer = room.players.find(p => p.id === voter.vote);
            return {
                voterId: voter.id,
                voterName: voter.name,
                votedForId: votedForPlayer?.id || null,
                votedForName: votedForPlayer ? votedForPlayer.name : "-",
            };
        })
        .sort((a, b) => a.voterName.localeCompare(b.voterName));

    let title = "Round Over!";
    let description = "The votes are in!";
    let icon = <CheckCircle className="h-12 w-12 text-yellow-500" />;
    let bgGradient = "from-slate-800 to-slate-900";
    let borderColor = "border-slate-700";

    if (round_outcome === 'imposter_caught' || round_outcome === 'chameleon_caught') {
      title = "Chameleon Caught!";
      description = `${revealedPlayer?.name} was the Chameleon! Good job, team!`;
      icon = <CheckCircle className="h-12 w-12 text-green-500" />;
      bgGradient = "from-green-900/70 to-green-800/50";
      borderColor = "border-green-500/50";
    } else if (round_outcome === 'innocent_voted' || round_outcome === 'wrong_vote') {
      title = "Oops! Wrong Person!";
      description = `${revealedPlayer?.name} was innocent! The Chameleon is still among us...`;
      icon = <AlertTriangle className="h-12 w-12 text-red-500" />;
      bgGradient = "from-red-900/70 to-red-800/50";
      borderColor = "border-red-500/50";
    } else if (round_outcome === 'jester_wins') {
      title = "Jester Wins!";
      description = `${revealedPlayer?.name} the Jester tricked you into voting for them!`;
      icon = <Laugh className="h-12 w-12 text-yellow-500" />;
      bgGradient = "from-yellow-900/70 to-yellow-800/50";
      borderColor = "border-yellow-500/50";
    } else if (round_outcome === 'tie') {
      title = "It's a Tie!";
      description = "No one was voted out. The Chameleon remains hidden!";
      icon = <Users className="h-12 w-12 text-blue-500" />;
      bgGradient = "from-blue-900/70 to-blue-800/50";
      borderColor = "border-blue-500/50";
    } else if (round_outcome === 'protected') {
      title = "Player Protected!";
      description = `${revealedPlayer?.name} was protected from being voted out!`;
      icon = <ShieldCheck className="h-12 w-12 text-emerald-500" />;
      bgGradient = "from-emerald-900/70 to-emerald-800/50";
      borderColor = "border-emerald-500/50";
    }
    
    const isLastRound = room.round >= room.max_rounds;

    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      >
        <Card className={`w-full max-w-lg shadow-2xl border-2 ${borderColor} bg-gradient-to-br ${bgGradient}`}>
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-primary to-primary/50 animate-gradient"></div>
          <CardHeader className="text-center pt-8">
            <div className="mx-auto mb-3">{icon}</div>
            <CardTitle className="text-2xl font-bold text-white">{title}</CardTitle>
            <p className="text-white/70 mt-1">{description}</p>
          </CardHeader>
          <CardContent className="space-y-3 divide-y divide-gray-700">
            {votes_tally && Object.keys(votes_tally).length > 0 && (
              <div className="text-sm pt-3">
                <h4 className="font-semibold mb-2 text-center text-white">Votes Received:</h4>
                <div className="max-h-40 overflow-y-auto px-4 space-y-1">
                  {Object.entries(votes_tally || {})
                    .sort(([, aVotes], [, bVotes]) => (bVotes as number) - (aVotes as number))
                    .map(([votedId, count]) => {
                      const p = room.players.find(pl => pl.id === votedId);
                      const isRevealed = p?.id === revealed_player_id;
                      const totalVotes = Object.values(votes_tally || {}).reduce((a, b) => (a as number) + (b as number), 0) as number;
                      const percentage = Math.round(((count as number) / totalVotes) * 100);
                      
                      return (
                        <div key={votedId} className="relative">
                          <div className="flex items-center gap-1.5">
                            <Badge variant={isRevealed ? "destructive" : "secondary"} className="text-[10px]">
                              {count} vote{(count as number) > 1 ? 's' : ''} ({percentage}%)
                            </Badge>
                            {isRevealed && <span className="text-lg">👈</span>}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            
            <div className="text-sm pt-3">
              <h4 className="font-semibold mb-2 text-center text-white">Voting Breakdown:</h4>
              <div className="max-h-48 overflow-y-auto px-2 sm:px-4 space-y-1.5">
                {voteDetails.map(vote => (
                  <div key={vote.voterId} className="flex justify-between items-center text-xs bg-gray-800/40 dark:bg-gray-800/50 px-2 py-1.5 rounded">
                    <span className="font-medium text-white">{vote.voterName}</span>
                    <div className="flex items-center gap-1 text-gray-400">
                      <span>voted for</span>
                      <Badge 
                        variant={vote.votedForId === revealed_player_id ? "destructive" : (vote.votedForId ? "secondary" : "outline")}
                        className="px-1.5 py-0.5 text-[10px]"
                      >
                        {vote.votedForName}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {(isLastRound || room.host_id === playerId) && (
              <div className="pt-3">
                <Button 
                  onClick={() => nextRound()} 
                  className="w-full font-semibold bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg text-white"
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

  const category = useMemo(() => {
      if (!room?.category) return null;
      return categories.find(c => c.name === room.category) || null;
  }, [room?.category]);

  if (!room) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading game...</p>
      </div>
    </div>
  );

  if (!category && room.state === 'lobby') {
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
  
  if (!category && room.state !== 'lobby') return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="mt-4 text-destructive">Error loading category data.</p>
      </div>
  );

  const currentPlayer = room?.turn_order && room.current_turn !== undefined 
    ? room.players.find(p => p.id === room.turn_order[room.current_turn])
    : undefined;

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white p-4">
      <AnimatePresence>
        {room?.state === 'results' && <ResultsDisplay />}
        {showTutorial && <GameTutorial visible={showTutorial} onClose={() => setShowTutorial(false)} />}
      </AnimatePresence>
      
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Game Header - make it neutral and distinct */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-primary/20 p-3 rounded-lg">
                <Gamepad2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <span className="text-primary">Chameleon X</span> 
                  <span className="text-sm font-normal bg-gray-700/70 px-2 py-0.5 rounded-full">
                    Round {room?.round} of {room?.max_rounds}
                  </span>
                </h1>
                <p className="text-gray-400">Category: {room?.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {!isPlayerChameleon && room?.secret_word && (
                <div className="bg-emerald-500/20 p-3 rounded-lg border border-emerald-500/30">
                  <p className="text-emerald-400 font-medium">Secret Word: {room.secret_word}</p>
                </div>
              )}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={() => setShowTutorial(true)} className="bg-gray-700/50 border-gray-600">
                      <HelpCircle className="h-5 w-5 text-gray-300" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Game Rules & Help</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Game Info with neutral styling */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700 shadow-lg">
              <h2 className="text-lg font-bold mb-4">Game Status</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Phase:</span>
                  <Badge variant="outline" className="bg-primary/20 text-primary">
                    {room?.state}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Time Left:</span>
                  <span className="text-xl font-bold text-primary">{remainingTime}s</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Players:</span>
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
