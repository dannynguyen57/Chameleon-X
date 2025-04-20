import { PlayerRole } from './types';

export interface RoleConfig {
  name: string;
  description: string;
  abilities: string[];
  tips: string[];
  winCondition: string;
}

export const roleConfig: Record<PlayerRole, RoleConfig> = {
  [PlayerRole.Regular]: {
    name: "Regular Player",
    description: "A standard player who knows the secret word and must help identify the Chameleon.",
    abilities: [
      "Knows the secret word",
      "Can vote to identify the Chameleon",
      "Can use special abilities if enabled"
    ],
    tips: [
      "Give clear but subtle hints about the word",
      "Watch for players who seem uncertain",
      "Coordinate with other regular players"
    ],
    winCondition: "Successfully identify and vote out the Chameleon"
  },
  [PlayerRole.Chameleon]: {
    name: "Chameleon",
    description: "The imposter who doesn't know the secret word and must blend in with regular players.",
    abilities: [
      "Can see other players' roles",
      "Can use special abilities if enabled",
      "Wins if not voted out"
    ],
    tips: [
      "Listen carefully to other players' descriptions",
      "Give vague but plausible hints",
      "Don't be too obvious or too quiet"
    ],
    winCondition: "Survive the voting phase without being caught"
  },
  [PlayerRole.Mimic]: {
    name: "Mimic",
    description: "A player who knows a similar word to the secret word and must use this to their advantage.",
    abilities: [
      "Knows a similar word to the secret word",
      "Can use special abilities if enabled",
      "Can help or hinder the Chameleon"
    ],
    tips: [
      "Use your knowledge of the similar word to blend in",
      "Help identify the Chameleon while maintaining your cover",
      "Be careful not to reveal your role"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Oracle]: {
    name: "Oracle",
    description: "A player with special insight who can see who the Chameleon is.",
    abilities: [
      "Can see who the Chameleon is",
      "Can use special abilities if enabled",
      "Must help others identify the Chameleon"
    ],
    tips: [
      "Guide the discussion subtly",
      "Protect yourself from being voted out",
      "Help regular players without revealing your role"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Jester]: {
    name: "Jester",
    description: "A mischievous player who wins by getting voted out as the Chameleon.",
    abilities: [
      "Can use special abilities if enabled",
      "Must act suspiciously but not too obviously",
      "Wins if voted out as the Chameleon"
    ],
    tips: [
      "Give vague or misleading hints",
      "Act suspicious but not too obviously",
      "Try to get voted out as the Chameleon"
    ],
    winCondition: "Get voted out as the Chameleon"
  },
  [PlayerRole.Spy]: {
    name: "Spy",
    description: "A player who knows the Chameleon's identity but must help them win.",
    abilities: [
      "Knows who the Chameleon is",
      "Can use special abilities if enabled",
      "Must help the Chameleon survive"
    ],
    tips: [
      "Protect the Chameleon subtly",
      "Distract other players from the real Chameleon",
      "Don't reveal your role"
    ],
    winCondition: "Help the Chameleon survive the voting phase"
  },
  [PlayerRole.Mirror]: {
    name: "Mirror",
    description: "A player who can see one other player's role.",
    abilities: [
      "Can see one other player's role",
      "Can use special abilities if enabled",
      "Must use this information wisely"
    ],
    tips: [
      "Use your knowledge strategically",
      "Help identify the Chameleon or protect yourself",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Whisperer]: {
    name: "Whisperer",
    description: "A player who can send one secret message to another player.",
    abilities: [
      "Can send one secret message",
      "Can use special abilities if enabled",
      "Must use this ability strategically"
    ],
    tips: [
      "Use your message to help or hinder others",
      "Choose your message recipient carefully",
      "Don't waste your message"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Timekeeper]: {
    name: "Timekeeper",
    description: "A player who can control the game's timing.",
    abilities: [
      "Can add or subtract time from phases",
      "Can use special abilities if enabled",
      "Must use timing strategically"
    ],
    tips: [
      "Use timing to help your team",
      "Watch for opportunities to use your ability",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Illusionist]: {
    name: "Illusionist",
    description: "A player who can make one player's vote count double.",
    abilities: [
      "Can double one player's vote",
      "Can use special abilities if enabled",
      "Must use this power strategically"
    ],
    tips: [
      "Use your ability to help your team",
      "Choose your target carefully",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Detective]: {
    name: "Detective",
    description: "A player who can investigate one player's role.",
    abilities: [
      "Can investigate one player's role",
      "Can use special abilities if enabled",
      "Must use this information wisely"
    ],
    tips: [
      "Use your investigation strategically",
      "Help identify the Chameleon",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Guardian]: {
    name: "Guardian",
    description: "A player who can protect one player from being voted out.",
    abilities: [
      "Can protect one player from votes",
      "Can use special abilities if enabled",
      "Must use this protection wisely"
    ],
    tips: [
      "Use your protection strategically",
      "Protect key players or yourself",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Trickster]: {
    name: "Trickster",
    description: "A player who can swap two players' votes.",
    abilities: [
      "Can swap two players' votes",
      "Can use special abilities if enabled",
      "Must use this power strategically"
    ],
    tips: [
      "Use your ability to help your team",
      "Choose your targets carefully",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Saboteur]: {
    name: "Saboteur",
    description: "A player who can disrupt the game in various ways.",
    abilities: [
      "Can disrupt the game in various ways",
      "Can use special abilities if enabled",
      "Must use this power strategically"
    ],
    tips: [
      "Use your abilities to create chaos",
      "Help the Chameleon or your own team",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover"
  },
  [PlayerRole.Host]: {
    name: "Host",
    description: "The game host who controls the game settings and flow.",
    abilities: [
      "Controls game settings",
      "Can start and end rounds",
      "Can manage players"
    ],
    tips: [
      "Set up the game fairly",
      "Keep the game moving smoothly",
      "Help players understand the rules"
    ],
    winCondition: "Ensure a fair and enjoyable game for all players"
  },
  [PlayerRole.Player]: {
    name: "Player",
    description: "A standard player in the game.",
    abilities: [
      "Can participate in the game",
      "Can vote and use abilities",
      "Must follow the game rules"
    ],
    tips: [
      "Pay attention to the game",
      "Follow the rules",
      "Have fun!"
    ],
    winCondition: "Help your team win the game"
  },
  [PlayerRole.Spectator]: {
    name: "Spectator",
    description: "A player who watches the game but doesn't participate.",
    abilities: [
      "Can watch the game",
      "Can chat with other spectators",
      "Cannot vote or use abilities"
    ],
    tips: [
      "Enjoy watching the game",
      "Don't interfere with the game",
      "Learn from other players"
    ],
    winCondition: "Enjoy watching the game"
  }
}; 