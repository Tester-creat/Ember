
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { AnimeCard, MarqueeRow } from '../components/AnimeRows';
import { LIBRARY_FILTER_STATUSES, getStatusLabel } from '../utils/animeUtils';

const BATCH_SIZE = 24;

export default function Library({ onOpenDetail }) {
  const { userData, libraryFilter, setLibraryFilter } = useAnimeData();
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const observerTarget = useRef(null);
  
  const entries = useMemo(() => Object.values(userData).filter(e => e && e.id), [userData]);
  
  const filtered = useMemo(() => {
    const items = libraryFilter === 'all' 
      ? entries 
      : entries.filter(e => e.status === libraryFilter);
    
    // Sort logic
    if (libraryFilter === 'watching') {
      return items.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    } else if (libraryFilter === 'completed') {
      return items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    }
    return items;
  }, [entries, libraryFilter]);

  // Reset visible count on filter change
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [libraryFilter]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setVisibleCount(prev => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [filtered.length]);

  const groups = useMemo(() => {
    if (libraryFilter !== 'all') return [];
    return LIBRARY_FILTER_STATUSES.filter(s => s !== 'all').map(s => {
      let items = entries.filter(e => e.status === s);
      if (s === 'watching') {
        items = items.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
      } else if (s === 'completed') {
        items = items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
      }
      return { status: s, label: getStatusLabel(s), items };
    }).filter(g => g.items.length > 0);
  }, [entries, libraryFilter]);

  return (
    <div className="section">
      <div className="section__head">
        <div className="section__title">My Library</div>
        <div className="section__actions">
          <button className="btn btn--glass btn--sm">Export</button>
          <button className="btn btn--glass btn--sm">Import</button>
        </div>
      </div>

      <div className="filter-bar">
        {LIBRARY_FILTER_STATUSES.map(status => {
          const count = status === 'all' ? entries.length : entries.filter(e => e.status === status).length;
          if (count === 0 && !['all', 'watching', 'plan-to-watch', 'completed'].includes(status)) return null;
          
          return (
            <button 
              key={status}
              className={`filter-btn ${libraryFilter === status ? 'is-active' : ''}`}
              onClick={() => setLibraryFilter(status)}
            >
              {getStatusLabel(status)}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="library-content" style={{ marginTop: 'var(--sp-6)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>
        {libraryFilter === 'all' ? (
          groups.map(group => (
            <div key={group.status} className="library-group">
              <h3 className="library-group__title" style={{ fontSize: 'var(--t-lg)', fontWeight: '700', marginBottom: 'var(--sp-4)', color: 'var(--text1)' }}>
                {group.label}
              </h3>
              {group.status === 'watching' ? (
                <div className="media-row">
                  <div className="media-row__viewport" style={{ overflowX: 'auto', paddingBottom: 'var(--sp-4)' }}>
                    <div className="media-row__track">
                      {group.items.map(entry => (
                        <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="media-grid">
                  {group.items.slice(0, group.status === 'completed' ? visibleCount : 999).map(entry => (
                    <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="media-grid">
            {filtered.slice(0, visibleCount).map(entry => (
              <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        )}

        {filtered.length > visibleCount && (
          <div ref={observerTarget} style={{ height: '20px', margin: '20px 0' }} />
        )}

        {entries.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">📚</div>
            <div className="empty-state__title">Library is empty</div>
            <p>Start browsing to add your favorite anime!</p>
          </div>
        )}
      </div>
    </div>
  );
}
