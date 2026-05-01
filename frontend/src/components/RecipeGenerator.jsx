import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import RecipeModal from './RecipeModal';

export default function RecipeGenerator({ onSaveToNotion }) {
  const [idea, setIdea] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recipe, setRecipe] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleGenerate = async () => {
    if (!idea.trim() || loading) return;
    setLoading(true);
    setError(null);
    setRecipe(null);
    setSaved(false);
    try {
      const result = await api.post('/gemini/generate', { idea });
      setRecipe(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (r) => {
    setSaving(true);
    try {
      await onSaveToNotion(r);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Créer une recette</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Décrivez une idée, Gemini génère la recette complète
        </p>
      </div>

      {/* Input */}
      <div className="card p-5 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Votre idée de recette
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Ex : poulet au citron rapide, soupe de lentilles épicée, tarte aux pommes…"
            className="input flex-1"
            disabled={loading}
          />
          <button
            onClick={handleGenerate}
            disabled={!idea.trim() || loading}
            className="btn-primary shrink-0"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Génération…</>
              : <><Sparkles className="w-4 h-4" /> Générer</>
            }
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 mb-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="card p-6 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-4" />
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-full" />
            <div className="h-3 bg-gray-100 rounded w-5/6" />
            <div className="h-3 bg-gray-100 rounded w-4/6" />
          </div>
        </div>
      )}

      {/* Result */}
      {recipe && !loading && (
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">{recipe.name}</h2>
              <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                {recipe.prepTime > 0 && <span>🕐 Prép : {recipe.prepTime} min</span>}
                {recipe.cookTime > 0 && <span>🔥 Cuisson : {recipe.cookTime} min</span>}
                {recipe.category && <span className="badge-orange">{recipe.category}</span>}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setRecipe({ ...recipe, _showFull: true })}
                className="btn-secondary text-xs"
              >
                Voir tout
              </button>
              {saved ? (
                <span className="btn-secondary text-xs text-green-600">✓ Sauvegardé</span>
              ) : (
                <button
                  onClick={() => handleSave(recipe)}
                  disabled={saving}
                  className="btn-primary text-xs"
                >
                  {saving ? 'Sauvegarde…' : '💾 Sauvegarder dans Notion'}
                </button>
              )}
            </div>
          </div>

          {/* Ingredients */}
          {recipe.ingredients && (
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Ingrédients</h3>
              <ul className="space-y-1">
                {recipe.ingredients.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-1.5 shrink-0" />
                    {line.replace(/^[-•*]\s*/, '')}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Instructions */}
          {recipe.instructions && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Préparation</h3>
              <ol className="space-y-2">
                {recipe.instructions.split('\n').filter(Boolean).map((line, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-700">
                    <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span>{line.replace(/^\d+[.)]\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Baby adaptation */}
          {recipe.babyAdaptation && (
            <div className="mt-4 bg-green-50 rounded-xl p-4 border border-green-100 text-sm text-green-800">
              <span className="font-semibold">👶 Adaptation bébé : </span>
              {recipe.babyAdaptation}
            </div>
          )}
        </div>
      )}

      {/* Full modal */}
      {recipe?._showFull && (
        <RecipeModal
          recipe={recipe}
          onClose={() => setRecipe({ ...recipe, _showFull: false })}
          onSaveToNotion={!saved ? handleSave : undefined}
          isSaving={saving}
        />
      )}
    </div>
  );
}
