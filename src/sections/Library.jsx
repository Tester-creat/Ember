
import { useState, useEffect, useRef, useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { AnimeCard } from '../components/AnimeRows';
import { LIBRARY_FILTER_STATUSES, getStatusLabel } from '../utils/animeUtils';
import { LIBRARY_WATCHING_ROW_MAX } from '../utils/renderBudgets';

const BATCH_SIZE = 24;

export default function Library(props) {
  const { libraryFilter } = useAnimeData();
  return <LibraryInner key={libraryFilter} {...props} />;
}

function LibraryInner({ onOpenDetail }) {
  const { userData, libraryFilter, setLibraryFilter } = useAnimeData();
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const observerTarget = useRef(null);

  const entries = useMemo(() => Object.values(userData).filter((e) => e && e.id), [userData]);

  const statusCounts = useMemo(() => {
    const m = {};
    for (const e of entries) {
      const s = e.status;
      if (s) m[s] = (m[s] || 0) + 1;
    }
    return m;
  }, [entries]);

  const filtered = useMemo(() => {
    const items =
      libraryFilter === 'all' ? entries : entries.filter((e) => e.status === libraryFilter);

    if (libraryFilter === 'watching') {
      return [...items].sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
    }
    if (libraryFilter === 'completed') {
      return [...items].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
    }
    return items;
  }, [entries, libraryFilter]);

  const groups = useMemo(() => {
    if (libraryFilter !== 'all') return [];
    return LIBRARY_FILTER_STATUSES.filter((s) => s !== 'all')
      .map((s) => {
        let items = entries.filter((e) => e.status === s);
        if (s === 'watching') {
          items = items.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
        } else if (s === 'completed') {
          items = items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        }
        return { status: s, label: getStatusLabel(s), items };
      })
      .filter((g) => g.items.length > 0);
  }, [entries, libraryFilter]);

  const completedCountInAll = useMemo(() => {
    const g = groups.find((x) => x.status === 'completed');
    return g ? g.items.length : 0;
  }, [groups]);

  const showLoadMoreSentinel =
    libraryFilter === 'all' ? completedCountInAll > visibleCount : filtered.length > visibleCount;

  useEffect(() => {
    const el = observerTarget.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (obsEntries) => {
        if (obsEntries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [showLoadMoreSentinel, libraryFilter]);

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div className="section__title">My Library</div>
        <div className="section__actions">
          <button type="button" className="btn btn--glass btn--sm">
            Export
          </button>
          <button type="button" className="btn btn--glass btn--sm">
            Import
          </button>
        </div>
      </div>

      <div className="filter-bar">
        {LIBRARY_FILTER_STATUSES.map((status) => {
          const count = status === 'all' ? entries.length : statusCounts[status] || 0;
          if (count === 0 && !['all', 'watching', 'plan-to-watch', 'completed'].includes(status))
            return null;

          return (
            <button
              key={status}
              type="button"
              className={`filter-btn ${libraryFilter === status ? 'is-active' : ''}`}
              onClick={() => setLibraryFilter(status)}
            >
              {getStatusLabel(status)}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div
        className="library-content"
        style={{
          marginTop: 'var(--sp-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-8)',
        }}
      >
        {libraryFilter === 'all' ? (
          groups.map((group) => {
            const watchingShown =
              group.status === 'watching'
                ? group.items.slice(0, LIBRARY_WATCHING_ROW_MAX)
                : group.items;
            const watchingOverflow =
              group.status === 'watching' && group.items.length > LIBRARY_WATCHING_ROW_MAX;

            return (
              <div key={group.status} className="library-group">
                <h3
                  className="library-group__title"
                  style={{
                    fontSize: 'var(--t-lg)',
                    fontWeight: '700',
                    marginBottom: 'var(--sp-4)',
                    color: 'var(--text1)',
                  }}
                >
                  {group.label}
                </h3>
                {group.status === 'watching' ? (
                  <>
                    <div className="media-row">
                      <div
                        className="media-row__viewport"
                        style={{ overflowX: 'auto', paddingBottom: 'var(--sp-4)' }}
                      >
                        <div className="media-row__track">
                          {watchingShown.map((entry) => (
                            <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {watchingOverflow && (
                      <p className="library-row-hint">
                        Showing top {LIBRARY_WATCHING_ROW_MAX} by recency — open{' '}
                        <strong>Watching</strong> to see the full list.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="media-grid">
                    {group.items
                      .slice(0, group.status === 'completed' ? visibleCount : group.items.length)
                      .map((entry) => (
                        <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
                      ))}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="media-grid">
            {filtered.slice(0, visibleCount).map((entry) => (
              <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        )}

        {showLoadMoreSentinel && (
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
