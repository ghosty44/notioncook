import React from 'react';
import { useBatchStore } from '../store/batchStore';

export default function RecipeModal({ recipe, onClose }) {
  const { addEntry, entries } = useBatchStore();
  const isInSession = entries.some((e) => e.recipe.id === recipe.id);
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {recipe.imageUrl && (
          <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-52 object-cover rounded-t-2xl" />
        )}
        <div className="p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{recipe.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl shrink-0">×</button>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {recipe.category && (
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full">{recipe.category}</span>
            )}
            {recipe.batchFriendly && (
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2.5 py-1 rounded-full">✓ Batch-friendly</span>
            )}
            {recipe.storageMethod && (
              <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">{recipe.storageMethod}</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {totalTime > 0 && (
              <div className="text-center bg-gray-50 rounded-xl p-3">
                <div className="text-lg font-bold text-gray-800">{totalTime} min</div>
                <div className="text-xs text-gray-500">Temps total</div>
              </div>
            )}
            {recipe.servings && (
              <div className="text-center bg-gray-50 rounded-xl p-3">
                <div className="text-lg font-bold text-gray-800">{recipe.servings}</div>
                <div className="text-xs text-gray-500">Portions</div>
              </div>
            )}
            {recipe.storageDays && (
              <div className="text-center bg-gray-50 rounded-xl p-3">
                <div className="text-lg font-bold text-gray-800">{recipe.storageDays}j</div>
                <div className="text-xs text-gray-500">Conservation</div>
              </div>
            )}
          </div>

          {recipe.ingredients && (
            <div className="mb-5">
              <h3 className="font-semibold text-gray-700 mb-2">Ingrédients</h3>
              <ul className="space-y-1">
                {recipe.ingredients.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-amber-500 mt-0.5">•</span>
                    {line.replace(/^[-•*]\s*/, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.instructions && (
            <div className="mb-5">
              <h3 className="font-semibold text-gray-700 mb-2">Instructions</h3>
              <ol className="space-y-2">
                {recipe.instructions.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-600">
                    <span className="shrink-0 bg-amber-100 text-amber-700 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </span>
                    {line.replace(/^\d+[.)]\s*/, '')}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            onClick={() => { if (!isInSession) addEntry(recipe, recipe.servings || 4); onClose(); }}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              isInSession ? 'bg-green-100 text-green-700' : 'bg-amber-500 text-white hover:bg-amber-600'
            }`}
          >
            {isInSession ? '✓ Déjà dans le batch planner' : '+ Ajouter au batch planner'}
          </button>
        </div>
      </div>
    </div>
  );
}
