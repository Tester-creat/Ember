
import React, { useState, useEffect, useCallback } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { searchAnime } from '../utils/api';
import { AnimeCard } from '../components/AnimeRows';

export default function Search({ onOpenDetail }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchAnime(query);
        setResults(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className="section">
      <div className="section__head">
        <div className="section__title">Search</div>
      </div>
      
      <div className="search-page">
        <input 
          type="text"
          className="search-input--page"
          placeholder="Search for anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Searching...</p>
          </div>
        ) : (
          <div className="media-grid">
            {results.map((anime, i) => (
              <AnimeCard key={`${anime.id}-${i}`} anime={anime} onOpenDetail={onOpenDetail} />
            ))}
          </div>
        )}

        {!loading && query.length >= 3 && results.length === 0 && (
          <div className="empty-state">
            <p>No results found for "{query}"</p>
          </div>
        )}
      </div>
    </div>
  );
}
