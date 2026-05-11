import { useEffect, useRef, useState } from 'react';
import { AnimeCard } from '../components/AnimeRows';
import { useAnimeData } from '../hooks/useAnimeData';
import { getCurrentSeason, normalizeAnime } from '../utils/animeUtils';
import { SEASONAL_GRID_BATCH, SEASONAL_GRID_INITIAL } from '../utils/renderBudgets';

const SEASONAL_QUERY = `
query($season: MediaSeason, $seasonYear: Int, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo {
      hasNextPage
    }
    media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
      id
      idMal
      title { romaji english native }
      coverImage { extraLarge large }
      episodes
      nextAiringEpisode { episode }
      duration
      status
      averageScore
      genres
      season
      seasonYear
      format
      description
      startDate { year month day }
      bannerImage
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
      setSeasonalData((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: SEASONAL_QUERY,
            variables: { season, seasonYear: year, page: 1 },
          }),
        });

        const json = await response.json();
        const results = (json?.data?.Page?.media || []).map(normalizeAnime).filter(Boolean);

        setSeasonalData({
          results,
          loading: false,
          error: null,
          page: 1,
          season,
          year,
          hasMore: Boolean(json?.data?.Page?.pageInfo?.hasNextPage),
        });
      } catch (error) {
        setSeasonalData((prev) => ({ ...prev, loading: false, error: error.message }));
      }
    };

    fetchSeasonal();
  }, [season, setSeasonalData, year]);

  const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const displayed = seasonalData.results.slice(
    0,
    Math.min(gridCap, seasonalData.results.length)
  );
  const canRevealMore = seasonalData.results.length > displayed.length;

  useEffect(() => {
    const element = moreRef.current;
    if (!element || !canRevealMore) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setGridCap((count) => count + SEASONAL_GRID_BATCH);
        }
      },
      { rootMargin: '240px', threshold: 0 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [canRevealMore, displayed.length]);

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div>
          <div className="section__eyebrow">Current line-up</div>
          <div className="section__title">Seasonal Anime</div>
        </div>
        <div className="seasonal-controls">
          <select value={season} onChange={(event) => setSeason(event.target.value)} className="field-control">
            {seasons.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={(event) => setYear(parseInt(event.target.value, 10))}
            className="field-control field-control--compact"
          />
        </div>
      </div>

      {seasonalData.loading && seasonalData.results.length === 0 ? (
        <div className="loading-state">
          <div className="spinner" />
          <p>Loading the season...</p>
        </div>
      ) : (
        <>
          <div className="media-grid">
            {displayed.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
            ))}
          </div>
          {canRevealMore ? <div ref={moreRef} style={{ height: 1 }} aria-hidden /> : null}
        </>
      )}
    </div>
  );
}
