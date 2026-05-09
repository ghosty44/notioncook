import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBatchStore = create(
  persist(
    (set) => ({
      entries: [],
      peopleCount: 4,

      addEntry: (recipe) =>
        set((state) => {
          if (state.entries.some((e) => e.recipe.id === recipe.id)) return state;
          return { entries: [...state.entries, { recipe }] };
        }),

      removeEntry: (recipeId) =>
        set((state) => ({ entries: state.entries.filter((e) => e.recipe.id !== recipeId) })),

      setPeopleCount: (n) => set({ peopleCount: Math.max(1, Math.min(20, n)) }),

      clearSession: () => set({ entries: [] }),
    }),
    { name: 'batch-session' }
  )
);
