import React from 'react';
import { ChefHat, BookOpen, ShoppingCart, CalendarDays, Sparkles } from 'lucide-react';
import clsx from 'clsx';

const TAB_ICONS = {
  planner: CalendarDays,
  recipes: BookOpen,
  generator: Sparkles,
  shopping: ShoppingCart,
};

export default function Navigation({ tabs, activeTab, onTabChange, recipeCount }) {
  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-sm">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg leading-tight">NotionCook</span>
              {recipeCount > 0 && (
                <span className="ml-2 text-xs text-gray-400">{recipeCount} recettes</span>
              )}
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex items-center gap-1">
            {tabs.map((tab) => {
              const Icon = TAB_ICONS[tab.id];
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    activeTab === tab.id
                      ? 'bg-brand-50 text-brand-600'
                      : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
                  )}
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
