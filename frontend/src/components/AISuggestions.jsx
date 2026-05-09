import React, { useState } from 'react';
import { useBatchStore } from '../store/batchStore';
import { useBatch } from '../hooks/useBatch';
import RecipeModal from './RecipeModal';

const QUICK_PROMPTS = [
  'Végétarien, facile à congéler',
  'Rapide à préparer, riche en protéines',
  'Sans gluten, légumes de saison',
  'Soupe ou ragout, se réchauffe bien',
];

export default function AISuggestions({ onSaveToNotion }) {
  const [preferences, setPreferences] = useState('');
  const [count, setCount] = useState(2);
  const [selected, setSelected] = useState(null);
  const { generateRecipes, suggestions, loading, error } = useBatch();
  const { addEntry } = useBatchStore();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">✨ Suggestions IA</h2>
        <p className="text-sm text-gray-500 mt-1">Recettes optimisées pour le batch cooking générées par Gemini</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPreferences(p)}
              className="text-xs border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-50 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>

        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Décrivez vos préférences : type de cuisine, régime alimentaire, ingrédients disponibles…"
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Nombre :</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-8 h-8 rounded-lg font-medium transition-colors ${
                  count === n ? 'bg-amber-500 text-white' : 'border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            onClick={() => generateRecipes(preferences, count)}
            disabled={loading || !preferences.trim()}
            className="bg-amber-500 text-white px-5 py-2 rounded-lg font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '⏳ Génération…' : '✨ Générer'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-4 text-sm">{error}</div>
      )}

      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {suggestions.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-800 leading-tight">{recipe.name}</h3>
                {recipe.batchFriendly && (
                  <span className="shrink-0 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">Batch ✓</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                {recipe.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{recipe.category}</span>}
                {(recipe.prepTime || recipe.cookTime) && (
                  <span>⏱ {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                )}
                {recipe.storageDays && <span>🗓 {recipe.storageDays}j {recipe.storageMethod || ''}</span>}
              </div>
              {recipe.storageTips && (
                <p className="text-xs text-gray-500 italic mb-3">{recipe.storageTips}</p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(recipe)}
                  className="flex-1 text-sm border border-gray-200 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  Voir
                </button>
                <button
                  onClick={() => addEntry(recipe, recipe.servings || 4)}
                  className="flex-1 text-sm bg-amber-500 text-white py-1.5 rounded-lg hover:bg-amber-600 font-medium"
                >
                  + Batch
                </button>
                {onSaveToNotion && (
                  <button
                    onClick={() => onSaveToNotion(recipe)}
                    className="text-sm border border-blue-200 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-50"
                    title="Sauvegarder dans Notion"
                  >
                    💾
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
