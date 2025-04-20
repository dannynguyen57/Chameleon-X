import { PlayerRole } from './types';

export function getRoleTip(role: PlayerRole | undefined): string {
  switch (role) {
    case PlayerRole.Chameleon:
      return "Try to blend in and avoid detection while learning the secret word";
    case PlayerRole.Mimic:
      return "Copy another player's description to hide your identity";
    case PlayerRole.Oracle:
      return "Use your knowledge of the word to guide discussions subtly";
    case PlayerRole.Jester:
      return "Create confusion and misdirection while avoiding elimination";
    case PlayerRole.Spy:
      return "Investigate other players to uncover their roles";
    case PlayerRole.Mirror:
      return "Reflect another player's abilities back at them";
    case PlayerRole.Whisperer:
      return "Influence votes through secret messages";
    case PlayerRole.Timekeeper:
      return "Control the pace of discussions and voting";
    case PlayerRole.Illusionist:
      return "Create false impressions to mislead other players";
    case PlayerRole.Guardian:
      return "Protect key players from being eliminated";
    case PlayerRole.Trickster:
      return "Manipulate the game through deception and misdirection";
    case PlayerRole.Regular:
      return "Participate in discussions and vote carefully";
    default:
      return "Waiting for role assignment...";
  }
} 