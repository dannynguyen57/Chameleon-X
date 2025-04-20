import { PlayerRole } from './types';

type RoleTheme = {
  gradient: string;
  border: string;
  button: string;
  text: string;
  bg: string;
  icon: string;
  description: string;
  tip: string;
  ability: string;
};

export const getRoleTheme = (role?: PlayerRole): RoleTheme => {
  switch (role) {
    case PlayerRole.Chameleon:
      return {
        gradient: 'from-red-900/50 to-red-800/30',
        border: 'border-red-500/50',
        button: 'bg-red-500 hover:bg-red-600',
        text: 'text-red-300',
        bg: 'bg-red-900/20',
        icon: '🦎',
        description: 'You are the Chameleon! You don\'t know the word - try to blend in.',
        tip: 'Listen carefully to others and create a plausible description without being obvious.',
        ability: 'If caught, you get one guess at the secret word to win the round.'
      };
    case PlayerRole.Mimic:
      return {
        gradient: 'from-orange-900/50 to-orange-800/30',
        border: 'border-orange-500/50',
        button: 'bg-orange-500 hover:bg-orange-600',
        text: 'text-orange-300',
        bg: 'bg-orange-900/20',
        icon: '🎭',
        description: 'You are the Mimic! You know a similar word - use this to your advantage.',
        tip: 'Use your similar word to create convincing descriptions.',
        ability: 'You have a similar but not exact word to help you blend in.'
      };
    case PlayerRole.Oracle:
      return {
        gradient: 'from-purple-900/50 to-purple-800/30',
        border: 'border-purple-500/50',
        button: 'bg-purple-500 hover:bg-purple-600',
        text: 'text-purple-300',
        bg: 'bg-purple-900/20',
        icon: '🔮',
        description: 'You are the Oracle! You know the word and can see the Chameleon.',
        tip: 'Guide the group subtly without revealing too much.',
        ability: 'You know who the Chameleon is.'
      };
    case PlayerRole.Jester:
      return {
        gradient: 'from-yellow-900/50 to-yellow-800/30',
        border: 'border-yellow-500/50',
        button: 'bg-yellow-500 hover:bg-yellow-600',
        text: 'text-yellow-300',
        bg: 'bg-yellow-900/20',
        icon: '🤡',
        description: 'You are the Jester! Your goal is to get voted out.',
        tip: 'Act suspicious but not too obvious.',
        ability: 'You win if you get voted out instead of the Chameleon.'
      };
    case PlayerRole.Spy:
      return {
        gradient: 'from-gray-900/50 to-gray-800/30',
        border: 'border-gray-500/50',
        button: 'bg-gray-500 hover:bg-gray-600',
        text: 'text-gray-300',
        bg: 'bg-gray-900/20',
        icon: '🕵️',
        description: 'You are the Spy! You know who the Chameleon is.',
        tip: 'Help others find the Chameleon without being too obvious.',
        ability: 'You know the Chameleon\'s identity.'
      };
    case PlayerRole.Mirror:
      return {
        gradient: 'from-cyan-900/50 to-cyan-800/30',
        border: 'border-cyan-500/50',
        button: 'bg-cyan-500 hover:bg-cyan-600',
        text: 'text-cyan-300',
        bg: 'bg-cyan-900/20',
        icon: '🪞',
        description: 'You are the Mirror! You can reveal your role to another player.',
        tip: 'Form alliances with others by sharing your identity.',
        ability: 'You can reveal your role to one player of your choice.'
      };
    case PlayerRole.Whisperer:
      return {
        gradient: 'from-pink-900/50 to-pink-800/30',
        border: 'border-pink-500/50',
        button: 'bg-pink-500 hover:bg-pink-600',
        text: 'text-pink-300',
        bg: 'bg-pink-900/20',
        icon: '🤫',
        description: 'You are the Whisperer! You can send one secret message.',
        tip: 'Share key information with trusted players.',
        ability: 'You can send one private message to another player.'
      };
    case PlayerRole.Timekeeper:
      return {
        gradient: 'from-amber-900/50 to-amber-800/30',
        border: 'border-amber-500/50',
        button: 'bg-amber-500 hover:bg-amber-600',
        text: 'text-amber-300',
        bg: 'bg-amber-900/20',
        icon: '⌛',
        description: 'You are the Timekeeper! Your vote counts double.',
        tip: 'Your vote has extra influence - use it wisely.',
        ability: 'Your vote counts as two votes.'
      };
    case PlayerRole.Illusionist:
      return {
        gradient: 'from-indigo-900/50 to-indigo-800/30',
        border: 'border-indigo-500/50',
        button: 'bg-indigo-500 hover:bg-indigo-600',
        text: 'text-indigo-300',
        bg: 'bg-indigo-900/20',
        icon: '🎩',
        description: 'You are the Illusionist! You can make another player\'s vote count double.',
        tip: 'Enhance someone else\'s voting power to influence the outcome.',
        ability: 'You can double another player\'s vote power.'
      };
    case PlayerRole.Guardian:
      return {
        gradient: 'from-green-900/50 to-green-800/30',
        border: 'border-green-500/50',
        button: 'bg-green-500 hover:bg-green-600',
        text: 'text-green-300',
        bg: 'bg-green-900/20',
        icon: '🛡️',
        description: 'You are the Guardian! You can protect one player from being voted out.',
        tip: 'Use your protection wisely - it can change the game outcome.',
        ability: 'You can protect one player from being voted out.'
      };
    case PlayerRole.Trickster:
      return {
        gradient: 'from-rose-900/50 to-rose-800/30',
        border: 'border-rose-500/50',
        button: 'bg-rose-500 hover:bg-rose-600',
        text: 'text-rose-300',
        bg: 'bg-rose-900/20',
        icon: '🃏',
        description: 'You are the Trickster! Your vote counts as negative.',
        tip: 'Your vote protects instead of condemns - a powerful tool.',
        ability: 'Your vote subtracts rather than adds to the vote count.'
      };
    default:
      return {
        gradient: 'from-blue-900/50 to-blue-800/30',
        border: 'border-blue-500/50',
        button: 'bg-blue-500 hover:bg-blue-600',
        text: 'text-blue-300',
        bg: 'bg-blue-900/20',
        icon: '👤',
        description: 'You are a Regular player. Find the Chameleon!',
        tip: 'Pay attention to suspicious descriptions that seem vague or off-topic.',
        ability: 'You know the secret word and must find the Chameleon.'
      };
  }
};

export const getRoleDescription = (role?: PlayerRole): string => {
  if (!role) return "Regular Player";
  
  const theme = getRoleTheme(role);
  return theme.description;
};

export const getRoleTip = (role?: PlayerRole): string => {
  if (!role) return "Pay attention to suspicious descriptions.";
  
  const theme = getRoleTheme(role);
  return theme.tip;
};

export const getRoleAbility = (role?: PlayerRole): string => {
  if (!role) return "You know the secret word and must find the Chameleon.";
  
  const theme = getRoleTheme(role);
  return theme.ability;
};

export const getRoleIcon = (role?: PlayerRole): string => {
  if (!role) return "👤";
  
  const theme = getRoleTheme(role);
  return theme.icon;
}; 