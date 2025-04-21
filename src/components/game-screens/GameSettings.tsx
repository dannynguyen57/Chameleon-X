import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GameMode, PlayerRole, GameSettings as GameSettingsType } from '@/lib/types';
import { X } from 'lucide-react';
import { useGame } from '@/hooks/useGame';

interface GameSettingsProps {
  onClose: () => void;
}

export default function GameSettings({ onClose }: GameSettingsProps) {
  const { room, updateSettings } = useGame();
  const [settings, setSettings] = useState<GameSettingsType>({
    max_players: room?.settings.max_players || 10,
    discussion_time: room?.settings.discussion_time || 120,
    max_rounds: room?.settings.max_rounds || 3,
    game_mode: room?.settings.game_mode || GameMode.Classic,
    team_size: room?.settings.team_size || 2,
    chaos_mode: room?.settings.chaos_mode || false,
    time_per_round: room?.settings.time_per_round || 60,
    voting_time: room?.settings.voting_time || 30,
    special_abilities: room?.settings.special_abilities || false,
    roles: room?.settings.roles || {
      [GameMode.Classic]: [PlayerRole.Regular, PlayerRole.Chameleon],
      [GameMode.Teams]: [PlayerRole.Regular, PlayerRole.Chameleon],
      [GameMode.Chaos]: [PlayerRole.Regular, PlayerRole.Chameleon],
      [GameMode.Timed]: [PlayerRole.Regular, PlayerRole.Chameleon]
    }
  });

  const handleSave = async () => {
    await updateSettings(settings);
    onClose();
  };

  const handleRoleToggle = (role: PlayerRole) => {
    const currentMode = settings.game_mode;
    const currentRoles = settings.roles[currentMode] || [];
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter(r => r !== role)
      : [...currentRoles, role];
    
    setSettings({
      ...settings,
      roles: {
        ...settings.roles,
        [currentMode]: newRoles
      }
    });
  };

  const getRoleDescription = (role: PlayerRole) => {
    switch (role) {
      case PlayerRole.Regular:
        return "Knows the secret word and tries to describe it";
      case PlayerRole.Chameleon:
        return "Doesn't know the word and tries to blend in";
      case PlayerRole.Mimic:
        return "Knows a similar word but not the exact one";
      case PlayerRole.Oracle:
        return "Knows the word and can see who the chameleon is";
      case PlayerRole.Jester:
        return "Wins if they get voted as the chameleon";
      case PlayerRole.Spy:
        return "Knows the word but must pretend they don't";
      case PlayerRole.Illusionist:
        return "Can make one player's vote count double";
      case PlayerRole.Guardian:
        return "Can protect one player from being voted";
      case PlayerRole.Trickster:
        return "Can swap roles with another player once";
      default:
        return "";
    }
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
              value={settings.game_mode}
              onValueChange={(value) => setSettings({ ...settings, game_mode: value as GameMode })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="creative">Creative</SelectItem>
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
                value={settings.max_players}
                onChange={(e) => setSettings({ ...settings, max_players: parseInt(e.target.value) })}
              />
            </div>
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
          </div>

          {/* Time Settings */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label>Time per Round (seconds)</Label>
              <Input
                type="number"
                min="30"
                max="180"
                value={settings.time_per_round}
                onChange={(e) => setSettings({ ...settings, time_per_round: parseInt(e.target.value) })}
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
                value={settings.voting_time}
                onChange={(e) => setSettings({ ...settings, voting_time: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Rounds</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={settings.max_rounds}
                onChange={(e) => setSettings({ ...settings, max_rounds: parseInt(e.target.value) })}
              />
            </div>
          </div>

          {/* Special Abilities Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="special-abilities"
              checked={settings.special_abilities}
              onCheckedChange={(checked) => setSettings({ ...settings, special_abilities: checked })}
            />
            <Label htmlFor="special-abilities">Enable Special Abilities</Label>
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <Label>Available Roles for {settings.game_mode} Mode</Label>
            <div className="grid gap-4">
              {Object.values(PlayerRole).map((role) => (
                <div key={role} className="flex items-start space-x-4 p-4 border rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`role-${role}`}
                      checked={settings.roles[settings.game_mode]?.includes(role) || false}
                      onCheckedChange={() => handleRoleToggle(role)}
                    />
                    <Label htmlFor={`role-${role}`} className="font-medium">
                      {role}
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1">
                    {getRoleDescription(role)}
                  </p>
                </div>
              ))}
            </div>
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