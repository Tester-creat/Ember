
import React, { useEffect, useState, useMemo } from 'react';
import { useAnimeData } from '../hooks/useAnimeData';
import { getDisplayTitle, getEntry } from '../utils/animeUtils';
import { STREAM_PROVIDERS, fetchWatchOrder } from '../utils/api';

const EP_GROUP_SIZE = 40;

export default function Watch() {
  const { 
    currentWatchId, userData, currentEpisode, setCurrentEpisode,
    currentProvider, setCurrentProvider, currentLanguage, setCurrentLanguage,
    watchPlayerError, setWatchPlayerError, setCurrentTab, setCurrentWatchId,
    updateEntry
  } = useAnimeData();

  const entry = userData[String(currentWatchId)];
  const [embedUrl, setEmbedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchOrder, setWatchOrder] = useState([]);

  const totalEps = entry?.episodes || 9999;
  const totalLabel = totalEps === 9999 ? "?" : totalEps;

  // Resolve Embed URL
  useEffect(() => {
    if (!entry) return;
    const resolve = async () => {
      setLoading(true);
      try {
        // This would call the provider logic
        // For simplicity in this initial port, I'll use the VidNest fallback logic
        const provider = [
          { buildUrl: (e, ep, l) => `https://vidnest.fun/anime/${e.anilistId}/${ep}/${l}` },
          { buildUrl: (e, ep, l) => `https://vidsrc.cc/v2/embed/anime/${e.anilistId}/${ep}${l === 'dub' ? '/dub' : ''}` }
        ][currentProvider % 2];
        
        const url = provider.buildUrl(entry, currentEpisode, currentLanguage);
        setEmbedUrl(url);
      } catch (e) {
        setWatchPlayerError({ provider: 'Provider', message: e.message });
      } finally {
        setLoading(false);
      }
    };
    resolve();
  }, [entry, currentEpisode, currentProvider, currentLanguage, setWatchPlayerError]);

  // Load Watch Order
  useEffect(() => {
    if (entry?.anilistId) {
      fetchWatchOrder(entry.anilistId).then(edges => {
        setWatchOrder(edges.filter(e => e.node.type === 'ANIME'));
      }).catch(() => {});
    }
  }, [entry?.anilistId]);

  if (!entry) return null;

  return (
    <div className="watch-layout">
      <div className="watch-main">
        <div className={`watch-player ${loading ? 'is-resolving' : ''} ${watchPlayerError ? 'has-error' : ''}`}>
          {embedUrl && <iframe src={embedUrl} allow="autoplay; fullscreen" data-watch-iframe />}
          
          {watchPlayerError && (
            <div className="watch-player__error-overlay">
              <div className="watch-player__error-icon">⚠</div>
              <div className="watch-player__error-title">Playback Error</div>
              <p>{watchPlayerError.message}</p>
              <button className="btn btn--primary" onClick={() => setWatchPlayerError(null)}>Retry</button>
            </div>
          )}
        </div>

        <div className="watch-meta" style={{ marginTop: 'var(--sp-4)' }}>
          <h1 className="watch-meta__title">{getDisplayTitle(entry)}</h1>
          <div className="watch-meta__info">
            Episode {currentEpisode} of {totalLabel} &bull; {currentLanguage.toUpperCase()}
          </div>

          <div className="watch-actions" style={{ marginTop: 'var(--sp-4)', display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button 
                className="btn btn--glass btn--sm" 
                onClick={() => setCurrentEpisode(prev => Math.max(1, prev - 1))}
                disabled={currentEpisode <= 1}
              >
                Previous
              </button>
              <button 
                className="btn btn--glass btn--sm" 
                onClick={() => setCurrentEpisode(prev => prev + 1)}
                disabled={totalEps !== 9999 && currentEpisode >= totalEps}
              >
                Next
              </button>
            </div>

            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <button className="btn btn--glass btn--sm" onClick={() => setCurrentLanguage(prev => prev === 'sub' ? 'dub' : 'sub')}>
                {currentLanguage.toUpperCase()}
              </button>
              <button className="btn btn--primary btn--sm" onClick={() => setCurrentProvider(prev => prev + 1)}>
                Switch Provider
              </button>
            </div>

            <button 
              className="btn btn--glass btn--sm" 
              onClick={() => {
                updateEntry(entry.id, { 
                  episodesWatched: currentEpisode,
                  lastWatched: Date.now(),
                  status: (totalEps !== 9999 && currentEpisode >= totalEps) ? 'completed' : 'watching'
                });
              }}
            >
              Mark Watched
            </button>
            
            <button 
              className="btn btn--glass btn--sm" 
              style={{ marginLeft: 'auto' }}
              onClick={() => {
                setCurrentWatchId(null);
                setCurrentTab('home');
              }}
            >
              Close Player
            </button>
          </div>
        </div>

        {watchOrder.length > 0 && (
          <div className="wo-panel" style={{ marginTop: 'var(--sp-6)' }}>
            <div className="wo-panel__title">Watch Order</div>
            <div className="wo-cards">
              {watchOrder.map(edge => (
                <div key={edge.node.id} className="wo-card" onClick={() => {
                  // Navigate logic
                }}>
                  <div className="wo-card__cover">
                    <img src={edge.node.coverImage.medium} alt="" />
                  </div>
                  <div className="wo-card__body">
                    <div className="wo-card__badge">{edge.relationType}</div>
                    <div className="wo-card__title">{edge.node.title.english || edge.node.title.romaji}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="watch-sidebar">
        <div className="watch-sidebar__title">Episodes ({totalLabel})</div>
        <div className="watch-sidebar__list">
          {Array.from({ length: Math.min(totalEps, 100) }, (_, i) => i + 1).map(ep => (
            <button 
              key={ep}
              className={`ep-row ${ep === currentEpisode ? 'is-current' : ''} ${ep <= (entry.episodesWatched || 0) ? 'is-watched' : ''}`}
              onClick={() => setCurrentEpisode(ep)}
            >
              <span className="ep-row__number">{ep}</span>
              <span className="ep-row__label">Episode {ep}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
