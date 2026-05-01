import React, { useState } from 'react';
import Navigation from './components/Navigation';
import RecipeList from './components/RecipeList';
import MealPlanner from './components/MealPlanner';
import GeminiSuggestions from './components/GeminiSuggestions';
import ShoppingList from './components/ShoppingList';
import { useRecipes } from './hooks/useRecipes';

const TABS = [
  { id: 'planner', label: 'Planning' },
  { id: 'recipes', label: 'Mes recettes' },
  { id: 'suggestions', label: 'Suggestions IA' },
  { id: 'shopping', label: 'Liste de courses' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const { recipes, loading, error, refetch, saveToNotion } = useRecipes();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        recipeCount={recipes.length}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {activeTab === 'planner' && (
          <MealPlanner recipes={recipes} />
        )}

        {activeTab === 'recipes' && (
          <RecipeList
            recipes={recipes}
            loading={loading}
            error={error}
            onRefetch={refetch}
          />
        )}

        {activeTab === 'suggestions' && (
          <GeminiSuggestions
            existingRecipeNames={recipes.map((r) => r.name)}
            onSaveToNotion={saveToNotion}
          />
        )}

        {activeTab === 'shopping' && (
          <ShoppingList recipes={recipes} />
        )}
      </main>
    </div>
  );
}
