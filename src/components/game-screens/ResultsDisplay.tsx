import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Crown, Users, Trophy, UserX, RotateCw, MessageSquare, Vote as VoteIcon } from "lucide-react";
import { GameRoom, Player, PlayerRole, VotingOutcome, Vote } from "@/lib/types";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getRoleTheme, RoleTheme } from "@/lib/roleThemes";
import { roleConfig } from "@/lib/roleConfig";
import { useGameActions } from "@/hooks/useGameActions";
import { useGame } from "@/hooks/useGame";
import { convertToExtendedRoom } from "@/lib/roomUtils";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ResultsDisplayProps {
  room: GameRoom;
  playerId: string;
}

const getRoleStyle = (role: PlayerRole | undefined | null): { theme: RoleTheme; config: typeof roleConfig[PlayerRole] } => {
  const actualRole = role || PlayerRole.Regular;
  const theme = getRoleTheme(actualRole);
  const config = roleConfig[actualRole];
  return { theme, config };
};

export default function ResultsDisplay({ room, playerId }: ResultsDisplayProps) {
  const { settings, setRoom } = useGame();
  const { prepareNextPresentingPhase, resetGame } = useGameActions(playerId, room ? convertToExtendedRoom(room) : null, settings, setRoom);
  
  const [showVotes, setShowVotes] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const roundResult = room.current_round_result;
  const votedOutPlayerId = room.voted_out_player;
  const revealedRole = room.revealed_role;
  const outcome = room.round_outcome;
  const votes: Vote[] = room.current_voting_round?.votes || [];

  const votedOutPlayer = votedOutPlayerId ? room.players.find(p => p.id === votedOutPlayerId) : null;
  const isChameleonVoted = revealedRole === PlayerRole.Chameleon;
  const isLastRound = room.round >= room.max_rounds;
  const isTie = outcome === VotingOutcome.Tie;
  const gameShouldEnd = isLastRound || isChameleonVoted;

  const roleStyle = getRoleStyle(revealedRole);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    const transitionTimeout = setTimeout(() => {
      if (gameShouldEnd) {
        resetGame();
      } else {
        if (!isChameleonVoted) {
          prepareNextPresentingPhase();
        } else {
          resetGame();
        }
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(transitionTimeout);
    };
  }, [gameShouldEnd, resetGame, prepareNextPresentingPhase, isChameleonVoted]);

  const votesByTarget = votes.reduce((acc, vote) => {
    if (!acc[vote.target_id]) {
      acc[vote.target_id] = [];
    }
    acc[vote.target_id].push(vote.voter_id);
    return acc;
  }, {} as Record<string, string[]>);

  const getPlayerName = (pId: string) => room.players.find(p => p.id === pId)?.name || 'Unknown';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="space-y-4 sm:space-y-6"
    >
      <Card className="border-2 border-green-500/30 shadow-xl bg-gradient-to-br from-green-950/80 via-emerald-950/60 to-green-950/80 backdrop-blur-lg overflow-hidden">
        <CardHeader className="p-4 sm:p-6 bg-gradient-to-b from-green-900/50 to-transparent border-b border-green-500/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2 text-green-100 font-bold">
              <Trophy className="w-6 h-6 text-green-300" />
              Round {room.round} Results
            </CardTitle>
            <Badge variant="outline" className="bg-green-500/20 border-green-500/40 text-green-100 font-semibold">
              {isLastRound ? "Final Round" : `Round ${room.round} / ${room.max_rounds}`}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <motion.div 
            className={cn(
              "text-center p-4 sm:p-6 rounded-lg border-2 shadow-inner backdrop-blur-sm",
              isTie 
                ? "bg-amber-900/30 border-amber-500/40"
                : isChameleonVoted
                  ? "bg-green-900/30 border-green-500/40"
                  : "bg-red-900/30 border-red-500/40"
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 100 }}
          >
            <CardDescription className={cn(
              "text-lg sm:text-xl font-bold mb-1",
               isTie ? "text-amber-200" : isChameleonVoted ? "text-green-200" : "text-red-200"
            )}>
              {isTie
                ? "It's a Tie!"
                : isChameleonVoted
                  ? "Chameleon Caught!"
                  : "Chameleon Escaped!"
              }
            </CardDescription>
            <p className="text-sm text-green-100/90 font-medium">
              {isTie
                ? "The votes were split. No one is eliminated this round."
                : isChameleonVoted
                  ? "The group successfully identified the Chameleon!"
                  : `The Chameleon remains hidden...`
              }
            </p>
          </motion.div>

          {votedOutPlayer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-950/60 p-4 sm:p-6 backdrop-blur-sm"
            >
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                 <motion.div 
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="relative flex-shrink-0"
                 >
                   <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-red-500/60 shadow-lg">
                     <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${votedOutPlayer.name}`} />
                     <AvatarFallback className="text-xl">{votedOutPlayer.name[0]}</AvatarFallback>
                   </Avatar>
                   <motion.div 
                     initial={{ scale: 0, rotate: -45 }}
                     animate={{ scale: 1, rotate: 0 }}
                     transition={{ delay: 0.6, type: "spring", stiffness: 150 }}
                     className="absolute -top-2 -right-2"
                   >
                     <div className="p-2 rounded-full bg-red-600 border-2 border-red-300 shadow-md">
                       <UserX className="w-4 h-4 text-white" />
                     </div>
                   </motion.div>
                 </motion.div>

                 <div className="flex-grow space-y-1">
                   <p className="text-sm text-red-200/90 font-medium">Voted Out:</p>
                   <h3 className="text-xl sm:text-2xl font-bold text-red-100">{votedOutPlayer.name}</h3>
                   {/* Role information is now hidden */}
                 </div>
               </div>
            </motion.div>
          )}

          <div className="space-y-3">
             <Button 
               variant="outline"
               size="sm"
               className="w-full border-green-500/40 bg-green-950/40 text-green-100 hover:bg-green-950/60 transition-colors duration-200 font-semibold"
               onClick={() => setShowVotes(!showVotes)}
             >
               <VoteIcon className="w-4 h-4 mr-2" />
               {showVotes ? "Hide Votes" : "Show Votes"}
             </Button>
             
             <AnimatePresence>
               {showVotes && (
                 <motion.div
                   initial={{ height: 0, opacity: 0 }}
                   animate={{ height: "auto", opacity: 1 }}
                   exit={{ height: 0, opacity: 0 }}
                   transition={{ duration: 0.3 }}
                   className="overflow-hidden"
                 >
                    <ScrollArea className="max-h-[200px] p-3 border border-green-800/40 rounded-md bg-green-950/30">
                      <div className="space-y-2">
                        {Object.entries(votesByTarget).map(([targetId, voterIds]) => (
                          <div key={targetId} className="text-sm">
                             <span className="font-bold text-green-100">{getPlayerName(targetId)}</span>
                             <span className="text-green-200/90"> received {voterIds.length} vote(s) from: </span>
                             <span className="text-green-100 italic">
                               {voterIds.map(vId => getPlayerName(vId)).join(", ")}
                             </span>
                          </div>
                        ))}
                        {votes.length === 0 && (
                          <p className="text-center text-green-200/90 text-sm font-medium">No votes were cast this round.</p>
                        )}
                      </div>
                    </ScrollArea>
                 </motion.div>
               )}
              </AnimatePresence>
           </div>

          <div className="pt-4 text-center space-y-2">
             <p className="text-sm text-green-200/90 font-medium">
               {gameShouldEnd ? "Returning to lobby in..." : "Continuing round in..."}
             </p>
             <Progress 
               value={(countdown / 5) * 100} 
               className="w-full h-2 bg-green-900/60 border border-green-500/30 [&>*]:bg-gradient-to-r [&>*]:from-green-500 [&>*]:to-emerald-500 transition-all duration-1000 ease-linear" 
             />
             <p className="text-2xl font-bold text-green-100">{countdown}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 