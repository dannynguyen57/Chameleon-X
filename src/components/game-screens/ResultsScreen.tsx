
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { User, Crown, ThumbsUp, ThumbsDown, Award, Trophy, Medal } from "lucide-react";

export default function ResultsScreen() {
  const { room, nextRound, playerId, isPlayerChameleon, submitChameleonGuess } = useGame();
  const [chameleonGuess, setChameleonGuess] = useState<string>("");
  const [hasGuessed, setHasGuessed] = useState<boolean>(false);
  const [guessCorrect, setGuessCorrect] = useState<boolean | null>(null);
  
  if (!room || !room.chameleonId || !room.secretWord) return null;
  
  // Tally votes
  const votesTally = room.votesTally || {};
  
  // Sort players by votes received
  const sortedPlayers = [...room.players].sort((a, b) => 
    (votesTally[b.id] || 0) - (votesTally[a.id] || 0)
  );
  
  const mostVotedPlayer = sortedPlayers.length > 0 ? sortedPlayers[0] : null;
  const chameleonCaught = mostVotedPlayer?.id === room.chameleonId;
  const chameleonPlayer = room.players.find(p => p.id === room.chameleonId);
  const isHost = playerId === room.hostId;
  
  // Determine round outcome text
  let outcomeText = "";
  if (room.roundOutcome === 'chameleon_escaped') {
    outcomeText = "The Chameleon wasn't caught! The Chameleon wins this round!";
  } else if (room.roundOutcome === 'chameleon_caught') {
    outcomeText = "The Chameleon was caught! Regular players win this round!";
  } else if (room.roundOutcome === 'chameleon_correct_guess') {
    outcomeText = "The Chameleon guessed the word correctly and wins despite being caught!";
  } else if (room.roundOutcome === 'chameleon_wrong_guess') {
    outcomeText = "The Chameleon was caught and couldn't guess the word. Regular players win!";
  }
  
  const handleChameleonGuess = async () => {
    const isCorrect = await submitChameleonGuess(chameleonGuess);
    setGuessCorrect(isCorrect);
    setHasGuessed(true);
  };
  
  const handleNextRound = () => {
    nextRound();
  };
  
  // Check if chameleon can still guess
  const canChameleonGuess = isPlayerChameleon && 
                           chameleonCaught && 
                           !hasGuessed && 
                           room.roundOutcome === 'chameleon_caught';
                           
  // Check if round can proceed                        
  const canProceed = (isHost || (isPlayerChameleon && hasGuessed) || 
                     (!isPlayerChameleon && (room.roundOutcome !== 'chameleon_caught' || 
                                          ['chameleon_wrong_guess', 'chameleon_correct_guess'].includes(room.roundOutcome || ''))));
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Round {room.round} Results</CardTitle>
          <CardDescription>
            The votes are in!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Round Winner */}
          <div className="bg-primary/10 rounded-lg p-4 text-center">
            <h3 className="text-lg font-medium mb-2">Round Outcome</h3>
            <div className="text-xl font-bold flex items-center justify-center gap-2">
              {room.roundOutcome?.includes('chameleon_escaped') || room.roundOutcome?.includes('chameleon_correct_guess') ? (
                <>
                  <Trophy className="h-5 w-5 text-yellow-500" />
                  <span>Chameleon Wins!</span>
                </>
              ) : (
                <>
                  <Medal className="h-5 w-5 text-blue-500" />
                  <span>Players Win!</span>
                </>
              )}
            </div>
            <p className="mt-2">{outcomeText}</p>
          </div>
          
          {/* Chameleon Reveal */}
          <div className="bg-secondary/30 p-6 rounded-lg text-center">
            <h3 className="text-lg font-medium mb-3">The Chameleon was...</h3>
            <div className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2 px-6 rounded-md">
              <User className="h-5 w-5" />
              <span className="font-bold text-xl">{chameleonPlayer?.name}</span>
            </div>
            
            <div className="mt-4 grid gap-2">
              <div className="flex justify-center items-center gap-2">
                <span className="font-medium">Secret Word:</span>
                <span className="bg-accent px-3 py-1 rounded font-mono">{room.secretWord}</span>
              </div>
              <div className="flex justify-center items-center gap-2">
                <span className="font-medium">Category:</span>
                <span>{room.category}</span>
              </div>
            </div>
          </div>
          
          {/* Vote Results */}
          <div>
            <h3 className="font-medium mb-3">Vote Results</h3>
            <div className="grid gap-2">
              {sortedPlayers.map((player) => {
                const voteCount = votesTally[player.id] || 0;
                const isMostVoted = mostVotedPlayer && player.id === mostVotedPlayer.id && voteCount > 0;
                const isProtected = player.isProtected;
                
                return (
                  <div 
                    key={player.id} 
                    className={`flex items-center justify-between p-3 rounded-md ${
                      player.id === room.chameleonId 
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
                      {player.id === room.chameleonId && (
                        <Badge variant="secondary" className="ml-1">Chameleon</Badge>
                      )}
                      {isProtected && (
                        <Badge variant="outline" className="ml-1">Protected</Badge>
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
          {canChameleonGuess && (
            <div className="bg-primary/10 p-4 rounded-lg">
              <h3 className="font-medium mb-2">You were caught!</h3>
              <p className="text-sm mb-3">
                You have one chance to guess the secret word and win anyway:
              </p>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={chameleonGuess}
                  onChange={(e) => setChameleonGuess(e.target.value)}
                  placeholder="Enter your guess..."
                  className="flex-1"
                />
                <Button 
                  onClick={handleChameleonGuess}
                  disabled={!chameleonGuess.trim()}
                >
                  Guess
                </Button>
              </div>
            </div>
          )}
          
          {/* Chameleon guess result */}
          {hasGuessed && (
            <div className={`p-4 rounded-lg ${
              guessCorrect ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
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
                    <span className="font-medium">Wrong guess! The word was "{room.secretWord}"</span>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
        
        {canProceed && (
          <CardFooter className="border-t pt-4">
            <Button 
              onClick={handleNextRound} 
              className="w-full"
            >
              {room.round >= room.maxRounds ? "End Game" : "Next Round"}
            </Button>
          </CardFooter>
        )}
      </Card>
      
      {/* Game Statistics */}
      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Game Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <span className="font-medium">Round {room.round} of {room.maxRounds}</span>
            <Progress value={(room.round / room.maxRounds) * 100} className="w-1/2 h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-muted/40 rounded-lg">
              <h4 className="text-sm font-medium mb-1">Total Players</h4>
              <p className="text-2xl font-bold">{room.players.length}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg">
              <h4 className="text-sm font-medium mb-1">Your Role</h4>
              <p className="text-xl font-bold">
                {isPlayerChameleon ? '🦎 Chameleon' : '👁️ Regular Player'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
