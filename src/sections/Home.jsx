
import { useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { MarqueeRow } from '../components/AnimeRows';
import { sortCompletedEntries, getDisplayTitle, getCoverSrc } from '../utils/animeUtils';
import {
  TRENDING_MARQUEE_ITEMS,
  COMPLETED_MARQUEE_ITEMS,
  CONTINUE_WATCHING_HOME,
} from '../utils/renderBudgets';

export default function Home({ onOpenDetail }) {
  const { userData, browseData, setCurrentTab, setCurrentWatchId } = useAnimeData();

  const entries = useMemo(() => Object.values(userData).filter((e) => e && e.id), [userData]);

  const watching = useMemo(
    () =>
      entries
        .filter((e) => e.status === 'watching')
        .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0))
        .slice(0, CONTINUE_WATCHING_HOME),
    [entries]
  );

  const completed = useMemo(
    () => sortCompletedEntries(entries.filter((e) => e.status === 'completed')),
    [entries]
  );

  const trendingItems = useMemo(() => browseData.results || [], [browseData.results]);

  return (
    <div className="home-content page-inner">
      <section className="section">
        <div className="section__head">
          <div className="section__title">Trending Now</div>
          <button className="btn btn--sm btn--glass" onClick={() => setCurrentTab('browse')}>
            View All
          </button>
        </div>
        <MarqueeRow
          items={trendingItems}
          onOpenDetail={onOpenDetail}
          maxItems={TRENDING_MARQUEE_ITEMS}
          embedded
        />
      </section>

      {watching.length > 0 && (
        <section className="section">
          <div className="section__head">
            <div className="section__title">Continue Watching</div>
          </div>
          <div className="media-row">
            <div className="media-row__viewport" data-row-track="continueRow">
              <div className="media-row__track">
                {watching.map((entry) => (
                  <ContinueCard
                    key={entry.id}
                    entry={entry}
                    onWatch={() => {
                      setCurrentWatchId(entry.id);
                      setCurrentTab('watch');
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <MarqueeRow
          title="Completed Masterpieces"
          items={completed}
          reverse
          maxItems={COMPLETED_MARQUEE_ITEMS}
          onOpenDetail={onOpenDetail}
        />
      )}
    </div>
  );
}

function ContinueCard({ entry, onWatch }) {
  const poster = getCoverSrc(entry);
  const title = getDisplayTitle(entry);
  const nextEp = (entry.episodesWatched || 0) + 1;
  const totalEp = entry.episodes || '?';

  return (
    <div
      className="continue-card"
      onClick={onWatch}
      onKeyDown={(e) => e.key === 'Enter' && onWatch()}
      role="button"
      tabIndex={0}
    >
      <div className="continue-card__bg">
        <img src={poster} alt="" loading="lazy" decoding="async" className="cover-media__img" />
      </div>
      <div className="continue-card__content">
        <div className="continue-card__poster">
          <img src={poster} alt="" loading="lazy" decoding="async" className="cover-media__img" />
        </div>
        <div className="continue-card__info">
          <div className="continue-card__title">{title}</div>
          <div className="continue-card__ep">
            Ep {nextEp} / {totalEp}
          </div>
        </div>
        <div className="continue-card__play">▶</div>
      </div>
    </div>
  );
}
