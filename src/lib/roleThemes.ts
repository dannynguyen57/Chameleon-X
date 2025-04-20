import { PlayerRole } from './types';

export interface RoleTheme {
  bg: string;
  border: string;
  text: string;
  icon: string;
  name: string;
  description: string;
  shadow: string;
  hover: string;
  ring: string;
  button: string;
  card: string;
}

export const getRoleTheme = (role: PlayerRole): RoleTheme => {
  const baseStyles = {
    shadow: 'shadow-lg',
    hover: 'hover:scale-105 transition-all duration-200',
    ring: 'ring-2 ring-offset-2'
  };

  switch (role) {
    case PlayerRole.Regular:
      return {
        ...baseStyles,
        bg: 'bg-slate-900/80',
        border: 'border-slate-700/50',
        button: 'bg-slate-800/40 hover:bg-slate-700/40',
        card: 'bg-slate-800/40 backdrop-blur-sm',
        text: 'text-slate-100',
        icon: '👤',
        name: 'Regular Player',
        description: 'A standard player who knows the secret word and must help identify the Chameleon.'
      };
    case PlayerRole.Chameleon:
      return {
        ...baseStyles,
        bg: 'bg-red-900/80',
        border: 'border-red-700/50',
        text: 'text-red-100',
        icon: '🦎',
        name: 'Chameleon',
        description: 'The imposter who doesn\'t know the secret word and must blend in with regular players.',
        button: 'bg-red-800/40 hover:bg-red-700/40',
        card: 'bg-red-800/40 backdrop-blur-sm'
      };
    case PlayerRole.Mimic:
      return {
        ...baseStyles,
        bg: 'bg-orange-900/80',
        border: 'border-orange-500/50',
        button: 'bg-orange-700 hover:bg-orange-600',
        card: 'bg-orange-800/40 backdrop-blur-sm',
        text: 'text-orange-200',
        icon: '🎭',
        name: 'Mimic',
        description: 'You know a similar word - use this to your advantage.'
      };
    case PlayerRole.Oracle:
      return {
        ...baseStyles,
        bg: 'bg-purple-900/80',
        border: 'border-purple-500/50',
        button: 'bg-purple-700 hover:bg-purple-600',
        card: 'bg-purple-800/40 backdrop-blur-sm',
        text: 'text-purple-200',
        icon: '🔮',
        name: 'Oracle',
        description: 'You know the word - help others find the Chameleon.'
      };
    case PlayerRole.Jester:
      return {
        ...baseStyles,
        bg: 'bg-yellow-900/80',
        border: 'border-yellow-500/50',
        button: 'bg-yellow-700 hover:bg-yellow-600',
        card: 'bg-yellow-800/40 backdrop-blur-sm',
        text: 'text-yellow-200',
        icon: '🤡',
        name: 'Jester',
        description: 'Your goal is to get voted out - be suspicious but not too obvious!'
      };
    case PlayerRole.Spy:
      return {
        ...baseStyles,
        bg: 'bg-gray-900/80',
        border: 'border-gray-500/50',
        button: 'bg-gray-700 hover:bg-gray-600',
        card: 'bg-gray-800/40 backdrop-blur-sm',
        text: 'text-gray-200',
        icon: '🕵️',
        name: 'Spy',
        description: 'You know who the Chameleon is - help others find them.'
      };
    case PlayerRole.Mirror:
      return {
        ...baseStyles,
        bg: 'bg-cyan-900/80',
        border: 'border-cyan-500/50',
        button: 'bg-cyan-700 hover:bg-cyan-600',
        card: 'bg-cyan-800/40 backdrop-blur-sm',
        text: 'text-cyan-200',
        icon: '🪞',
        name: 'Mirror',
        description: 'You can see one player\'s role - use this information wisely.'
      };
    case PlayerRole.Whisperer:
      return {
        ...baseStyles,
        bg: 'bg-pink-900/80',
        border: 'border-pink-500/50',
        button: 'bg-pink-700 hover:bg-pink-600',
        card: 'bg-pink-800/40 backdrop-blur-sm',
        text: 'text-pink-200',
        icon: '🗣️',
        name: 'Whisperer',
        description: 'You can send one secret message to another player.'
      };
    case PlayerRole.Timekeeper:
      return {
        ...baseStyles,
        bg: 'bg-amber-900/80',
        border: 'border-amber-500/50',
        button: 'bg-amber-700 hover:bg-amber-600',
        card: 'bg-amber-800/40 backdrop-blur-sm',
        text: 'text-amber-200',
        icon: '⏱️',
        name: 'Timekeeper',
        description: 'You can add or subtract time from the current phase.'
      };
    case PlayerRole.Illusionist:
      return {
        ...baseStyles,
        bg: 'bg-indigo-900/80',
        border: 'border-indigo-500/50',
        button: 'bg-indigo-700 hover:bg-indigo-600',
        card: 'bg-indigo-800/40 backdrop-blur-sm',
        text: 'text-indigo-200',
        icon: '🎪',
        name: 'Illusionist',
        description: 'You can make one player\'s vote count double.'
      };
    case PlayerRole.Detective:
      return {
        ...baseStyles,
        bg: 'bg-blue-900/80',
        border: 'border-blue-500/50',
        button: 'bg-blue-700 hover:bg-blue-600',
        card: 'bg-blue-800/40 backdrop-blur-sm',
        text: 'text-blue-200',
        icon: '🔍',
        name: 'Detective',
        description: 'Find the Chameleon!'
      };
    case PlayerRole.Guardian:
      return {
        ...baseStyles,
        bg: 'bg-emerald-900/80',
        border: 'border-emerald-500/50',
        button: 'bg-emerald-700 hover:bg-emerald-600',
        card: 'bg-emerald-800/40 backdrop-blur-sm',
        text: 'text-emerald-200',
        icon: '🛡️',
        name: 'Guardian',
        description: 'You can protect one player from being voted out.'
      };
    case PlayerRole.Trickster:
      return {
        ...baseStyles,
        bg: 'bg-violet-900/80',
        border: 'border-violet-500/50',
        button: 'bg-violet-700 hover:bg-violet-600',
        card: 'bg-violet-800/40 backdrop-blur-sm',
        text: 'text-violet-200',
        icon: '🎭',
        name: 'Trickster',
        description: 'You can swap two players\' votes.'
      };
    case PlayerRole.Saboteur:
      return {
        ...baseStyles,
        bg: 'bg-rose-900/80',
        border: 'border-rose-500/50',
        button: 'bg-rose-700 hover:bg-rose-600',
        card: 'bg-rose-800/40 backdrop-blur-sm',
        text: 'text-rose-200',
        icon: '💣',
        name: 'Saboteur',
        description: 'Your goal is to sabotage the game.'
      };
    case PlayerRole.Host:
      return {
        ...baseStyles,
        bg: 'bg-sky-900/80',
        border: 'border-sky-500/50',
        button: 'bg-sky-700 hover:bg-sky-600',
        card: 'bg-sky-800/40 backdrop-blur-sm',
        text: 'text-sky-200',
        icon: '👑',
        name: 'Host',
        description: 'You are the game master.'
      };
    case PlayerRole.Player:
      return {
        ...baseStyles,
        bg: 'bg-slate-900/80',
        border: 'border-slate-500/50',
        button: 'bg-slate-700 hover:bg-slate-600',
        card: 'bg-slate-800/40 backdrop-blur-sm',
        text: 'text-slate-200',
        icon: '👤',
        name: 'Player',
        description: 'You are a regular player. Find the Chameleon!'
      };
    case PlayerRole.Spectator:
      return {
        ...baseStyles,
        bg: 'bg-zinc-900/80',
        border: 'border-zinc-500/50',
        button: 'bg-zinc-700 hover:bg-zinc-600',
        card: 'bg-zinc-800/40 backdrop-blur-sm',
        text: 'text-zinc-200',
        icon: '👀',
        name: 'Spectator',
        description: 'You are observing the game.'
      };
    default:
      return {
        ...baseStyles,
        bg: 'bg-slate-900/80',
        border: 'border-slate-500/50',
        button: 'bg-slate-700 hover:bg-slate-600',
        card: 'bg-slate-800/40 backdrop-blur-sm',
        text: 'text-slate-200',
        icon: '👤',
        name: 'Regular',
        description: 'You are a regular player. Find the Chameleon!'
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