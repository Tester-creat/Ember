import { useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { getStatusLabel } from '../utils/animeUtils';

export default function Stats() {
  const { userData } = useAnimeData();
  const entries = useMemo(() => Object.values(userData).filter(e => e && e.id), [userData]);

  const stats = useMemo(() => {
    const total = entries.length;
    const completed = entries.filter(e => e.status === 'completed').length;
    const watching = entries.filter(e => e.status === 'watching').length;
    const planToWatch = entries.filter(e => e.status === 'plan-to-watch').length;
    
    let totalEpsWatched = 0;
    let totalScore = 0;
    let scoredCount = 0;

    entries.forEach(e => {
      totalEpsWatched += (e.episodesWatched || 0);
      if (e.rating) {
        totalScore += e.rating;
        scoredCount++;
      }
    });

    const avgScore = scoredCount > 0 ? (totalScore / scoredCount).toFixed(1) : "N/A";

    return { total, completed, watching, planToWatch, totalEpsWatched, avgScore };
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="section page-inner">
        <h2 className="section__title">Stats</h2>
        <div className="empty-state">
          <div className="empty-state__icon">📊</div>
          <div className="empty-state__title">No data yet</div>
          <p>Add anime to your library to see your viewing statistics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="section page-inner">
      <h2 className="section__title">My Statistics</h2>
      
      <div className="stats-grid" style={{ marginTop: 'var(--sp-6)' }}>
        <div className="stats-card">
          <span className="stats-card__label">Total Anime</span>
          <span className="stats-card__value">{stats.total}</span>
          <span className="stats-card__sub">{stats.completed} Completed</span>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Episodes Watched</span>
          <span className="stats-card__value">{stats.totalEpsWatched}</span>
          <span className="stats-card__sub">Across all titles</span>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Average Rating</span>
          <span className="stats-card__value">{stats.avgScore}</span>
          <span className="stats-card__sub">/ 10.0</span>
        </div>

        <div className="stats-card">
          <span className="stats-card__label">Currently Watching</span>
          <span className="stats-card__value">{stats.watching}</span>
          <span className="stats-card__sub">Active series</span>
        </div>
      </div>

      <div className="library-content" style={{ marginTop: 'var(--sp-8)' }}>
         <h3 className="section__title" style={{ fontSize: 'var(--t-lg)' }}>Library Breakdown</h3>
         <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
            {['watching', 'completed', 'plan-to-watch', 'paused', 'dropped'].map(status => {
               const count = entries.filter(e => e.status === status).length;
               if (count === 0) return null;
               const percentage = ((count / stats.total) * 100).toFixed(0);
               return (
                  <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
                     <div style={{ width: '120px', fontSize: 'var(--t-sm)', color: 'var(--text2)' }}>{getStatusLabel(status)}</div>
                     <div style={{ flex: 1, height: '8px', background: 'var(--surface)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--accent)', borderRadius: '4px' }}></div>
                     </div>
                     <div style={{ width: '40px', fontSize: 'var(--t-sm)', fontWeight: '700', textAlign: 'right' }}>{count}</div>
                  </div>
               );
            })}
         </div>
      </div>
    </div>
  );
}
