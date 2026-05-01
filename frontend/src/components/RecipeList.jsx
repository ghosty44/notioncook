import React, { useState, useMemo } from 'react';
import { Search, RefreshCw, AlertCircle, BookOpen } from 'lucide-react';
import RecipeCard from './RecipeCard';
import RecipeModal from './RecipeModal';

const CATEGORY_FILTERS = [
  'Toutes',
  'Petit-déjeuner',
  'Déjeuner',
  'Dîner',
  'Snack',
  'Dessert',
  'Soupe',
  'Salade',
  'Autre',
];

export default function RecipeList({ recipes, loading, error, onRefetch }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Toutes');
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchesSearch =
        !search ||
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.tags?.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
        r.ingredients?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === 'Toutes' || r.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [recipes, search, categoryFilter]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes recettes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {recipes.length} recette{recipes.length > 1 ? 's' : ''} depuis Notion
          </p>
        </div>
        <button onClick={onRefetch} disabled={loading} className="btn-secondary">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une recette, un ingrédient…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                categoryFilter === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700 mb-4">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Erreur de connexion à Notion</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <BookOpen className="w-12 h-12 mb-3 opacity-30" />
          <p className="font-medium">
            {search || categoryFilter !== 'Toutes'
              ? 'Aucune recette ne correspond à votre recherche'
              : 'Aucune recette trouvée dans Notion'}
          </p>
          {!search && recipes.length === 0 && (
            <p className="text-sm mt-1">Vérifiez votre clé API et database ID dans le .env</p>
          )}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onClick={() => setSelectedRecipe(recipe)}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
