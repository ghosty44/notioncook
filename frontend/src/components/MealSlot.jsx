import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { Plus, X, Baby, Clock, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { useMealPlanStore } from '../store/mealPlanStore';
import RecipeModal from './RecipeModal';

// Inner draggable recipe chip inside a slot
function DraggableRecipeChip({ entry, date, slot, onRemove }) {
  const [showDetail, setShowDetail] = useState(false);
  const { toggleBabyMode } = useMealPlanStore();
  const { recipe, babyMode } = entry;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `placed-${date}-${slot}`,
    data: { recipe, date, slot, babyMode },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={clsx(
          'relative group rounded-lg p-2 text-xs leading-tight transition-all',
          'bg-white border border-gray-200 shadow-sm',
          babyMode ? 'border-l-2 border-l-green-400' : 'border-l-2 border-l-brand-400',
          isDragging && 'opacity-40'
        )}
        {...attributes}
        {...listeners}
      >
        {/* Recipe name */}
        <p className="font-medium text-gray-800 truncate pr-4">{recipe.name}</p>

        {/* Meta */}
        <div className="flex items-center gap-1.5 mt-0.5 text-gray-400">
          {(recipe.prepTime || recipe.cookTime) && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {(recipe.prepTime || 0) + (recipe.cookTime || 0)}m
            </span>
          )}
          {babyMode && (
            <span className="flex items-center gap-0.5 text-green-500">
              <Baby className="w-2.5 h-2.5" />
              bébé
            </span>
          )}
        </div>

        {/* Actions overlay */}
        <div className="absolute top-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setShowDetail(true); }}
            className="w-5 h-5 rounded bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
            title="Voir la recette"
          >
            <ChevronDown className="w-3 h-3 text-gray-500" />
          </button>
          {recipe.babyAdaptation && (
            <button
              onClick={(e) => { e.stopPropagation(); toggleBabyMode(date, slot); }}
              className={clsx(
                'w-5 h-5 rounded flex items-center justify-center',
                babyMode ? 'bg-green-100 hover:bg-green-200' : 'bg-gray-100 hover:bg-gray-200'
              )}
              title={babyMode ? 'Désactiver mode bébé' : 'Activer mode bébé'}
            >
              <Baby className={clsx('w-3 h-3', babyMode ? 'text-green-600' : 'text-gray-400')} />
            </button>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="w-5 h-5 rounded bg-gray-100 hover:bg-red-100 flex items-center justify-center"
            title="Supprimer"
          >
            <X className="w-3 h-3 text-gray-500 hover:text-red-500" />
          </button>
        </div>
      </div>

      {showDetail && (
        <RecipeModal recipe={recipe} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

// Drop zone + content for a single day/slot cell
export default function MealSlot({ date, slot, entry, onAdd, onRemove }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${date}-${slot}`,
    data: { date, slot },
  });

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'min-h-[72px] rounded-xl border-2 border-dashed transition-all duration-150 relative',
        isOver
          ? 'border-brand-400 bg-brand-50'
          : 'border-gray-200 bg-gray-50 hover:border-gray-300',
        entry && 'border-solid border-transparent bg-transparent p-0'
      )}
    >
      {entry ? (
        <DraggableRecipeChip
          entry={entry}
          date={date}
          slot={slot}
          onRemove={onRemove}
        />
      ) : (
        <button
          onClick={onAdd}
          className="absolute inset-0 flex items-center justify-center w-full h-full group"
          title="Ajouter une recette"
        >
          <Plus className="w-4 h-4 text-gray-300 group-hover:text-brand-400 transition-colors" />
        </button>
      )}
    </div>
  );
}
