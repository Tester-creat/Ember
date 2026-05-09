
import { useEffect, useRef, useMemo, useState, memo } from 'react';
import { getTitle, getCoverSrc, getStatusLabel } from '../utils/animeUtils';
import { MARQUEE_MAX_ITEMS } from '../utils/renderBudgets';

export const AnimeCard = memo(function AnimeCard({ anime, entry, onOpenDetail }) {
  const data = anime || entry;
  const title = getTitle(data);
  const cover = getCoverSrc(data);
  const score = data?.averageScore;
  const status = entry?.status;
  const [imgError, setImgError] = useState(false);

  return (
    <div className="anime-card" onClick={() => onOpenDetail(data)}>
      <div className="anime-card__media">
        {cover && !imgError ? (
          <img src={cover} alt="" loading="lazy" decoding="async" className="anime-card__img" onError={() => setImgError(true)} />
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
          {data?.year || ''} · {data?.format || ''}
        </div>
      </div>
    </div>
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
          {cappedItems.map((item, i) => (
            <AnimeCard
              key={`m-a-${String(item?.id ?? item?.anilistId ?? i)}`}
              anime={item}
              onOpenDetail={onOpenDetail}
            />
          ))}
          {cappedItems.map((item, i) => (
            <AnimeCard
              key={`m-b-${String(item?.id ?? item?.anilistId ?? i)}`}
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
    const arr = items ?? [];
    if (arr.length === 0) return [];
    return arr.length > maxItems ? arr.slice(0, maxItems) : arr;
  }, [items, maxItems]);

  const layoutKey = useMemo(
    () => cappedItems.map((i) => String(i?.id ?? i?.anilistId ?? '')).join('|'),
    [cappedItems]
  );

  useEffect(() => {
    if (!trackRef.current || cappedItems.length === 0) return;

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

      track.style.setProperty('--marquee-dur', `${dur}s`);
      track.style.setProperty('--marquee-translate', `-${copyWidthPx}px`);
    };

    let raf = 0;
    const scheduleMeasure = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateMarquee);
    };
    scheduleMeasure();

    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          scheduleMeasure();
        })
      : null;
    ro?.observe(track);

    let resizeTimer;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(scheduleMeasure, 150);
    };

    window.addEventListener('resize', onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      window.removeEventListener('resize', onResize);
      clearTimeout(resizeTimer);
    };
  }, [layoutKey, reverse, cappedItems.length]);

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
