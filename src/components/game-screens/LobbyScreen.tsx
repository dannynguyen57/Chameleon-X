
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, UserCircle2, Check, Clock, Users } from "lucide-react";
import GameSettings from "./GameSettings";
import { gameModeDescriptions } from "@/lib/game-data";

export default function LobbyScreen() {
  const { room, togglePlayerReady, startGame, playerId } = useGame();

  if (!room) return null;

  const isHost = playerId === room.hostId;
  const currentPlayer = room.players.find(p => p.id === playerId);
  const isPlayerReady = currentPlayer?.isReady || false;
  const allPlayersReady = room.players.every(p => p.isReady);
  const canStartGame = room.players.length >= 3 && allPlayersReady;
  const gameMode = room.gameMode || 'classic';

  return (
    <div className="space-y-6">
      <Card className="border-2 border-primary/20 shadow-lg">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-2xl">Game Lobby</CardTitle>
              <CardDescription>
                {isHost 
                  ? "You are the host. Start the game when everyone is ready." 
                  : "Waiting for the host to start the game..."}
              </CardDescription>
            </div>
            <GameSettings />
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="players" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="players" className="flex gap-2 items-center">
                <Users className="h-4 w-4" />
                <span>Players ({room.players.length})</span>
              </TabsTrigger>
              <TabsTrigger value="info" className="flex gap-2 items-center">
                <Clock className="h-4 w-4" />
                <span>Game Info</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="players" className="mt-4">
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
                    <div className="flex items-center gap-2">
                      {player.isReady && (
                        <Badge variant="secondary" className="flex gap-1">
                          <Check className="h-3 w-3" /> Ready
                        </Badge>
                      )}
                      {player.isHost && (
                        <Badge variant="secondary" className="flex gap-1">
                          <ShieldCheck className="h-3 w-3" /> Host
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="info" className="mt-4 space-y-4">
              <div>
                <h3 className="font-medium mb-2">Game Mode: {gameModeDescriptions[gameMode].name}</h3>
                <p className="text-sm text-muted-foreground">{gameModeDescriptions[gameMode].description}</p>
                <p className="text-sm mt-1">Recommended: {gameModeDescriptions[gameMode].playerCount}</p>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Settings</h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-secondary/10 rounded">
                    <span className="text-xs text-muted-foreground">Rounds</span>
                    <p className="font-medium">{room.maxRounds}</p>
                  </div>
                  <div className="p-2 bg-secondary/10 rounded">
                    <span className="text-xs text-muted-foreground">Discussion Time</span>
                    <p className="font-medium">{room.discussionTime}s</p>
                  </div>
                  <div className="p-2 bg-secondary/10 rounded">
                    <span className="text-xs text-muted-foreground">Max Players</span>
                    <p className="font-medium">{room.maxPlayers}</p>
                  </div>
                  <div className="p-2 bg-secondary/10 rounded">
                    <span className="text-xs text-muted-foreground">Chaos Mode</span>
                    <p className="font-medium">{room.chaosMode ? "Enabled" : "Disabled"}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">How to Play</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>One player will be randomly chosen as the Chameleon</li>
                  <li>Everyone except the Chameleon will see the secret word</li>
                  <li>Take turns describing the secret word without saying it directly</li>
                  <li>The Chameleon must pretend to know the word</li>
                  <li>After everyone has spoken, vote on who you think is the Chameleon</li>
                  <li>If caught, the Chameleon gets one chance to guess the word to win</li>
                </ol>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button 
            onClick={togglePlayerReady} 
            variant={isPlayerReady ? "outline" : "secondary"}
            className="w-full"
          >
            {isPlayerReady ? "I'm not ready" : "I'm ready!"}
          </Button>
          
          {isHost && (
            <Button 
              onClick={startGame} 
              disabled={!canStartGame}
              className="w-full"
            >
              {room.players.length < 3 
                ? "Need at least 3 players to start" 
                : !allPlayersReady 
                  ? "Waiting for all players to be ready"
                  : "Start Game"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
