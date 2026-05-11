import React, { useState } from 'react';
import Navigation from './components/Navigation';
import RecipeLibrary from './components/RecipeLibrary';
import BatchPlanner from './components/BatchPlanner';
import CookingTimeline from './components/CookingTimeline';
import AISuggestions from './components/AISuggestions';
import DriveTab from './components/DriveTab';
import { useRecipes } from './hooks/useRecipes';
import { useBatchStore } from './store/batchStore';

const TABS = [
  { id: 'library', label: 'Recettes', icon: '📚' },
  { id: 'planner', label: 'Plan', icon: '🗓️' },
  { id: 'timeline', label: 'Timeline', icon: '⏱' },
  { id: 'ai', label: 'IA', icon: '✨' },
  { id: 'drive', label: 'Drive', icon: '🛗️' },
];

const PAGE_TITLES = {
  library: 'Mes Recettes',
  planner: 'Plan de repas',
  timeline: 'Planning cuisson',
  ai: 'Suggestions IA',
  drive: 'Panier Drive',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const { recipes, loading, error, refetch, saveToNotion, deleteRecipeById, updateRecipe } = useRecipes();
  const sessionCount = useBatchStore((s) => s.mealPlan?.days?.length ?? s.entries.length);

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <header className="sticky top-0 z-20 bg-[#f2f2f7]/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-3">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1c1c1e] leading-none">
            {PAGE_TITLES[activeTab]}
          </h1>
        </div>
      </header>

      <main key={activeTab} className="max-w-2xl mx-auto px-5 py-5 pb-28 animate-page-enter">
        {activeTab === 'library' && <RecipeLibrary recipes={recipes} loading={loading} error={error} onRefetch={refetch} onDeleteRecipe={deleteRecipeById} updateRecipe={updateRecipe} />}
        {activeTab === 'planner' && <BatchPlanner recipes={recipes} updateRecipe={updateRecipe} />}
        {activeTab === 'timeline' && <CookingTimeline />}
        {activeTab === 'ai' && <AISuggestions onSaveToNotion={saveToNotion} />}
        {activeTab === 'drive' && <DriveTab />}
      </main>

      <Navigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} sessionCount={sessionCount} />
    </div>
  );
}
