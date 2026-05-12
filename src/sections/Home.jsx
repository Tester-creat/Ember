import { useMemo } from 'react';
import { MarqueeRow } from '../components/AnimeRows';
import CoverArt from '../components/CoverArt';
import { useAnimeData } from '../hooks/useAnimeData';
import { getDisplayTitle, sortCompletedEntries } from '../utils/animeUtils';
import {
  COMPLETED_MARQUEE_ITEMS,
  CONTINUE_WATCHING_HOME,
  TRENDING_MARQUEE_ITEMS,
} from '../utils/renderBudgets';

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

  return (
    <div className="home-content page-inner">
      <section className="section">
        <div className="section__head">
          <div>
            <div className="section__eyebrow">Ambient discovery</div>
            <div className="section__title">Trending Now</div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => setCurrentTab('browse')}>
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

      {watching.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <div>
              <div className="section__eyebrow">Picked up where you left off</div>
              <div className="section__title">Continue Watching</div>
            </div>
          </div>
          <div className="media-row">
            <div className="media-row__viewport" data-row-track="continueRow">
              <div className="media-row__track media-row__track--static">
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
      ) : null}

      {completed.length > 0 ? (
        <section className="section">
          <div className="section__head">
            <div>
              <div className="section__title">Completed Masterpieces</div>
              {completed.length > COMPLETED_MARQUEE_ITEMS ? (
                <p className="library-row-hint">
                  Showing {COMPLETED_MARQUEE_ITEMS} of {completed.length} completed titles in this
                  animated row to keep Home smooth.
                </p>
              ) : null}
            </div>
          </div>
          <MarqueeRow
            items={completed}
            reverse
            maxItems={COMPLETED_MARQUEE_ITEMS}
            onOpenDetail={onOpenDetail}
            embedded
          />
        </section>
      ) : null}
    </div>
  );
}

function ContinueCard({ entry, onWatch }) {
  const title = getDisplayTitle(entry);
  const nextEpisode = (entry.episodesWatched || 0) + 1;
  const totalEpisodes = entry.episodes || '?';

  return (
    <button type="button" className="continue-card" onClick={onWatch}>
      <div className="continue-card__bg">
        <CoverArt anime={entry} className="cover-media cover-media--fill" />
      </div>
      <div className="continue-card__content">
        <div className="continue-card__poster">
          <CoverArt anime={entry} className="cover-media cover-media--poster" />
        </div>
        <div className="continue-card__info">
          <div className="continue-card__title">{title}</div>
          <div className="continue-card__ep">
            Episode {nextEpisode} of {totalEpisodes}
          </div>
        </div>
        <div className="continue-card__play">Resume</div>
      </div>
    </button>
  );
}
