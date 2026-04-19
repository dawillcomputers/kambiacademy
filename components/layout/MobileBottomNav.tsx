import React, { useState } from 'react';

export interface BottomNavItem {
  key: string;
  label: string;
  icon: string;
  onClick: () => void;
  badge?: number;
}

interface MobileBottomNavProps {
  items: BottomNavItem[];
  activeKey: string;
  /** Extra items shown in a "More" popup when there are > maxVisible items */
  maxVisible?: number;
}

const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ items, activeKey, maxVisible = 5 }) => {
  const [showMore, setShowMore] = useState(false);

  const needsMore = items.length > maxVisible;
  const visibleItems = needsMore ? items.slice(0, maxVisible - 1) : items;
  const overflowItems = needsMore ? items.slice(maxVisible - 1) : [];

  return (
    <>
      {/* Spacer so content doesn't hide behind fixed nav */}
      <div className="h-16 md:hidden" />

      {/* More menu overlay */}
      {showMore && (
        <div className="fixed inset-0 z-40 md:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="absolute bottom-16 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 rounded-t-2xl shadow-2xl p-3 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid grid-cols-3 gap-2">
              {overflowItems.map((item) => (
                <button
                  key={item.key}
                  onClick={() => { item.onClick(); setShowMore(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-colors ${
                    activeKey === item.key
                      ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10'
                  }`}
                >
                  <span className="text-xl relative">
                    {item.icon}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {item.badge > 9 ? '9+' : item.badge}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-medium leading-tight">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {visibleItems.map((item) => (
            <button
              key={item.key}
              onClick={item.onClick}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                activeKey === item.key
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="text-xl relative">
                {item.icon}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </span>
              <span className={`text-[10px] font-semibold leading-tight ${
                activeKey === item.key ? 'text-indigo-600 dark:text-indigo-400' : ''
              }`}>{item.label}</span>
            </button>
          ))}

          {needsMore && (
            <button
              onClick={() => setShowMore(!showMore)}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${
                showMore || overflowItems.some(i => i.key === activeKey)
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <span className="text-xl">⋯</span>
              <span className="text-[10px] font-semibold leading-tight">More</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
};

export default MobileBottomNav;
