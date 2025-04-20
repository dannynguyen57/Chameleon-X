
import { RoleDescription } from "./types";

export const roleDescriptions: Record<string, RoleDescription> = {
  chameleon: {
    name: "Chameleon",
    description: "You don't know the word! Try to blend in by listening to others' clues.",
    ability: "If caught, you get one chance to guess the secret word to win.",
    icon: "🦎"
  },
  detective: {
    name: "Detective",
    description: "You can investigate one player during the game.",
    ability: "Check if a specific player is the Chameleon (once per game).",
    icon: "🔎"
  },
  protector: {
    name: "Protector",
    description: "You can protect one player from being eliminated.",
    ability: "Shield one player from being voted out (once per game).",
    icon: "🛡️"
  },
  deceiver: {
    name: "Deceiver",
    description: "Your vote counts double during voting rounds.",
    ability: "Your vote has double weight (once per game).",
    icon: "🎭"
  },
  standard: {
    name: "Player",
    description: "Regular player who knows the secret word.",
    ability: "No special abilities.",
    icon: "👤"
  }
};

export const gameModeDescriptions = {
  classic: {
    name: "Classic",
    description: "One chameleon tries to blend in while others try to identify them.",
    playerCount: "3-20 players"
  },
  team: {
    name: "Team",
    description: "Players divided into teams, with chameleons on both sides.",
    playerCount: "4-20 players (must be divisible by team size)"
  },
  chaos: {
    name: "Chaos",
    description: "All special roles active, with multiple chameleons possible.",
    playerCount: "5-20 players"
  }
};
