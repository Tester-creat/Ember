import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimeCard } from '../components/AnimeRows';
import { useAnimeData } from '../hooks/useAnimeData';
import { fetchRecentAnimePage, fetchTrendingAnimePage } from '../utils/api';
import { BROWSE_GRID_BATCH, BROWSE_GRID_INITIAL } from '../utils/renderBudgets';

const MODE_FETCHERS = {
  trending: fetchTrendingAnimePage,
  recent: fetchRecentAnimePage,
};

export default function Browse({ onOpenDetail }) {
  const { browseData, setBrowseData } = useAnimeData();
  const [gridCap, setGridCap] = useState(BROWSE_GRID_INITIAL);
  const moreRef = useRef(null);
  const browseRef = useRef(browseData);

  useEffect(() => {
    browseRef.current = browseData;
  }, [browseData]);

  const loadPage = useCallback(
    async (mode, page, replace = false) => {
      const fetcher = MODE_FETCHERS[mode] || fetchTrendingAnimePage;
      setBrowseData((prev) => ({
        ...prev,
        loading: true,
        error: null,
        mode,
      }));

      try {
        const payload = await fetcher(page, 30);
        setBrowseData((prev) => ({
          ...prev,
          results: replace ? payload.results : [...prev.results, ...payload.results],
          loading: false,
          error: null,
          page: payload.page,
          mode,
          hasMore: payload.hasMore,
        }));
      } catch (error) {
        setBrowseData((prev) => ({
          ...prev,
          loading: false,
          error: error.message,
          mode,
        }));
      }
    },
    [setBrowseData]
  );

  useEffect(() => {
    setGridCap(BROWSE_GRID_INITIAL);
  }, [browseData.mode]);

  useEffect(() => {
    if (browseData.results.length === 0 && !browseData.loading) {
      loadPage(browseData.mode || 'trending', 1, true);
    }
  }, [browseData.loading, browseData.mode, browseData.results.length, loadPage]);

  const loadMore = useCallback(async () => {
    const current = browseRef.current;
    if (current.loading) return;
    await loadPage(current.mode, current.page + 1, false);
    setGridCap((count) => count + BROWSE_GRID_BATCH);
  }, [loadPage]);

  const switchMode = (mode) => {
    if (mode === browseData.mode) return;
    setBrowseData({
      results: [],
      loading: false,
      error: null,
      page: 0,
      mode,
      hasMore: true,
    });
  };

  const displayed = browseData.results.slice(
    0,
    Math.min(gridCap, browseData.results.length)
  );
  const canRevealMore = browseData.results.length > displayed.length;

  useEffect(() => {
    const element = moreRef.current;
    if (!element || !canRevealMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setGridCap((count) => count + BROWSE_GRID_BATCH);
        }
      },
      { rootMargin: '240px', threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [canRevealMore, displayed.length]);

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div>
          <div className="section__eyebrow">Explore the catalog</div>
          <div className="section__title">Browse Anime</div>
        </div>
        <div className="section__actions">
          <div className="pill-nav">
            <button
              type="button"
              className={`pill-btn ${browseData.mode === 'trending' ? 'is-active' : ''}`}
              onClick={() => switchMode('trending')}
            >
              Trending
            </button>
            <button
              type="button"
              className={`pill-btn ${browseData.mode === 'recent' ? 'is-active' : ''}`}
              onClick={() => switchMode('recent')}
            >
              Airing Now
            </button>
          </div>
        </div>
      </div>

      {browseData.error ? (
        <div className="empty-state">
          <div className="empty-state__title">Browse feed unavailable</div>
          <p>{browseData.error}</p>
        </div>
      ) : null}

      <div className="media-grid">
        {displayed.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
        ))}
      </div>

      {canRevealMore ? <div ref={moreRef} style={{ height: 1, margin: 0 }} aria-hidden /> : null}

      {browseData.loading ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading more titles...</p>
        </div>
      ) : null}

      {!browseData.loading && !canRevealMore && browseData.hasMore ? (
        <div className="section__footer">
          <button type="button" className="btn btn--glass" onClick={loadMore}>
            Load More
          </button>
        </div>
      ) : null}
    </div>
  );
}
