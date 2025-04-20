import { PlayerRole } from './types';

export const roleConfig: Record<PlayerRole, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  name: string;
}> = {
  [PlayerRole.Regular]: {
    bg: 'bg-gradient-to-br from-blue-900/50 to-blue-800/30',
    border: 'border-blue-500/50',
    text: 'text-blue-200',
    icon: '👤',
    name: 'Regular'
  },
  [PlayerRole.Chameleon]: {
    bg: 'bg-gradient-to-br from-green-900/50 to-green-800/30',
    border: 'border-green-500/50',
    text: 'text-green-200',
    icon: '🦎',
    name: 'Chameleon'
  },
  [PlayerRole.Mimic]: {
    bg: 'bg-gradient-to-br from-orange-900/50 to-orange-800/30',
    border: 'border-orange-500/50',
    text: 'text-orange-200',
    icon: '🎭',
    name: 'Mimic'
  },
  [PlayerRole.Oracle]: {
    bg: 'bg-gradient-to-br from-purple-900/50 to-purple-800/30',
    border: 'border-purple-500/50',
    text: 'text-purple-200',
    icon: '🔮',
    name: 'Oracle'
  },
  [PlayerRole.Jester]: {
    bg: 'bg-gradient-to-br from-yellow-900/50 to-yellow-800/30',
    border: 'border-yellow-500/50',
    text: 'text-yellow-200',
    icon: '🤡',
    name: 'Jester'
  },
  [PlayerRole.Spy]: {
    bg: 'bg-gradient-to-br from-gray-900/50 to-gray-800/30',
    border: 'border-gray-500/50',
    text: 'text-gray-200',
    icon: '🕵️',
    name: 'Spy'
  },
  [PlayerRole.Mirror]: {
    bg: 'bg-gradient-to-br from-cyan-900/50 to-cyan-800/30',
    border: 'border-cyan-500/50',
    text: 'text-cyan-200',
    icon: '🪞',
    name: 'Mirror'
  },
  [PlayerRole.Whisperer]: {
    bg: 'bg-gradient-to-br from-pink-900/50 to-pink-800/30',
    border: 'border-pink-500/50',
    text: 'text-pink-200',
    icon: '🗣️',
    name: 'Whisperer'
  },
  [PlayerRole.Timekeeper]: {
    bg: 'bg-gradient-to-br from-amber-900/50 to-amber-800/30',
    border: 'border-amber-500/50',
    text: 'text-amber-200',
    icon: '⏱️',
    name: 'Timekeeper'
  },
  [PlayerRole.Illusionist]: {
    bg: 'bg-gradient-to-br from-indigo-900/50 to-indigo-800/30',
    border: 'border-indigo-500/50',
    text: 'text-indigo-200',
    icon: '🎪',
    name: 'Illusionist'
  },
  [PlayerRole.Detective]: {
    bg: 'bg-gradient-to-br from-red-900/50 to-red-800/30',
    border: 'border-red-500/50',
    text: 'text-red-200',
    icon: '🔍',
    name: 'Detective'
  },
  [PlayerRole.Guardian]: {
    bg: 'bg-gradient-to-br from-emerald-900/50 to-emerald-800/30',
    border: 'border-emerald-500/50',
    text: 'text-emerald-200',
    icon: '🛡️',
    name: 'Guardian'
  },
  [PlayerRole.Trickster]: {
    bg: 'bg-gradient-to-br from-violet-900/50 to-violet-800/30',
    border: 'border-violet-500/50',
    text: 'text-violet-200',
    icon: '🎭',
    name: 'Trickster'
  },
  [PlayerRole.Saboteur]: {
    bg: 'bg-gradient-to-br from-rose-900/50 to-rose-800/30',
    border: 'border-rose-500/50',
    text: 'text-rose-200',
    icon: '💣',
    name: 'Saboteur'
  },
  [PlayerRole.Host]: {
    bg: 'bg-gradient-to-br from-sky-900/50 to-sky-800/30',
    border: 'border-sky-500/50',
    text: 'text-sky-200',
    icon: '👑',
    name: 'Host'
  },
  [PlayerRole.Player]: {
    bg: 'bg-gradient-to-br from-slate-900/50 to-slate-800/30',
    border: 'border-slate-500/50',
    text: 'text-slate-200',
    icon: '👤',
    name: 'Player'
  },
  [PlayerRole.Spectator]: {
    bg: 'bg-gradient-to-br from-zinc-900/50 to-zinc-800/30',
    border: 'border-zinc-500/50',
    text: 'text-zinc-200',
    icon: '👀',
    name: 'Spectator'
  }
}; 