import { useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { getStatusLabel } from '../utils/animeUtils';

const BREAKDOWN_STATUSES = ['watching', 'completed', 'plan-to-watch', 'paused', 'dropped'];

export default function Stats() {
  const { userData } = useAnimeData();
  const entries = useMemo(
    () => Object.values(userData).filter((entry) => entry && entry.id),
    [userData]
  );

  const stats = useMemo(() => {
    const total = entries.length;
    const completed = entries.filter((entry) => entry.status === 'completed').length;
    const watching = entries.filter((entry) => entry.status === 'watching').length;
    const planToWatch = entries.filter((entry) => entry.status === 'plan-to-watch').length;

    let totalEpisodesWatched = 0;
    let totalScore = 0;
    let scoredCount = 0;

    entries.forEach((entry) => {
      totalEpisodesWatched += entry.episodesWatched || 0;
      if (entry.rating) {
        totalScore += entry.rating;
        scoredCount += 1;
      }
    });

    return {
      total,
      completed,
      watching,
      planToWatch,
      totalEpisodesWatched,
      avgScore: scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : 'N/A',
    };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="section page-inner">
        <h2 className="section__title">Stats</h2>
        <div className="empty-state">
          <div className="empty-state__icon">Stats</div>
          <div className="empty-state__title">No data yet</div>
          <p>Add anime to your library to see your viewing statistics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section page-inner">
      <div className="section__head">
        <div>
          <div className="section__eyebrow">Personal dashboard</div>
          <h2 className="section__title">My Statistics</h2>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stats-card">
          <span className="stats-card__label">Total Anime</span>
          <span className="stats-card__value">{stats.total}</span>
          <span className="stats-card__sub">{stats.completed} completed titles</span>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Episodes Watched</span>
          <span className="stats-card__value">{stats.totalEpisodesWatched}</span>
          <span className="stats-card__sub">Across your full library</span>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Average Rating</span>
          <span className="stats-card__value">{stats.avgScore}</span>
          <span className="stats-card__sub">Out of 10.0</span>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Currently Watching</span>
          <span className="stats-card__value">{stats.watching}</span>
          <span className="stats-card__sub">{stats.planToWatch} queued next</span>
        </div>
      </div>

      <div className="stats-breakdown">
        <h3 className="section__title section__title--sm">Library Breakdown</h3>
        <div className="stats-breakdown__rows">
          {BREAKDOWN_STATUSES.map((status) => {
            const count = entries.filter((entry) => entry.status === status).length;
            if (count === 0) return null;

            const percentage = ((count / stats.total) * 100).toFixed(0);

            return (
              <div key={status} className="stats-breakdown__row">
                <div className="stats-breakdown__name">{getStatusLabel(status)}</div>
                <div className="stats-breakdown__track">
                  <div
                    className="stats-breakdown__fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="stats-breakdown__count">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
