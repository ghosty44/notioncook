import React from 'react';
import { X, Clock, Users, Baby, Tag, ChefHat } from 'lucide-react';
import clsx from 'clsx';

export default function RecipeModal({ recipe, onClose, onSaveToNotion, isSaving }) {
  if (!recipe) return null;

  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);
  const isGemini = recipe.source === 'gemini';

  const ingredientLines = recipe.ingredients
    ? recipe.ingredients.split('\n').filter((l) => l.trim())
    : [];

  const instructionLines = recipe.instructions
    ? recipe.instructions.split('\n').filter((l) => l.trim())
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between gap-4 rounded-t-2xl">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{recipe.name}</h2>
            {isGemini && (
              <span className="inline-flex items-center gap-1 text-xs text-purple-500 mt-0.5">
                <span>✨</span> Suggestion générée par IA
              </span>
            )}
          </div>
          <button onClick={onClose} className="btn-ghost p-1.5 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-6">
          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {recipe.prepTime > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-500" />
                Prep : <strong>{recipe.prepTime} min</strong>
              </span>
            )}
            {recipe.cookTime > 0 && (
              <span className="flex items-center gap-1.5">
                <ChefHat className="w-4 h-4 text-brand-500" />
                Cuisson : <strong>{recipe.cookTime} min</strong>
              </span>
            )}
            {totalTime > 0 && (
              <span className="flex items-center gap-1.5 font-medium text-brand-600">
                Total : {totalTime} min
              </span>
            )}
            {recipe.servings && (
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-brand-500" />
                <strong>{recipe.servings} personnes</strong>
              </span>
            )}
          </div>

          {/* Tags */}
          {recipe.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {recipe.category && (
                <span className="badge-orange">{recipe.category}</span>
              )}
              {recipe.tags.map((t) => (
                <span key={t} className="badge bg-gray-100 text-gray-600">
                  <Tag className="w-2.5 h-2.5 mr-1" />{t}
                </span>
              ))}
            </div>
          )}

          {/* Ingredients */}
          {ingredientLines.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Ingrédients
              </h3>
              <ul className="space-y-1.5">
                {ingredientLines.map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    {line.replace(/^[-•*]\s*/, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {instructionLines.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Préparation
              </h3>
              <ol className="space-y-3">
                {instructionLines.map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{line.replace(/^\d+[.)]\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Baby adaptation */}
          {recipe.babyAdaptation && (
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <div className="flex items-center gap-2 mb-2">
                <Baby className="w-4 h-4 text-green-600" />
                <h3 className="text-sm font-semibold text-green-700">Adaptation bébé</h3>
              </div>
              <p className="text-sm text-green-800 leading-relaxed">{recipe.babyAdaptation}</p>
            </div>
          )}

          {/* Nutrition notes */}
          {recipe.nutritionNotes && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <h3 className="text-sm font-semibold text-blue-700 mb-1">Notes nutritionnelles</h3>
              <p className="text-sm text-blue-800">{recipe.nutritionNotes}</p>
            </div>
          )}

          {/* Save button for Gemini suggestions */}
          {isGemini && onSaveToNotion && (
            <div className="pt-2">
              <button
                onClick={() => onSaveToNotion(recipe)}
                disabled={isSaving}
                className="btn-primary w-full justify-center"
              >
                {isSaving ? 'Sauvegarde en cours…' : '💾 Sauvegarder dans Notion'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
