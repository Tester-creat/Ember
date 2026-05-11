import { useMemo } from 'react';
import CoverArt from '../components/CoverArt';
import { useAnimeData } from '../hooks/useAnimeData';
import {
  getDisplayTitle,
  getStatusColor,
  getStatusLabel,
  LIBRARY_FILTER_STATUSES,
} from '../utils/animeUtils';

const STATUS_BREAKDOWN = LIBRARY_FILTER_STATUSES.filter((status) => status !== 'all');

export default function Stats() {
  const { userData } = useAnimeData();
  const entries = useMemo(
    () => Object.values(userData).filter((entry) => entry && entry.id),
    [userData]
  );

  const stats = useMemo(() => {
    const total = entries.length;
    const completedEntries = entries.filter((entry) => entry.status === 'completed');
    const completed = completedEntries.length;
    const totalEpisodesWatched = entries.reduce(
      (sum, entry) => sum + (entry.episodesWatched || 0),
      0
    );

    const ratedEntries = entries.filter((entry) => (entry.rating || 0) > 0);
    const averageRating = ratedEntries.length
      ? (
          ratedEntries.reduce((sum, entry) => sum + entry.rating, 0) / ratedEntries.length
        ).toFixed(1)
      : 'N/A';

    const completionRate = total > 0 ? `${Math.round((completed / total) * 100)}%` : '0%';

    const statusBreakdown = STATUS_BREAKDOWN.map((status) => {
      const count = entries.filter((entry) => entry.status === status).length;
      return {
        status,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      };
    }).filter((row) => row.count > 0);

    const genreCounts = new Map();
    entries.forEach((entry) => {
      (entry.genres || []).forEach((genre) => {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    });

    const genres = [...genreCounts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 8)
      .map(([genre, count]) => ({
        genre,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      }));

    const topRated = [...ratedEntries]
      .sort((a, b) => b.rating - a.rating || (b.averageScore || 0) - (a.averageScore || 0))
      .slice(0, 5);

    const recentlyCompleted = [...completedEntries]
      .sort(
        (a, b) =>
          Math.max(b.completedAt || 0, b.lastWatched || 0) -
          Math.max(a.completedAt || 0, a.lastWatched || 0)
      )
      .slice(0, 5);

    return {
      total,
      totalEpisodesWatched,
      averageRating,
      completionRate,
      statusBreakdown,
      genres,
      topRated,
      recentlyCompleted,
    };
  }, [entries]);

  if (entries.length < 3) {
    return (
      <div className="section page-inner">
        <div className="section__head">
          <div>
            <div className="section__eyebrow">Personal dashboard</div>
            <h2 className="section__title">My Statistics</h2>
          </div>
        </div>
        <div className="empty-state">
          <div className="empty-state__icon">Stats</div>
          <div className="empty-state__title">Not enough data yet</div>
          <p>Your stats will appear here once you&apos;ve added some anime to your library.</p>
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
        <StatCard label="Total Anime" value={stats.total} sub="Titles in your library" />
        <StatCard
          label="Episodes Watched"
          value={stats.totalEpisodesWatched}
          sub="Tracked progress across all entries"
        />
        <StatCard label="Average Rating" value={stats.averageRating} sub="Mean of all rated titles" />
        <StatCard label="Completion Rate" value={stats.completionRate} sub="Entries marked completed" />
      </div>

      <div className="stats-layout">
        <StatsSection title="Status Breakdown">
          <div className="stats-bars">
            {stats.statusBreakdown.map((row) => (
              <div key={row.status} className="status-bar-row">
                <div className="stats-bar__label">{getStatusLabel(row.status)}</div>
                <div className="stats-bar__track">
                  <div
                    className="stats-bar__fill"
                    style={{
                      width: `${row.percentage}%`,
                      background: `linear-gradient(90deg, ${getStatusColor(row.status)}, rgba(255,255,255,0.14))`,
                    }}
                  />
                </div>
                <div className="stats-bar__meta">
                  {row.count} / {row.percentage}%
                </div>
              </div>
            ))}
          </div>
        </StatsSection>

        <StatsSection title="Genre Breakdown">
          <div className="stats-bars">
            {stats.genres.map((row) => (
              <div key={row.genre} className="genre-bar-row">
                <div className="stats-bar__label">{row.genre}</div>
                <div className="stats-bar__track">
                  <div
                    className="stats-bar__fill"
                    style={{
                      width: `${Math.max(row.percentage, 8)}%`,
                      background: 'linear-gradient(90deg, var(--accent), var(--accent-blue))',
                    }}
                  />
                </div>
                <div className="stats-bar__meta">{row.count}</div>
              </div>
            ))}
          </div>
        </StatsSection>

        <StatsSection title="Top Rated Titles">
          <div className="stats-entry-list">
            {stats.topRated.length > 0 ? (
              stats.topRated.map((entry) => (
                <StatEntryRow
                  key={entry.id}
                  entry={entry}
                  trailing={
                    <span className="stats-pill stats-pill--rating">{entry.rating.toFixed(1)}</span>
                  }
                />
              ))
            ) : (
              <div className="stats-empty-inline">No ratings yet. Use the detail overlay to score titles.</div>
            )}
          </div>
        </StatsSection>

        <StatsSection title="Recently Completed">
          <div className="stats-entry-list">
            {stats.recentlyCompleted.length > 0 ? (
              stats.recentlyCompleted.map((entry) => (
                <StatEntryRow
                  key={entry.id}
                  entry={entry}
                  trailing={
                    <span className="stats-pill">
                      {new Date(
                        Math.max(entry.completedAt || 0, entry.lastWatched || 0)
                      ).toLocaleDateString()}
                    </span>
                  }
                />
              ))
            ) : (
              <div className="stats-empty-inline">Complete a series to populate this list.</div>
            )}
          </div>
        </StatsSection>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="stats-card">
      <span className="stats-card__label">{label}</span>
      <span className="stats-card__value">{value}</span>
      <span className="stats-card__sub">{sub}</span>
    </div>
  );
}

function StatsSection({ title, children }) {
  return (
    <section className="stats-section">
      <h3 className="stats-section__title">{title}</h3>
      {children}
    </section>
  );
}

function StatEntryRow({ entry, trailing }) {
  return (
    <div className="stat-entry-row">
      <div className="stat-entry-row__cover">
        <CoverArt anime={entry} className="cover-media cover-media--fill" />
      </div>
      <div className="stat-entry-row__body">
        <div className="stat-entry-row__title">{getDisplayTitle(entry)}</div>
        <div className="stat-entry-row__badges">
          <span
            className="stats-pill"
            style={{
              color: getStatusColor(entry.status),
              borderColor: `${getStatusColor(entry.status)}66`,
              background: `${getStatusColor(entry.status)}1A`,
            }}
          >
            {getStatusLabel(entry.status)}
          </span>
          {entry.averageScore ? (
            <span className="stats-pill">{entry.averageScore}% match</span>
          ) : null}
        </div>
      </div>
      <div className="stat-entry-row__trailing">{trailing}</div>
    </div>
  );
}
