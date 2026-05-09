
import React from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { AnimeCard } from '../components/AnimeRows';
import { LIBRARY_FILTER_STATUSES, getStatusLabel } from '../utils/animeUtils';

export default function Library({ onOpenDetail }) {
  const { userData, libraryFilter, setLibraryFilter } = useAnimeData();
  
  const entries = Object.values(userData).filter(e => e && e.id);
  const filtered = libraryFilter === 'all' 
    ? entries 
    : entries.filter(e => e.status === libraryFilter);

  // Group by status for 'all' view
  const groups = libraryFilter === 'all' 
    ? LIBRARY_FILTER_STATUSES.filter(s => s !== 'all').map(s => ({
        status: s,
        label: getStatusLabel(s),
        items: entries.filter(e => e.status === s)
      })).filter(g => g.items.length > 0)
    : [];

  return (
    <div className="section">
      <div className="section__head">
        <div className="section__title">My Library</div>
        <div className="section__actions">
          <button className="btn btn--glass btn--sm" onClick={() => { /* Export logic */ }}>Export</button>
          <button className="btn btn--glass btn--sm" onClick={() => { /* Import logic */ }}>Import</button>
        </div>
      </div>

      <div className="filter-bar">
        {LIBRARY_FILTER_STATUSES.map(status => {
          const count = status === 'all' ? entries.length : entries.filter(e => e.status === status).length;
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

      {libraryFilter === 'all' ? (
        groups.map(group => (
          <div key={group.status} className="library-group">
            <h3 className="library-group__title">{group.label}</h3>
            <div className="media-grid">
              {group.items.map(entry => (
                <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
              ))}
            </div>
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
  );
}
