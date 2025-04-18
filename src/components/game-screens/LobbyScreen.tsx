
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, UserCircle2 } from "lucide-react";

export default function LobbyScreen() {
  const { room, startGame, playerId } = useGame();

  if (!room) return null;

  const isHost = playerId === room.hostId;
  const canStartGame = room.players.length >= 3;

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Game Lobby</CardTitle>
          <CardDescription>
            {isHost 
              ? "You are the host. Start the game when everyone has joined." 
              : "Waiting for the host to start the game..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Players ({room.players.length})</h3>
            <div className="grid gap-2">
              {room.players.map((player) => (
                <div 
                  key={player.id} 
                  className={`flex items-center justify-between p-3 rounded-md ${
                    player.id === playerId ? "bg-primary/10" : "bg-card/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5" />
                    <span>{player.name}</span>
                    {player.id === playerId && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                  </div>
                  {player.isHost && (
                    <Badge variant="secondary" className="flex gap-1">
                      <ShieldCheck className="h-3 w-3" /> Host
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          {isHost ? (
            <Button 
              onClick={startGame} 
              disabled={!canStartGame}
              className="w-full"
            >
              {canStartGame 
                ? "Start Game" 
                : "Need at least 3 players to start"}
            </Button>
          ) : (
            <p className="text-center w-full text-muted-foreground">
              Waiting for host to start the game...
            </p>
          )}
        </CardFooter>
      </Card>

      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Game Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2">
            <li>One player will be randomly chosen as the Chameleon.</li>
            <li>Everyone except the Chameleon will see the secret word.</li>
            <li>Take turns describing the secret word without saying it directly.</li>
            <li>The Chameleon must pretend to know the word!</li>
            <li>After everyone has spoken, vote on who you think is the Chameleon.</li>
            <li>If caught, the Chameleon gets one chance to guess the word to win.</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
