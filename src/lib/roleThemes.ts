import { PlayerRole } from './types';

export interface RoleTheme {
  bg: string;
  border: string;
  button: string;
  card: string;
  text: string;
  icon: string;
  name: string;
  gradient: string;
}

export const getRoleTheme = (role?: PlayerRole): RoleTheme => {
  if (!role) {
    return {
      bg: "bg-green-50/50 dark:bg-green-950/20",
      border: "border-green-500/30",
      button: "bg-green-500 hover:bg-green-600 shadow-sm shadow-green-500/20",
      card: "bg-green-100/50 dark:bg-green-900/20",
      text: "text-green-600 dark:text-green-400",
      icon: "👤",
      name: "Regular",
      gradient: "from-green-500/10 to-green-400/5"
    };
  }
  
  switch (role) {
    case PlayerRole.Chameleon:
      return {
        bg: "bg-red-50/50 dark:bg-red-950/20",
        border: "border-red-500/30",
        button: "bg-red-500 hover:bg-red-600 shadow-sm shadow-red-500/20",
        card: "bg-red-100/50 dark:bg-red-900/20",
        text: "text-red-600 dark:text-red-400",
        icon: "🦎",
        name: "Chameleon",
        gradient: "from-red-500/10 to-red-400/5"
      };
    case PlayerRole.Mimic:
      return {
        bg: "bg-purple-50/50 dark:bg-purple-950/20",
        border: "border-purple-500/30",
        button: "bg-purple-500 hover:bg-purple-600 shadow-sm shadow-purple-500/20",
        card: "bg-purple-100/50 dark:bg-purple-900/20",
        text: "text-purple-600 dark:text-purple-400",
        icon: "🔄",
        name: "Mimic",
        gradient: "from-purple-500/10 to-purple-400/5"
      };
    case PlayerRole.Oracle:
      return {
        bg: "bg-blue-50/50 dark:bg-blue-950/20",
        border: "border-blue-500/30",
        button: "bg-blue-500 hover:bg-blue-600 shadow-sm shadow-blue-500/20",
        card: "bg-blue-100/50 dark:bg-blue-900/20",
        text: "text-blue-600 dark:text-blue-400",
        icon: "🔍",
        name: "Oracle",
        gradient: "from-blue-500/10 to-blue-400/5"
      };
    case PlayerRole.Jester:
      return {
        bg: "bg-yellow-50/50 dark:bg-yellow-950/20",
        border: "border-yellow-500/20",
        button: "bg-yellow-500 hover:bg-yellow-600",
        card: "bg-yellow-100/50 dark:bg-yellow-900/20",
        text: "text-yellow-500 dark:text-yellow-400",
        icon: "🤡",
        name: "Jester",
        gradient: "from-yellow-500/10 to-yellow-400/5"
      };
    case PlayerRole.Spy:
      return {
        bg: "bg-gray-50/50 dark:bg-gray-950/20",
        border: "border-gray-500/20",
        button: "bg-gray-500 hover:bg-gray-600",
        card: "bg-gray-100/50 dark:bg-gray-900/20",
        text: "text-gray-500 dark:text-gray-400",
        icon: "🕵️",
        name: "Spy",
        gradient: "from-gray-500/10 to-gray-400/5"
      };
    case PlayerRole.Mirror:
      return {
        bg: "bg-indigo-50/50 dark:bg-indigo-950/20",
        border: "border-indigo-500/20",
        button: "bg-indigo-500 hover:bg-indigo-600",
        card: "bg-indigo-100/50 dark:bg-indigo-900/20",
        text: "text-indigo-500 dark:text-indigo-400",
        icon: "🪞",
        name: "Mirror",
        gradient: "from-indigo-500/10 to-indigo-400/5"
      };
    case PlayerRole.Whisperer:
      return {
        bg: "bg-pink-50/50 dark:bg-pink-950/20",
        border: "border-pink-500/20",
        button: "bg-pink-500 hover:bg-pink-600",
        card: "bg-pink-100/50 dark:bg-pink-900/20",
        text: "text-pink-500 dark:text-pink-400",
        icon: "🗣️",
        name: "Whisperer",
        gradient: "from-pink-500/10 to-pink-400/5"
      };
    case PlayerRole.Timekeeper:
      return {
        bg: "bg-cyan-50/50 dark:bg-cyan-950/20",
        border: "border-cyan-500/20",
        button: "bg-cyan-500 hover:bg-cyan-600",
        card: "bg-cyan-100/50 dark:bg-cyan-900/20",
        text: "text-cyan-500 dark:text-cyan-400",
        icon: "⏱️",
        name: "Timekeeper",
        gradient: "from-cyan-500/10 to-cyan-400/5"
      };
    case PlayerRole.Illusionist:
      return {
        bg: "bg-violet-50/50 dark:bg-violet-950/20",
        border: "border-violet-500/20",
        button: "bg-violet-500 hover:bg-violet-600",
        card: "bg-violet-100/50 dark:bg-violet-900/20",
        text: "text-violet-500 dark:text-violet-400",
        icon: "🎭",
        name: "Illusionist",
        gradient: "from-violet-500/10 to-violet-400/5"
      };
    case PlayerRole.Guardian:
      return {
        bg: "bg-emerald-50/50 dark:bg-emerald-950/20",
        border: "border-emerald-500/20",
        button: "bg-emerald-500 hover:bg-emerald-600",
        card: "bg-emerald-100/50 dark:bg-emerald-900/20",
        text: "text-emerald-500 dark:text-emerald-400",
        icon: "🛡️",
        name: "Guardian",
        gradient: "from-emerald-500/10 to-emerald-400/5"
      };
    case PlayerRole.Trickster:
      return {
        bg: "bg-amber-50/50 dark:bg-amber-950/20",
        border: "border-amber-500/20",
        button: "bg-amber-500 hover:bg-amber-600",
        card: "bg-amber-100/50 dark:bg-amber-900/20",
        text: "text-amber-500 dark:text-amber-400",
        icon: "🎪",
        name: "Trickster",
        gradient: "from-amber-500/10 to-amber-400/5"
      };
    default:
      return {
        bg: "bg-green-50/50 dark:bg-green-950/20",
        border: "border-green-500/30",
        button: "bg-green-500 hover:bg-green-600 shadow-sm shadow-green-500/20",
        card: "bg-green-100/50 dark:bg-green-900/20",
        text: "text-green-600 dark:text-green-400",
        icon: "👤",
        name: "Regular",
        gradient: "from-green-500/10 to-green-400/5"
      };
  }
};

export const getRoleDescription = (role?: PlayerRole): string => {
  if (!role) return "Regular Player";
  
  switch (role) {
    case PlayerRole.Chameleon:
      return "You are the Chameleon! You don't know the word - try to blend in.";
    case PlayerRole.Mimic:
      return "You are the Mimic! You know a similar word - use this to your advantage.";
    case PlayerRole.Oracle:
      return "You are the Oracle! You know the word - help others find the Chameleon.";
    case PlayerRole.Jester:
      return "You are the Jester! Your goal is to get voted out - be suspicious but not too obvious!";
    case PlayerRole.Spy:
      return "You are the Spy! You know who the Chameleon is - help others find them.";
    case PlayerRole.Mirror:
      return "You are the Mirror! You can see one player's role - use this information wisely.";
    case PlayerRole.Whisperer:
      return "You are the Whisperer! You can send one secret message to another player.";
    case PlayerRole.Timekeeper:
      return "You are the Timekeeper! You can add or subtract time from the current phase.";
    case PlayerRole.Illusionist:
      return "You are the Illusionist! You can make one player's vote count double.";
    case PlayerRole.Guardian:
      return "You are the Guardian! You can protect one player from being voted out.";
    case PlayerRole.Trickster:
      return "You are the Trickster! You can swap two players' votes.";
    default:
      return "You are a regular player. Find the Chameleon!";
  }
}; 