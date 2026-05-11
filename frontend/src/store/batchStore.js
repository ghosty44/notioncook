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

      // Favorites (array of recipe id or name)
      favorites: [],

      // Comments keyed by recipe id or name
      comments: {},

      setDateRange: (start, end) => set({ startDate: start, endDate: end }),
      setMealPlan: (plan) => set({ mealPlan: plan, planLoading: false, planError: null }),
      setPlanLoading: (v) => set({ planLoading: v }),
      setPlanError: (e) => set({ planError: e, planLoading: false }),
      setPlanPreferences: (v) => set({ planPreferences: v }),
      clearMealPlan: () => set({ mealPlan: null, planError: null, planPreferences: '' }),

      updateMeal: (date, mealType, meal) =>
        set((s) => ({
          mealPlan: {
            ...s.mealPlan,
            days: s.mealPlan.days.map((d) =>
              d.date === date ? { ...d, [mealType === 'lunch' ? 'lunch' : 'dinner']: meal } : d
            ),
          },
        })),

      updateBatchSessionDate: (index, newDate) =>
        set((s) => {
          if (!s.mealPlan?.batchSessions) return s;
          const raw = new Date(newDate + 'T00:00:00').toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long',
          });
          const dayLabel = raw.charAt(0).toUpperCase() + raw.slice(1);
          return {
            mealPlan: {
              ...s.mealPlan,
              batchSessions: s.mealPlan.batchSessions.map((session, i) =>
                i === index ? { ...session, date: newDate, dayLabel } : session
              ),
            },
          };
        }),

      addEntry: (recipe) =>
        set((state) => {
          if (state.entries.some((e) => e.recipe.id === recipe.id)) return state;
          return { entries: [...state.entries, { recipe }] };
        }),
      removeEntry: (recipeId) =>
        set((state) => ({ entries: state.entries.filter((e) => e.recipe.id !== recipeId) })),
      setPeopleCount: (n) => set({ peopleCount: Math.max(1, Math.min(20, n)) }),
      clearSession: () => set({ entries: [] }),

      toggleFavorite: (recipe) =>
        set((s) => {
          const key = recipe.id || recipe.name;
          const isFav = s.favorites.includes(key);
          return { favorites: isFav ? s.favorites.filter((k) => k !== key) : [...s.favorites, key] };
        }),

      setComment: (recipeKey, text) =>
        set((s) => ({ comments: { ...s.comments, [recipeKey]: text } })),
    }),
    { name: 'batch-session' }
  )
);
