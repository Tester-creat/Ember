
import React, { useEffect, useCallback } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { anikotoFetch } from '../utils/api';
import { normalizeAnime } from '../utils/animeUtils';
import { AnimeCard } from '../components/AnimeRows';

export default function Browse({ onOpenDetail }) {
  const { browseData, setBrowseData } = useAnimeData();

  const loadMore = useCallback(async () => {
    if (browseData.loading) return;
    setBrowseData(prev => ({ ...prev, loading: true }));
    try {
      const nextPage = browseData.page + 1;
      const res = await anikotoFetch(`/recent-anime?page=${nextPage}&per_page=50`);
      const data = await res.json();
      if (data.ok) {
        const normalized = data.data.map(m => normalizeAnime({ ...m, id: m.ani_id }));
        setBrowseData(prev => ({
          ...prev,
          results: [...prev.results, ...normalized],
          page: nextPage,
          loading: false,
          hasMore: normalized.length >= 50
        }));
      }
    } catch (e) {
      setBrowseData(prev => ({ ...prev, loading: false, error: e.message }));
    }
  }, [browseData, setBrowseData]);

  const switchMode = (mode) => {
    setBrowseData({ results: [], loading: false, error: null, page: 0, mode, hasMore: true });
    // In a real app, this would trigger a different API call or sort
  };

  return (
    <div className="section">
      <div className="section__head">
        <div className="section__title">Browse Anime</div>
        <div className="section__actions">
          <div className="pill-nav">
            <button 
              className={`pill-btn ${browseData.mode === 'trending' ? 'is-active' : ''}`}
              onClick={() => switchMode('trending')}
            >
              Trending
            </button>
            <button 
              className={`pill-btn ${browseData.mode === 'recent' ? 'is-active' : ''}`}
              onClick={() => switchMode('recent')}
            >
              Recent
            </button>
          </div>
        </div>
      </div>

      <div className="media-grid">
        {browseData.results.map((anime, i) => (
          <AnimeCard key={`${anime.id}-${i}`} anime={anime} onOpenDetail={onOpenDetail} />
        ))}
      </div>

      {browseData.loading && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading more titles...</p>
        </div>
      )}

      {!browseData.loading && browseData.hasMore && (
        <div className="section__footer">
          <button className="btn btn--glass" onClick={loadMore}>Load More</button>
        </div>
      )}
    </div>
  );
}
