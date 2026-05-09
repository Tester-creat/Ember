
import React from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { AnimeCard, MarqueeRow } from '../components/AnimeRows';
import { LIBRARY_FILTER_STATUSES, getStatusLabel } from '../utils/animeUtils';

export default function Library({ onOpenDetail }) {
  const { userData, libraryFilter, setLibraryFilter } = useAnimeData();
  
  const entries = Object.values(userData).filter(e => e && e.id);
  const filtered = libraryFilter === 'all' 
    ? entries 
    : entries.filter(e => e.status === libraryFilter);

  // Group by status for 'all' view, adhering strictly to LIBRARY_FILTER_STATUSES order
  const groups = libraryFilter === 'all' 
    ? LIBRARY_FILTER_STATUSES.filter(s => s !== 'all').map(s => {
        let items = entries.filter(e => e.status === s);
        // Sort active engagement
        if (s === 'watching') {
          items = items.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
        } else if (s === 'completed') {
          items = items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        }
        return { status: s, label: getStatusLabel(s), items };
      }).filter(g => g.items.length > 0)
    : [];

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
          // Only show filter buttons that actually have items, except for 'all' and a few key ones
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
                // Use a horizontal scrolling row for "Watching"
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
                  {group.items.map(entry => (
                    <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="media-grid">
            {filtered.map(entry => (
              <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
            ))}
          </div>
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
