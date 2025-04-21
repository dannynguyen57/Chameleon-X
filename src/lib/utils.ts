import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { WordCategory } from "./word-categories"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getRandomWord = (category: WordCategory): string => {
  const words = category.words;
  return words[Math.floor(Math.random() * words.length)];
};
