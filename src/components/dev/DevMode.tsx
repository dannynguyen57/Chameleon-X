import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useGame } from '@/context/GameContext';
import { PlayerRole, GameMode } from '@/lib/types';
import { toast } from '@/components/ui/use-toast';
import { Slider } from "@/components/ui/slider";
import { useGameActions } from '@/hooks/useGameActions';

export default function DevMode() {
  const { room, playerId, setRoom } = useGame();
  const defaultSettings = {
    max_players: 10,
    discussion_time: 30,
    max_rounds: 3,
    game_mode: 'classic' as GameMode,
    team_size: 2,
    chaos_mode: false,
    time_per_round: 30,
    voting_time: 30
  };
  const { setPlayerRole } = useGameActions(playerId, room, room?.settings || defaultSettings, setRoom);
  const [devSettings, setDevSettings] = useState({
    timeScale: 1,
    autoFillDescriptions: false,
    autoVote: false,
    testRole: PlayerRole.Regular
  });

  if (!room) return null;

  const handleTimeScaleChange = (value: number[]) => {
    const scale = value[0];
    if (scale >= 0.1 && scale <= 10) {
      setDevSettings({ ...devSettings, timeScale: scale });
      if (room.timer) {
        const newTimer = Math.floor(room.timer * scale);
        setRoom({ ...room, timer: newTimer });
      }
    }
  };

  const handleAutoFill = async () => {
    if (!room.players) return;

    const updatedPlayers = room.players.map(player => {
      if (!player.turn_description) {
        return {
          ...player,
          turn_description: `Test description for ${player.name}`
        };
      }
      return player;
    });

    setRoom({ ...room, players: updatedPlayers });
    toast({
      title: "Auto-filled descriptions",
      description: "All players now have test descriptions"
    });
  };

  const handleAutoVote = async () => {
    if (!room.players) return;

    const updatedPlayers = room.players.map(player => {
      if (!player.vote) {
        const otherPlayers = room.players.filter(p => p.id !== player.id);
        const randomPlayer = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
        return {
          ...player,
          vote: randomPlayer.id
        };
      }
      return player;
    });

    setRoom({ ...room, players: updatedPlayers });
    toast({
      title: "Auto-voted",
      description: "All players have cast their votes"
    });
  };

  const handleSetTestRole = async (role: PlayerRole) => {
    if (!playerId) return;
    
    const success = await setPlayerRole(playerId, role);
    if (success) {
      setDevSettings({ ...devSettings, testRole: role });
      toast({
        title: "Role changed",
        description: `Your role is now ${role}`
      });
    }
  };

  return (
    <Card className="fixed bottom-20 right-4 w-96 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-lg border-2 border-primary">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-bold text-primary">Dev Mode Controls</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Time Scale: {devSettings.timeScale}x</Label>
          <Slider
            value={[devSettings.timeScale]}
            onValueChange={handleTimeScaleChange}
            min={0.1}
            max={10}
            step={0.1}
            className="w-full"
          />
        </div>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAutoFill}
          >
            Auto-fill Descriptions
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAutoVote}
          >
            Auto-vote
          </Button>
        </div>

        <div className="space-y-2">
          <Label>Test Role</Label>
          <div className="grid grid-cols-2 gap-2">
            {Object.values(PlayerRole).map((role) => (
              <Button
                key={role}
                variant={devSettings.testRole === role ? "default" : "outline"}
                className="w-full"
                onClick={() => handleSetTestRole(role)}
              >
                {role}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 