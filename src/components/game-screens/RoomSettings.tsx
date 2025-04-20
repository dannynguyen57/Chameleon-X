import { useState } from "react";
import { useGame } from "@/context/GameContext";
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
    max_players: room?.settings.max_players || 10,
    discussion_time: room?.settings.discussion_time || 120,
    max_rounds: room?.settings.max_rounds || 3,
    game_mode: room?.settings.game_mode || 'classic',
    team_size: room?.settings.team_size || 2,
    chaos_mode: room?.settings.chaos_mode || false,
    time_per_round: room?.settings.time_per_round || 60,
    voting_time: room?.settings.voting_time || 30
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
              value={settings.game_mode}
              onValueChange={(value: GameMode) => setSettings({ ...settings, game_mode: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic Mode</SelectItem>
                <SelectItem value="creative">Creative Mode</SelectItem>
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
              value={settings.max_players}
              onChange={(e) => setSettings({ ...settings, max_players: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Discussion Time (seconds)</Label>
            <Input
              type="number"
              min="30"
              max="300"
              value={settings.discussion_time}
              onChange={(e) => setSettings({ ...settings, discussion_time: parseInt(e.target.value) })}
            />
          </div>

          <div className="space-y-2">
            <Label>Max Rounds</Label>
            <Input
              type="number"
              min="1"
              max="10"
              value={settings.max_rounds}
              onChange={(e) => setSettings({ ...settings, max_rounds: parseInt(e.target.value) })}
            />
          </div>

          {settings.game_mode === 'team' && (
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Input
                type="number"
                min="2"
                max="5"
                value={settings.team_size}
                onChange={(e) => setSettings({ ...settings, team_size: parseInt(e.target.value) })}
              />
            </div>
          )}

          {settings.game_mode === 'timed' && (
            <div className="space-y-2">
              <Label>Time per Round (seconds)</Label>
              <Input
                type="number"
                min="30"
                max="180"
                value={settings.time_per_round}
                onChange={(e) => setSettings({ ...settings, time_per_round: parseInt(e.target.value) })}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Voting Time (seconds)</Label>
            <Input
              type="number"
              min="10"
              max="60"
              value={settings.voting_time}
              onChange={(e) => setSettings({ ...settings, voting_time: parseInt(e.target.value) })}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="chaos-mode"
              checked={settings.chaos_mode}
              onCheckedChange={(checked) => setSettings({ ...settings, chaos_mode: checked })}
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