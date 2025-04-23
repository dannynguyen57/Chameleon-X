import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useGame } from '@/hooks/useGame';  
import { useToast } from '@/components/ui/use-toast';
import { PlayerRole, GameMode } from '@/lib/types';

export default function DevModeSetup() {
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const { createRoom, joinRoom } = useGame();
  const { toast } = useToast();

  const handleCreateTestRoom = async () => {
    if (!playerName) {
      toast({
        title: 'Error',
        description: 'Please enter a player name',
        variant: 'destructive',
      });
      return;
    }

    try {
      const roomId = await createRoom(playerName, {
        max_players: 4,
        discussion_time: 60,
        presenting_time: 60,
        voting_time: 30,
        max_rounds: 3,
        game_mode: GameMode.Classic,
        team_size: 2,
        chaos_mode: false,
        roles: {
          [GameMode.Classic]: [PlayerRole.Regular, PlayerRole.Chameleon, PlayerRole.Mimic, PlayerRole.Oracle],
          [GameMode.Teams]: [PlayerRole.Regular, PlayerRole.Chameleon],
          [GameMode.Chaos]: [PlayerRole.Regular, PlayerRole.Chameleon],
          [GameMode.Timed]: [PlayerRole.Regular, PlayerRole.Chameleon]
        },
        special_abilities: true
      });
      
      if (roomId) {
        toast({
          title: 'Success',
          description: `Test room created with ID: ${roomId}`,
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create test room',
        variant: 'destructive',
      });
    }
  };

  const handleJoinTestRoom = async () => {
    if (!playerName || !roomId) {
      toast({
        title: 'Error',
        description: 'Please enter both player name and room ID',
        variant: 'destructive',
      });
      return;
    }

    try {
      await joinRoom(roomId, playerName);
      toast({
        title: 'Success',
        description: 'Joined test room successfully',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to join test room',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card className="w-full max-w-md p-4">
      <h2 className="text-xl font-bold mb-4">Chameleon X - Dev Mode</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Player Name</label>
          <Input
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Room ID (Optional)</label>
          <Input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID to join"
          />
        </div>
        <div className="flex flex-col gap-2">
          <Button onClick={handleCreateTestRoom} className="w-full">
            Create Test Room
          </Button>
          {roomId && (
            <Button onClick={handleJoinTestRoom} className="w-full" variant="outline">
              Join Test Room
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
} 