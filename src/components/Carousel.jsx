import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Netflix-style horizontal content row.
 * - Native touch / trackpad scrolling with scroll-snap.
 * - Hover-reveal chevron controls on pointer devices.
 * - Edge fade masks and arrow state derived from scroll position.
 *
 * Pass cards as children; the carousel only owns the rail + controls + header.
 */
export default function Carousel({
  title,
  eyebrow,
  action,
  children,
  className = '',
  itemCount = 0,
}) {
  const trackRef = useRef(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const { scrollLeft, scrollWidth, clientWidth } = track;
    const max = scrollWidth - clientWidth;
    setOverflowing(max > 8);
    setAtStart(scrollLeft <= 8);
    setAtEnd(scrollLeft >= max - 8);
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return undefined;

    measure();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    observer?.observe(track);
    window.addEventListener('resize', measure, { passive: true });

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [measure, itemCount]);

  const scrollByDir = (dir) => {
    const track = trackRef.current;
    if (!track) return;
    const amount = Math.max(track.clientWidth * 0.82, 240);
    track.scrollBy({ left: dir * amount, behavior: 'smooth' });
  };

  return (
    <section className={`carousel ${className}`}>
      {(title || action) && (
        <div className="carousel__head">
          <div className="carousel__heading">
            {eyebrow ? <div className="carousel__eyebrow">{eyebrow}</div> : null}
            {title ? <h2 className="carousel__title">{title}</h2> : null}
          </div>
          {action ? <div className="carousel__action">{action}</div> : null}
        </div>
      )}

      <div className={`carousel__rail ${atStart ? '' : 'is-scrolled-start'} ${atEnd ? 'is-scrolled-end' : ''}`}>
        {overflowing && !atStart ? (
          <button
            type="button"
            className="carousel__nav carousel__nav--prev"
            aria-label="Scroll left"
            onClick={() => scrollByDir(-1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}

        <div className="carousel__track" ref={trackRef} onScroll={measure}>
          {children}
        </div>

        {overflowing && !atEnd ? (
          <button
            type="button"
            className="carousel__nav carousel__nav--next"
            aria-label="Scroll right"
            onClick={() => scrollByDir(1)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        ) : null}
      </div>
    </section>
  );
}
