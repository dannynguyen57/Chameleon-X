import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Crown, Users, Trophy, UserX } from "lucide-react";
import { GameRoom, Player, GameResultType, PlayerRole, VotingOutcome } from "@/lib/types";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ResultsDisplayProps {
  room: GameRoom;
  playerId: string;
  onNextRound: () => Promise<void>;
}

export default function ResultsDisplay({ room, playerId, onNextRound }: ResultsDisplayProps) {
  const [isLoading, setIsLoading] = useState(false);
  const roundResult = room.current_round_result;
  const votedOutPlayerId = roundResult?.voted_out_player_id;
  const revealedRole = roundResult?.revealed_role;
  const outcome = roundResult?.outcome;
  
  const votedOutPlayer = votedOutPlayerId ? room.players.find(p => p.id === votedOutPlayerId) : null;
  const isChameleon = revealedRole === PlayerRole.Chameleon;
  const isCurrentPlayerChameleon = room.chameleon_id === playerId;
  const isLastRound = room.round >= room.max_rounds;

  const getRoleColor = (role: PlayerRole | undefined | null) => {
    switch (role) {
      case PlayerRole.Chameleon:
        return "text-red-500 bg-red-500/10 border-red-500/20";
      case PlayerRole.Regular:
        return "text-blue-500 bg-blue-500/10 border-blue-500/20";
      case PlayerRole.Guardian:
        return "text-yellow-500 bg-yellow-500/10 border-yellow-500/20";
      case PlayerRole.Mimic:
        return "text-purple-500 bg-purple-500/10 border-purple-500/20";
      default:
        return "text-gray-500 bg-gray-500/10 border-gray-500/20";
    }
  };
  
  const handleNextRound = async () => {
    try {
      setIsLoading(true);
      await onNextRound();
    } catch (error) {
      console.error("Error transitioning to next round:", error);
      toast.error("Failed to start next round. Please try again.");
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <Card className="border shadow-sm bg-background/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Round {room.round} Results
            </CardTitle>
            <Badge variant="outline">
              {isLastRound ? "Final Round" : `Round ${room.round}/${room.max_rounds}`}
            </Badge>
          </div>
          <CardDescription>
            {outcome === VotingOutcome.ChameleonFound
              ? "The group successfully identified the Chameleon!"
              : outcome === VotingOutcome.ChameleonSurvived
              ? "The Chameleon remains hidden among us..."
              : "The voting ended in a tie. No one was eliminated."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Voted Out Player Card */}
          {votedOutPlayer && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-lg border bg-card p-6"
            >
              <div className="absolute top-0 right-0 p-4">
                <Badge variant="outline" className={getRoleColor(revealedRole)}>
                  {revealedRole || "Unknown Role"}
                </Badge>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${votedOutPlayer.name}`} />
                    <AvatarFallback>{votedOutPlayer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="absolute -top-2 -right-2">
                    <div className="p-2 rounded-full bg-background border">
                      <UserX className="w-4 h-4 text-destructive" />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-xl font-semibold">{votedOutPlayer.name}</h3>
                  <p className="text-sm text-muted-foreground">was voted out!</p>
                </div>

                {/* Outcome Message */}
                <div className={`mt-4 p-4 rounded-lg ${
                  isChameleon 
                    ? "bg-green-500/10 border border-green-500/20" 
                    : "bg-red-500/10 border border-red-500/20"
                }`}>
                  <p className={`text-lg font-semibold ${
                    isChameleon ? "text-green-500" : "text-red-500"
                  }`}>
                    {isChameleon 
                      ? "The Chameleon has been caught!" 
                      : "An innocent player was eliminated!"}
                  </p>
                  <p className="text-sm mt-1 text-muted-foreground">
                    {isChameleon
                      ? "The group wins this round!"
                      : "The Chameleon successfully deceived the group."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* No Player Voted Out */}
          {!votedOutPlayer && (
            <div className="text-center p-6 bg-muted/50 rounded-lg">
              <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold">No Player Eliminated</h3>
              <p className="text-sm text-muted-foreground mt-2">
                The vote ended in a tie. All players remain in the game.
              </p>
            </div>
          )}

          {/* Next Round Button */}
          <div className="pt-4">
            <Button
              onClick={handleNextRound}
              className="w-full"
              size="lg"
              disabled={isLoading}
            >
              {isLoading ? (
                <><span className="animate-spin mr-2">⟳</span> Processing...</>
              ) : (
                <>
                  {isChameleon || isLastRound ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      Return to Lobby
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4 mr-2" />
                      Next Round
                    </>
                  )}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 