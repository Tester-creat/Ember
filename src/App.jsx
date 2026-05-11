import { useEffect, useRef, useState } from 'react';
import { AnimeProvider, useAnimeData } from './hooks/useAnimeData';
import CoverArt from './components/CoverArt';
import Hero from './components/Hero';
import MobileBar from './components/MobileBar';
import Navbar from './components/Navbar';
import PerformanceHud from './components/PerformanceHud';
import Browse from './sections/Browse';
import Home from './sections/Home';
import Library from './sections/Library';
import Search from './sections/Search';
import Seasonal from './sections/Seasonal';
import Stats from './sections/Stats';
import Watch from './sections/Watch';
import { fetchTrendingAnimePage } from './utils/api';
import { getPlainDescription, getTitle } from './utils/animeUtils';
import './index.css';

function AppContent() {
  const {
    currentTab,
    setCurrentTab,
    setBrowseData,
    homeTrending,
    setHomeTrending,
    currentWatchId,
    setCurrentWatchId,
    addToLibrary,
  } = useAnimeData();
  const [selectedAnime, setSelectedAnime] = useState(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current || homeTrending.results.length > 0 || homeTrending.loading) {
      return;
    }
    initializedRef.current = true;

    const init = async () => {
      try {
        setHomeTrending((prev) => ({ ...prev, loading: true, error: null }));
        const trending = await fetchTrendingAnimePage(1, 30);

        setHomeTrending({
          results: trending.results,
          loading: false,
          error: null,
          page: trending.page,
          hasMore: trending.hasMore,
        });

        setBrowseData((prev) => ({
          ...prev,
          results: trending.results,
          loading: false,
          error: null,
          page: trending.page,
          mode: 'trending',
          hasMore: trending.hasMore,
        }));
      } catch (error) {
        console.error('Initial load failed', error);
        initializedRef.current = false;
        setHomeTrending((prev) => ({ ...prev, loading: false, error: error.message }));
      }
    };
    init();
  }, [homeTrending.loading, homeTrending.results.length, setBrowseData, setHomeTrending]);

  const renderActiveSection = () => {
    if (currentWatchId) return <Watch />;

    switch (currentTab) {
      case 'home':
        return <Home onOpenDetail={setSelectedAnime} />;
      case 'browse':
        return <Browse onOpenDetail={setSelectedAnime} />;
      case 'seasonal':
        return <Seasonal onOpenDetail={setSelectedAnime} />;
      case 'library':
        return <Library onOpenDetail={setSelectedAnime} />;
      case 'stats':
        return <Stats />;
      case 'search':
        return <Search onOpenDetail={setSelectedAnime} />;
      default:
        return <Home onOpenDetail={setSelectedAnime} />;
    }
  };

  const detailDescription = getPlainDescription(selectedAnime?.description);

  return (
    <div className="app-container">
      <Navbar />

      {currentTab === 'home' && !currentWatchId ? <Hero /> : null}

      <main
        className="main"
        id="app"
        style={{
          paddingTop:
            currentTab === 'home' && !currentWatchId
              ? '0'
              : 'calc(var(--nav-height) + var(--space-6))',
          paddingBottom: 'calc(var(--mob-nav-h) + var(--space-6))',
        }}
      >
        {renderActiveSection()}
      </main>

      <MobileBar />
      <PerformanceHud />

      {selectedAnime ? (
        <div className="overlay is-open" onClick={() => setSelectedAnime(null)}>
          <div className="overlay-card" onClick={(event) => event.stopPropagation()}>
            <div className="overlay-card__media">
              <CoverArt anime={selectedAnime} className="cover-media cover-media--overlay" />
            </div>
            <div className="overlay-card__content">
              <button
                className="btn btn--ghost btn--sm overlay-card__close"
                onClick={() => setSelectedAnime(null)}
              >
                Close
              </button>
              <h2 className="overlay-card__title">{getTitle(selectedAnime)}</h2>
              <div className="overlay-card__meta">
                {[
                  selectedAnime.year,
                  selectedAnime.format,
                  selectedAnime.averageScore ? `${selectedAnime.averageScore}%` : null,
                ]
                  .filter(Boolean)
                  .join(' / ')}
              </div>
              {detailDescription ? (
                <p className="overlay-card__text">{detailDescription}</p>
              ) : null}
              <div className="overlay-card__actions">
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    const savedEntry = addToLibrary(selectedAnime, 'watching');
                    setCurrentWatchId(savedEntry.id);
                    setCurrentTab('watch');
                    setSelectedAnime(null);
                  }}
                >
                  Watch Now
                </button>
                <button
                  className="btn btn--glass"
                  onClick={() => {
                    addToLibrary(selectedAnime, 'plan-to-watch');
                    setSelectedAnime(null);
                  }}
                >
                  Add to List
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
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
