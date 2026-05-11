import React, { useState } from 'react';
import { useBatchStore } from '../store/batchStore';
import { parseIngredientLines, categorizeIngredient } from '../utils/shoppingListUtils';
import RecipeModal from './RecipeModal';
import DriveReviewModal from './DriveReviewModal';

const CATEGORIES = ['Toutes', 'Déjeuner', 'Dîner', 'Petit-déjeuner', 'Soupe', 'Salade', 'Snack', 'Dessert', 'Autre'];

function getRecipeItems(recipe) {
  return parseIngredientLines(recipe.ingredients || '').map((text) => ({
    text,
    category: categorizeIngredient(text),
  }));
}

export default function RecipeLibrary({ recipes, loading, error, onRefetch, onDeleteRecipe, updateRecipe, addToCart }) {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('Toutes');
  const [selected, setSelected] = useState(null);
  const [driveRecipe, setDriveRecipe] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const { favorites, toggleFavorite } = useBatchStore();

  const filtered = recipes.filter((r) => {
    if (category !== 'Toutes' && r.category !== category) return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function toggleCardSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleConfirmDelete() {
    if (!onDeleteRecipe || selectedIds.size === 0) return;
    setDeleting(true);
    try {
      await Promise.all([...selectedIds].map((id) => onDeleteRecipe(id)));
    } finally {
      setDeleting(false);
      setSelectedIds(new Set());
      setDeleteMode(false);
    }
  }

  function cancelDeleteMode() {
    setDeleteMode(false);
    setSelectedIds(new Set());
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
    <div className="pb-16">
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e8e93] text-sm">🔍</span>
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white rounded-2xl pl-9 pr-4 py-3 text-sm placeholder-[#8e8e93] outline-none shadow-sm border border-black/5"
          />
        </div>
        {onDeleteRecipe && (
          <button
            onClick={() => deleteMode ? cancelDeleteMode() : setDeleteMode(true)}
            className={`shrink-0 px-3 py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
              deleteMode ? 'bg-red-100 text-red-500' : 'bg-white text-[#3a3a3c] shadow-sm border border-black/5'
            }`}
          >
            {deleteMode ? 'Annuler' : 'Sélectionner'}
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 mb-4">
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

      <p className="text-xs text-[#8e8e93] mb-3">{filtered.length} recette{filtered.length !== 1 ? 's' : ''}</p>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#8e8e93]">Aucune recette trouvée</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe, i) => {
            const recipeKey = recipe.id || recipe.name;
            const isFav = recipe.notionUrl ? (recipe.favori ?? false) : favorites.includes(recipeKey);
            const isSelected = selectedIds.has(recipe.id);
            return (
              <div
                key={recipe.id}
                onClick={() => deleteMode ? toggleCardSelect(recipe.id) : setSelected(recipe)}
                style={{ animationDelay: `${i * 40}ms` }}
                className={`animate-page-enter bg-white rounded-2xl shadow-sm border overflow-hidden cursor-pointer active:scale-[0.98] transition-all duration-100 ${
                  isSelected ? 'border-red-400 ring-2 ring-red-200' : 'border-black/5'
                }`}
              >
                {recipe.imageUrl && (
                  <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-44 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {deleteMode && (
                        <div className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'bg-red-500 border-red-500' : 'border-[#c7c7cc]'
                        }`}>
                          {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                        </div>
                      )}
                      <h3 className="font-semibold text-[#1c1c1e] leading-tight truncate">{recipe.name}</h3>
                    </div>
                    {!deleteMode && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        {recipe.babyAdaptation && <span title="Adaptation bébé disponible">👶</span>}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (recipe.notionUrl && updateRecipe) {
                              updateRecipe(recipe.id, { favori: !recipe.favori });
                            } else {
                              toggleFavorite(recipe);
                            }
                          }}
                          className="text-sm leading-none"
                          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          {isFav ? '❤️' : '🤍'}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDriveRecipe(recipe); }}
                          title="Ajouter au panier Drive"
                          className="text-[#c7c7cc] text-base hover:text-orange-400 transition-colors"
                        >
                          🛒
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-[#8e8e93]">
                    {recipe.category && <span className="bg-[#f2f2f7] px-2.5 py-1 rounded-full">{recipe.category}</span>}
                    {recipe.prepTime > 0 && <span>🔪 {recipe.prepTime} min</span>}
                    {recipe.cookTime > 0 && <span>🔥 {recipe.cookTime} min</span>}
                    {recipe.storageDays > 0 && <span>🗓 {recipe.storageDays}j</span>}
                    {recipe.dejaFait && <span className="text-green-500 font-medium">✓ Réalisée</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteMode && (
        <div className="fixed bottom-20 left-0 right-0 z-30 px-5">
          <div className="max-w-2xl mx-auto bg-[#1c1c1e] rounded-2xl px-4 py-3 flex items-center justify-between shadow-2xl">
            <span className="text-white text-sm font-medium">
              {selectedIds.size} recette{selectedIds.size !== 1 ? 's' : ''} sélectionnée{selectedIds.size !== 1 ? 's' : ''}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={cancelDeleteMode}
                className="text-sm text-[#8e8e93] px-3 py-1.5 rounded-full"
              >Annuler</button>
              <button
                onClick={handleConfirmDelete}
                disabled={selectedIds.size === 0 || deleting}
                className="text-sm bg-red-500 text-white px-4 py-1.5 rounded-full font-semibold disabled:opacity-40"
              >
                {deleting ? '…' : `Supprimer (${selectedIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <RecipeModal
          recipe={selected}
          onClose={() => setSelected(null)}
          onUpdate={selected.notionUrl && updateRecipe ? (fields) => updateRecipe(selected.id, fields) : null}
          addToCart={addToCart}
        />
      )}

      {driveRecipe && (
        <DriveReviewModal
          items={getRecipeItems(driveRecipe)}
          sourceName={driveRecipe.name}
          onConfirm={(items) => { if (addToCart) addToCart(items); setDriveRecipe(null); }}
          onClose={() => setDriveRecipe(null)}
        />
      )}
    </div>
  );
}
