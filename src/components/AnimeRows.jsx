import { memo, useState } from 'react';
import CoverArt from './CoverArt';
import { useAnimeData } from '../hooks/useAnimeData';
import { getStatusLabel, getTitle } from '../utils/animeUtils';

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.5-6.5a1 1 0 0 0 0-1.72L9.52 4.64A1 1 0 0 0 8 5.5Z" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const AnimeCard = memo(function AnimeCard({ anime, entry, onOpenDetail, rank }) {
  const { getEntry, addToLibrary, setCurrentTab, setCurrentWatchId } = useAnimeData();
  const data = anime || entry;
  const id = data?.id ?? data?.anilistId;
  const savedEntry = entry || (id != null ? getEntry(id) : null);

  const title = getTitle(data);
  const score = data?.averageScore;
  const status = savedEntry?.status;
  const meta = [data?.year, data?.format && String(data.format).replace(/_/g, ' ')]
    .filter(Boolean)
    .join(' • ');

  const watched = savedEntry?.episodesWatched || 0;
  const totalEps = savedEntry?.episodes || data?.episodes || 0;
  const progress =
    status === 'watching' && watched > 0 && totalEps > 0
      ? Math.min(100, Math.round((watched / totalEps) * 100))
      : 0;

  const inLibrary = Boolean(savedEntry);

  const open = () => onOpenDetail?.(data);

  const handlePlay = (event) => {
    event.stopPropagation();
    let targetId = savedEntry?.id;
    if (!targetId) {
      const created = addToLibrary(data, 'watching', { lastWatched: Date.now() });
      targetId = created.id;
    }
    setCurrentWatchId(targetId);
    setCurrentTab('watch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAdd = (event) => {
    event.stopPropagation();
    if (inLibrary) {
      open();
      return;
    }
    addToLibrary(data, 'plan-to-watch');
  };

  return (
    <div
      className={`anime-card ${rank != null ? 'anime-card--ranked' : ''}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          open();
        }
      }}
    >
      {rank != null ? <div className="anime-card__rank" aria-hidden="true">{rank}</div> : null}

      <div className="anime-card__frame">
        <div className="anime-card__media">
          <CoverArt
            anime={data}
            className="cover-media anime-card__cover"
            imgClassName="anime-card__img"
          />

          <div className="anime-card__shade" />

          <div className="anime-card__top">
            {score ? <span className="anime-card__score">{(score / 10).toFixed(1)}</span> : null}
            {status ? (
              <span className="status-badge status-badge--card" data-status={status}>
                {getStatusLabel(status)}
              </span>
            ) : null}
          </div>

          <div className="anime-card__hover">
            <div className="anime-card__actions">
              <button
                type="button"
                className="card-action card-action--play"
                onClick={handlePlay}
                aria-label={`Play ${title}`}
              >
                <PlayGlyph />
                <span>Play</span>
              </button>
              <button
                type="button"
                className={`card-action card-action--icon ${inLibrary ? 'is-active' : ''}`}
                onClick={handleAdd}
                aria-label={inLibrary ? 'In your list' : `Add ${title} to list`}
              >
                {inLibrary ? <CheckGlyph /> : <PlusGlyph />}
              </button>
            </div>
          </div>

          {progress > 0 ? (
            <div className="anime-card__progress">
              <span style={{ width: `${progress}%` }} />
            </div>
          ) : null}
        </div>

        <div className="anime-card__body">
          <div className="anime-card__title">{title}</div>
          {meta ? <div className="anime-card__meta">{meta}</div> : null}
        </div>
      </div>
    </div>
  );
});

/**
 * Lightweight landscape "continue watching" card with resume progress.
 */
export const ContinueCard = memo(function ContinueCard({ entry, onWatch }) {
  const [hovered, setHovered] = useState(false);
  const title = getTitle(entry);
  const nextEpisode = (entry.episodesWatched || 0) + 1;
  const totalEpisodes = entry.episodes || 0;
  const watched = entry.episodesWatched || 0;
  const progress = totalEpisodes > 0 ? Math.min(100, Math.round((watched / totalEpisodes) * 100)) : 0;
  const bg = entry.banner || entry.cover;

  return (
    <div
      className="continue-card"
      role="button"
      tabIndex={0}
      onClick={onWatch}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onWatch();
        }
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="continue-card__media">
        {bg ? (
          <img src={bg} alt={title} loading="lazy" decoding="async" className="continue-card__img" />
        ) : (
          <div className="continue-card__ph">{(title || '?').charAt(0).toUpperCase()}</div>
        )}
        <div className="continue-card__veil" />
        <div className={`continue-card__play ${hovered ? 'is-hovered' : ''}`}>
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5.5v13a1 1 0 0 0 1.52.86l10.5-6.5a1 1 0 0 0 0-1.72L9.52 4.64A1 1 0 0 0 8 5.5Z" />
          </svg>
        </div>
        <div className="continue-card__caption">
          <div className="continue-card__title">{title}</div>
          <div className="continue-card__ep">
            Episode {nextEpisode}
            {totalEpisodes ? ` of ${totalEpisodes}` : ''}
          </div>
        </div>
        {progress > 0 ? (
          <div className="continue-card__bar">
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
});
