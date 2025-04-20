
import { useState } from "react";
import { useGame } from "@/contexts/GameContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Settings, Check } from "lucide-react";
import { GameSettings as GameSettingsType, GameMode } from "@/lib/types";
import { roleDescriptions } from "@/lib/game-data";

export default function GameSettings() {
  const { room, playerId, settings, updateGameSettings } = useGame();
  const [isOpen, setIsOpen] = useState(false);
  const [formState, setFormState] = useState<Partial<GameSettingsType>>(settings);
  
  if (!room) return null;
  
  const isHost = playerId === room.hostId;
  const canEditSettings = isHost && room.state === 'lobby';
  
  const handleSaveSettings = () => {
    updateGameSettings(formState);
    setIsOpen(false);
  };
  
  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)} 
        className="flex items-center gap-2"
        disabled={!canEditSettings}
      >
        <Settings className="h-4 w-4" />
        <span>Game Settings</span>
      </Button>
    );
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Game Settings</CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Game Mode */}
          <div className="space-y-2">
            <Label htmlFor="gameMode">Game Mode</Label>
            <Select 
              value={formState.gameMode || settings.gameMode} 
              onValueChange={(value: GameMode) => setFormState({...formState, gameMode: value})}
              disabled={!canEditSettings}
            >
              <SelectTrigger id="gameMode">
                <SelectValue placeholder="Game Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classic">Classic</SelectItem>
                <SelectItem value="team">Team</SelectItem>
                <SelectItem value="chaos">Chaos</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {formState.gameMode === 'classic' && "Classic mode: One chameleon tries to blend in."}
              {formState.gameMode === 'team' && "Team mode: Players form teams to compete."}
              {formState.gameMode === 'chaos' && "Chaos mode: Multiple special roles and abilities active."}
            </p>
          </div>
          
          {/* Chaos Mode */}
          {formState.gameMode !== 'chaos' && (
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="chaosMode">Chaos Mode</Label>
                <p className="text-xs text-muted-foreground">Enable special roles and abilities</p>
              </div>
              <Switch 
                id="chaosMode" 
                checked={formState.chaosMode || settings.chaosMode}
                onCheckedChange={(checked) => setFormState({...formState, chaosMode: checked})}
                disabled={!canEditSettings}
              />
            </div>
          )}
          
          {/* Max Players */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxPlayers">Max Players: {formState.maxPlayers || settings.maxPlayers}</Label>
              <span className="text-sm">{formState.maxPlayers || settings.maxPlayers}</span>
            </div>
            <Slider
              id="maxPlayers"
              min={3}
              max={20}
              step={1}
              value={[formState.maxPlayers || settings.maxPlayers]}
              onValueChange={(value) => setFormState({...formState, maxPlayers: value[0]})}
              disabled={!canEditSettings}
            />
          </div>
          
          {/* Rounds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxRounds">Rounds: {formState.maxRounds || settings.maxRounds}</Label>
              <span className="text-sm">{formState.maxRounds || settings.maxRounds}</span>
            </div>
            <Slider
              id="maxRounds"
              min={1}
              max={10}
              step={1}
              value={[formState.maxRounds || settings.maxRounds]}
              onValueChange={(value) => setFormState({...formState, maxRounds: value[0]})}
              disabled={!canEditSettings}
            />
          </div>
          
          {/* Time Settings */}
          <div className="space-y-4">
            <h3 className="font-medium">Time Settings (seconds)</h3>
            
            <div className="space-y-2">
              <Label htmlFor="timePerRound">Time Per Turn</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="timePerRound"
                  min={10}
                  max={120}
                  step={5}
                  className="flex-1"
                  value={[formState.timePerRound || settings.timePerRound]}
                  onValueChange={(value) => setFormState({...formState, timePerRound: value[0]})}
                  disabled={!canEditSettings}
                />
                <span className="w-12 text-right">{formState.timePerRound || settings.timePerRound}s</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="discussionTime">Discussion Time</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="discussionTime"
                  min={30}
                  max={300}
                  step={30}
                  className="flex-1"
                  value={[formState.discussionTime || settings.discussionTime]}
                  onValueChange={(value) => setFormState({...formState, discussionTime: value[0]})}
                  disabled={!canEditSettings}
                />
                <span className="w-12 text-right">{formState.discussionTime || settings.discussionTime}s</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="votingTime">Voting Time</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="votingTime"
                  min={10}
                  max={120}
                  step={10}
                  className="flex-1"
                  value={[formState.votingTime || settings.votingTime]}
                  onValueChange={(value) => setFormState({...formState, votingTime: value[0]})}
                  disabled={!canEditSettings}
                />
                <span className="w-12 text-right">{formState.votingTime || settings.votingTime}s</span>
              </div>
            </div>
          </div>
          
          {/* Team Settings */}
          {formState.gameMode === 'team' && (
            <div className="space-y-2">
              <Label htmlFor="teamSize">Team Size</Label>
              <div className="flex items-center gap-2">
                <Slider
                  id="teamSize"
                  min={2}
                  max={5}
                  step={1}
                  className="flex-1"
                  value={[formState.teamSize || settings.teamSize]}
                  onValueChange={(value) => setFormState({...formState, teamSize: value[0]})}
                  disabled={!canEditSettings}
                />
                <span className="w-12 text-right">{formState.teamSize || settings.teamSize}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Players per team
              </p>
            </div>
          )}
          
          {/* Available Roles */}
          {(formState.chaosMode || formState.gameMode === 'chaos') && (
            <div className="space-y-3">
              <Label>Special Roles</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(roleDescriptions).map(([role, data]) => (
                  <Card key={role} className="p-3 bg-secondary/10">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-lg">{data.icon}</span>
                      <span>{data.name}</span>
                    </div>
                    <p className="text-xs mt-1">{data.description}</p>
                    <p className="text-xs italic mt-1">Ability: {data.ability}</p>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t p-4">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveSettings}
            disabled={!canEditSettings}
            className="gap-1"
          >
            <Check className="h-4 w-4" /> Save Settings
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
