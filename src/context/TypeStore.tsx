import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type TypeOptions = 'horror' | 'nsfw' | 'funny' | 'quickie' | 'random';

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
