import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GameRoom, Player, PlayerRole } from "@/lib/types";
import { useGame } from "@/hooks/useGame";
import { useGameActions } from "@/hooks/useGameActions";
import { convertToExtendedRoom } from "@/lib/roomUtils";
import { toast } from "sonner";
import { 
  Clock, Timer, ShieldCheck, Laugh, Lightbulb, Crown, 
  Shield, Award, EyeOff 
} from "lucide-react";

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

  const { handleRoleAbility } = useGameActions(
    playerId, 
    room ? convertToExtendedRoom(room) : null, 
    room?.settings, 
    () => {}
  );

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
              "relative p-8 rounded-lg transition-all duration-200 border-2 hover:shadow-xl",
              isChameleon
                ? "bg-gradient-to-br from-red-900/40 via-red-800/30 to-red-950/40 border-red-500/40 shadow-lg shadow-red-900/20"
                : "bg-gradient-to-br from-green-900/40 via-green-800/30 to-green-950/40 border-green-500/40 shadow-lg shadow-green-900/20"
            )}>
              <div className="flex flex-col items-center justify-center gap-4">
                <div className={cn(
                  "text-4xl font-bold tracking-wider text-center",
                  isChameleon 
                    ? "text-red-200 blur-[3px] select-none" 
                    : "text-green-200"
                )}>
                  {isChameleon ? "?????????" : room.secret_word}
                </div>
                {isChameleon && (
                  <Badge variant="outline" className="bg-red-500/20 text-red-200 border-red-500/30 px-4 py-1.5 text-sm">
                    You are the Chameleon
                  </Badge>
                )}
                <p className={cn(
                  "text-sm text-center max-w-md",
                  isChameleon ? "text-red-300/80" : "text-green-300/80"
                )}>
                  {isChameleon 
                    ? "Listen carefully to others' descriptions and try to blend in!"
                    : "Describe this word without being too obvious!"}
                </p>
              </div>
            </div>
          </div>

          {isCurrentPlayerTurn && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description" className="text-green-200">
                  Your Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter your description..."
                  className="min-h-[100px] bg-green-900/50 border-green-700/50 text-green-100 placeholder:text-green-700"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitDescription}
                  disabled={!description.trim() || isSubmitting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  Submit Description
                </Button>
                <Button
                  onClick={handleSkipTurn}
                  disabled={isSubmitting}
                  variant="outline"
                  className="border-green-700/50 text-green-300 hover:bg-green-900/50"
                >
                  Skip Turn
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default CurrentTurnCard; 