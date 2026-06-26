import { useMemo } from 'react';
import Carousel from '../components/Carousel';
import { AnimeCard, ContinueCard } from '../components/AnimeRows';
import { useAnimeData } from '../hooks/useAnimeData';
import { sortCompletedEntries } from '../utils/animeUtils';
import {
  COMPLETED_MARQUEE_ITEMS,
  CONTINUE_WATCHING_HOME,
  TRENDING_MARQUEE_ITEMS,
} from '../utils/renderBudgets';

const GENRE_ROW_TARGET = 3;
const GENRE_ROW_MIN_ITEMS = 7;
const GENRE_ROW_MAX_ITEMS = 20;

const GENRE_TAGLINES = {
  Action: 'Adrenaline & high-stakes battles',
  Adventure: 'Worlds worth getting lost in',
  Comedy: 'Guaranteed to lighten the mood',
  Drama: 'Stories that hit hard',
  Fantasy: 'Magic, myth, and the impossible',
  Romance: 'Hearts on the line',
  'Sci-Fi': 'Tomorrow, reimagined',
  'Slice of Life': 'Quiet, lovely, human',
  Supernatural: 'Beyond the ordinary',
  Thriller: 'Edge-of-your-seat tension',
  Mystery: 'Clues, twists, and reveals',
  Horror: 'Turn the lights down',
  Sports: 'Heart, hustle, and glory',
  Psychological: 'Mind games and slow burns',
  Mecha: 'Steel, scale, and spectacle',
  Music: 'Turn it all the way up',
};

export default function Home({ onOpenDetail }) {
  const { userData, homeTrending, setCurrentTab, setCurrentWatchId } = useAnimeData();

  const entries = useMemo(
    () => Object.values(userData).filter((entry) => entry && entry.id),
    [userData]
  );

  const watching = useMemo(
    () =>
      entries
        .filter((entry) => entry.status === 'watching')
        .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
        .slice(0, CONTINUE_WATCHING_HOME),
    [entries]
  );

  const completed = useMemo(
    () => sortCompletedEntries(entries.filter((entry) => entry.status === 'completed')),
    [entries]
  );

  const trendingItems = useMemo(() => homeTrending.results || [], [homeTrending.results]);

  const topTen = useMemo(() => trendingItems.slice(0, 10), [trendingItems]);

  const trendingRow = useMemo(
    () => trendingItems.slice(0, TRENDING_MARQUEE_ITEMS),
    [trendingItems]
  );

  const topRated = useMemo(
    () =>
      [...trendingItems]
        .filter((item) => item.averageScore)
        .sort((a, b) => (b.averageScore || 0) - (a.averageScore || 0))
        .slice(0, 18),
    [trendingItems]
  );

  const genreRows = useMemo(() => {
    if (trendingItems.length === 0) return [];

    const counts = new Map();
    for (const item of trendingItems) {
      for (const genre of item.genres || []) {
        counts.set(genre, (counts.get(genre) || 0) + 1);
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .filter(([, count]) => count >= GENRE_ROW_MIN_ITEMS)
      .slice(0, GENRE_ROW_TARGET)
      .map(([genre]) => ({
        genre,
        items: trendingItems
          .filter((item) => (item.genres || []).includes(genre))
          .slice(0, GENRE_ROW_MAX_ITEMS),
      }))
      .filter((row) => row.items.length >= GENRE_ROW_MIN_ITEMS);
  }, [trendingItems]);

  const isLoading = homeTrending.loading && trendingItems.length === 0;

  return (
    <div className="home-content page-inner">
      {isLoading ? (
        <div className="home-rails">
          {Array.from({ length: 3 }).map((_, rowIndex) => (
            <div key={rowIndex} className="skeleton-rail">
              <div className="skeleton-rail__title" />
              <div className="skeleton-rail__track">
                {Array.from({ length: 7 }).map((_, cardIndex) => (
                  <div key={cardIndex} className="skeleton-card" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="home-rails">
          {watching.length > 0 ? (
            <Carousel
              eyebrow="Jump back in"
              title="Continue Watching"
              itemCount={watching.length}
            >
              {watching.map((entry) => (
                <ContinueCard
                  key={entry.id}
                  entry={entry}
                  onWatch={() => {
                    setCurrentWatchId(entry.id);
                    setCurrentTab('watch');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                />
              ))}
            </Carousel>
          ) : null}

          {topTen.length > 0 ? (
            <Carousel
              eyebrow="Most popular this week"
              title="Top 10 Trending"
              itemCount={topTen.length}
              className="carousel--ranked"
            >
              {topTen.map((anime, index) => (
                <AnimeCard
                  key={anime.id}
                  anime={anime}
                  rank={index + 1}
                  onOpenDetail={onOpenDetail}
                />
              ))}
            </Carousel>
          ) : null}

          {trendingRow.length > 0 ? (
            <Carousel
              eyebrow="Ambient discovery"
              title="Trending Now"
              itemCount={trendingRow.length}
              action={
                <button className="link-action" onClick={() => setCurrentTab('browse')}>
                  View All
                </button>
              }
            >
              {trendingRow.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
              ))}
            </Carousel>
          ) : null}

          {topRated.length >= GENRE_ROW_MIN_ITEMS ? (
            <Carousel eyebrow="Critically loved" title="Top Rated" itemCount={topRated.length}>
              {topRated.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
              ))}
            </Carousel>
          ) : null}

          {genreRows.map((row) => (
            <Carousel
              key={row.genre}
              eyebrow={GENRE_TAGLINES[row.genre] || 'Handpicked for the mood'}
              title={row.genre}
              itemCount={row.items.length}
            >
              {row.items.map((anime) => (
                <AnimeCard key={anime.id} anime={anime} onOpenDetail={onOpenDetail} />
              ))}
            </Carousel>
          ))}

          {completed.length > 0 ? (
            <Carousel
              eyebrow="From your shelf"
              title="Completed Masterpieces"
              itemCount={Math.min(completed.length, COMPLETED_MARQUEE_ITEMS)}
              action={
                <button className="link-action" onClick={() => setCurrentTab('library')}>
                  My Library
                </button>
              }
            >
              {completed.slice(0, COMPLETED_MARQUEE_ITEMS).map((entry) => (
                <AnimeCard key={entry.id} entry={entry} onOpenDetail={onOpenDetail} />
              ))}
            </Carousel>
          ) : null}

          {homeTrending.error && trendingItems.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">Home feed unavailable</div>
              <p>{homeTrending.error}</p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
