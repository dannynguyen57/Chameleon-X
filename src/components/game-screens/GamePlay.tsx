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
import { Check, Clock, Lightbulb, Trophy, Gamepad2, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Shield, Search, Laugh, Crown, Eye, EyeOff } from "lucide-react";

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

const getPlayerRoleIcon = (player: Player) => {
  const theme = getRoleTheme(player.role);
  return theme.icon;
};

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

// Memoized Current Turn Card Component
const CurrentTurnCard = ({ 
  room, 
  player, 
  onDescriptionSubmit 
}: { 
  room: GameRoom; 
  player: Player; 
  onDescriptionSubmit: (description: string) => void;
}) => {
  const [description, setDescription] = useState("");
  const [isWordVisible, setIsWordVisible] = useState(false);
  const isCurrentPlayer = room.current_turn?.toString() === player.id;
  const currentPlayer = room.players.find(p => p.id === room.current_turn?.toString());

  return (
    <motion.div
      className="relative w-full max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardHeader className="bg-primary/5">
          <CardTitle className="text-center">
            {isCurrentPlayer ? "Your Turn" : `${currentPlayer?.name}'s Turn`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Word Display */}
            <motion.div
              className="flex items-center justify-between p-4 bg-muted rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span className="text-lg font-medium">
                {isWordVisible ? room.secret_word : "••••••••"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsWordVisible(!isWordVisible)}
              >
                {isWordVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </motion.div>

            {/* Description Input */}
            {isCurrentPlayer && (
              <motion.div
                className="space-y-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Label htmlFor="description">Your Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter your description..."
                  className="min-h-[100px]"
                />
                <Button
                  className="w-full"
                  onClick={() => {
                    onDescriptionSubmit(description);
                    setDescription("");
                  }}
                >
                  Submit
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Phase-specific Overlay */}
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
    </motion.div>
  );
};

// Add these new components at the top level
const GamePhaseIndicator = ({ room }: { room: GameRoom }) => {
  const phases = [
    { state: GameState.Presenting, label: "Presenting", icon: <Gamepad2 className="w-4 h-4" /> },
    { state: GameState.Discussion, label: "Discussion", icon: <MessageSquare className="w-4 h-4" /> },
    { state: GameState.Voting, label: "Voting", icon: <Vote className="w-4 h-4" /> },
    { state: GameState.Results, label: "Results", icon: <Trophy className="w-4 h-4" /> }
  ];

  return (
    <div className="relative">
      <motion.div 
        className="flex items-center justify-center gap-2 p-2 bg-background/50 backdrop-blur-sm rounded-lg"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
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

const GameTimer = ({ remainingTime }: { remainingTime: number | null }) => {
  if (remainingTime === null) return null;

  return (
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="fixed bottom-4 right-4 bg-background/80 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-primary/20"
    >
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-primary" />
        <span className="text-lg font-semibold">{remainingTime}s</span>
      </div>
    </motion.div>
  );
};

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings, playerId, setRoom, resetGame } = useGame();
  const { submitWord, submitVote, nextRound, resetGame: resetGameAction } = useGameActions(playerId, room, settings, setRoom);
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const hasVoted = Boolean(room?.votes?.[playerId]);
  const isDevMode = import.meta.env.VITE_ENABLE_DEV_MODE === 'false';

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
        {room.category && (
          <GameHeader 
            room={room} 
            category={room.category} 
            roleTheme={getRoleTheme(currentPlayer?.role || PlayerRole.Regular)}
            isPlayerChameleon={isPlayerChameleon}
          />
        )}
        
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
                      <Avatar>
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                        <AvatarFallback>{player.name[0]}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{player.name}</span>
                          {player.id === playerId && (
                            <Badge variant="outline">You</Badge>
                          )}
                        </div>
                        {player.turn_description && (
                          <p className="text-sm text-muted-foreground mt-1">
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
                    player={currentPlayer}
                    onDescriptionSubmit={submitWord}
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
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                          <MessageSquare className="w-6 h-6" />
                          Discussion Phase
                        </CardTitle>
                        <Badge variant="outline" className="text-lg">
                          Time Left: {remainingTime}s
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        Discuss the descriptions and try to identify the Chameleon!
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {room.players.map((player) => (
                            <Card key={player.id} className="p-4">
                              <div className="flex items-center gap-3">
                                <Avatar>
                                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                  <AvatarFallback>{player.name[0]}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <h3 className="font-semibold">{player.name}</h3>
                                  <p className="text-sm text-muted-foreground">
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
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-2xl">
                          <Vote className="w-6 h-6" />
                          Voting Phase
                        </CardTitle>
                        <Badge variant="outline" className="text-lg">
                          Time Left: {remainingTime}s
                        </Badge>
                      </div>
                      <CardDescription className="text-base">
                        Vote for who you think is the Chameleon!
                      </CardDescription>
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
                              <Avatar>
                                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${player.name}`} />
                                <AvatarFallback>{player.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold">{player.name}</h3>
                                <p className="text-sm text-muted-foreground">
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
                    <p className="text-2xl font-bold">{room?.round || 1}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Time Remaining</h4>
                    <p className="text-2xl font-bold">{remainingTime || 0}s</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground">Category</h4>
                    <p className="text-lg font-semibold">{room?.category?.name || "Not selected"}</p>
                  </div>
                  {room?.secret_word && (
                    <div>
                      <h4 className="text-sm font-medium text-muted-foreground">Secret Word</h4>
                      <p className="text-lg font-semibold">{room.secret_word}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Floating Timer */}
        <GameTimer remainingTime={remainingTime} />
      </div>
    </div>
  );
}

