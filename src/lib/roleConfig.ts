import { PlayerRole } from './types';
import { Search, Smile, Laugh, Lightbulb, Crown, Eye, Shield, Award, EyeOff } from "lucide-react";
import { LucideIcon } from "lucide-react";

export interface RoleConfig {
  name: string;
  description: string;
  abilities: string[];
  tips: string[];
  winCondition: string;
  icon: LucideIcon;
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
    winCondition: "Successfully identify and vote out the Chameleon",
    icon: Search
  },
  [PlayerRole.Chameleon]: {
    name: "Chameleon",
    description: "The imposter who doesn't know the secret word and must blend in with regular players.",
    abilities: [
      "Can see other players' roles",
      "Can use 'Blend In' ability once per game",
      "Wins if not voted out"
    ],
    tips: [
      "Listen carefully to other players' descriptions",
      "Use your 'Blend In' ability strategically",
      "Don't be too obvious or too quiet"
    ],
    winCondition: "Survive the voting phase without being caught",
    icon: Smile
  },
  [PlayerRole.Mimic]: {
    name: "Mimic",
    description: "A player who knows a similar word to the secret word and must use this to their advantage.",
    abilities: [
      "Knows a similar word to the secret word",
      "Can mimic another player's description style",
      "Can help or hinder the Chameleon"
    ],
    tips: [
      "Use your knowledge of the similar word to blend in",
      "Mimic other players' description styles",
      "Be careful not to reveal your role"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover",
    icon: Laugh
  },
  [PlayerRole.Oracle]: {
    name: "Oracle",
    description: "A player with special insight who can see who the Chameleon is.",
    abilities: [
      "Can see who the Chameleon is",
      "Can guide other players subtly",
      "Must help others identify the Chameleon"
    ],
    tips: [
      "Guide the discussion subtly",
      "Use your abilities to help others",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover",
    icon: Lightbulb
  },
  [PlayerRole.Jester]: {
    name: "Jester",
    description: "A mischievous player who wins by getting voted out as the Chameleon.",
    abilities: [
      "Can act suspicious to draw attention",
      "Can distract other players",
      "Wins if voted out as the Chameleon"
    ],
    tips: [
      "Act suspicious but not too obviously",
      "Use your abilities to draw attention",
      "Try to get voted out as the Chameleon"
    ],
    winCondition: "Get voted out as the Chameleon",
    icon: Crown
  },
  [PlayerRole.Spy]: {
    name: "Spy",
    description: "A player who knows the Chameleon's identity but must help them win.",
    abilities: [
      "Knows who the Chameleon is",
      "Can protect the Chameleon",
      "Must help the Chameleon survive"
    ],
    tips: [
      "Protect the Chameleon subtly",
      "Use your abilities to help the Chameleon",
      "Don't reveal your role"
    ],
    winCondition: "Help the Chameleon survive the voting phase",
    icon: Eye
  },
  [PlayerRole.Guardian]: {
    name: "Guardian",
    description: "A player who can protect one player from being voted out.",
    abilities: [
      "Can protect one player from votes",
      "Protection lasts for one round",
      "Must use protection wisely"
    ],
    tips: [
      "Use your protection strategically",
      "Protect key players or yourself",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover",
    icon: Shield
  },
  [PlayerRole.Trickster]: {
    name: "Trickster",
    description: "A player who can swap two players' votes.",
    abilities: [
      "Can swap two players' votes",
      "Can use ability once per game",
      "Must use power strategically"
    ],
    tips: [
      "Use your ability to help your team",
      "Choose your targets carefully",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover",
    icon: Award
  },
  [PlayerRole.Illusionist]: {
    name: "Illusionist",
    description: "A player who can make one player's vote count double.",
    abilities: [
      "Can double one player's vote",
      "Can use ability once per game",
      "Must use power strategically"
    ],
    tips: [
      "Use your ability to help your team",
      "Choose your target carefully",
      "Don't reveal your role too early"
    ],
    winCondition: "Help identify the Chameleon while maintaining your cover",
    icon: EyeOff
  },
}; 