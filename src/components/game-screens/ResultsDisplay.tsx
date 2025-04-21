import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Smile, Users } from "lucide-react";
import { GameRoom, Player, GameResultType } from "@/lib/types";

interface ResultsDisplayProps {
  room: GameRoom;
  playerId: string;
  onNextRound: () => void;
}

export default function ResultsDisplay({ room, playerId, onNextRound }: ResultsDisplayProps) {
  const { round_outcome, revealed_player_id, revealed_role } = room;
  const revealedPlayer = revealed_player_id ? room.players.find((p: Player) => p.id === revealed_player_id) : null;
  
  let title = "Round Complete";
  let description = "The round has ended.";
  let icon = <CheckCircle className="h-10 w-10 text-yellow-500" />;

  if (round_outcome === GameResultType.ImposterCaught) {
    title = "Imposter Caught!";
    description = `${revealedPlayer?.name} (${revealed_role}) was the imposter! Good job, team!`;
    icon = <CheckCircle className="h-10 w-10 text-green-500" />;
  } else if (round_outcome === GameResultType.InnocentVoted) {
    title = "Oops! Wrong Person!";
    description = `${revealedPlayer?.name} (${revealed_role}) was innocent! The imposter is still among us...`;
    icon = <XCircle className="h-10 w-10 text-red-500" />;
  } else if (round_outcome === GameResultType.JesterWins) {
    title = "Jester Wins!";
    description = `${revealedPlayer?.name} the Jester tricked you into voting for them!`;
    icon = <Smile className="h-10 w-10 text-yellow-500" />;
  } else if (round_outcome === GameResultType.Tie) {
    title = "It's a Tie!";
    description = "No one was voted out. The imposter remains hidden!";
    icon = <Users className="h-10 w-10 text-gray-500" />;
  }

  const isLastRound = room.round >= room.max_rounds;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 0.5 }}
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-lg shadow-2xl border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3">{icon}</div>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <p className="text-muted-foreground mt-1">{description}</p>
        </CardHeader>
        <CardContent className="space-y-3 divide-y divide-gray-200 dark:divide-gray-700">
          {room.votes_tally && Object.keys(room.votes_tally).length > 0 && (
            <div className="text-sm pt-3">
              <h4 className="font-semibold mb-2 text-center">Votes Received:</h4>
              <ul className="space-y-1 max-h-40 overflow-y-auto px-4">
                {Object.entries(room.votes_tally as Record<string, number>)
                  .sort(([, aVotes], [, bVotes]) => bVotes - aVotes)
                  .map(([votedId, count]) => {
                    const p = room.players.find((pl: Player) => pl.id === votedId);
                    return (
                      <li key={votedId} className="flex justify-between items-center text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        <span>{p?.name || 'Unknown'}</span>
                        <Badge variant={p?.id === revealed_player_id ? "destructive" : "secondary"}>
                          {count} vote{count > 1 ? 's' : ''}
                        </Badge>
                      </li>
                    );
                  })}
              </ul>
            </div>
          )}
          
          <div className="text-sm pt-3">
            <h4 className="font-semibold mb-2 text-center">Voting Breakdown:</h4>
            <ul className="space-y-1 max-h-48 overflow-y-auto px-2 sm:px-4">
              {Object.entries(room.votes as Record<string, string>).map(([voterId, votedId]: [string, string]) => {
                const voter = room.players.find((p: Player) => p.id === voterId);
                const voted = room.players.find((p: Player) => p.id === votedId);
                return (
                  <li key={voterId} className="flex justify-between items-center text-xs bg-gray-100 dark:bg-gray-800/50 px-2 py-1.5 rounded">
                    <span className="font-medium">{voter?.name || 'Unknown'}</span>
                    <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                      <span>voted for</span>
                      <span className="font-medium">{voted?.name || 'Unknown'}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {(isLastRound || room.host_id === playerId) && (
            <div className="pt-3">
              <Button 
                onClick={onNextRound} 
                className="w-full font-semibold"
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
} 