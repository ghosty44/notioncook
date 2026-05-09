import React, { useState } from 'react';
import { useBatchStore } from '../store/batchStore';
import { useBatch } from '../hooks/useBatch';
import RecipeModal from './RecipeModal';

const QUICK_PROMPTS = [
  'Végétarien, facile à congéler',
  'Rapide, riche en protéines',
  'Sans gluten, légumes de saison',
  'Soupe ou ragout qui se réchauffe bien',
];

export default function AISuggestions({ onSaveToNotion }) {
  const [preferences, setPreferences] = useState('');
  const [count, setCount] = useState(2);
  const [selected, setSelected] = useState(null);
  const [saved, setSaved] = useState({});
  const [saving, setSaving] = useState({});
  const { generateRecipes, suggestions, loading, error } = useBatch();
  const { addEntry, entries } = useBatchStore();

  const isInSession = (id) => entries.some((e) => e.recipe.id === id);

  async function handleSave(recipe) {
    if (saved[recipe.id] || saving[recipe.id] || !onSaveToNotion) return;
    setSaving((p) => ({ ...p, [recipe.id]: true }));
    try {
      await onSaveToNotion(recipe);
      setSaved((p) => ({ ...p, [recipe.id]: true }));
    } catch {
      // silently fail
    } finally {
      setSaving((p) => ({ ...p, [recipe.id]: false }));
    }
  }

  return (
    <div>
      <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-4 mb-5">
        <div className="flex flex-wrap gap-2 mb-3">
          {QUICK_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setPreferences(p)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                preferences === p
                  ? 'bg-orange-500 text-white border-orange-500'
                  : 'border-orange-200 text-orange-600 hover:bg-orange-50'
              }`}
            >{p}</button>
          ))}
        </div>

        <textarea
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
          placeholder="Décrivez vos préférences…"
          rows={3}
          className="w-full bg-[#f2f2f7] rounded-xl px-3 py-2.5 text-sm placeholder-[#8e8e93] outline-none resize-none"
        />

        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8e8e93]">Recettes :</span>
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => setCount(n)}
                className={`w-7 h-7 rounded-full text-xs font-semibold transition-colors ${
                  count === n ? 'bg-orange-500 text-white' : 'bg-[#f2f2f7] text-[#1c1c1e]'
                }`}
              >{n}</button>
            ))}
          </div>
          <button
            onClick={() => generateRecipes(preferences, count)}
            disabled={loading || !preferences.trim()}
            className="bg-orange-500 text-white px-5 py-2 rounded-full font-semibold text-sm disabled:opacity-40 transition-opacity"
          >
            {loading ? '⏳ Génération…' : '✨ Générer'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 rounded-2xl p-4 mb-4 text-sm border border-red-100">{error}</div>
      )}

      {suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((recipe) => (
            <div key={recipe.id} className="bg-white rounded-2xl shadow-sm border border-black/5 p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-semibold text-[#1c1c1e] leading-tight">{recipe.name}</h3>
                {recipe.batchFriendly && (
                  <span className="shrink-0 bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">Batch ✓</span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 text-xs text-[#8e8e93] mb-2">
                {recipe.category && <span className="bg-[#f2f2f7] px-2.5 py-1 rounded-full">{recipe.category}</span>}
                {(recipe.prepTime || recipe.cookTime) && (
                  <span>⏱ {(recipe.prepTime || 0) + (recipe.cookTime || 0)} min</span>
                )}
                {recipe.storageDays && <span>🗓 {recipe.storageDays}j {recipe.storageMethod || ''}</span>}
              </div>

              {recipe.storageTips && (
                <p className="text-xs text-[#8e8e93] italic mb-3">{recipe.storageTips}</p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setSelected(recipe)}
                  className="flex-1 text-sm bg-[#f2f2f7] text-[#1c1c1e] py-2.5 rounded-xl font-medium"
                >Voir</button>
                <button
                  onClick={() => addEntry(recipe)}
                  disabled={isInSession(recipe.id)}
                  className={`flex-1 text-sm py-2.5 rounded-xl font-semibold transition-colors ${
                    isInSession(recipe.id)
                      ? 'bg-green-50 text-green-600'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  {isInSession(recipe.id) ? '✓ Ajouté' : '+ Session'}
                </button>
                {onSaveToNotion && (
                  <button
                    onClick={() => handleSave(recipe)}
                    disabled={saved[recipe.id] || saving[recipe.id]}
                    title={saved[recipe.id] ? 'Sauvegardé dans Notion' : 'Sauvegarder dans Notion'}
                    className={`w-11 h-10 rounded-xl flex items-center justify-center text-sm transition-all ${
                      saved[recipe.id]
                        ? 'bg-green-500 text-white'
                        : saving[recipe.id]
                        ? 'bg-[#f2f2f7] text-[#8e8e93]'
                        : 'bg-[#f2f2f7] text-[#8e8e93] hover:bg-blue-50 hover:text-blue-500'
                    }`}
                  >
                    {saving[recipe.id] ? '…' : saved[recipe.id] ? '✓' : '💾'}
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
