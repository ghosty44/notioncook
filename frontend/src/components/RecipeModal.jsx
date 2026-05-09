import React from 'react';
import { useBatchStore } from '../store/batchStore';

export default function RecipeModal({ recipe, onClose }) {
  const { addEntry, entries } = useBatchStore();
  const isInSession = entries.some((e) => e.recipe.id === recipe.id);
  const totalTime = (recipe.prepTime || 0) + (recipe.cookTime || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-xl rounded-t-[32px] sm:rounded-[32px] overflow-y-auto max-h-[92vh] shadow-2xl">
        {/* Drag handle */}
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
            <button
              onClick={onClose}
              className="bg-[#f2f2f7] rounded-full w-8 h-8 flex items-center justify-center text-[#8e8e93] text-sm shrink-0"
            >×</button>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {recipe.category && (
              <span className="bg-orange-100 text-orange-600 text-xs font-medium px-3 py-1 rounded-full">{recipe.category}</span>
            )}
            {recipe.batchFriendly && (
              <span className="bg-green-100 text-green-600 text-xs font-medium px-3 py-1 rounded-full">✓ Batch-friendly</span>
            )}
            {recipe.storageMethod && (
              <span className="bg-blue-100 text-blue-600 text-xs font-medium px-3 py-1 rounded-full">{recipe.storageMethod}</span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {totalTime > 0 && (
              <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
                <div className="text-lg font-bold text-[#1c1c1e]">{totalTime}<span className="text-xs font-normal"> min</span></div>
                <div className="text-xs text-[#8e8e93]">Temps total</div>
              </div>
            )}
            <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
              <div className="text-lg font-bold text-[#1c1c1e]">1<span className="text-xs font-normal"> pers.</span></div>
              <div className="text-xs text-[#8e8e93]">Base recette</div>
            </div>
            {recipe.storageDays && (
              <div className="bg-[#f2f2f7] rounded-2xl p-3 text-center">
                <div className="text-lg font-bold text-[#1c1c1e]">{recipe.storageDays}<span className="text-xs font-normal">j</span></div>
                <div className="text-xs text-[#8e8e93]">Conservation</div>
              </div>
            )}
          </div>

          {recipe.ingredients && (
            <div className="mb-5">
              <h3 className="text-[15px] font-semibold text-[#1c1c1e] mb-2">
                Ingrédients
                <span className="text-[#8e8e93] font-normal text-xs ml-1">(pour 1 personne)</span>
              </h3>
              <div className="bg-[#f2f2f7] rounded-2xl overflow-hidden">
                {recipe.ingredients.split('\n').filter(Boolean).map((line, i, arr) => (
                  <div key={i} className={`flex items-start gap-3 px-4 py-2.5 ${i < arr.length - 1 ? 'border-b border-white' : ''}` }>
                    <span className="text-orange-500 mt-0.5">•</span>
                    <span className="text-sm text-[#1c1c1e]">{line.replace(/^[-•*]\s*/, '')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recipe.instructions && (
            <div className="mb-6">
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

          <button
            onClick={() => { if (!isInSession) addEntry(recipe); onClose(); }}
            className={`w-full py-4 rounded-2xl font-semibold text-[15px] transition-colors ${
              isInSession ? 'bg-green-50 text-green-600' : 'bg-orange-500 text-white'
            }`}
          >
            {isInSession ? '✓ Déjà dans la session' : '+ Ajouter à la session'}
          </button>
        </div>
      </div>
    </div>
  );
}
