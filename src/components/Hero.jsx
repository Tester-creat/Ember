import { useEffect, useMemo, useState } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import {
  getCoverSrc,
  getPlainDescription,
  getTitle,
  normalizeAnime,
  truncate,
} from '../utils/animeUtils';
import { HERO_BACKFILL_TRENDING, HERO_ROTATION_MAX } from '../utils/renderBudgets';

const HERO_INTERVAL_MS = 8000;

export default function Hero() {
  const { userData, homeTrending, setCurrentTab, setCurrentWatchId, addToLibrary } =
    useAnimeData();
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const entries = Object.values(userData).filter((entry) => entry && entry.id);
    let heroItems = entries
      .filter((entry) => entry.status === 'watching')
      .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
      .slice(0, HERO_ROTATION_MAX);

    if (heroItems.length < 5) {
      const trending = (homeTrending.results || []).filter(
        (anime) => !heroItems.some((item) => String(item.id) === String(anime.id))
      );
      const needed = Math.max(0, 5 - heroItems.length);
      heroItems = [
        ...heroItems,
        ...trending.slice(0, Math.max(needed, HERO_BACKFILL_TRENDING)),
      ];
    }

    return heroItems.map(normalizeAnime).filter(Boolean);
  }, [homeTrending.results, userData]);

  useEffect(() => {
    if (items.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setIndex((prev) => {
        const length = items.length;
        if (length <= 1) return 0;
        return (Math.min(prev, length - 1) + 1) % length;
      });
    }, HERO_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [items.length]);

  const activeIndex = items.length === 0 ? 0 : Math.min(index, items.length - 1);

  useEffect(() => {
    if (items.length === 0) return;

    const nextIndex = (activeIndex + 1) % items.length;
    const next = items[nextIndex];
    const src = next?.banner || getCoverSrc(next);
    if (!src) return;

    const image = new Image();
    image.decoding = 'async';
    image.src = src;
  }, [activeIndex, items]);

  if (items.length === 0) return null;

  const anime = items[activeIndex];
  const entry = userData[String(anime.id)];
  const isWatching = entry?.status === 'watching';
  const title = getTitle(anime);
  const bannerSrc = anime.banner || getCoverSrc(anime);
  const description = truncate(getPlainDescription(anime.description), 220);

  const meta = [
    anime.averageScore ? `${anime.averageScore}% match` : null,
    anime.year ? String(anime.year) : null,
    anime.episodes ? `${anime.episodes} eps` : null,
  ].filter(Boolean);

  const format = anime.format ? anime.format.replace(/_/g, ' ') : '';
  const nextEpisode = isWatching && entry ? `Ep ${(entry.episodesWatched || 0) + 1}` : '';

  const handlePrimaryAction = () => {
    if (isWatching) {
      setCurrentTab('watch');
      setCurrentWatchId(anime.id);
      return;
    }

    const savedEntry = addToLibrary(anime, 'watching');
    setCurrentWatchId(savedEntry.id);
    setCurrentTab('watch');
  };

  return (
    <section className="hero" id="hero">
      <div
        key={bannerSrc}
        className={`hero__bg hero__bg--crossfade-in ${bannerSrc ? 'hero__bg--ken-burns' : 'hero__bg--fallback'}`}
        style={{ backgroundImage: bannerSrc ? `url(${bannerSrc})` : 'none' }}
      />
      <div className="hero__overlay" />
      <div className="hero__glow" />

      <div className="hero__body">
        <div className="hero__slide" key={anime.id}>
          <div className="hero__accent fade-in-left">
            {isWatching ? 'Continue Watching' : 'Spotlight Pick'}
          </div>
          {format ? <div className="hero__meta-format fade-in-left">{format}</div> : null}
          <h1 className="hero__title fade-in-left">{title}</h1>
          {meta.length > 0 ? (
            <div className="hero__meta fade-in-left">
              {meta.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          ) : null}
          <div className="hero__genres fade-in-left">
            {(anime.genres || []).slice(0, 3).map((genre) => (
              <span key={genre} className="hero__genre-chip">
                {genre}
              </span>
            ))}
          </div>
          {description ? <p className="hero__subtitle fade-in-left">{description}</p> : null}
          <div className="hero__actions fade-in-left">
            <button type="button" className="btn btn--primary" onClick={handlePrimaryAction}>
              {isWatching ? (nextEpisode ? `Resume ${nextEpisode}` : 'Resume') : 'Start Watching'}
            </button>
            <button
              type="button"
              className="btn btn--glass"
              onClick={() => addToLibrary(anime, 'plan-to-watch')}
            >
              Add to My List
            </button>
          </div>
        </div>
      </div>

      <div className="hero__indicators" id="heroIndicators">
        {items.map((item, itemIndex) => (
          <button
            key={String(item.id)}
            type="button"
            aria-label={`Hero slide ${itemIndex + 1}`}
            className={`hero__dot ${itemIndex === activeIndex ? 'is-active' : ''}`}
            onClick={() => setIndex(itemIndex)}
          />
        ))}
      </div>

      <div className="hero__progress-container">
        <div
          key={activeIndex}
          className="hero__progress"
          style={{ animationDuration: `${HERO_INTERVAL_MS}ms` }}
        />
      </div>
    </section>
  );
}
