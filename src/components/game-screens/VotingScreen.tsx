
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCircle2, Check } from "lucide-react";

export default function VotingScreen() {
  const { room, playerId, submitVote } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  if (!room) return null;
  
  const hasVoted = room.players.find(p => p.id === playerId)?.vote !== undefined;
  
  const handleVote = () => {
    if (selectedPlayer) {
      submitVote(selectedPlayer);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Vote for the Chameleon</CardTitle>
          <CardDescription>
            Who do you think doesn't know the secret word?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            {room.players.map((player) => (
              <Button
                key={player.id}
                variant={selectedPlayer === player.id ? "default" : "outline"}
                disabled={player.id === playerId || hasVoted}
                className={`justify-between h-auto py-3 ${
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
                </div>
                {selectedPlayer === player.id && (
                  <Check className="h-4 w-4" />
                )}
              </Button>
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
          <CardTitle className="text-xl">Round {room.round} of {room.maxRounds}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Based on what everyone said during the discussion, vote for who you think is the Chameleon.
            Remember to consider unusual descriptions or responses that seemed vague.
          </p>
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
