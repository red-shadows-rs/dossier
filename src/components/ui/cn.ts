// Dossier - Cn Ui Component
// https://github.com/red-shadows-rs/dossier

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
