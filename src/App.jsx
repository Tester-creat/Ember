import { useEffect, useMemo, useRef, useState } from 'react';
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
import {
  getPlainDescription,
  getStatusLabel,
  getStatusTransitionPatch,
  getTitle,
  STATUS_ORDER,
} from './utils/animeUtils';
import './index.css';

const OVERLAY_STATUS_OPTIONS = STATUS_ORDER.filter((status) =>
  ['watching', 'queued', 'plan-to-watch', 'rewatching', 'paused', 'favorites', 'completed', 'archived', 'dropped', 'untracked'].includes(status)
);

function AppContent() {
  const {
    currentTab,
    setCurrentTab,
    setBrowseData,
    homeTrending,
    setHomeTrending,
    currentWatchId,
    setCurrentWatchId,
    getEntry,
    updateEntry,
    addToLibrary,
  } = useAnimeData();
  const [selectedAnime, setSelectedAnime] = useState(null);
  const [overlayStatus, setOverlayStatus] = useState('plan-to-watch');
  const [overlayRating, setOverlayRating] = useState(0);
  const [overlayNotes, setOverlayNotes] = useState('');
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
  const selectedEntry = useMemo(() => {
    if (!selectedAnime) return null;
    return getEntry(selectedAnime.id || selectedAnime.anilistId);
  }, [getEntry, selectedAnime]);

  useEffect(() => {
    if (!selectedAnime) return;
    const entry = getEntry(selectedAnime.id || selectedAnime.anilistId);
    setOverlayStatus(entry?.status || 'plan-to-watch');
    setOverlayRating(entry?.rating || 0);
    setOverlayNotes(entry?.notes || '');
  }, [getEntry, selectedAnime]);

  const saveOverlayFields = () => {
    if (!selectedEntry) return;
    updateEntry(selectedEntry.id, {
      rating: overlayRating,
      notes: overlayNotes,
    });
  };

  const handleOverlayStatusSelect = (nextStatus) => {
    setOverlayStatus(nextStatus);

    if (!selectedEntry) return;

    updateEntry(selectedEntry.id, {
      ...getStatusTransitionPatch(selectedEntry, nextStatus),
    });
  };

  const handleOverlayPrimaryAction = () => {
    if (!selectedAnime) return;

    if (selectedEntry) {
      saveOverlayFields();
      setCurrentWatchId(selectedEntry.id);
      setCurrentTab('watch');
      setSelectedAnime(null);
      return;
    }

    addToLibrary(selectedAnime, overlayStatus, {
      rating: overlayRating,
      notes: overlayNotes,
    });
    setSelectedAnime(null);
  };

  const handleOverlayWatchAnyway = () => {
    if (!selectedAnime) return;

    const savedEntry = addToLibrary(selectedAnime, 'watching', {
      rating: overlayRating,
      notes: overlayNotes,
      lastWatched: Date.now(),
    });
    setCurrentWatchId(savedEntry.id);
    setCurrentTab('watch');
    setSelectedAnime(null);
  };

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
              <div className="overlay-status-picker">
                <div className="overlay-section__label">
                  {selectedEntry ? 'Library Status' : 'Add to Library As'}
                </div>
                <div className="status-chips">
                  {OVERLAY_STATUS_OPTIONS.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`status-chip ${overlayStatus === status ? 'is-active' : ''}`}
                      onClick={() => handleOverlayStatusSelect(status)}
                    >
                      {getStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="overlay-fields">
                <label className="overlay-field">
                  <span className="overlay-section__label">Rating</span>
                  <select
                    className="overlay-select"
                    value={overlayRating}
                    onChange={(event) => setOverlayRating(Number(event.target.value))}
                    onBlur={saveOverlayFields}
                  >
                    {Array.from({ length: 11 }, (_, value) => value).map((value) => (
                      <option key={value} value={value}>
                        {value === 0 ? 'Unrated' : `${value} / 10`}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="overlay-field overlay-field--notes">
                  <span className="overlay-section__label">Notes</span>
                  <textarea
                    className="overlay-textarea"
                    rows="4"
                    placeholder="Add quick thoughts, standout moments, or reminders."
                    value={overlayNotes}
                    onChange={(event) => setOverlayNotes(event.target.value)}
                    onBlur={saveOverlayFields}
                  />
                </label>
              </div>
              <div className="overlay-card__actions">
                <button
                  className="btn btn--primary"
                  onClick={handleOverlayPrimaryAction}
                >
                  {selectedEntry ? 'Watch Now' : 'Add to Library'}
                </button>
                <button
                  className={`btn ${selectedEntry ? 'btn--ghost' : 'btn--glass'}`}
                  onClick={handleOverlayWatchAnyway}
                >
                  Start Watching
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
