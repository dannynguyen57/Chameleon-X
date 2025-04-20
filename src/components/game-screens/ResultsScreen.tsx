import { useState } from "react";
import { useGame } from "@/context/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Crown, ThumbsUp, ThumbsDown } from "lucide-react";
import { PlayerRole } from "@/lib/types";

export default function ResultsScreen() {
  const { room, nextRound, playerId, isPlayerChameleon, resetGame } = useGame();
  const [chameleonGuess, setChameleonGuess] = useState<string>("");
  const [hasGuessed, setHasGuessed] = useState<boolean>(false);
  const [guessCorrect, setGuessCorrect] = useState<boolean | null>(null);
  
  if (!room || !room.chameleon_id || !room.secret_word) return null;
  
  // Tally votes
  const votes: Record<string, number> = {};
  room.players.forEach(player => {
    if (player.vote) {
      votes[player.vote] = (votes[player.vote] || 0) + 1;
    }
  });
  
  // Sort players by votes received
  const sortedPlayers = [...room.players].sort((a, b) => 
    (votes[b.id] || 0) - (votes[a.id] || 0)
  );
  
  const mostVotedPlayer = sortedPlayers[0];
  const chameleonCaught = mostVotedPlayer?.id === room.chameleon_id;
  const chameleonPlayer = room.players.find(p => p.id === room.chameleon_id);
  const isHost = playerId === room.host_id;
  
  // Check if Jester won
  const jesterPlayer = room.players.find(p => p.role === PlayerRole.Jester);
  const jesterWon = jesterPlayer && mostVotedPlayer?.id === jesterPlayer.id;
  
  const handleChameleonGuess = () => {
    const isCorrect = chameleonGuess.toLowerCase().trim() === room.secret_word?.toLowerCase().trim();
    setGuessCorrect(isCorrect);
    setHasGuessed(true);
  };
  
  const handleNextRound = () => {
    if (room.round >= room.max_rounds) {
      resetGame();
    } else {
      nextRound();
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Round Results</CardTitle>
          <CardDescription>
            {jesterWon 
              ? "The Jester has won by being voted as the Chameleon! 🤡"
              : chameleonCaught
                ? "The Chameleon was caught!"
                : "The Chameleon escaped!"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-3">Vote Results</h3>
            <div className="grid gap-2">
              {sortedPlayers.map((player) => {
                const voteCount = votes[player.id] || 0;
                const isMostVoted = player.id === mostVotedPlayer?.id && voteCount > 0;
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-md ${
                      player.id === room.chameleon_id 
                        ? "bg-primary/10" 
                        : isMostVoted 
                          ? "bg-secondary/20"
                          : "bg-card/60"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isMostVoted && voteCount > 0 && (
                        <Crown className="h-4 w-4 text-amber-500" />
                      )}
                      <span>{player.name}</span>
                      {player.id === room.chameleon_id && (
                        <Badge variant="secondary" className="ml-1">Chameleon</Badge>
                      )}
                      {player.role === PlayerRole.Jester && (
                        <Badge variant="outline" className="ml-1">Jester</Badge>
                      )}
                    </div>
                    <Badge variant={voteCount > 0 ? "secondary" : "outline"}>
                      {voteCount} {voteCount === 1 ? "vote" : "votes"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Chameleon Guess (only shown to the chameleon if caught) */}
          {isPlayerChameleon && chameleonCaught && !hasGuessed && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2">You were caught!</h3>
              <p className="text-sm mb-3">
                You have one chance to guess the secret word and win anyway:
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chameleonGuess}
                  onChange={(e) => setChameleonGuess(e.target.value)}
                  placeholder="Enter your guess..."
                  className="flex-1 px-3 py-2 rounded-md border"
                />
                <Button onClick={handleChameleonGuess}>
                  Guess
                </Button>
              </div>
            </div>
          )}
          
          {/* Chameleon guess result */}
          {hasGuessed && (
            <div className={`p-4 rounded-lg ${
              guessCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            }`}>
              <div className="flex items-center gap-2">
                {guessCorrect ? (
                  <>
                    <ThumbsUp className="h-5 w-5" />
                    <span className="font-medium">Correct! You win this round despite being caught!</span>
                  </>
                ) : (
                  <>
                    <ThumbsDown className="h-5 w-5" />
                    <span className="font-medium">Wrong guess! The word was "{room.secret_word}"</span>
                  </>
                )}
              </div>
            </div>
          )}
          
          {/* Game outcome */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Round Outcome</h3>
            {chameleonCaught ? (
              hasGuessed && guessCorrect ? (
                <p>The Chameleon was caught but guessed the word correctly! The Chameleon wins!</p>
              ) : (
                <p>The Chameleon was caught and {hasGuessed ? "couldn't guess the word" : "has a chance to guess the word"}!</p>
              )
            ) : (
              <p>The Chameleon wasn't caught! The Chameleon wins this round!</p>
            )}
          </div>
        </CardContent>
        
        {(isHost || (isPlayerChameleon && chameleonCaught && hasGuessed) || (!isPlayerChameleon && chameleonCaught)) && (
          <CardFooter>
            <Button 
              onClick={handleNextRound} 
              className="w-full"
            >
              {room.round >= room.max_rounds ? "End Game" : "Next Round"}
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
