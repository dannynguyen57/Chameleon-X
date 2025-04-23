import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GameRoom, PlayerRole } from "@/lib/types";
import { WordCategory } from "@/lib/word-categories";
import { RoleTheme } from "@/lib/roleThemes";
import { motion } from "framer-motion";
import { Gamepad2, Crown, Shield, Timer, Lightbulb, Trophy, Users, MessageSquare, Vote, CheckCircle, XCircle, Smile, ShieldCheck, Award, Search, Laugh, Eye, EyeOff } from "lucide-react";

interface GameHeaderProps {
  roomName: string;
  category?: WordCategory | null;
  playerRole?: PlayerRole;
  word?: string;
  roleTheme: RoleTheme;
  timeLeft?: number;
}

export default function GameHeader({ 
  roomName, 
  category, 
  playerRole,
  word,
  roleTheme,
  timeLeft
}: GameHeaderProps) {
  const getRoleDisplayName = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.Chameleon:
        return "Chameleon";
      case PlayerRole.Mimic:
        return "Mimic";
      case PlayerRole.Oracle:
        return "Oracle";
      case PlayerRole.Jester:
        return "Jester";
      case PlayerRole.Spy:
        return "Spy";
      case PlayerRole.Guardian:
        return "Guardian";
      case PlayerRole.Trickster:
        return "Trickster";
      case PlayerRole.Illusionist:
        return "Illusionist";
      default:
        return "Regular Player";
    }
  };

  const getRoleIcon = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.Chameleon:
        return <Smile className="w-4 h-4" />;
      case PlayerRole.Mimic:
        return <Laugh className="w-4 h-4" />;
      case PlayerRole.Oracle:
        return <Lightbulb className="w-4 h-4" />;
      case PlayerRole.Jester:
        return <Crown className="w-4 h-4" />;
      case PlayerRole.Spy:
        return <Eye className="w-4 h-4" />;
      case PlayerRole.Guardian:
        return <Shield className="w-4 h-4" />;
      case PlayerRole.Trickster:
        return <Award className="w-4 h-4" />;
      case PlayerRole.Illusionist:
        return <EyeOff className="w-4 h-4" />;
      default:
        return <Users className="w-4 h-4" />;
    }
  };

  return (
    <motion.div
      className="w-full"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col items-center sm:items-start gap-2 w-full sm:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Gamepad2 className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                <span className="text-xl sm:text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60 truncate">
                  {category?.name || "Not selected"}
                </span>
                {category?.emoji && (
                  <span className="text-xl sm:text-2xl md:text-3xl">{category.emoji}</span>
                )}
              </div>
              <p className="text-xs sm:text-sm md:text-base text-muted-foreground text-center sm:text-left w-full sm:w-auto">
                {category?.description || "Select a category to begin"}
              </p>
              {/* Timer Display - Moved below category description */}
              {typeof timeLeft === 'number' && (
                <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full self-center sm:self-start mt-1">
                  <Timer className="w-4 h-4 text-primary animate-pulse" />
                  <span className="text-base font-semibold text-primary">
                    {Math.max(0, Math.floor(timeLeft))}s
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              {word && (
                <div className="flex items-center gap-2 w-full sm:w-auto justify-center sm:justify-end">
                  <span className="text-base sm:text-lg md:text-xl font-medium truncate">
                    {/* {word} */}
                  </span>
                  <Badge 
                    variant={playerRole === PlayerRole.Chameleon ? "destructive" : "default"}
                    className={cn(
                      "text-xs sm:text-sm flex items-center gap-1",
                      roleTheme.bg,
                      roleTheme.text,
                      roleTheme.border
                    )}
                  >
                    {getRoleIcon(playerRole || PlayerRole.Regular)}
                    {getRoleDisplayName(playerRole || PlayerRole.Regular)}
                  </Badge>
                </div>
              )}
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right flex items-center gap-1 w-full sm:w-auto justify-center sm:justify-end">
                {playerRole === PlayerRole.Chameleon ? (
                  <>
                    <ShieldCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                    Try to blend in with other players' descriptions
                  </>
                ) : playerRole === PlayerRole.Mimic ? (
                  <>
                    <Laugh className="w-3 h-3 sm:w-4 sm:h-4" />
                    Use your similar word to create convincing descriptions
                  </>
                ) : playerRole === PlayerRole.Oracle ? (
                  <>
                    <Lightbulb className="w-3 h-3 sm:w-4 sm:h-4" />
                    Guide others subtly without revealing you know the word
                  </>
                ) : playerRole === PlayerRole.Spy ? (
                  <>
                    <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                    Help others find the Chameleon without being too obvious
                  </>
                ) : playerRole === PlayerRole.Jester ? (
                  <>
                    <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
                    Try to get others to vote for you by being suspicious
                  </>
                ) : playerRole === PlayerRole.Guardian ? (
                  <>
                    <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                    Protect players from being voted out
                  </>
                ) : playerRole === PlayerRole.Trickster ? (
                  <>
                    <Award className="w-3 h-3 sm:w-4 sm:h-4" />
                    Use your tricks to manipulate the game
                  </>
                ) : playerRole === PlayerRole.Illusionist ? (
                  <>
                    <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />
                    Create confusion with your illusion abilities
                  </>
                ) : (
                  <>
                    <Search className="w-3 h-3 sm:w-4 sm:h-4" />
                    Describe the word without saying it directly
                  </>
                )}
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  );
} 