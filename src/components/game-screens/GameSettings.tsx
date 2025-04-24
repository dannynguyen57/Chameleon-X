import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GameMode, PlayerRole, GameSettings as GameSettingsType } from '@/lib/types';
import { X } from 'lucide-react';
import { useGame } from '@/hooks/useGame';
import { toast } from 'sonner';
import { DEFAULT_SETTINGS, DEFAULT_ROLES } from '@/lib/constants';

interface GameSettingsProps {
  onClose: () => void;
}

export default function GameSettings({ onClose }: GameSettingsProps) {
  const { room, updateSettings } = useGame();
  const [settings, setSettings] = useState<GameSettingsType>(() => {
    console.log('Initializing settings with room:', room);
    // Only use room settings if they exist, otherwise use defaults
    const roomSettings = (room?.settings || {}) as Partial<GameSettingsType>;
    return {
      ...DEFAULT_SETTINGS,
      ...roomSettings,
      // Ensure timer values are properly initialized from room settings
      discussion_time: roomSettings.discussion_time || DEFAULT_SETTINGS.discussion_time,
      presenting_time: roomSettings.presenting_time || DEFAULT_SETTINGS.presenting_time,
      voting_time: roomSettings.voting_time || DEFAULT_SETTINGS.voting_time
    };
  });

  const handleSave = async () => {
    try {
      console.log('Saving settings:', settings);
      const success = await updateSettings(settings);
      console.log('Settings save result:', success);
      if (success) {
        toast.success("Settings saved successfully!");
        onClose();
      } else {
        toast.error("Failed to save settings. Please try again.");
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error("Failed to save settings. Please try again.");
    }
  };

  // Update local settings when room changes
  useEffect(() => {
    console.log('Room settings changed:', room?.settings);
    if (room?.settings) {
      setSettings(prevSettings => ({
        ...prevSettings,
        ...room.settings
      }));
    }
  }, [room?.id, room?.settings]);

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

  const handleGameModeChange = (value: string) => {
    const newMode = value as GameMode;
    const isChaosMode = newMode === GameMode.Chaos;
    
    setSettings({ 
      ...settings, 
      game_mode: newMode,
      // Enable special abilities for Chaos mode
      special_abilities: isChaosMode ? true : settings.special_abilities,
      // Update roles based on special abilities
      roles: {
        ...settings.roles,
        [newMode]: isChaosMode 
          ? DEFAULT_ROLES[newMode] 
          : settings.special_abilities 
            ? DEFAULT_ROLES[newMode]
            : DEFAULT_ROLES[newMode].filter((role: PlayerRole) => 
                role === PlayerRole.Regular || role === PlayerRole.Chameleon
              )
      }
    });
  };

  const handleSpecialAbilitiesToggle = (checked: boolean) => {
    const newRoles = { ...settings.roles };
    
    // Update roles for all game modes
    Object.keys(newRoles).forEach(mode => {
      newRoles[mode as GameMode] = checked
        ? DEFAULT_ROLES[mode as GameMode]
        : DEFAULT_ROLES[mode as GameMode].filter((role: PlayerRole) => 
            role === PlayerRole.Regular || role === PlayerRole.Chameleon
          );
    });

    setSettings({
      ...settings,
      special_abilities: checked,
      roles: newRoles
    });
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
            <Label className="text-lg font-semibold">Game Mode</Label>
            <Select
              value={settings.game_mode}
              onValueChange={handleGameModeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select game mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={GameMode.Classic}>Classic</SelectItem>
                <SelectItem value={GameMode.Teams}>Teams</SelectItem>
                <SelectItem value={GameMode.Chaos}>Chaos</SelectItem>
                <SelectItem value={GameMode.Timed}>Timed</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              {settings.game_mode === GameMode.Classic && "Classic mode with basic roles"}
              {settings.game_mode === GameMode.Teams && "Team-based gameplay with guardian roles"}
              {settings.game_mode === GameMode.Chaos && "Chaos mode with all special roles enabled"}
              {settings.game_mode === GameMode.Timed && "Timed mode with mimic roles"}
            </p>
          </div>

          {/* Special Abilities Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <Label htmlFor="special-abilities" className="text-base font-medium">
                Special Abilities
              </Label>
              <p className="text-sm text-muted-foreground">
                Enable special roles and abilities for more complex gameplay
              </p>
            </div>
            <Switch
              id="special-abilities"
              checked={settings.special_abilities}
              disabled={settings.game_mode === GameMode.Chaos}
              onCheckedChange={handleSpecialAbilitiesToggle}
            />
          </div>

          {/* Role Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-lg font-semibold">Available Roles for {settings.game_mode} Mode</Label>
            </div>
            <div className="grid gap-4">
              {Object.values(PlayerRole).map((role) => {
                const isEnabled = settings.roles[settings.game_mode]?.includes(role) || false;
                const isSpecial = role !== PlayerRole.Regular && role !== PlayerRole.Chameleon;
                const isDisabled = isSpecial && !settings.special_abilities;
                const isChaosMode = settings.game_mode === GameMode.Chaos;
                
                return (
                  <div 
                    key={role} 
                    className={`flex items-start space-x-4 p-4 border rounded-lg transition-colors ${
                      isDisabled ? 'opacity-50 bg-muted' : 'hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <Switch
                        id={`role-${role}`}
                        checked={isEnabled}
                        disabled={isDisabled || (isChaosMode && isSpecial)}
                        onCheckedChange={() => handleRoleToggle(role)}
                      />
                      <Label 
                        htmlFor={`role-${role}`} 
                        className={`font-medium ${isDisabled ? 'text-muted-foreground' : ''}`}
                      >
                        {role}
                      </Label>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">
                        {getRoleDescription(role)}
                      </p>
                      {isSpecial && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {isChaosMode 
                            ? "Always enabled in Chaos mode"
                            : "Requires Special Abilities to be enabled"
                          }
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setSettings({ ...settings, max_players: value });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Team Size</Label>
              <Input
                type="number"
                min="2"
                max="5"
                value={settings.team_size}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setSettings({ ...settings, team_size: value });
                  }
                }}
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setSettings({ ...settings, discussion_time: value });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Time per Player (seconds)</Label>
              <Input
                type="number"
                min="30"
                max="180"
                value={settings.presenting_time}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setSettings({ ...settings, presenting_time: value });
                  }
                }}
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
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setSettings({ ...settings, voting_time: value });
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Rounds</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={settings.max_rounds}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  if (!isNaN(value)) {
                    setSettings({ ...settings, max_rounds: value });
                  }
                }}
              />
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