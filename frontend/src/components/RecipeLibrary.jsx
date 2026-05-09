import React, { useState } from 'react';
import { useBatchStore } from '../store/batchStore';
import RecipeModal from './RecipeModal';

const CATEGORIES = ['Toutes', 'Déjeuner', 'Dîner', 'Petit-déjeuner', 'Soupe', 'Salade', 'Snack', 'Dessert', 'Autre'];

export default function RecipeLibrary({ recipes, loading, error, onRefetch }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [batchOnly, setBatchOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const { addEntry, entries } = useBatchStore();

  const filtered = recipes.filter((r) => {
    if (batchOnly && !r.batchFriendly) return false;
    if (category !== 'Toutes' && r.category !== category) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isInSession = (id) => entries.some((e) => e.recipe.id === id);

  if (loading) return <div className="text-center py-16 text-gray-500">Chargement des recettes…</div>;
  if (error) return (
    <div className="text-center py-16">
      <p className="text-red-500 mb-4">{error}</p>
      <button onClick={onRefetch} className="bg-amber-500 text-white px-4 py-2 rounded-lg">Réessayer</button>
    </div>
  );

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Rechercher une recette…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm flex-1 min-w-40 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={batchOnly}
            onChange={(e) => setBatchOnly(e.target.checked)}
            className="accent-amber-500"
          />
          <span>Batch-friendly uniquement</span>
        </label>
      </div>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} recette{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">Aucune recette trouvée</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              onClick={() => setSelected(recipe)}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
            >
              {recipe.imageUrl && (
                <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-36 object-cover rounded-lg mb-3" />
              )}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-800 leading-tight">{recipe.name}</h3>
                {recipe.batchFriendly && (
                  <span className="shrink-0 bg-green-100 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    Batch ✓
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                {recipe.category && <span className="bg-gray-100 px-2 py-0.5 rounded">{recipe.category}</span>}
                {recipe.prepTime && <span>⏱ {recipe.prepTime + (recipe.cookTime || 0)} min</span>}
                {recipe.storageDays && <span>🗓 {recipe.storageDays}j {recipe.storageMethod || ''}</span>}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isInSession(recipe.id)) addEntry(recipe, 4);
                }}
                className={`w-full text-sm py-1.5 rounded-lg font-medium transition-colors ${
                  isInSession(recipe.id)
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                }`}
              >
                {isInSession(recipe.id) ? '✓ Dans le planner' : '+ Ajouter au batch'}
              </button>
            </div>
          ))}
        </div>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
