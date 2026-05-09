
import { useEffect, useCallback, useState, useRef } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { anikotoFetch } from '../utils/api';
import { normalizeAnime } from '../utils/animeUtils';
import { AnimeCard } from '../components/AnimeRows';
import { BROWSE_GRID_INITIAL, BROWSE_GRID_BATCH } from '../utils/renderBudgets';

export default function Browse({ onOpenDetail }) {
  const { browseData, setBrowseData } = useAnimeData();
  const [gridCap, setGridCap] = useState(BROWSE_GRID_INITIAL);
  const moreRef = useRef(null);
  const browseRef = useRef(browseData);

  useEffect(() => {
    browseRef.current = browseData;
  }, [browseData]);

  useEffect(() => {
    setGridCap(BROWSE_GRID_INITIAL);
  }, [browseData.mode]);

  const loadMore = useCallback(async () => {
    const b = browseRef.current;
    if (b.loading) return;
    setBrowseData((prev) => ({ ...prev, loading: true }));
    try {
      const nextPage = b.page + 1;
      const res = await anikotoFetch(`/recent-anime?page=${nextPage}&per_page=50`);
      const data = await res.json();
      if (data.ok) {
        const normalized = data.data.map((m) => normalizeAnime({ ...m, id: m.ani_id }));
        setBrowseData((prev) => ({
          ...prev,
          results: [...prev.results, ...normalized],
          page: nextPage,
          loading: false,
          hasMore: normalized.length >= 50,
        }));
        setGridCap((c) => c + BROWSE_GRID_BATCH);
      } else {
        setBrowseData((prev) => ({ ...prev, loading: false }));
      }
    } catch (e) {
      setBrowseData((prev) => ({ ...prev, loading: false, error: e.message }));
    }
  }, [setBrowseData]);

  const switchMode = (mode) => {
    setBrowseData({ results: [], loading: false, error: null, page: 0, mode, hasMore: true });
  };

  const displayed = browseData.results.slice(0, Math.min(gridCap, browseData.results.length));
  const canRevealMore = browseData.results.length > displayed.length;

  useEffect(() => {
    const el = moreRef.current;
    if (!el || !canRevealMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setGridCap((c) => c + BROWSE_GRID_BATCH);
        }
      },
      { rootMargin: '240px', threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canRevealMore, displayed.length]);

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div className="section__title">Browse Anime</div>
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
              Recent
            </button>
          </div>
        </div>
      </div>

      <div className="media-grid">
        {displayed.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
        ))}
      </div>

      {canRevealMore && <div ref={moreRef} style={{ height: 1, margin: 0 }} aria-hidden />}

      {browseData.loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading more titles...</p>
        </div>
      )}

      {!browseData.loading && browseData.hasMore && (
        <div className="section__footer">
          <button type="button" className="btn btn--glass" onClick={loadMore}>
            Load More
          </button>
        </div>
      )}
    </div>
  );
}
