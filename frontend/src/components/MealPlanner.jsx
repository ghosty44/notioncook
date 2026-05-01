import React, { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';
import { addWeeks, subWeeks } from 'date-fns';
import { getWeekDays, toDateKey, formatDayLabel, formatMonthYear, SLOT_KEYS, SLOT_LABELS } from '../utils/dateUtils';
import { useMealPlanStore } from '../store/mealPlanStore';
import MealSlot from './MealSlot';
import RecipePickerModal from './RecipePickerModal';
import RecipeCard from './RecipeCard';

export default function MealPlanner({ recipes }) {
  const [weekRef, setWeekRef] = useState(new Date());
  const [activeItem, setActiveItem] = useState(null); // { recipe, date, slot }
  const [pickerContext, setPickerContext] = useState(null); // { date, slot }

  const { mealPlan, assignMeal, removeMeal } = useMealPlanStore();
  const weekDays = getWeekDays(weekRef);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // Drag start: record which meal is being dragged
  const handleDragStart = useCallback(({ active }) => {
    setActiveItem(active.data.current);
  }, []);

  // Drag end: move meal to the new slot
  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveItem(null);
    if (!over || active.id === over.id) return;

    const src = active.data.current; // { recipe, date, slot, babyMode }
    const dst = over.data.current;   // { date, slot }

    if (!dst?.date || !dst?.slot) return;

    // Place recipe in destination slot
    assignMeal(dst.date, dst.slot, src.recipe, src.babyMode || false);

    // If source was a planned meal (not just a recipe from sidebar), remove it
    if (src.date && src.slot) {
      removeMeal(src.date, src.slot);
    }
  }, [assignMeal, removeMeal]);

  const openPicker = useCallback((date, slot) => {
    setPickerContext({ date, slot });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Planning des repas</h1>
            <p className="text-sm text-gray-500 mt-0.5 capitalize">
              {formatMonthYear(weekDays[0])}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWeekRef((d) => subWeeks(d, 1))}
              className="btn-secondary px-2"
              title="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setWeekRef(new Date())}
              className="btn-secondary text-xs px-3"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              Aujourd'hui
            </button>
            <button
              onClick={() => setWeekRef((d) => addWeeks(d, 1))}
              className="btn-secondary px-2"
              title="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drag hint */}
        <p className="text-xs text-gray-400 mb-4">
          Glissez les recettes dans les créneaux, ou cliquez sur + pour choisir depuis votre bibliothèque.
        </p>

        {/* Calendar grid */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((day) => {
                const isToday = toDateKey(day) === toDateKey(new Date());
                return (
                  <div key={toDateKey(day)} className="text-center">
                    <span
                      className={`text-xs font-semibold capitalize px-2 py-1 rounded-lg ${
                        isToday
                          ? 'bg-brand-500 text-white'
                          : 'text-gray-500'
                      }`}
                    >
                      {formatDayLabel(day)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Slot rows */}
            {SLOT_KEYS.map((slot) => (
              <div key={slot} className="mb-3">
                <div className="text-xs font-medium text-gray-500 mb-1.5 ml-1">
                  {SLOT_LABELS[slot]}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => {
                    const dateKey = toDateKey(day);
                    const entry = mealPlan[dateKey]?.[slot];
                    return (
                      <MealSlot
                        key={`${dateKey}-${slot}`}
                        date={dateKey}
                        slot={slot}
                        entry={entry}
                        onAdd={() => openPicker(dateKey, slot)}
                        onRemove={() => removeMeal(dateKey, slot)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Drag overlay */}
        <DragOverlay>
          {activeItem?.recipe && (
            <RecipeCard
              recipe={activeItem.recipe}
              compact
              className="shadow-2xl rotate-2 w-36"
            />
          )}
        </DragOverlay>

        {/* Recipe picker modal */}
        {pickerContext && (
          <RecipePickerModal
            recipes={recipes}
            onSelect={(recipe) => {
              assignMeal(pickerContext.date, pickerContext.slot, recipe, false);
              setPickerContext(null);
            }}
            onClose={() => setPickerContext(null)}
            date={pickerContext.date}
            slot={pickerContext.slot}
          />
        )}
      </div>
    </DndContext>
  );
}
