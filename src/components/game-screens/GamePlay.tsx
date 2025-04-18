
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { UserCircle2, Clock } from "lucide-react";
import { categories } from "@/lib/word-categories";

export default function GamePlay() {
  const { room, isPlayerChameleon, remainingTime, settings } = useGame();

  if (!room || !room.category) return null;

  const category = categories.find(c => c.name === room.category);
  const timePercentage = room.timer && settings?.discussionTime 
    ? (room.timer / settings.discussionTime) * 100
    : 0;

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

          <div>
            <h3 className="font-medium mb-3">Players Order</h3>
            <div className="grid gap-2">
              {room.players.map((player, index) => (
                <div 
                  key={player.id} 
                  className="flex items-center gap-2 p-3 rounded-md bg-card/60"
                >
                  <div className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="h-5 w-5" />
                    <span>{player.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-secondary/20">
        <CardHeader>
          <CardTitle className="text-xl">Discussion Rules</CardTitle>
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
