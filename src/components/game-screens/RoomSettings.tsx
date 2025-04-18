import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { GameMode } from "@/lib/types";

export default function RoomSettings() {
  const { room, updateSettings } = useGame();
  const [settings, setSettings] = useState({
    maxPlayers: room?.settings.maxPlayers || 10,
    discussionTime: room?.settings.discussionTime || 120,
    maxRounds: room?.settings.maxRounds || 3,
    gameMode: room?.settings.gameMode || 'classic',
    teamSize: room?.settings.teamSize || 2,
    chaosMode: room?.settings.chaosMode || false,
    timePerRound: room?.settings.timePerRound || 60,
    votingTime: room?.settings.votingTime || 30
  });

  const handleSave = async () => {
    await updateSettings(settings);
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader>
        <CardTitle>Room Settings</CardTitle>
        <CardDescription>
          Customize your game experience
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Game Mode</Label>
            <Select
              value={settings.gameMode}
              onValueChange={(value: GameMode) => setSettings({ ...settings, gameMode: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic Mode</SelectItem>
                <SelectItem value="timed">Timed Mode</SelectItem>
                <SelectItem value="chaos">Chaos Mode</SelectItem>
                <SelectItem value="team">Team Mode</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Max Players</Label>
            <Input
              type="number"
              min="3"
              max="20"
              value={settings.maxPlayers}
              onChange={(e) => setSettings({ ...settings, maxPlayers: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Discussion Time (seconds)</Label>
            <Input
              type="number"
              min="30"
              max="300"
              value={settings.discussionTime}
              onChange={(e) => setSettings({ ...settings, discussionTime: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Rounds</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={settings.maxRounds}
              onChange={(e) => setSettings({ ...settings, maxRounds: parseInt(e.target.value) })}
            />
          </div>

          {settings.gameMode === 'team' && (
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Input
                type="number"
                min="2"
                max="5"
                value={settings.teamSize}
                onChange={(e) => setSettings({ ...settings, teamSize: parseInt(e.target.value) })}
              />
            </div>
          )}

          {settings.gameMode === 'timed' && (
            <div className="space-y-2">
              <Label>Time per Round (seconds)</Label>
              <Input
                type="number"
                min="30"
                max="180"
                value={settings.timePerRound}
                onChange={(e) => setSettings({ ...settings, timePerRound: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Voting Time (seconds)</Label>
            <Input
              type="number"
              min="10"
              max="60"
              value={settings.votingTime}
              onChange={(e) => setSettings({ ...settings, votingTime: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="chaos-mode"
              checked={settings.chaosMode}
              onCheckedChange={(checked) => setSettings({ ...settings, chaosMode: checked })}
            />
            <Label htmlFor="chaos-mode">Chaos Mode</Label>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSave} className="w-full">
          Save Settings
        </Button>
      </CardFooter>
    </Card>
  );
} 