import React from 'react';

export default function Navigation({ tabs, activeTab, onTabChange, sessionCount }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 bg-white/75 backdrop-blur-xl border-t border-black/8">
      <div className="max-w-2xl mx-auto flex items-center justify-around px-1 pt-2 pb-safe">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const showBadge = tab.id === 'planner' && sessionCount > 0;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-0.5 py-1 px-2 flex-1 relative transition-opacity"
            >
              <div className="relative">
                <span
                  className={`text-[22px] block transition-all duration-150 ${isActive ? '' : 'opacity-40'}`}
                  style={isActive ? { filter: 'drop-shadow(0 1px 4px rgba(249,115,22,0.3))' } : {}}
                >
                  {tab.icon}
                </span>
                {showBadge && (
                  <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                    {sessionCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-medium transition-colors ${isActive ? 'text-orange-500' : 'text-[#8e8e93]'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
