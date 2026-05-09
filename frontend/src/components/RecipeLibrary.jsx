import React, { useState } from 'react';
import { useBatchStore } from '../store/batchStore';
import RecipeModal from './RecipeModal';

const CATEGORIES = ['Toutes', 'Déjeuner', 'Dîner', 'Petit-déjeuner', 'Soupe', 'Salade', 'Snack', 'Dessert', 'Autre'];

export default function RecipeLibrary({ recipes, loading, error, onRefetch, onDeleteRecipe }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [batchOnly, setBatchOnly] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { addEntry, entries } = useBatchStore();

  const filtered = recipes.filter((r) => {
    if (batchOnly && !r.batchFriendly) return false;
    if (category !== 'Toutes' && r.category !== category) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const isInSession = (id) => entries.some((e) => e.recipe.id === id);

  async function handleDelete(e, recipeId) {
    e.stopPropagation();
    if (!onDeleteRecipe) return;
    setDeletingId(recipeId);
    setConfirmDeleteId(null);
    try {
      await onDeleteRecipe(recipeId);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-24 gap-3">
      <div className="w-10 h-10 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-[#8e8e93] text-sm">Chargement…</p>
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-red-500 mb-4 text-sm">{error}</p>
      <button onClick={onRefetch} className="bg-orange-500 text-white px-6 py-2.5 rounded-full font-semibold text-sm">Réessayer</button>
    </div>
  );

  return (
    <div>
      <div className="relative mb-3">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] text-sm">🔍</span>
        <input
          type="text"
          placeholder="Rechercher…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white rounded-2xl pl-9 pr-4 py-3 text-sm placeholder-[#8e8e93] outline-none shadow-sm border border-black/5"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-3">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              category === c ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-[#1c1c1e] border border-black/5 shadow-sm'
            }`}
          >{c}</button>
        ))}
      </div>

      <div
        onClick={() => setBatchOnly(!batchOnly)}
        className="flex items-center justify-between bg-white rounded-2xl px-4 py-3 mb-5 shadow-sm border border-black/5 cursor-pointer"
      >
        <div>
          <div className="text-sm font-medium text-[#1c1c1e]">Batch-friendly uniquement</div>
          <div className="text-xs text-[#8e8e93]">Se conserve bien au frigo / congélo</div>
        </div>
        <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${batchOnly ? 'bg-orange-500' : 'bg-[#e5e5ea]'}`}>
          <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${batchOnly ? 'translate-x-5' : ''}`} />
        </div>
      </div>

      <p className="text-xs text-[#8e8e93] mb-3">{filtered.length} recette{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8e8e93]">Aucune recette trouvée</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe, i) => (
            <div
              key={recipe.id}
              onClick={() => setSelected(recipe)}
              style={{ animationDelay: `${i * 40}ms` }}
              className="animate-page-enter bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden cursor-pointer active:scale-[0.98] transition-transform duration-100"
            >
              {recipe.imageUrl && (
                <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-44 object-cover" />
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-semibold text-[#1c1c1e] leading-tight flex-1">{recipe.name}</h3>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {recipe.babyAdaptation && <span title="Adaptation bébé disponible">👶</span>}
                    {recipe.batchFriendly && (
                      <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">✓ Batch</span>
                    )}
                    {onDeleteRecipe && (
                      confirmDeleteId === recipe.id ? (
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDelete(e, recipe.id)}
                            disabled={deletingId === recipe.id}
                            className="text-[11px] bg-red-500 text-white px-2 py-0.5 rounded-full font-semibold leading-5"
                          >
                            {deletingId === recipe.id ? '…' : 'Oui'}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                            className="text-[11px] bg-[#f2f2f7] text-[#3a3a3c] px-2 py-0.5 rounded-full font-semibold leading-5"
                          >
                            Non
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(recipe.id); }}
                          disabled={deletingId === recipe.id}
                          title="Supprimer de Notion"
                          className="text-[#c7c7cc] text-base hover:text-red-400 transition-colors disabled:opacity-40"
                        >
                          🗑️
                        </button>
                      )
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-[#8e8e93] mb-3">
                  {recipe.category && <span className="bg-[#f2f2f7] px-2.5 py-1 rounded-full">{recipe.category}</span>}
                  {recipe.prepTime > 0 && <span>🔪 {recipe.prepTime} min</span>}
                  {recipe.cookTime > 0 && <span>🔥 {recipe.cookTime} min</span>}
                  {recipe.storageDays && <span>🗓 {recipe.storageDays}j</span>}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); if (!isInSession(recipe.id)) addEntry(recipe); }}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isInSession(recipe.id) ? 'bg-green-50 text-green-600' : 'bg-orange-500 text-white'
                  }`}
                >
                  {isInSession(recipe.id) ? '✓ Dans la session' : '+ Ajouter à la session'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && <RecipeModal recipe={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
