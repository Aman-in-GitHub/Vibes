import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const VIBE_OPTIONS = [
  'horror',
  'quickie',
  'nsfw',
  'funny',
  'conspiracy',
  'random'
];

type TypeOptions = (typeof VIBE_OPTIONS)[number];

type TypeStore = {
  vibeType: TypeOptions;
  setVibeType: (vibeType: TypeOptions) => void;
  clearVibeType: () => void;
};

export const useTypeStore = create<TypeStore>()(
  persist(
    (set) => ({
      vibeType: 'random',
      setVibeType: (vibeType) => set({ vibeType }),
      clearVibeType: () => set({ vibeType: 'random' })
    }),
    { name: 'vibes-type-store' }
  )
);
