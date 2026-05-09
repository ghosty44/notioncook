import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBatchStore = create(
  persist(
    (set) => ({
      entries: [],

      addEntry: (recipe, servings = 4) =>
        set((state) => {
          if (state.entries.some((e) => e.recipe.id === recipe.id)) return state;
          return { entries: [...state.entries, { recipe, servings }] };
        }),

      removeEntry: (recipeId) =>
        set((state) => ({ entries: state.entries.filter((e) => e.recipe.id !== recipeId) })),

      updateServings: (recipeId, servings) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.recipe.id === recipeId ? { ...e, servings } : e
          ),
        })),

      clearSession: () => set({ entries: [] }),
    }),
    { name: 'batch-session' }
  )
);
