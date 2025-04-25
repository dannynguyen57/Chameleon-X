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
      setCountdown((prev) => prev - 1);
    }, 1000);

    const transitionTimeout = setTimeout(() => {
      if (gameShouldEnd) {
        resetGame();
      } else {
        prepareNextPresentingPhase();
      }
    }, 5000);

    return () => {
      clearInterval(timer);
      clearTimeout(transitionTimeout);
    };
  }, [gameShouldEnd, resetGame, prepareNextPresentingPhase]);

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
      <Card className="border-2 border-blue-500/20 shadow-xl bg-gradient-to-br from-blue-950/50 via-green-950/30 to-blue-950/50 backdrop-blur-lg overflow-hidden">
        <CardHeader className="p-4 sm:p-6 bg-gradient-to-b from-blue-900/30 to-transparent border-b border-blue-500/10">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2 text-blue-200">
              <Trophy className="w-6 h-6 text-blue-300" />
              Round {room.round} Results
            </CardTitle>
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-200">
              {isLastRound ? "Final Round" : `Round ${room.round} / ${room.max_rounds}`}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
          <motion.div 
            className={cn(
              "text-center p-4 sm:p-6 rounded-lg border-2 shadow-inner",
              isTie 
                ? "bg-yellow-900/20 border-yellow-500/30"
                : isChameleonVoted
                  ? "bg-green-900/20 border-green-500/30"
                  : "bg-red-900/20 border-red-500/30"
            )}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4, type: "spring", stiffness: 100 }}
          >
            <CardDescription className={cn(
              "text-lg sm:text-xl font-semibold mb-1",
               isTie ? "text-yellow-300" : isChameleonVoted ? "text-green-300" : "text-red-300"
            )}>
              {isTie
                ? "It's a Tie!"
                : isChameleonVoted
                  ? "Chameleon Caught!"
                  : "Chameleon Escaped!"
              }
            </CardDescription>
            <p className="text-sm text-blue-200/80">
              {isTie
                ? "The votes were split. No one is eliminated this round."
                : isChameleonVoted
                  ? "The group successfully identified the Chameleon!"
                  : `The Chameleon (${room.players.find(p => p.role === PlayerRole.Chameleon)?.name || 'Unknown'}) remains hidden...`
              }
            </p>
          </motion.div>

          {votedOutPlayer && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
              className="relative overflow-hidden rounded-lg border border-gray-700/50 bg-gray-950/40 p-4 sm:p-6 backdrop-blur-sm"
            >
              <div className="flex flex-col sm:flex-row items-center text-center sm:text-left gap-4">
                 <motion.div 
                    initial={{ scale: 0.5 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.3 }}
                    className="relative flex-shrink-0"
                 >
                   <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-2 border-red-500/50 shadow-lg">
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
                   <p className="text-sm text-red-300/80 font-medium">Voted Out:</p>
                   <h3 className="text-xl sm:text-2xl font-bold text-red-200">{votedOutPlayer.name}</h3>
                   <motion.div 
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: "auto", opacity: 1 }}
                      transition={{ delay: 0.8, duration: 0.5 }}
                      className="inline-block"
                   >
                    <Badge variant="outline" className={cn("text-sm font-medium mt-1 backdrop-blur-sm", roleStyle.theme.bg, roleStyle.theme.text, roleStyle.theme.border)}>
                      <span className="mr-1.5">{roleStyle.theme.icon}</span>
                      Role: {roleStyle.config.name}
                    </Badge>
                   </motion.div>
                 </div>
               </div>
            </motion.div>
          )}

          <div className="space-y-3">
             <Button 
               variant="outline"
               size="sm"
               className="w-full border-blue-500/30 bg-blue-950/30 text-blue-200 hover:bg-blue-950/50"
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
                    <ScrollArea className="max-h-[200px] p-3 border border-blue-800/30 rounded-md bg-green-950/20">
                      <div className="space-y-2">
                        {Object.entries(votesByTarget).map(([targetId, voterIds]) => (
                          <div key={targetId} className="text-sm">
                             <span className="font-semibold text-blue-100">{getPlayerName(targetId)}</span>
                             <span className="text-blue-300/80"> received {voterIds.length} vote(s) from: </span>
                             <span className="text-blue-200 italic">
                               {voterIds.map(vId => getPlayerName(vId)).join(", ")}
                             </span>
                          </div>
                        ))}
                        {votes.length === 0 && (
                          <p className="text-center text-blue-300/70 text-sm">No votes were cast this round.</p>
                        )}
                      </div>
                    </ScrollArea>
                 </motion.div>
               )}
              </AnimatePresence>
           </div>

          <div className="pt-4 text-center space-y-2">
             <p className="text-sm text-blue-300/80">
               {gameShouldEnd ? "Returning to lobby in..." : "Continuing round in..."}
             </p>
             <Progress value={(countdown / 5) * 100} className="w-full h-2 bg-blue-900/50 border border-blue-500/20 [&>*]:bg-gradient-to-r [&>*]:from-blue-400 [&>*]:to-cyan-400 transition-all duration-1000 ease-linear" />
             <p className="text-2xl font-bold text-blue-200">{countdown}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
} 