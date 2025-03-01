import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ColorStore {
  color: string;
  setColor: (color: string) => void;
  clearColor: () => void;
}

export const useColorStore = create<ColorStore>()(
  persist(
    (set) => ({
      color: '',
      setColor: (color) => set({ color }),
      clearColor: () => set({ color: '' })
    }),
    { name: 'vibes-color-store' }
  )
);
