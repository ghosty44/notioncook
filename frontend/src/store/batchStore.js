import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useBatchStore = create(
  persist(
    (set) => ({
      // Meal plan
      startDate: null,
      endDate: null,
      mealPlan: null,
      planLoading: false,
      planError: null,
      planPreferences: '',

      // Manual session (RecipeLibrary fallback)
      entries: [],
      peopleCount: 4,

      setDateRange: (start, end) => set({ startDate: start, endDate: end }),
      setMealPlan: (plan) => set({ mealPlan: plan, planLoading: false, planError: null }),
      setPlanLoading: (v) => set({ planLoading: v }),
      setPlanError: (e) => set({ planError: e, planLoading: false }),
      setPlanPreferences: (v) => set({ planPreferences: v }),
      clearMealPlan: () => set({ mealPlan: null, planError: null, planPreferences: '' }),

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
