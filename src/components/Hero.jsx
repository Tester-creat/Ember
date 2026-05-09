
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { getTitle, getCoverSrc, truncate, escapeHtml, normalizeAnime } from '../utils/animeUtils';

const HERO_INTERVAL = 8000;

export default function Hero() {
  const { userData, browseData, setCurrentTab, setCurrentWatchId, addToLibrary } = useAnimeData();
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState(null);
  const timerRef = useRef(null);

  // Prepare hero items
  useEffect(() => {
    const entries = Object.values(userData).filter(e => e && e.id);
    let heroItems = entries
      .filter(e => e.status === "watching")
      .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));

    if (heroItems.length < 5) {
      const trending = (browseData.results || []).filter(a => !heroItems.some(i => String(i.id) === String(a.id)));
      heroItems = [...heroItems, ...trending.slice(0, 8 - heroItems.length)];
    }

    setItems(heroItems.map(normalizeAnime).filter(Boolean));
  }, [userData, browseData.results]);

  const nextSlide = useCallback(() => {
    setPrevIndex(index);
    setIndex(prev => (prev + 1) % items.length);
  }, [index, items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(nextSlide, HERO_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [items.length, nextSlide]);

  if (items.length === 0) return null;

  const anime = items[index];
  const entry = userData[String(anime.id)];
  const isWatching = entry?.status === "watching";
  const title = getTitle(anime);
  const hasBanner = !!anime.banner;
  const bannerSrc = anime.banner || getCoverSrc(anime);
  const description = truncate(anime.description?.replace(/<[^>]*>/g, ""), 200);

  const score = anime.averageScore ? `${anime.averageScore}%` : "";
  const year = anime.year ? String(anime.year) : "";
  const episodes = anime.episodes ? `${anime.episodes} eps` : "";
  const format = anime.format ? anime.format.replace(/_/g, " ") : "";
  const nextEp = isWatching && entry ? `Ep ${(entry.episodesWatched || 0) + 1}` : "";

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
            {isWatching ? "▶ Continue Watching" : "Trending Now"}
          </div>
          {format && <div className="hero__meta-format fade-in-left">{format}</div>}
          <h1 className="hero__title fade-in-left">{title}</h1>
          <div className="hero__meta fade-in-left">
            {[score, year, episodes].filter(Boolean).map(m => <span key={m}>{m}</span>)}
          </div>
          <div className="hero__genres fade-in-left">
            {(anime.genres || []).slice(0, 3).map(g => (
              <span key={g} className="hero__genre-chip">{g}</span>
            ))}
          </div>
          {description && <p className="hero__subtitle fade-in-left">{description}</p>}
          <div className="hero__actions fade-in-left">
            <button 
              className="btn btn--primary" 
              onClick={() => {
                if (isWatching) {
                  setCurrentTab('watch');
                  setCurrentWatchId(anime.id);
                } else {
                  // This would trigger the detail overlay
                }
              }}
            >
              {isWatching ? (nextEp ? `▶ Resume ${nextEp}` : "▶ Resume") : "View Details"}
            </button>
            <button className="btn btn--glass" onClick={() => addToLibrary(anime)}>+ My List</button>
          </div>
        </div>
      </div>
      <div className="hero__indicators" id="heroIndicators">
        {items.map((_, i) => (
          <button 
            key={i} 
            className={`hero__dot ${i === index ? 'is-active' : ''}`}
            onClick={() => {
              setPrevIndex(index);
              setIndex(i);
            }}
          />
        ))}
      </div>
      <div className="hero__progress-container">
        <div 
          key={index}
          className="hero__progress" 
          style={{ 
            width: '100%', 
            transition: `width ${HERO_INTERVAL}ms linear`,
            animation: 'heroProgress 8s linear forwards'
          }}
        />
      </div>
    </div>
  );
}
