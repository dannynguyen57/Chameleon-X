import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGame } from '@/contexts/GameContext';
import { GameMode } from '@/lib/types';
import { X } from 'lucide-react';

interface GameSettingsProps {
  onClose: () => void;
}

export default function GameSettings({ onClose }: GameSettingsProps) {
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
    onClose();
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Game Settings</CardTitle>
              <CardDescription>Configure your game rules and options</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Game Mode Selection */}
          <div className="space-y-2">
            <Label>Game Mode</Label>
            <Select
              value={settings.gameMode}
              onValueChange={(value) => setSettings({ ...settings, gameMode: value as GameMode })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="chaos">Chaos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Player Settings */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Team Size</Label>
              <Input
                type="number"
                min="2"
                max="5"
                value={settings.teamSize}
                onChange={(e) => setSettings({ ...settings, teamSize: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Time Settings */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Time per Round (seconds)</Label>
              <Input
                type="number"
                min="30"
                max="180"
                value={settings.timePerRound}
                onChange={(e) => setSettings({ ...settings, timePerRound: parseInt(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="space-y-2">
              <Label>Max Rounds</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={settings.maxRounds}
                onChange={(e) => setSettings({ ...settings, maxRounds: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Chaos Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="chaos-mode"
              checked={settings.chaosMode}
              onCheckedChange={(checked) => setSettings({ ...settings, chaosMode: checked })}
            />
            <Label htmlFor="chaos-mode">Chaos Mode</Label>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSave} className="flex-1">
            Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 