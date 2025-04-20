import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle2, Check, Clock, AlertCircle } from "lucide-react";
import { PlayerRole } from "@/lib/types";
import { motion } from "framer-motion";

export default function VotingScreen() {
  const { room, playerId, submitVote, remainingTime } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  if (!room) return null;
  
  const currentPlayer = room.players.find(p => p.id === playerId);
  const hasVoted = currentPlayer?.vote !== undefined;
  const playerRole = currentPlayer?.role;
  
  const handleVote = () => {
    if (selectedPlayer) {
      submitVote(selectedPlayer);
    }
  };

  const getRoleHint = (role?: PlayerRole) => {
    switch (role) {
      case PlayerRole.Chameleon:
        return "You are the Chameleon! Try to blend in and avoid being voted out.";
      case PlayerRole.Mimic:
        return "You are the Mimic! You know a similar word - use this to your advantage.";
      case PlayerRole.Oracle:
        return "You are the Oracle! You know the word - help others find the Chameleon.";
      case PlayerRole.Jester:
        return "You are the Jester! Try to get voted out to win.";
      case PlayerRole.Spy:
        return "You are the Spy! You know who the Chameleon is - help others find them.";
      default:
        return "You are a regular player. Find the Chameleon!";
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Vote for the Chameleon</CardTitle>
          <CardDescription>
            {getRoleHint(playerRole)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Time remaining: {remainingTime}s</span>
          </div>
          
          <div className="grid gap-2">
            {room.players.map((player) => (
              <motion.div
                key={player.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  variant={selectedPlayer === player.id ? "default" : "outline"}
                  disabled={player.id === playerId || hasVoted}
                  className={`justify-between h-auto py-3 w-full ${
                    selectedPlayer === player.id 
                    ? "border-2 border-primary" 
                    : "border border-input"
                  }`}
                  onClick={() => setSelectedPlayer(player.id)}
                >
                  <div className="flex items-center gap-2 justify-start">
                    <UserCircle2 className="h-5 w-5" />
                    <span>{player.name}</span>
                    {player.id === playerId && (
                      <Badge variant="outline" className="ml-1">You</Badge>
                    )}
                    {player.vote && (
                      <Badge variant="secondary" className="ml-1">Voted</Badge>
                    )}
                  </div>
                  {selectedPlayer === player.id && (
                    <Check className="h-4 w-4" />
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button
            onClick={handleVote}
            disabled={!selectedPlayer || hasVoted}
            className="w-full"
          >
            {hasVoted 
              ? "Vote Submitted - Waiting for Others" 
              : "Confirm Vote"}
          </Button>
        </CardFooter>
      </Card>
      
      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Round {room.round} of {room.max_rounds}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              Based on what everyone said during the discussion, vote for who you think is the Chameleon.
              Remember to consider:
            </p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>Unusual or vague descriptions</li>
              <li>Players who seemed to struggle</li>
              <li>Inconsistencies in their hints</li>
              <li>Players who were too confident</li>
            </ul>
          </div>
        </CardContent>
      </Card>
      
      {/* Voting status */}
      <Card className="border border-muted">
        <CardHeader>
          <CardTitle className="text-base">Voting Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {room.players.map((player) => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-2"
              >
                <span>{player.name}</span>
                <Badge variant={player.vote ? "secondary" : "outline"}>
                  {player.vote ? "Voted" : "Voting..."}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
