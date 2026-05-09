
import React, { useEffect, useRef } from 'react';
import { getTitle, getCoverSrc, getStatusLabel } from '../utils/animeUtils';

export function AnimeCard({ anime, entry, onOpenDetail, onOpenStatusPicker }) {
  const title = getTitle(anime || entry);
  const cover = getCoverSrc(anime || entry);
  const score = (anime || entry).averageScore;
  const status = entry?.status;

  return (
    <div className="anime-card" onClick={() => onOpenDetail(anime || entry)}>
      <div className="anime-card__media">
        {cover ? (
          <img src={cover} alt={title} loading="lazy" className="anime-card__img" />
        ) : (
          <div className="anime-card__ph">{title.charAt(0)}</div>
        )}
        <div className="anime-card__overlay">
          <div className="anime-card__score">★ {score ? (score / 10).toFixed(1) : '?.?'}</div>
          {status && <div className="status-badge" data-status={status}>{getStatusLabel(status)}</div>}
        </div>
      </div>
      <div className="anime-card__body">
        <div className="anime-card__title">{title}</div>
        <div className="anime-card__meta">
          {(anime || entry).year || ''} · {(anime || entry).format || ''}
        </div>
      </div>
    </div>
  );
}

export function MarqueeRow({ title, items, reverse = false, onOpenDetail }) {
  const trackRef = useRef(null);

  useEffect(() => {
    if (!trackRef.current || items.length === 0) return;
    
    const track = trackRef.current;
    const updateMarquee = () => {
      const childCount = track.children.length / 2;
      if (childCount === 0) return;

      const gap = parseFloat(getComputedStyle(track).gap) || 12;
      const firstChild = track.children[0];
      const childWidth = firstChild?.getBoundingClientRect().width || 180;
      const copyWidthPx = childCount * childWidth + childCount * gap;

      const speed = 60;
      const dur = Math.max(copyWidthPx / speed, 15);

      track.style.setProperty("--marquee-dur", `${dur}s`);
      track.style.setProperty("--marquee-translate", `-${copyWidthPx}px`);
    };

    requestAnimationFrame(() => requestAnimationFrame(updateMarquee));
    
    let resizeTimer;
    const throttledResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateMarquee, 150);
    };

    window.addEventListener('resize', throttledResize);
    return () => {
      window.removeEventListener('resize', throttledResize);
      clearTimeout(resizeTimer);
    };
  }, [items]);


  return (
    <section className="section">
      <div className="section__head">
        <div className="section__title">{title}</div>
      </div>
      <div className="media-row">
        <div className="media-row__viewport marquee-container">
          <div 
            ref={trackRef}
            className={`media-row__track marquee-track ${reverse ? 'marquee-track--reverse' : ''}`}
          >
            {items.map((item, i) => <AnimeCard key={`a-${i}`} anime={item} onOpenDetail={onOpenDetail} />)}
            {items.map((item, i) => <AnimeCard key={`b-${i}`} anime={item} onOpenDetail={onOpenDetail} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
