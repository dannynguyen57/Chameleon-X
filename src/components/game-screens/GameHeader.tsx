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
}

export default function GameHeader({ 
  roomName, 
  category, 
  playerRole,
  word,
  roleTheme
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
        <CardHeader className="bg-primary/5 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-col items-center sm:items-start gap-2">
              <div className="flex items-center gap-2">
                <Gamepad2 className="w-6 h-6 text-primary" />
                <span className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                  {category?.name || "Not selected"}
                </span>
                {category?.emoji && (
                  <span className="text-2xl sm:text-3xl">{category.emoji}</span>
                )}
              </div>
              <p className="text-sm sm:text-base text-muted-foreground text-center sm:text-left">
                {category?.description || "Select a category to begin"}
              </p>
            </div>
            
            <div className="flex flex-col items-center sm:items-end gap-2">
              {word && (
                <div className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl font-medium">
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
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-right flex items-center gap-1">
                {playerRole === PlayerRole.Chameleon ? (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Try to blend in with other players' descriptions
                  </>
                ) : playerRole === PlayerRole.Mimic ? (
                  <>
                    <Laugh className="w-4 h-4" />
                    Use your similar word to create convincing descriptions
                  </>
                ) : playerRole === PlayerRole.Oracle ? (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    Guide others subtly without revealing you know the word
                  </>
                ) : playerRole === PlayerRole.Spy ? (
                  <>
                    <Eye className="w-4 h-4" />
                    Help others find the Chameleon without being too obvious
                  </>
                ) : playerRole === PlayerRole.Jester ? (
                  <>
                    <Crown className="w-4 h-4" />
                    Try to get others to vote for you by being suspicious
                  </>
                ) : playerRole === PlayerRole.Guardian ? (
                  <>
                    <Shield className="w-4 h-4" />
                    Protect players from being voted out
                  </>
                ) : playerRole === PlayerRole.Trickster ? (
                  <>
                    <Award className="w-4 h-4" />
                    Use your tricks to manipulate the game
                  </>
                ) : playerRole === PlayerRole.Illusionist ? (
                  <>
                    <EyeOff className="w-4 h-4" />
                    Create confusion with your illusion abilities
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
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