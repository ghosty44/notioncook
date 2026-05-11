import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useBatchStore } from '../store/batchStore';
import { parseIngredientLines, categorizeIngredient } from '../utils/shoppingListUtils';
import DriveReviewModal from './DriveReviewModal';

const BABY_BIRTH = new Date('2025-03-05');
const babyAgeMonths = Math.floor((Date.now() - BABY_BIRTH.getTime()) / (1000 * 60 * 60 * 24 * 30.44));

function getRecipeItems(recipe) {
  return parseIngredientLines(recipe.ingredients || '').map((text) => ({
    text,
    category: categorizeIngredient(text),
  }));
}

// Handles integers, decimals (1,5 or 1.5) and fractions (1/2, 3/4)
function scaleIngredients(ingredients, from, to) {
  if (from === to || !ingredients) return ingredients;
  const ratio = to / from;
  return ingredients.replace(
    /\b(\d+)\s*\/\s*(\d+)\b|\b(\d+([.,]\d+)?)\b/g,
    (match, fracN, fracD, intPart) => {
      const n = fracN !== undefined
        ? (parseInt(fracN) / parseInt(fracD)) * ratio
        : parseFloat(intPart.replace(',', '.')) * ratio;
      if (Number.isInteger(n)) return n.toString();
      const rounded = parseFloat(n.toFixed(1));
      return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1).replace('.', ',');
    }
  );
}

export default function RecipeModal({ recipe, onClose, showBatchNote = false, onUpdate = null }) {
  const { addDriveItems, favorites, toggleFavorite, comments, setComment } = useBatchStore();
  const [showDriveModal, setShowDriveModal] = useState(false);
  const [servings, setServings] = useState(recipe.servings || 1);

  const recipeKey = recipe.id || recipe.name;
  const isNotionRecipe = !!recipe.notionUrl;
  const baseServings = recipe.servings || 1;

  const [isFav, setIsFav] = useState(isNotionRecipe ? (recipe.favori ?? false) : favorites.includes(recipeKey));
  const [localComment, setLocalComment] = useState(isNotionRecipe ? (recipe.notes || '') : (comments[recipeKey] || ''));
  const [dejaFait, setDejaFait] = useState(recipe.dejaFait ?? false);

  const commentDebounce = useRef(null);
  useEffect(() => () => { if (commentDebounce.current) clearTimeout(commentDebounce.current); }, []);

  const scaledIngredients = scaleIngredients(recipe.ingredients, baseServings, servings);

  function handleFavToggle() {
    if (isNotionRecipe) {
      const newVal = !isFav;
      setIsFav(newVal);
      onUpdate?.({ favori: newVal });
    } else {
      toggleFavorite(recipe);
    }
  }

  function handleCommentChange(text) {
    setLocalComment(text);
    if (isNotionRecipe) {
      if (commentDebounce.current) clearTimeout(commentDebounce.current);
      commentDebounce.current = setTimeout(() => onUpdate?.({ notes: text }), 1000);
    } else {
      setComment(recipeKey, text);
    }
  }

  function handleDejaFaitToggle() {
    const newVal = !dejaFait;
    setDejaFait(newVal);
    onUpdate?.({ dejaFait: newVal });
  }

  const content = (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-xl rounded-t-[32px] sm:rounded-[32px] overflow-y-auto max-h-[92vh] shadow-2xl">
          <div className="flex justify-center pt-3 pb-0 sm:hidden">
            <div className="w-9 h-1 bg-[#e5e5ea] rounded-full" />
          </div>

          {recipe.imageUrl ? (
            <img src={recipe.imageUrl} alt={recipe.name} className="w-full h-52 object-cover" />
          ) : (
            <div className="h-4" />
          )}

          <div className="p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <h2 className="text-[22px] font-bold text-[#1c1c1e] leading-tight">{recipe.name}</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleFavToggle}
                  className="bg-[#f2f2f7] rounded-full w-8 h-8 flex items-center justify-center text-sm"
                  aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  {isFav ? '❤️' : '🤍'}
                </button>
                <button
                  onClick={onClose}
                  className="bg-[#f2f2f7] rounded-full w-8 h-8 flex items-center justify-center text-[#8e8e93] text-sm"
                >×</button>
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
              {recipe.category && (
                <span className="bg-orange-100 text-orange-600 text-xs font-medium px-3 py-1 rounded-full">{recipe.category}</span>
              )}
              {recipe.storageMethod && (
                <span className="bg-blue-100 text-blue-600 text-xs font-medium px-3 py-1 rounded-full">{recipe.storageMethod}</span>
              )}
              {recipe.babyAdaptation && (
                <span className="bg-pink-100 text-pink-600 text-xs font-medium px-3 py-1 rounded-full">👶 Bébé {babyAgeMonths} mois</span>
              )}
              {isNotionRecipe && (
                <button
                  onClick={handleDejaFaitToggle}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                    dejaFait ? 'bg-green-100 text-green-700' : 'bg-[#f2f2f7] text-[#8e8e93]'
                  }`}
                >
                  {dejaFait ? '✓ Déjà réalisée' : 'Pas encore réalisée'}
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {recipe.prepTime > 0 && (
                <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
                  <div className="text-lg font-bold text-[#1c1c1e]">{recipe.prepTime}<span className="text-xs font-normal"> min</span></div>
                  <div className="text-xs text-[#8e8e93]">🔪 Préparation</div>
                </div>
              )}
              {recipe.cookTime > 0 && (
                <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
                  <div className="text-lg font-bold text-[#1c1c1e]">{recipe.cookTime}<span className="text-xs font-normal"> min</span></div>
                  <div className="text-xs text-[#8e8e93]">🔥 Cuisson</div>
                </div>
              )}
              <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
                <div className="flex items-center justify-center gap-1.5">
                  <button
                    onClick={() => setServings((n) => Math.max(1, n - 1))}
                    className="w-5 h-5 rounded-full bg-white shadow text-[#1c1c1e] text-xs font-bold leading-none flex items-center justify-center"
                  >−</button>
                  <span className="text-lg font-bold text-[#1c1c1e]">{servings}</span>
                  <button
                    onClick={() => setServings((n) => Math.min(20, n + 1))}
                    className="w-5 h-5 rounded-full bg-white shadow text-[#1c1c1e] text-xs font-bold leading-none flex items-center justify-center"
                  >+</button>
                </div>
                <div className="text-xs text-[#8e8e93]">Portions</div>
              </div>
              {recipe.storageDays > 0 && (
                <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
                  <div className="text-lg font-bold text-[#1c1c1e]">{recipe.storageDays}<span className="text-xs font-normal">j</span></div>
                  <div className="text-xs text-[#8e8e93]">Conservation</div>
                </div>
              )}
            </div>

            {/* Batch note */}
            {showBatchNote && recipe.batchNote && (
              <div className="mb-5">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4">
                  <p className="text-[13px] font-semibold text-green-700 mb-1">♻️ Note batch</p>
                  <p className="text-sm text-green-700 leading-relaxed">{recipe.batchNote}</p>
                </div>
              </div>
            )}

            {/* Ingredients */}
            {recipe.ingredients && (
              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-[#1c1c1e] mb-2">
                  Ingrédients
                  {servings !== baseServings ? (
                    <span className="text-orange-500 font-normal text-xs ml-1">(adapté pour {servings} pers.)</span>
                  ) : (
                    <span className="text-[#8e8e93] font-normal text-xs ml-1">(pour {servings} personne{servings > 1 ? 's' : ''})</span>
                  )}
                </h3>
                <div className="bg-[#f2f2f7] rounded-2xl overflow-hidden">
                  {scaledIngredients.split('\n').filter(Boolean).map((line, i, arr) => (
                    <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-white' : ''}`}>
                      <span className="text-orange-500 mt-0.5">•</span>
                      <span className="text-sm text-[#1c1c1e]">{line.replace(/^[-•*]\s*/, '')}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instructions */}
            {recipe.instructions && (
              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-[#1c1c1e] mb-3">Instructions</h3>
                <div className="space-y-3">
                  {recipe.instructions.split('\n').filter(Boolean).map((line, i) => (
                    <div key={i} className="flex gap-3">
                      <span className="shrink-0 bg-orange-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                      <p className="text-sm text-[#1c1c1e] leading-relaxed">{line.replace(/^\d+[.)]\s*/, '')}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Baby adaptation */}
            {recipe.babyAdaptation && (
              <div className="mb-5">
                <h3 className="text-[15px] font-semibold text-[#1c1c1e] mb-2">
                  👶 Adaptation bébé
                  <span className="text-[#8e8e93] font-normal text-xs ml-1">({babyAgeMonths} mois)</span>
                </h3>
                <div className="bg-pink-50 border border-pink-100 rounded-2xl p-4">
                  {recipe.babyAdaptation.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-sm text-[#1c1c1e] leading-relaxed">{line}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Comment */}
            <div className="mb-4">
              <h3 className="text-[15px] font-semibold text-[#1c1c1e] mb-2">📝 Commentaire</h3>
              <textarea
                value={localComment}
                onChange={(e) => handleCommentChange(e.target.value)}
                placeholder="Tes notes sur cette recette…"
                rows={3}
                className="w-full bg-[#f2f2f7] rounded-2xl px-4 py-3 text-sm placeholder-[#8e8e93] outline-none resize-none"
              />
            </div>

            {/* Drive button */}
            {recipe.ingredients && (
              <button
                onClick={() => setShowDriveModal(true)}
                className="w-full bg-[#f2f2f7] text-[#3a3a3c] py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
              >
                🛒 Ajouter au panier Drive
              </button>
            )}
          </div>
        </div>
      </div>

      {showDriveModal && (
        <DriveReviewModal
          items={getRecipeItems(recipe)}
          sourceName={recipe.name}
          onConfirm={(items) => { addDriveItems(items); setShowDriveModal(false); }}
          onClose={() => setShowDriveModal(false)}
        />
      )}
    </>
  );

  return createPortal(content, document.body);
}
