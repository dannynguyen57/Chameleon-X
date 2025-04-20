
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { UserCircle2, Clock, Send, AlertTriangle } from "lucide-react";
import { categories } from "@/lib/word-categories";
import { roleDescriptions } from "@/lib/game-data";

export default function GamePlay() {
  const { 
    room, 
    playerId, // Use playerId from the context instead
    isPlayerChameleon, 
    isCurrentPlayerTurn,
    remainingTime, 
    submitTurnDescription,
    moveToVotingPhase,
    useSpecialAbility
  } = useGame();
  const [description, setDescription] = useState("");
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  
  if (!room || !room.category) return null;

  const category = categories.find(c => c.name === room.category);
  const timePercentage = room.timer && room.timePerRound 
    ? (room.timer / room.timePerRound) * 100
    : 0;
    
  const currentPlayer = room.players.find(player => 
    room.turnOrder && room.currentTurn !== undefined 
      ? player.id === room.turnOrder[room.currentTurn] 
      : false
  );
  
  const playerRole = room.players.find(p => p.id === currentPlayer?.id)?.role || 'standard';
  const roleIcon = playerRole === 'chameleon' 
    ? roleDescriptions.chameleon.icon
    : roleDescriptions[playerRole]?.icon || '👤';
    
  const handleSubmitDescription = () => {
    if (description.trim()) {
      submitTurnDescription(description);
      setDescription("");
    }
  };
  
  const handleUseAbility = (targetId: string) => {
    useSpecialAbility(targetId);
    setTargetPlayerId(null);
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Round {room.round} of {room.maxRounds}</CardTitle>
              <CardDescription>
                Category: <Badge variant="outline" className="ml-1">
                  {category?.emoji} {room.category}
                </Badge>
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
        <CardContent className="space-y-6">
          {/* Phase-specific content */}
          {room.state === 'presenting' && (
            <>
              {/* Current player info */}
              <div className="bg-secondary/20 p-4 rounded-lg">
                <div className="text-center mb-4">
                  <span className="inline-block px-3 py-1 rounded bg-accent">
                    {currentPlayer ? `${currentPlayer.name}'s` : 'Player'} Turn
                  </span>
                </div>
                
                {isCurrentPlayerTurn ? (
                  <div className="space-y-3">
                    <p className="text-center">It's your turn to describe the word!</p>
                    <div className="border-t border-b border-secondary py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Enter your description..."
                          maxLength={50}
                          className="max-w-xs"
                        />
                        <Button 
                          onClick={handleSubmitDescription}
                          disabled={!description.trim()}
                          size="sm"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-center mt-2">
                        Keep it brief! Don't say the word directly.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-center">
                    Wait for {currentPlayer?.name} to provide their description.
                  </p>
                )}
              </div>
  
              {/* Your info */}
              <div className="bg-secondary/30 p-6 rounded-lg text-center">
                <h3 className="text-lg font-medium mb-2">Your Role</h3>
                {isPlayerChameleon ? (
                  <div>
                    <div className="text-4xl mb-3">🦎</div>
                    <div className="font-bold text-xl text-primary mb-1">You are the Chameleon!</div>
                    <p className="text-muted-foreground">
                      Try to blend in without knowing the secret word. Listen carefully and fake it!
                    </p>
                  </div>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">👁️</div>
                    <div className="font-bold text-xl text-primary mb-1">You are a Regular Player</div>
                    <p className="text-muted-foreground mb-4">
                      The secret word is:
                    </p>
                    <div className="bg-primary text-primary-foreground py-2 px-4 rounded-md inline-block font-bold text-xl">
                      {room.secretWord}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Discussion phase */}
          {room.state === 'discussion' && (
            <>
              <div className="bg-secondary/20 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-center mb-3">Discussion Phase</h3>
                <p className="text-center">
                  Discuss the descriptions and try to identify the Chameleon.
                </p>
                <div className="mt-4 flex justify-center">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    <Clock className="h-4 w-4 mr-2" />
                    {remainingTime || 0}s remaining
                  </Badge>
                </div>
              </div>
              
              {/* Player summaries */}
              <div className="space-y-3">
                <h3 className="font-medium">Player Descriptions</h3>
                <div className="grid gap-2">
                  {room.players.map((player) => (
                    <div 
                      key={player.id} 
                      className="flex items-center justify-between p-3 rounded-md bg-card/60"
                    >
                      <div className="flex items-center gap-2">
                        <UserCircle2 className="h-5 w-5" />
                        <span>{player.name}</span>
                        {player.id === room.chameleonId && isPlayerChameleon && (
                          <Badge variant="destructive" className="ml-1">You</Badge>
                        )}
                      </div>
                      <div className="text-sm font-medium">
                        {player.turnDescription || "No description"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Special abilities */}
              {room.players.find(p => p.id === playerId)?.role !== 'standard' && 
               room.players.find(p => p.id === playerId)?.role !== 'chameleon' &&
               !room.players.find(p => p.id === playerId)?.specialAbilityUsed && (
                <div className="bg-accent/20 p-4 rounded-lg">
                  <h3 className="text-lg font-medium text-center mb-2">Special Ability</h3>
                  
                  {room.players.find(p => p.id === playerId)?.role === 'detective' && (
                    <div className="space-y-3">
                      <p className="text-center text-sm">
                        As a Detective, you can investigate one player to see if they are the Chameleon.
                      </p>
                      <div className="grid gap-2 mt-2">
                        {room.players.filter(p => p.id !== playerId).map((player) => (
                          <Button 
                            key={player.id} 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => handleUseAbility(player.id)}
                          >
                            <UserCircle2 className="h-4 w-4 mr-2" />
                            Investigate {player.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {room.players.find(p => p.id === playerId)?.role === 'protector' && (
                    <div className="space-y-3">
                      <p className="text-center text-sm">
                        As a Protector, you can shield one player from being voted out.
                      </p>
                      <div className="grid gap-2 mt-2">
                        {room.players.filter(p => p.id !== playerId).map((player) => (
                          <Button 
                            key={player.id} 
                            variant="outline" 
                            className="justify-start"
                            onClick={() => handleUseAbility(player.id)}
                          >
                            <UserCircle2 className="h-4 w-4 mr-2" />
                            Protect {player.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {room.players.find(p => p.id === playerId)?.role === 'deceiver' && (
                    <div className="text-center">
                      <p className="text-sm mb-3">
                        As a Deceiver, you can make your vote count twice in the voting phase.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => handleUseAbility('')}
                      >
                        Activate Double Vote
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Player list */}
          <div>
            <h3 className="font-medium mb-3">Players Turn Order</h3>
            <div className="grid gap-2">
              {room.turnOrder?.map((playerId, index) => {
                const player = room.players.find(p => p.id === playerId);
                const isCurrentTurn = index === room.currentTurn;
                
                return player ? (
                  <div 
                    key={player.id} 
                    className={`flex items-center gap-2 p-3 rounded-md ${
                      isCurrentTurn ? "bg-accent/20" : "bg-card/60"
                    }`}
                  >
                    <div className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                      {index + 1}
                    </div>
                    <div className="flex items-center gap-2 flex-1">
                      <UserCircle2 className="h-5 w-5" />
                      <span>{player.name}</span>
                    </div>
                    {player.turnDescription && (
                      <Badge variant="secondary">Described</Badge>
                    )}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </CardContent>
        
        {room.state === 'discussion' && !remainingTime && (
          <CardFooter className="border-t pt-4 flex flex-col gap-2">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Discussion time has ended</span>
            </div>
            <Button 
              onClick={moveToVotingPhase}
              className="w-full"
            >
              Proceed to Voting
            </Button>
          </CardFooter>
        )}
      </Card>

      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Game Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2">
            <li>Each player takes one turn to describe the secret word</li>
            <li>You <strong>cannot</strong> say the secret word directly</li>
            <li>You <strong>cannot</strong> use parts of the word or derivatives</li>
            <li>Keep your description brief - just a word or short phrase</li>
            <li>The chameleon must pretend to know the word</li>
            <li>When time runs out, everyone will vote</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
