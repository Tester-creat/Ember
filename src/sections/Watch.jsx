import { useEffect, useRef, useState } from 'react';
import CoverArt from '../components/CoverArt';
import { useAnimeData } from '../hooks/useAnimeData';
import {
  fetchAnikotoEpisode,
  fetchWatchOrder,
  resolveAnikotoSeries,
  STREAM_PROVIDERS,
} from '../utils/api';
import { getDisplayTitle, normalizeAnime } from '../utils/animeUtils';

export default function Watch() {
  const {
    currentWatchId,
    userData,
    currentEpisode,
    setCurrentEpisode,
    currentProvider,
    setCurrentProvider,
    currentLanguage,
    setCurrentLanguage,
    watchPlayerError,
    setWatchPlayerError,
    setCurrentTab,
    setCurrentWatchId,
    updateEntry,
    addToLibrary,
  } = useAnimeData();

  const entry = userData[String(currentWatchId)];
  const initializedWatchId = useRef(null);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvingMessage, setResolvingMessage] = useState('');
  const [watchOrder, setWatchOrder] = useState([]);

  const totalEpisodes = entry?.episodes || 9999;
  const totalLabel = totalEpisodes === 9999 ? '?' : totalEpisodes;

  useEffect(() => {
    if (!entry || initializedWatchId.current === currentWatchId) return;
    initializedWatchId.current = currentWatchId;

    const nextEpisode =
      entry.status === 'watching' && entry.episodesWatched
        ? Math.min((entry.episodesWatched || 0) + 1, entry.episodes || Number.MAX_SAFE_INTEGER)
        : 1;

    setCurrentEpisode(Math.max(1, nextEpisode));
  }, [currentWatchId, entry, setCurrentEpisode]);

  useEffect(() => {
    if (!entry) return;

    const resolve = async () => {
      setLoading(true);
      setResolvingMessage('Initializing player...');
      setWatchPlayerError(null);

      try {
        const provider = STREAM_PROVIDERS[currentProvider % STREAM_PROVIDERS.length];

        if (provider.isAnikoto) {
          setResolvingMessage('Searching Anikoto catalog...');
          try {
            const series = await resolveAnikotoSeries(entry.anilistId, entry);
            setResolvingMessage(`Loading ${series.title}...`);
            const url = await fetchAnikotoEpisode(series.id, currentEpisode, currentLanguage);
            setEmbedUrl(url);
          } catch (anikotoError) {
            console.warn('Anikoto resolution failed, attempting fallback...', anikotoError);
            setResolvingMessage('Primary source unavailable, trying fallback...');
            const fallback = STREAM_PROVIDERS[1];
            setEmbedUrl(fallback.buildUrl(entry.anilistId, currentEpisode, currentLanguage));
          }
        } else {
          setResolvingMessage(`Loading from ${provider.name}...`);
          setEmbedUrl(provider.buildUrl(entry.anilistId, currentEpisode, currentLanguage));
        }
      } catch (error) {
        setWatchPlayerError({ provider: 'Provider', message: error.message });
      } finally {
        setLoading(false);
        setResolvingMessage('');
      }
    };

    resolve();
  }, [
    currentEpisode,
    currentLanguage,
    currentProvider,
    entry,
    setWatchPlayerError,
  ]);

  useEffect(() => {
    if (!entry?.anilistId) return;

    fetchWatchOrder(entry.anilistId)
      .then((edges) => {
        setWatchOrder(edges.filter((edge) => edge.node.type === 'ANIME'));
      })
      .catch(() => {
        setWatchOrder([]);
      });
  }, [entry?.anilistId]);

  if (!entry) return null;

  const handleWatchOrderSelect = (node) => {
    const savedEntry = addToLibrary(normalizeAnime(node), 'watching');
    setCurrentWatchId(savedEntry.id);
    setCurrentEpisode(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="watch-layout page-inner">
      <div className="watch-main">
        <div className={`watch-player ${loading ? 'is-resolving' : ''} ${watchPlayerError ? 'has-error' : ''}`}>
          {embedUrl ? (
            <iframe src={embedUrl} allow="autoplay; fullscreen" data-watch-iframe />
          ) : null}

          {loading ? (
            <div className="watch-player__loading-overlay">
              <div className="spinner" />
              {resolvingMessage ? <div className="resolving-msg">{resolvingMessage}</div> : null}
            </div>
          ) : null}

          {watchPlayerError ? (
            <div className="watch-player__error-overlay">
              <div className="watch-player__error-icon">!</div>
              <div className="watch-player__error-title">Playback Error</div>
              <p>{watchPlayerError.message}</p>
              <button className="btn btn--primary" onClick={() => setWatchPlayerError(null)}>
                Retry
              </button>
            </div>
          ) : null}
        </div>

        <div className="watch-meta">
          <h1 className="watch-meta__title">{getDisplayTitle(entry)}</h1>
          <div className="watch-meta__info">
            Episode {currentEpisode} of {totalLabel} / {currentLanguage.toUpperCase()}
          </div>

          <div className="watch-actions">
            <div className="watch-actions__group">
              <button
                className="btn btn--glass btn--sm"
                onClick={() => setCurrentEpisode((prev) => Math.max(1, prev - 1))}
                disabled={currentEpisode <= 1}
              >
                Previous
              </button>
              <button
                className="btn btn--glass btn--sm"
                onClick={() => setCurrentEpisode((prev) => prev + 1)}
                disabled={totalEpisodes !== 9999 && currentEpisode >= totalEpisodes}
              >
                Next
              </button>
            </div>

            <div className="watch-actions__group">
              <button
                className="btn btn--ghost btn--sm"
                onClick={() => setCurrentLanguage((prev) => (prev === 'sub' ? 'dub' : 'sub'))}
              >
                {currentLanguage.toUpperCase()}
              </button>
              <button
                className="btn btn--primary btn--sm"
                onClick={() =>
                  setCurrentProvider((prev) => (prev + 1) % STREAM_PROVIDERS.length)
                }
              >
                {STREAM_PROVIDERS[currentProvider % STREAM_PROVIDERS.length].name}
              </button>
            </div>

            <button
              className="btn btn--glass btn--sm"
              onClick={() => {
                updateEntry(entry.id, {
                  episodesWatched: currentEpisode,
                  lastWatched: Date.now(),
                  status:
                    totalEpisodes !== 9999 && currentEpisode >= totalEpisodes
                      ? 'completed'
                      : 'watching',
                });
              }}
            >
              Mark Watched
            </button>

            <button
              className="btn btn--ghost btn--sm watch-actions__close"
              onClick={() => {
                setCurrentWatchId(null);
                setCurrentTab('home');
              }}
            >
              Close Player
            </button>
          </div>
        </div>

        {watchOrder.length > 0 ? (
          <div className="wo-panel">
            <div className="wo-panel__title">Watch Order</div>
            <div className="wo-cards">
              {watchOrder.map((edge) => (
                <button
                  key={edge.node.id}
                  type="button"
                  className="wo-card"
                  onClick={() => handleWatchOrderSelect(edge.node)}
                >
                  <div className="wo-card__cover">
                    <CoverArt anime={edge.node} className="cover-media cover-media--fill" />
                  </div>
                  <div className="wo-card__body">
                    <div className="wo-card__badge">{edge.relationType.replace(/_/g, ' ')}</div>
                    <div className="wo-card__title">
                      {edge.node.title.english || edge.node.title.romaji}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="watch-sidebar">
        <div className="watch-sidebar__title">Episodes ({totalLabel})</div>
        <div className="watch-sidebar__list">
          {Array.from({ length: Math.min(totalEpisodes, 100) }, (_, index) => index + 1).map(
            (episode) => (
              <button
                key={episode}
                className={`ep-row ${episode === currentEpisode ? 'is-current' : ''} ${episode <= (entry.episodesWatched || 0) ? 'is-watched' : ''}`}
                onClick={() => setCurrentEpisode(episode)}
              >
                <span className="ep-row__number">{episode}</span>
                <span className="ep-row__label">Episode {episode}</span>
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}
