import { TaekwondoBelt } from '../types';

export interface BeltMetadata {
  id: TaekwondoBelt;
  name: string;
  geupRank: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  chipClass: string;
  ribbonGradient: string;
  description: string;
}

export const TAEKWONDO_BELTS: BeltMetadata[] = [
  {
    id: 'White',
    name: 'White Belt',
    geupRank: '10th Geup (Beginner)',
    bgColor: 'bg-white',
    textColor: 'text-slate-800',
    borderColor: 'border-slate-300 dark:border-slate-600',
    chipClass: 'bg-white text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600 shadow-2xs',
    ribbonGradient: 'from-slate-100 to-white text-slate-800 border border-slate-300',
    description: 'Beginner purity & foundation',
  },
  {
    id: 'Yellow',
    name: 'Yellow Belt',
    geupRank: '8th - 7th Geup',
    bgColor: 'bg-amber-400',
    textColor: 'text-amber-950',
    borderColor: 'border-amber-500',
    chipClass: 'bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700 shadow-2xs',
    ribbonGradient: 'from-amber-300 to-amber-500 text-amber-950 border border-amber-500',
    description: 'Seed sprouting in rich earth',
  },
  {
    id: 'Green',
    name: 'Green Belt',
    geupRank: '6th - 5th Geup',
    bgColor: 'bg-emerald-600',
    textColor: 'text-white',
    borderColor: 'border-emerald-700',
    chipClass: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700 shadow-2xs',
    ribbonGradient: 'from-emerald-500 to-emerald-700 text-white border border-emerald-600',
    description: 'Plant growing towards sunlight',
  },
  {
    id: 'Blue',
    name: 'Blue Belt',
    geupRank: '4th - 3rd Geup',
    bgColor: 'bg-sky-600',
    textColor: 'text-white',
    borderColor: 'border-sky-700',
    chipClass: 'bg-sky-100 text-sky-900 border border-sky-300 dark:bg-sky-950/70 dark:text-sky-200 dark:border-sky-700 shadow-2xs',
    ribbonGradient: 'from-sky-500 to-blue-700 text-white border border-sky-600',
    description: 'Sky & heaven reaching maturity',
  },
  {
    id: 'Red',
    name: 'Red Belt',
    geupRank: '2nd - 1st Geup',
    bgColor: 'bg-rose-600',
    textColor: 'text-white',
    borderColor: 'border-rose-700',
    chipClass: 'bg-rose-100 text-rose-900 border border-rose-300 dark:bg-rose-950/70 dark:text-rose-200 dark:border-rose-700 shadow-2xs',
    ribbonGradient: 'from-red-500 to-rose-700 text-white border border-rose-600',
    description: 'Mastery of power & self-control',
  },
  {
    id: 'Black',
    name: 'Black Belt',
    geupRank: '1st Dan & Above (Poom/Dan)',
    bgColor: 'bg-slate-950',
    textColor: 'text-amber-400',
    borderColor: 'border-slate-800 ring-1 ring-amber-400/40',
    chipClass: 'bg-slate-900 text-amber-300 border border-slate-700 dark:bg-black dark:text-amber-400 ring-1 ring-amber-400/30 shadow-2xs',
    ribbonGradient: 'from-slate-900 via-slate-950 to-black text-amber-300 border border-amber-500/50',
    description: 'Complete mastery, wisdom & leadership',
  },
];

export function getBeltMeta(belt?: TaekwondoBelt): BeltMetadata {
  const found = TAEKWONDO_BELTS.find((b) => b.id === belt);
  return found || TAEKWONDO_BELTS[0];
}
