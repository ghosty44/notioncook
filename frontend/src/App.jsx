import React, { useState } from 'react';
import Navigation from './components/Navigation';
import RecipeLibrary from './components/RecipeLibrary';
import BatchPlanner from './components/BatchPlanner';
import ShoppingList from './components/ShoppingList';
import CookingTimeline from './components/CookingTimeline';
import AISuggestions from './components/AISuggestions';
import DriveTab from './components/DriveTab';
import { useRecipes } from './hooks/useRecipes';
import { useBatchStore } from './store/batchStore';

const TABS = [
  { id: 'library', label: 'Recettes', icon: '📚' },
  { id: 'planner', label: 'Plan', icon: '🗓️' },
  { id: 'shopping', label: 'Courses', icon: '🛒' },
  { id: 'timeline', label: 'Timeline', icon: '⏱' },
  { id: 'ai', label: 'IA', icon: '✨' },
  { id: 'drive', label: 'Drive', icon: '🛍️' },
];

const PAGE_TITLES = {
  library: 'Mes Recettes',
  planner: 'Plan de repas',
  shopping: 'Liste de courses',
  timeline: 'Planning cuisson',
  ai: 'Suggestions IA',
  drive: 'Panier Drive',
};

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const { recipes, loading, error, refetch, saveToNotion } = useRecipes();
  const sessionCount = useBatchStore((s) => s.mealPlan?.days?.length ?? s.entries.length);
  const peopleCount = useBatchStore((s) => s.peopleCount);
  const setPeopleCount = useBatchStore((s) => s.setPeopleCount);

  return (
    <div className="min-h-screen bg-[#f2f2f7]">
      <header className="sticky top-0 z-20 bg-[#f2f2f7]/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-2xl mx-auto px-5 pt-12 pb-3 flex items-end justify-between gap-4">
          <h1 className="text-[32px] font-bold tracking-tight text-[#1c1c1e] leading-none">
            {PAGE_TITLES[activeTab]}
          </h1>
          <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1.5 shadow-sm border border-black/5 shrink-0">
            <span className="text-sm">👤</span>
            <button onClick={() => setPeopleCount(peopleCount - 1)} className="w-5 h-5 flex items-center justify-center text-orange-500 font-bold text-lg leading-none select-none">−</button>
            <span className="text-sm font-semibold text-[#1c1c1e] w-4 text-center tabular-nums">{peopleCount}</span>
            <button onClick={() => setPeopleCount(peopleCount + 1)} className="w-5 h-5 flex items-center justify-center text-orange-500 font-bold text-lg leading-none select-none">+</button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-5 pb-28">
        {activeTab === 'library' && <RecipeLibrary recipes={recipes} loading={loading} error={error} onRefetch={refetch} />}
        {activeTab === 'planner' && <BatchPlanner />}
        {activeTab === 'shopping' && <ShoppingList />}
        {activeTab === 'timeline' && <CookingTimeline />}
        {activeTab === 'ai' && <AISuggestions onSaveToNotion={saveToNotion} />}
        {activeTab === 'drive' && <DriveTab />}
      </main>

      <Navigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} sessionCount={sessionCount} />
    </div>
  );
}
