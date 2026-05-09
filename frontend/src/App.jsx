import React, { useState } from 'react';
import Navigation from './components/Navigation';
import RecipeLibrary from './components/RecipeLibrary';
import BatchPlanner from './components/BatchPlanner';
import ShoppingList from './components/ShoppingList';
import CookingTimeline from './components/CookingTimeline';
import AISuggestions from './components/AISuggestions';
import { useRecipes } from './hooks/useRecipes';
import { useBatchStore } from './store/batchStore';

const TABS = [
  { id: 'library', label: '📚 Bibliothèque' },
  { id: 'planner', label: '🥘 Batch Planner' },
  { id: 'shopping', label: '🛒 Courses' },
  { id: 'timeline', label: '⏱ Timeline' },
  { id: 'ai', label: '✨ Suggestions IA' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('planner');
  const { recipes, loading, error, refetch, saveToNotion } = useRecipes();
  const sessionCount = useBatchStore((s) => s.entries.length);

  return (
    <div className="min-h-screen bg-amber-50">
      <Navigation
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionCount={sessionCount}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6">
        {activeTab === 'library' && (
          <RecipeLibrary recipes={recipes} loading={loading} error={error} onRefetch={refetch} />
        )}
        {activeTab === 'planner' && (
          <BatchPlanner recipes={recipes} loading={loading} />
        )}
        {activeTab === 'shopping' && <ShoppingList />}
        {activeTab === 'timeline' && <CookingTimeline />}
        {activeTab === 'ai' && <AISuggestions onSaveToNotion={saveToNotion} />}
      </main>
    </div>
  );
}
