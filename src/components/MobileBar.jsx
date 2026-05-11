
import { useAnimeData } from '../hooks/useAnimeData';

export default function MobileBar() {
  const { currentTab, setCurrentTab, setCurrentWatchId } = useAnimeData();

  const handleTabClick = (tab) => {
    setCurrentTab(tab);
    setCurrentWatchId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const tabs = [
    { id: 'home', label: 'Home', icon: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
    { id: 'browse', label: 'Browse', icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></> },
    { id: 'seasonal', label: 'Season', icon: <><path d="M12 2v20"/><path d="M5 9c1.5-2 4-3 7-3s5.5 1 7 3"/><path d="M5 15c1.5 2 4 3 7 3s5.5-1 7-3"/></> },
    { id: 'search', label: 'Search', icon: <><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></> },
    { id: 'library', label: 'Library', icon: <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></> },
    { id: 'stats', label: 'Stats', icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></> }
  ];

  return (
    <div className="mobile-bar">
      {tabs.map(tab => (
        <button 
          key={tab.id}
          className={`mobile-tab ${currentTab === tab.id ? 'is-active' : ''}`}
          onClick={() => handleTabClick(tab.id)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {tab.icon}
          </svg>
          <span>{tab.label}</span>
        </button>
      ))}
    </div>
  );
}
