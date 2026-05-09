
import React, { useState, useEffect } from 'react';
import { useAnimeData, AnimeProvider } from './hooks/useAnimeData';
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
      case 'stats': return <div className="section"><h2 className="section__title">Stats (Coming Soon)</h2></div>;
      case 'search': return <Search onOpenDetail={setSelectedAnime} />;
      default: return <Home onOpenDetail={setSelectedAnime} />;
    }
  };


  return (
    <div className="app-container">
      <Navbar />
      
      {currentTab === 'home' && !currentWatchId && <Hero />}
      
      <main className="main" id="app" style={{ 
        paddingTop: (currentTab === 'home' && !currentWatchId) ? '0' : 'calc(var(--nav-height) + 16px)' 
      }}>
        {renderActiveSection()}
      </main>

      <MobileBar />

      {/* Detail Overlay */}
      {selectedAnime && (
        <div className="overlay" style={{ display: 'flex' }} onClick={() => setSelectedAnime(null)}>
          <div className="overlay__content" onClick={e => e.stopPropagation()}>
            <button className="overlay__close" onClick={() => setSelectedAnime(null)}>×</button>
            <div className="overlay__body">
              <div className="overlay__header">
                <img src={selectedAnime.banner || selectedAnime.cover} alt="" className="overlay__banner" />
                <div className="overlay__title-area">
                  <h2 className="overlay__title">{selectedAnime.title}</h2>
                  <div className="overlay__meta">
                    {selectedAnime.year} · {selectedAnime.format} · {selectedAnime.averageScore}%
                  </div>
                </div>
              </div>
              <div className="overlay__desc" dangerouslySetInnerHTML={{ __html: selectedAnime.description }} />
              <div className="overlay__actions">
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
