import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimeCard } from '../components/AnimeRows';
import { useAnimeData } from '../hooks/useAnimeData';
import { getStatusLabel, LIBRARY_FILTER_STATUSES } from '../utils/animeUtils';
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

  const entries = useMemo(
    () => Object.values(userData).filter((entry) => entry && entry.id),
    [userData]
  );

  const statusCounts = useMemo(() => {
    const counts = {};
    for (const entry of entries) {
      if (!entry.status) continue;
      counts[entry.status] = (counts[entry.status] || 0) + 1;
    }
    return counts;
  }, [entries]);

  const filtered = useMemo(() => {
    const items =
      libraryFilter === 'all' ? entries : entries.filter((entry) => entry.status === libraryFilter);

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

    return LIBRARY_FILTER_STATUSES.filter((status) => status !== 'all')
      .map((status) => {
        let items = entries.filter((entry) => entry.status === status);
        if (status === 'watching') {
          items = items.sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
        } else if (status === 'completed') {
          items = items.sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        }
        return { status, label: getStatusLabel(status), items };
      })
      .filter((group) => group.items.length > 0);
  }, [entries, libraryFilter]);

  const completedCountInAll = useMemo(() => {
    const completed = groups.find((group) => group.status === 'completed');
    return completed ? completed.items.length : 0;
  }, [groups]);

  const showLoadMoreSentinel =
    libraryFilter === 'all' ? completedCountInAll > visibleCount : filtered.length > visibleCount;

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return undefined;

    const observer = new IntersectionObserver(
      (observedEntries) => {
        if (observedEntries[0]?.isIntersecting) {
          setVisibleCount((prev) => prev + BATCH_SIZE);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [libraryFilter, showLoadMoreSentinel]);

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div>
          <div className="section__eyebrow">Tracked collection</div>
          <div className="section__title">My Library</div>
        </div>
        <div className="section__actions">
          <button type="button" className="btn btn--glass btn--sm" disabled>
            Export
          </button>
          <button type="button" className="btn btn--glass btn--sm" disabled>
            Import
          </button>
        </div>
      </div>

      <div className="filter-bar">
        {LIBRARY_FILTER_STATUSES.map((status) => {
          const count = status === 'all' ? entries.length : statusCounts[status] || 0;
          if (count === 0 && !['all', 'watching', 'plan-to-watch', 'completed'].includes(status)) {
            return null;
          }

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
          marginTop: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-8)',
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
                <h3 className="library-group__title">{group.label}</h3>
                {group.status === 'watching' ? (
                  <>
                    <div className="media-row">
                      <div
                        className="media-row__viewport"
                        style={{ overflowX: 'auto', paddingBottom: 'var(--space-4)' }}
                      >
                        <div className="media-row__track">
                          {watchingShown.map((entry) => (
                            <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
                          ))}
                        </div>
                      </div>
                    </div>
                    {watchingOverflow ? (
                      <p className="library-row-hint">
                        Showing top {LIBRARY_WATCHING_ROW_MAX} by recency. Open{' '}
                        <strong>Watching</strong> to see the full list.
                      </p>
                    ) : null}
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

        {showLoadMoreSentinel ? (
          <div ref={observerTarget} style={{ height: '20px', margin: '20px 0' }} />
        ) : null}

        {entries.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon">Library</div>
            <div className="empty-state__title">Library is empty</div>
            <p>Start browsing to add your favorite anime.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
