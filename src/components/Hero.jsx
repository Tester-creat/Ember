
import { useState, useEffect, useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { getTitle, getCoverSrc, truncate, normalizeAnime } from '../utils/animeUtils';
import { HERO_ROTATION_MAX, HERO_BACKFILL_TRENDING } from '../utils/renderBudgets';

const HERO_INTERVAL_MS = 8000;

export default function Hero() {
  const { userData, browseData, setCurrentTab, setCurrentWatchId, addToLibrary } = useAnimeData();
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const entries = Object.values(userData).filter((e) => e && e.id);
    let heroItems = entries
      .filter((e) => e.status === 'watching')
      .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
      .slice(0, HERO_ROTATION_MAX);

    if (heroItems.length < 5) {
      const trending = (browseData.results || []).filter(
        (a) => !heroItems.some((i) => String(i.id) === String(a.id))
      );
      const need = Math.max(0, 5 - heroItems.length);
      heroItems = [...heroItems, ...trending.slice(0, Math.max(need, HERO_BACKFILL_TRENDING))];
    }

    return heroItems.map(normalizeAnime).filter(Boolean);
  }, [userData, browseData.results]);

  useEffect(() => {
    if (items.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((prev) => {
        const len = items.length;
        if (len <= 1) return 0;
        const cur = Math.min(prev, len - 1);
        return (cur + 1) % len;
      });
    }, HERO_INTERVAL_MS);
    return () => clearInterval(id);
  }, [items.length]);

  const activeIndex = items.length === 0 ? 0 : Math.min(index, items.length - 1);

  useEffect(() => {
    if (items.length === 0) return;
    const nextIdx = (activeIndex + 1) % items.length;
    const next = items[nextIdx];
    const src = next?.banner || getCoverSrc(next);
    if (!src) return;
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  }, [items, activeIndex]);

  if (items.length === 0) return null;

  const anime = items[activeIndex];
  const entry = userData[String(anime.id)];
  const isWatching = entry?.status === 'watching';
  const title = getTitle(anime);
  const hasBanner = !!anime.banner;
  const bannerSrc = anime.banner || getCoverSrc(anime);
  const description = truncate(anime.description?.replace(/<[^>]*>/g, ''), 200);

  const score = anime.averageScore ? `${anime.averageScore}%` : '';
  const year = anime.year ? String(anime.year) : '';
  const episodes = anime.episodes ? `${anime.episodes} eps` : '';
  const format = anime.format ? anime.format.replace(/_/g, ' ') : '';
  const nextEp = isWatching && entry ? `Ep ${(entry.episodesWatched || 0) + 1}` : '';

  return (
    <div className="hero" id="hero">
      <div className="hero__glow"></div>
      <div
        key={bannerSrc}
        className={`hero__bg hero__bg--crossfade-in ${hasBanner ? 'hero__bg--ken-burns' : 'hero__bg--fallback'}`}
        style={{ backgroundImage: bannerSrc ? `url(${bannerSrc})` : 'none' }}
      ></div>
      <div className="hero__overlay"></div>
      <div className="hero__body">
        <div className="hero__slide" key={anime.id}>
          <div className="hero__accent fade-in-left">
            {isWatching ? '▶ Continue Watching' : 'Trending Now'}
          </div>
          {format && <div className="hero__meta-format fade-in-left">{format}</div>}
          <h1 className="hero__title fade-in-left">{title}</h1>
          <div className="hero__meta fade-in-left">
            {[score, year, episodes].filter(Boolean).map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <div className="hero__genres fade-in-left">
            {(anime.genres || []).slice(0, 3).map((g) => (
              <span key={g} className="hero__genre-chip">
                {g}
              </span>
            ))}
          </div>
          {description && <p className="hero__subtitle fade-in-left">{description}</p>}
          <div className="hero__actions fade-in-left">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                if (isWatching) {
                  setCurrentTab('watch');
                  setCurrentWatchId(anime.id);
                }
              }}
            >
              {isWatching ? (nextEp ? `▶ Resume ${nextEp}` : '▶ Resume') : 'View Details'}
            </button>
            <button type="button" className="btn btn--glass" onClick={() => addToLibrary(anime)}>
              + My List
            </button>
          </div>
        </div>
      </div>
      <div className="hero__indicators" id="heroIndicators">
        {items.map((h, i) => (
          <button
            key={String(h.id)}
            type="button"
            aria-label={`Hero slide ${i + 1}`}
            className={`hero__dot ${i === activeIndex ? 'is-active' : ''}`}
            onClick={() => setIndex(i)}
          />
        ))}
      </div>
      <div className="hero__progress-container">
        <div
          key={activeIndex}
          className="hero__progress"
          style={{
            width: '100%',
            animation: `heroProgress ${HERO_INTERVAL_MS}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
