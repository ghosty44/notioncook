import React, { useState } from 'react';
import { Sparkles, RefreshCw, CheckCircle, X, AlertCircle, ChevronDown, ChevronUp, Baby } from 'lucide-react';
import { useGemini } from '../hooks/useGemini';
import RecipeModal from './RecipeModal';
import clsx from 'clsx';

const MEAL_TYPES = ['', 'Petit-déjeuner', 'Déjeuner', 'Dîner', 'Snack', 'Dessert', 'Soupe', 'Salade'];

export default function GeminiSuggestions({ existingRecipeNames, onSaveToNotion }) {
  const { suggestions, loading, error, fetchSuggestions, fetchOne, removeSuggestion, setSuggestions } = useGemini();
  const [preferences, setPreferences] = useState('');
  const [mealType, setMealType] = useState('');
  const [count, setCount] = useState(3);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [savingId, setSavingId] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [showOptions, setShowOptions] = useState(false);

  const handleGenerate = () => {
    fetchSuggestions({
      count,
      excludeNames: [...existingRecipeNames, ...suggestions.map((s) => s.name)],
      preferences,
      mealType,
    });
  };

  const handleGenerateOne = () => {
    fetchOne({
      excludeNames: [...existingRecipeNames, ...suggestions.map((s) => s.name)],
      preferences,
      mealType,
    });
  };

  const handleSave = async (recipe) => {
    setSavingId(recipe.id);
    try {
      await onSaveToNotion(recipe);
      setSavedIds((prev) => new Set([...prev, recipe.id]));
    } catch (err) {
      alert('Erreur lors de la sauvegarde : ' + err.message);
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suggestions IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Gemini génère des recettes personnalisées pour votre famille
          </p>
        </div>
      </div>

      {/* Generation panel */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Préférences ou contraintes (ex: sans gluten, végétarien, rapide…)"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              className="input"
            />
          </div>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value)}
            className="input sm:w-44"
          >
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>{t || 'Tous types de repas'}</option>
            ))}
          </select>
        </div>

        {/* Advanced options */}
        <div className="mt-3">
          <button
            onClick={() => setShowOptions((v) => !v)}
            className="text-xs text-gray-500 flex items-center gap-1 hover:text-gray-700"
          >
            {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Options avancées
          </button>
          {showOptions && (
            <div className="mt-2 flex items-center gap-3">
              <label className="text-xs text-gray-600">Nombre de suggestions :</label>
              {[1, 3, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setCount(n)}
                  className={clsx(
                    'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                    count === n ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="btn-primary"
          >
            <Sparkles className="w-4 h-4" />
            {loading ? 'Génération en cours…' : `Générer ${count} suggestion${count > 1 ? 's' : ''}`}
          </button>
          {suggestions.length > 0 && (
            <button
              onClick={handleGenerateOne}
              disabled={loading}
              className="btn-secondary"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              + Une autre
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 mb-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Erreur Gemini</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && suggestions.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-2 mb-3">
                <div className="h-5 bg-purple-100 rounded-full w-16" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-4/6" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && suggestions.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Sparkles className="w-12 h-12 mb-3 opacity-20" />
          <p className="font-medium">Cliquez sur "Générer" pour obtenir des idées de recettes</p>
          <p className="text-sm mt-1">Gemini prendra en compte vos recettes existantes pour proposer des nouveautés</p>
        </div>
      )}

      {/* Suggestions grid */}
      {suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suggestions.map((recipe) => {
            const isSaved = savedIds.has(recipe.id);
            const isSaving = savingId === recipe.id;

            return (
              <div
                key={recipe.id}
                className={clsx(
                  'card p-5 flex flex-col transition-all',
                  isSaved && 'opacity-60'
                )}
              >
                {/* Category + Baby badge */}
                <div className="flex items-center gap-2 mb-2">
                  {recipe.category && (
                    <span className="badge-orange">{recipe.category}</span>
                  )}
                  {recipe.babyAdaptation && (
                    <span className="badge-green flex items-center gap-1">
                      <Baby className="w-2.5 h-2.5" /> Bébé OK
                    </span>
                  )}
                  <span className="badge bg-purple-100 text-purple-600 ml-auto">✨ IA</span>
                </div>

                {/* Name */}
                <h3
                  className="font-bold text-gray-900 text-base mb-2 cursor-pointer hover:text-brand-600 transition-colors"
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  {recipe.name}
                </h3>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                  {recipe.prepTime && <span>🕐 Prép : {recipe.prepTime} min</span>}
                  {recipe.cookTime && <span>🔥 Cuisson : {recipe.cookTime} min</span>}
                </div>

                {/* Ingredients preview */}
                {recipe.ingredients && (
                  <p className="text-xs text-gray-500 line-clamp-3 mb-3 flex-1">
                    {recipe.ingredients.split('\n').slice(0, 4).join(', ')}…
                  </p>
                )}

                {/* Tags */}
                {recipe.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {recipe.tags.slice(0, 4).map((t) => (
                      <span key={t} className="badge bg-gray-100 text-gray-500">{t}</span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-50">
                  <button
                    onClick={() => setSelectedRecipe(recipe)}
                    className="btn-secondary flex-1 justify-center text-xs"
                  >
                    Voir la recette
                  </button>
                  {isSaved ? (
                    <div className="flex items-center gap-1 text-green-600 text-xs font-medium px-3">
                      <CheckCircle className="w-4 h-4" /> Sauvegardé
                    </div>
                  ) : (
                    <button
                      onClick={() => handleSave(recipe)}
                      disabled={isSaving}
                      className="btn-primary flex-1 justify-center text-xs"
                    >
                      {isSaving ? '…' : '💾 Notion'}
                    </button>
                  )}
                  <button
                    onClick={() => removeSuggestion(recipe.id)}
                    className="btn-ghost p-2"
                    title="Ignorer cette suggestion"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
          onSaveToNotion={!savedIds.has(selectedRecipe.id) ? handleSave : undefined}
          isSaving={savingId === selectedRecipe.id}
        />
      )}
    </div>
  );
}
