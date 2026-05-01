import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../utils/api';

export const useMealPlanStore = create(
  persist(
    (set, get) => ({
      // { 'YYYY-MM-DD': { breakfast: { recipe, babyMode }, lunch: {...}, dinner: {...} } }
      mealPlan: {},

      assignMeal: async (date, slot, recipe, babyMode = false) => {
        try {
          await api.put(`/meals/${date}/${slot}`, { recipe, babyMode });
        } catch {
          // Silently fallback to local-only if backend unavailable
        }
        set((state) => ({
          mealPlan: {
            ...state.mealPlan,
            [date]: {
              ...state.mealPlan[date],
              [slot]: { recipe, babyMode },
            },
          },
        }));
      },

      removeMeal: async (date, slot) => {
        try {
          await api.delete(`/meals/${date}/${slot}`);
        } catch {
          // Silently fallback
        }
        set((state) => {
          const day = { ...state.mealPlan[date] };
          delete day[slot];
          const next = { ...state.mealPlan };
          if (Object.keys(day).length === 0) {
            delete next[date];
          } else {
            next[date] = day;
          }
          return { mealPlan: next };
        });
      },

      toggleBabyMode: (date, slot) => {
        set((state) => {
          const entry = state.mealPlan[date]?.[slot];
          if (!entry) return state;
          return {
            mealPlan: {
              ...state.mealPlan,
              [date]: {
                ...state.mealPlan[date],
                [slot]: { ...entry, babyMode: !entry.babyMode },
              },
            },
          };
        });
      },

      getMealsForRange: (startDate, endDate) => {
        const plan = get().mealPlan;
        const result = {};
        Object.keys(plan).forEach((date) => {
          if (date >= startDate && date <= endDate) result[date] = plan[date];
        });
        return result;
      },

      clearDay: (date) => {
        set((state) => {
          const next = { ...state.mealPlan };
          delete next[date];
          return { mealPlan: next };
        });
      },
    }),
    { name: 'notioncook-meal-plan' }
  )
);
