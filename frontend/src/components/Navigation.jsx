import React from 'react';

export default function Navigation({ tabs, activeTab, onTabChange, sessionCount }) {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 h-14">
          <span className="text-2xl">🥗</span>
          <h1 className="text-xl font-bold text-amber-800">BatchCook</h1>
          {sessionCount > 0 && (
            <span className="bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {sessionCount} recette{sessionCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-white'
                  : 'text-gray-600 hover:text-amber-700 hover:bg-amber-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
