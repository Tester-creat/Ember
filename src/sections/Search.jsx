
import { useState, useEffect, useCallback } from 'react';
import { searchAnime } from '../utils/api';
import { AnimeCard } from '../components/AnimeRows';
import { SEARCH_RESULTS_MAX } from '../utils/renderBudgets';

const SEARCH_PAGE = 36;

export default function Search({ onOpenDetail }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (query.length < 3) {
      return;
    }

    let isActive = true;
    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await searchAnime(query);
        if (isActive) setResults(res);
      } catch (e) {
        console.error(e);
        if (isActive) {
          setResults([]);
          setError(e.message || 'Search is unavailable right now.');
        }
      } finally {
        if (isActive) setLoading(false);
      }
    }, 500);

    return () => {
      isActive = false;
      clearTimeout(delayDebounceFn);
    };
  }, [query]);

  const handleQueryChange = (event) => {
    const nextQuery = event.target.value;
    setQuery(nextQuery);

    if (nextQuery.length < 3) {
      setLoading(false);
      setError(null);
      setResults([]);
    }
  };

  const displayResults = query.length < 3 ? [] : results;

  const resultsKey =
    query.length < 3 ? 'idle' : `${query}:${displayResults.length}:${displayResults[0]?.id ?? 'x'}`;

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div className="section__title">Search</div>
      </div>

      <div className="search-page">
        <input
          type="text"
          className="search-input--page"
          placeholder="Search for anime..."
          value={query}
          onChange={handleQueryChange}
          autoFocus
        />

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        ) : (
          <SearchGrid
            key={resultsKey}
            results={displayResults}
            query={query}
            onOpenDetail={onOpenDetail}
          />
        )}

        {!loading && error ? (
          <div className="empty-state">
            <div className="empty-state__title">Search unavailable</div>
            <p>{error}</p>
          </div>
        ) : null}

        {!loading && !error && query.length >= 3 && displayResults.length === 0 && (
          <div className="empty-state">
            <p>No results found for &quot;{query}&quot;</p>
          </div>
        )}
      </div>
    </div>
  );
}

function SearchGrid({ results, query, onOpenDetail }) {
  const [visible, setVisible] = useState(SEARCH_PAGE);
  const showMore = useCallback(() => {
    setVisible((v) => Math.min(v + SEARCH_PAGE, SEARCH_RESULTS_MAX));
  }, []);

  if (query.length < 3) return null;
  if (results.length === 0) return null;

  const cappedResults =
    results.length > SEARCH_RESULTS_MAX ? results.slice(0, SEARCH_RESULTS_MAX) : results;
  const slice = cappedResults.slice(0, visible);
  const hasMore = cappedResults.length > slice.length;

  return (
    <>
      {results.length > SEARCH_RESULTS_MAX && (
        <p className="search-cap-hint">
          Showing first {SEARCH_RESULTS_MAX} matches for performance - refine your search to narrow
          results.
        </p>
      )}
      <div className="media-grid">
        {slice.map((anime) => (
          <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
        ))}
      </div>
      {hasMore && (
        <div className="section__footer">
          <button type="button" className="btn btn--glass" onClick={showMore}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}
