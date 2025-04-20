
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCircle2, Check, Clock, AlarmClock, User, Shield } from "lucide-react";

export default function VotingScreen() {
  const { room, playerId, submitVote, remainingTime, useSpecialAbility } = useGame();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  
  if (!room) return null;
  
  const currentPlayer = room.players.find(p => p.id === playerId);
  const hasVoted = currentPlayer?.vote !== undefined;
  const playerRole = currentPlayer?.role;
  const isProtector = playerRole === 'protector' && !currentPlayer?.specialAbilityUsed;
  const isDeceiver = playerRole === 'deceiver' && !currentPlayer?.specialAbilityUsed;
  const timePercentage = room.timer && room.votingTime 
    ? (room.timer / room.votingTime) * 100
    : 0;
  
  const handleVote = () => {
    if (selectedPlayer) {
      submitVote(selectedPlayer);
    }
  };
  
  const handleUseProtection = (targetId: string) => {
    useSpecialAbility(targetId);
  };
  
  const handleUseDoubleVote = () => {
    useSpecialAbility();
  };
  
  // Count votes in progress
  const votesSubmitted = room.players.filter(p => p.vote).length;
  const totalPlayers = room.players.length;
  const voteProgress = (votesSubmitted / totalPlayers) * 100;
  
  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Vote for the Chameleon</CardTitle>
              <CardDescription>
                Who do you think doesn't know the secret word?
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1 flex items-center justify-end">
                <Clock className="h-4 w-4 mr-1" />
                <span>{remainingTime || 0}s</span>
              </div>
              <Progress value={timePercentage} className="w-32 h-2" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Special role actions */}
          {(isProtector || isDeceiver) && !hasVoted && (
            <div className="bg-accent/20 p-4 rounded-lg mb-4">
              <h3 className="font-medium mb-3">Special Ability</h3>
              
              {isProtector && (
                <div className="space-y-2">
                  <p className="text-sm">You can protect one player from being eliminated this round.</p>
                  <div className="grid gap-2 mt-2">
                    {room.players.filter(p => p.id !== playerId).map((player) => (
                      <Button 
                        key={player.id} 
                        variant="outline" 
                        className="justify-start"
                        onClick={() => handleUseProtection(player.id)}
                      >
                        <Shield className="h-4 w-4 mr-2" />
                        Protect {player.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {isDeceiver && (
                <div className="text-center">
                  <p className="text-sm mb-3">Activate your ability to make your vote count twice.</p>
                  <Button 
                    variant="outline"
                    onClick={handleUseDoubleVote}
                    className="mx-auto"
                  >
                    Activate Double Vote
                  </Button>
                </div>
              )}
            </div>
          )}
          
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
                  {player.isProtected && (
                    <Badge variant="secondary" className="ml-1">Protected</Badge>
                  )}
                  {currentPlayer?.voteMultiplier && currentPlayer.voteMultiplier > 1 && player.id === currentPlayer.vote && (
                    <Badge variant="secondary" className="ml-1">Double Vote</Badge>
                  )}
                </div>
                {selectedPlayer === player.id && (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex-col space-y-4">
          <Button
            onClick={handleVote}
            disabled={!selectedPlayer || hasVoted}
            className="w-full"
          >
            {hasVoted 
              ? "Vote Submitted - Waiting for Others" 
              : "Confirm Vote"}
          </Button>
          
          {/* Voting progress */}
          <div className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span>Votes: {votesSubmitted}/{totalPlayers}</span>
              <span>{Math.round(voteProgress)}%</span>
            </div>
            <Progress value={voteProgress} className="w-full h-2" />
          </div>
        </CardFooter>
      </Card>
      
      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Round {room.round} of {room.maxRounds}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Based on what everyone said during the discussion, vote for who you think is the Chameleon.
            Remember to consider unusual descriptions or responses that seemed vague.
          </p>
          
          <div className="bg-secondary/10 p-4 rounded-lg">
            <h3 className="font-medium mb-2">Voting Guidelines</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>The player with the most votes will be accused of being the Chameleon</li>
              <li>If the Chameleon is caught, they get one chance to guess the word</li>
              <li>If the guess is correct, the Chameleon wins despite being caught</li>
              <li>If the wrong person is accused, the Chameleon wins automatically</li>
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
                <span className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {player.name}
                  {player.id === playerId && <span className="text-xs text-muted-foreground">(You)</span>}
                </span>
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
