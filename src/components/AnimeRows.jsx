import { memo, useEffect, useMemo, useRef } from 'react';
import CoverArt from './CoverArt';
import { getStatusLabel, getTitle } from '../utils/animeUtils';
import { MARQUEE_MAX_ITEMS } from '../utils/renderBudgets';

export const AnimeCard = memo(function AnimeCard({ anime, entry, onOpenDetail }) {
  const data = anime || entry;
  const title = getTitle(data);
  const score = data?.averageScore;
  const status = entry?.status;
  const meta = [data?.year, data?.format].filter(Boolean).join(' / ');

  return (
    <button type="button" className="anime-card" onClick={() => onOpenDetail(data)}>
      <div className="anime-card__media">
        <CoverArt anime={data} className="cover-media anime-card__cover" imgClassName="anime-card__img" />
        <div className="anime-card__overlay">
          <div className="anime-card__score">{score ? `${(score / 10).toFixed(1)} score` : 'Unrated'}</div>
          {status ? (
            <div className="status-badge" data-status={status}>
              {getStatusLabel(status)}
            </div>
          ) : null}
        </div>
      </div>
      <div className="anime-card__body">
        <div className="anime-card__title">{title}</div>
        {meta ? <div className="anime-card__meta">{meta}</div> : null}
      </div>
    </button>
  );
});

function MarqueeTrack({ cappedItems, reverse, onOpenDetail, trackRef }) {
  return (
    <div className="media-row">
      <div className="media-row__viewport marquee-container">
        <div
          ref={trackRef}
          className={`media-row__track marquee-track ${reverse ? 'marquee-track--reverse' : ''}`}
        >
          {cappedItems.map((item, index) => (
            <AnimeCard
              key={`m-a-${String(item?.id ?? item?.anilistId ?? index)}`}
              anime={item}
              onOpenDetail={onOpenDetail}
            />
          ))}
          {cappedItems.map((item, index) => (
            <AnimeCard
              key={`m-b-${String(item?.id ?? item?.anilistId ?? index)}`}
              anime={item}
              onOpenDetail={onOpenDetail}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export const MarqueeRow = memo(function MarqueeRow({
  title,
  items,
  reverse = false,
  onOpenDetail,
  maxItems = MARQUEE_MAX_ITEMS,
  embedded = false,
}) {
  const trackRef = useRef(null);
  const cappedItems = useMemo(() => {
    const list = items ?? [];
    if (list.length === 0) return [];
    return list.length > maxItems ? list.slice(0, maxItems) : list;
  }, [items, maxItems]);

  const layoutKey = useMemo(
    () => cappedItems.map((item) => String(item?.id ?? item?.anilistId ?? '')).join('|'),
    [cappedItems]
  );

  useEffect(() => {
    if (!trackRef.current || cappedItems.length === 0) return undefined;

    const track = trackRef.current;

    const updateMarquee = () => {
      const childCount = track.children.length / 2;
      if (childCount === 0) return;

      const gap = parseFloat(getComputedStyle(track).gap) || 16;
      const firstChild = track.children[0];
      const childWidth = firstChild?.getBoundingClientRect().width || 220;
      const copyWidthPx = childCount * childWidth + childCount * gap;
      const speed = 56;
      const duration = Math.max(copyWidthPx / speed, 18);

      track.style.setProperty('--marquee-dur', `${duration}s`);
      track.style.setProperty('--marquee-translate', `-${copyWidthPx}px`);
    };

    let raf = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateMarquee);
    };

    scheduleMeasure();

    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            scheduleMeasure();
          })
        : null;

    observer?.observe(track);

    let resizeTimer;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scheduleMeasure, 150);
    };

    window.addEventListener('resize', handleResize, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [cappedItems.length, layoutKey, reverse]);

  if (cappedItems.length === 0) return null;

  const track = (
    <MarqueeTrack
      cappedItems={cappedItems}
      reverse={reverse}
      onOpenDetail={onOpenDetail}
      trackRef={trackRef}
    />
  );

  if (embedded) return track;

  return (
    <section className="section">
      {title ? (
        <div className="section__head">
          <div className="section__title">{title}</div>
        </div>
      ) : null}
      {track}
    </section>
  );
});
