import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserType } from '@/lib/dexie';

type UserStore = {
  user: UserType | null;
  setUser: (user: UserType) => void;
  updateUser: (updates: Partial<UserType>) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      updateUser: (updates) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, ...updates } };
        }),
      clearUser: () => set({ user: null })
    }),
    { name: 'vibes-user-store' }
  )
);
