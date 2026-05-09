
import React from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { MarqueeRow, AnimeCard } from '../components/AnimeRows';
import { sortCompletedEntries, getDisplayTitle, getCoverSrc } from '../utils/animeUtils';

export default function Home({ onOpenDetail }) {
  const { userData, browseData, setCurrentTab, setCurrentWatchId } = useAnimeData();
  
  const entries = Object.values(userData).filter(e => e && e.id);
  const watching = entries
    .filter(e => e.status === "watching")
    .sort((a, b) => (b.lastWatched || 0) - (a.lastWatched || 0));
  
  const completed = sortCompletedEntries(entries.filter(e => e.status === "completed"));

  return (
    <div className="home-content">
      <section className="section">
        <div className="section__head">
          <div className="section__title">Trending Now</div>
          <button className="btn btn--sm btn--glass" onClick={() => setCurrentTab('browse')}>View All</button>
        </div>
        <MarqueeRow items={browseData.results} onOpenDetail={onOpenDetail} />
      </section>

      {watching.length > 0 && (
        <section className="section">
          <div className="section__head">
            <div className="section__title">Continue Watching</div>
          </div>
          <div className="media-row">
            <div className="media-row__viewport" data-row-track="continueRow">
              <div className="media-row__track">
                {watching.map(entry => (
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
          reverse={true} 
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
  const totalEp = entry.episodes || "?";

  return (
    <div className="continue-card" onClick={onWatch} role="button" tabIndex="0">
      <div className="continue-card__bg">
        <img src={poster} alt="" className="cover-media__img" />
      </div>
      <div className="continue-card__content">
        <div className="continue-card__poster">
          <img src={poster} alt={title} className="cover-media__img" />
        </div>
        <div className="continue-card__info">
          <div className="continue-card__title">{title}</div>
          <div className="continue-card__ep">Ep {nextEp} / {totalEp}</div>
        </div>
        <div className="continue-card__play">▶</div>
      </div>
    </div>
  );
}
