
import { useState, useEffect } from 'react';
import { useAnimeData, AnimeProvider } from './hooks/useAnimeData';
import PerformanceHud from './components/PerformanceHud';
import Navbar from './components/Navbar';
import MobileBar from './components/MobileBar';
import Hero from './components/Hero';
import Home from './sections/Home';
import Browse from './sections/Browse';
import Library from './sections/Library';
import Watch from './sections/Watch';
import Seasonal from './sections/Seasonal';
import Search from './sections/Search';
import { anikotoFetch } from './utils/api';
import { getCoverSrc, getTitle } from './utils/animeUtils';
import './index.css';

function AppContent() {
  const { currentTab, setCurrentTab, setBrowseData, currentWatchId, setCurrentWatchId, addToLibrary } = useAnimeData();
  const [selectedAnime, setSelectedAnime] = useState(null);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        const res = await anikotoFetch('/recent-anime?page=1&per_page=50');
        const data = await res.json();
        if (data.ok) {
          const results = data.data.map(m => ({ ...m, id: m.ani_id }));
          setBrowseData(prev => ({ ...prev, results, loading: false }));
        }
      } catch (e) {
        console.error("Initial load failed", e);
      }
    };
    init();
  }, [setBrowseData]);

  const renderActiveSection = () => {
    if (currentWatchId) return <Watch />;

    switch (currentTab) {
      case 'home': return <Home onOpenDetail={setSelectedAnime} />;
      case 'browse': return <Browse onOpenDetail={setSelectedAnime} />;
      case 'seasonal': return <Seasonal onOpenDetail={setSelectedAnime} />;
      case 'library': return <Library onOpenDetail={setSelectedAnime} />;
      case 'stats': return <div className="section page-inner"><h2 className="section__title">Stats (Coming Soon)</h2></div>;
      case 'search': return <Search onOpenDetail={setSelectedAnime} />;
      default: return <Home onOpenDetail={setSelectedAnime} />;
    }
  };


  return (
    <div className="app-container">
      <Navbar />
      
      {currentTab === 'home' && !currentWatchId && <Hero />}
      
      <main
        className="main"
        id="app"
        style={{
          paddingTop: currentTab === 'home' && !currentWatchId ? '0' : 'calc(var(--nav-height) + 16px)',
        }}
      >
        {renderActiveSection()}
      </main>

      <MobileBar />

      <PerformanceHud />

      {/* Detail Overlay */}
      {selectedAnime && (
        <div className="overlay is-open" onClick={() => setSelectedAnime(null)}>
          <div className="overlay-card" onClick={e => e.stopPropagation()}>
            <div className="overlay-card__media">
             <img src={getCoverSrc(selectedAnime)} alt="" className="cover-media__img" />
             </div>
             <div className="overlay-card__content">
               <button className="btn btn--glass btn--sm" style={{ alignSelf: 'flex-end' }} onClick={() => setSelectedAnime(null)}>Close</button>
               <h2 className="overlay-card__title">{getTitle(selectedAnime)}</h2>
              <div className="overlay-card__meta" style={{ color: 'var(--accent-hi)', fontWeight: '600' }}>
                {selectedAnime.year} · {selectedAnime.format} · {selectedAnime.averageScore}%
              </div>
              <div className="overlay-card__text" dangerouslySetInnerHTML={{ __html: selectedAnime.description }} />
              <div className="overlay-card__actions" style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'auto' }}>
                <button className="btn btn--primary" onClick={() => {
                  setCurrentWatchId(selectedAnime.id);
                  setCurrentTab('watch');
                  setSelectedAnime(null);
                }}>Watch Now</button>
                <button className="btn btn--glass" onClick={() => {
                  addToLibrary(selectedAnime, "plan-to-watch");
                  setSelectedAnime(null);
                }}>Add to List</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AnimeProvider>
      <AppContent />
    </AnimeProvider>
  );
}
