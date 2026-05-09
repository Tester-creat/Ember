
import { useEffect, useState, useRef } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { normalizeAnime, getCurrentSeason } from '../utils/animeUtils';
import { AnimeCard } from '../components/AnimeRows';
import { SEASONAL_GRID_INITIAL, SEASONAL_GRID_BATCH } from '../utils/renderBudgets';

const SEASONAL_QUERY = `
query($season: MediaSeason, $seasonYear: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
      id idMal title{romaji english native}coverImage{extraLarge large}episodes nextAiringEpisode{episode} duration status averageScore genres season seasonYear format description startDate{year month day} bannerImage
    }
  }
}`;

export default function Seasonal({ onOpenDetail }) {
  const { seasonalData, setSeasonalData } = useAnimeData();
  const [year, setYear] = useState(new Date().getFullYear());
  const [season, setSeason] = useState(getCurrentSeason());
  const [gridCap, setGridCap] = useState(SEASONAL_GRID_INITIAL);
  const moreRef = useRef(null);

  useEffect(() => {
    setGridCap(SEASONAL_GRID_INITIAL);
  }, [season, year]);

  useEffect(() => {
    const fetchSeasonal = async () => {
      setSeasonalData((prev) => ({ ...prev, loading: true }));
      try {
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: SEASONAL_QUERY,
            variables: { season, seasonYear: year, page: 1 },
          }),
        });
        const json = await res.json();
        const results = json.data.Page.media.map(normalizeAnime);
        setSeasonalData({
          results,
          loading: false,
          error: null,
          page: 1,
          season,
          year,
          hasMore: json.data.Page.pageInfo.hasNextPage,
        });
      } catch (e) {
        setSeasonalData((prev) => ({ ...prev, loading: false, error: e.message }));
      }
    };

    fetchSeasonal();
  }, [season, year, setSeasonalData]);

  const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

  const displayed = seasonalData.results.slice(0, Math.min(gridCap, seasonalData.results.length));
  const canRevealMore = seasonalData.results.length > displayed.length;

  useEffect(() => {
    const el = moreRef.current;
    if (!el || !canRevealMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setGridCap((c) => c + SEASONAL_GRID_BATCH);
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
        <div className="section__title">Seasonal Anime</div>
        <div className="section__actions" style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="btn btn--glass btn--sm"
            style={{ padding: '4px 12px' }}
          >
            {seasons.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="btn btn--glass btn--sm"
            style={{ width: '80px', padding: '4px 12px' }}
          />
        </div>
      </div>

      {seasonalData.loading && seasonalData.results.length === 0 ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading the season...</p>
        </div>
      ) : (
        <>
          <div className="media-grid">
            {displayed.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
            ))}
          </div>
          {canRevealMore && <div ref={moreRef} style={{ height: 1 }} aria-hidden />}
        </>
      )}
    </div>
  );
}
