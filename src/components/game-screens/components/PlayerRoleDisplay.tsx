import { memo } from "react";
import { Player, PlayerRole } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getRoleTheme } from '@/lib/roleThemes';
import { roleConfig } from '@/lib/roleConfig';

interface RoleStyle {
  theme: ReturnType<typeof getRoleTheme>;
  config: typeof roleConfig[PlayerRole];
}

const getRoleStyle = (role: PlayerRole | undefined): RoleStyle => {
  const actualRole = role || PlayerRole.Regular;
  return {
    theme: getRoleTheme(actualRole),
    config: roleConfig[actualRole]
  };
};

interface PlayerRoleDisplayProps {
  player: Player;
}

const PlayerRoleDisplay = memo(({ player }: PlayerRoleDisplayProps) => {
  const { theme, config } = getRoleStyle(player.role);
  
  return (
    <div className={cn(
      'p-3 rounded-lg border text-sm',
      theme.bg, theme.border, theme.text, theme.shadow, theme.hover
    )}>
      <div className="flex items-center gap-1.5">
        <span className="text-lg">{theme.icon}</span>
        <span className="font-semibold">{config.name}</span>
      </div>
      <p className="mt-1.5 text-xs opacity-80">{config.description}</p>
      {config.abilities && (
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Abilities:</h4>
          <ul className="text-sm space-y-1">
            {config.abilities.map((ability: string, index: number) => (
              <li key={index} className="flex items-center gap-2">
                <span className="text-xs">•</span>
                {ability}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

PlayerRoleDisplay.displayName = 'PlayerRoleDisplay';

export default PlayerRoleDisplay; 