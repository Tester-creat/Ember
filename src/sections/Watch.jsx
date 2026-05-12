import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CoverArt from '../components/CoverArt';
import { useAnimeData } from '../hooks/useAnimeData';
import {
  buildMegaPlayAniListUrl,
  fetchAnikotoEpisode,
  fetchWatchOrder,
  resolveAnikotoSeries,
  STREAM_PROVIDERS,
} from '../utils/api';
import { getDisplayTitle, getStatusTransitionPatch, normalizeAnime } from '../utils/animeUtils';

const EPISODE_GROUP_SIZE = 40;
const PROVIDER_FALLBACK_TIMEOUT_MS = 30000;

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
  const iframeRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const autoFallbackAttemptsRef = useRef(0);
  const [embedUrl, setEmbedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolvingMessage, setResolvingMessage] = useState('');
  const [watchOrder, setWatchOrder] = useState([]);
  const [episodeGroupOverride, setEpisodeGroupOverride] = useState(null);
  const [groupMenuOpen, setGroupMenuOpen] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);

  const totalEpisodes = entry?.episodes || 9999;
  const totalLabel = totalEpisodes === 9999 ? '?' : totalEpisodes;
  const hasKnownEpisodeCount = totalEpisodes !== 9999;
  const totalEpisodeGroups = hasKnownEpisodeCount ? Math.ceil(totalEpisodes / EPISODE_GROUP_SIZE) : 0;

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
    autoFallbackAttemptsRef.current = 0;
  }, [currentEpisode, currentLanguage, currentWatchId]);

  const cycleProvider = useCallback(
    (reason) => {
      if (autoFallbackAttemptsRef.current >= STREAM_PROVIDERS.length - 1) {
        setWatchPlayerError({
          provider: STREAM_PROVIDERS[currentProvider % STREAM_PROVIDERS.length].name,
          message: `Playback could not be restored after trying every provider. Last failure: ${reason}.`,
        });
        return;
      }

      autoFallbackAttemptsRef.current += 1;
      console.warn(
        `[Watch] Cycling provider after ${reason}. Attempt ${autoFallbackAttemptsRef.current}.`
      );
      setCurrentProvider((prev) => (prev + 1) % STREAM_PROVIDERS.length);
    },
    [currentProvider, setCurrentProvider, setWatchPlayerError]
  );

  useEffect(() => {
    if (!entry) return;

    const resolve = async () => {
      setLoading(true);
      setEmbedUrl(null);
      setResolvingMessage('Initializing player...');
      setWatchPlayerError(null);

      try {
        const provider = STREAM_PROVIDERS[currentProvider % STREAM_PROVIDERS.length];

        if (provider.isAnikoto) {
          setResolvingMessage('Searching Anikoto catalog...');
          try {
            const series = await resolveAnikotoSeries(entry.anilistId, entry);
            setResolvingMessage(`Loading ${series.title} from MegaPlay...`);
            const url = await fetchAnikotoEpisode(series.id, currentEpisode, currentLanguage);

            if (typeof url !== 'string' || url.trim() === '') {
              console.warn(
                '[Watch] MegaPlay returned an empty embed URL. Falling back to the direct AniList endpoint.'
              );
              setEmbedUrl(buildMegaPlayAniListUrl(entry.anilistId, currentEpisode, currentLanguage));
              return;
            }

            setEmbedUrl(url.trim());
          } catch (anikotoError) {
            console.warn(
              '[Watch] Anikoto resolution failed, attempting MegaPlay direct AniList fallback...',
              anikotoError
            );
            setResolvingMessage('Primary source unavailable, trying direct AniList fallback...');
            setEmbedUrl(buildMegaPlayAniListUrl(entry.anilistId, currentEpisode, currentLanguage));
          }
        } else {
          setResolvingMessage(`Loading from ${provider.name}...`);
          const url = provider.buildUrl(entry.anilistId, currentEpisode, currentLanguage);
          if (typeof url !== 'string' || url.trim() === '') {
            cycleProvider(`${provider.name} returned an empty URL`);
            return;
          }
          setEmbedUrl(url.trim());
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
    cycleProvider,
    entry,
    retryNonce,
    setWatchPlayerError,
  ]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !embedUrl || loading) return undefined;

    const clearFallbackTimer = () => {
      if (fallbackTimerRef.current) {
        window.clearTimeout(fallbackTimerRef.current);
        fallbackTimerRef.current = null;
      }
    };

    const handleLoad = () => {
      clearFallbackTimer();
    };

    const handleError = () => {
      clearFallbackTimer();
      cycleProvider('iframe load error');
    };

    iframe.addEventListener('load', handleLoad);
    iframe.addEventListener('error', handleError);

    fallbackTimerRef.current = window.setTimeout(() => {
      cycleProvider(`no iframe load signal after ${PROVIDER_FALLBACK_TIMEOUT_MS / 1000}s`);
    }, PROVIDER_FALLBACK_TIMEOUT_MS);

    return () => {
      clearFallbackTimer();
      iframe.removeEventListener('load', handleLoad);
      iframe.removeEventListener('error', handleError);
    };
  }, [cycleProvider, embedUrl, loading]);

  useEffect(() => {
    if (!embedUrl?.includes('megaplay.buzz')) return undefined;

    const handleMessage = (event) => {
      if (!String(event.origin || '').includes('megaplay.buzz')) return;

      let payload = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (payload?.event === 'error') {
        cycleProvider('MegaPlay player error event');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [cycleProvider, embedUrl]);

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

  const groupOptions = useMemo(() => {
    if (!hasKnownEpisodeCount || totalEpisodeGroups <= 1) return [];

    return Array.from({ length: totalEpisodeGroups }, (_, index) => {
      const start = index * EPISODE_GROUP_SIZE + 1;
      const end = Math.min(start + EPISODE_GROUP_SIZE - 1, totalEpisodes);
      return { index, start, end };
    });
  }, [hasKnownEpisodeCount, totalEpisodeGroups, totalEpisodes]);

  if (!entry) return null;

  const activeProvider = STREAM_PROVIDERS[currentProvider % STREAM_PROVIDERS.length];
  const derivedEpisodeGroup = hasKnownEpisodeCount
    ? Math.floor((Math.max(1, currentEpisode) - 1) / EPISODE_GROUP_SIZE)
    : 0;
  const episodeGroup =
    episodeGroupOverride != null &&
    (!hasKnownEpisodeCount ||
      (currentEpisode >= episodeGroupOverride * EPISODE_GROUP_SIZE + 1 &&
        currentEpisode <= episodeGroupOverride * EPISODE_GROUP_SIZE + EPISODE_GROUP_SIZE))
      ? episodeGroupOverride
      : derivedEpisodeGroup;
  const activeGroupStart = episodeGroup * EPISODE_GROUP_SIZE + 1;
  const activeGroupEnd = hasKnownEpisodeCount
    ? Math.min(activeGroupStart + EPISODE_GROUP_SIZE - 1, totalEpisodes)
    : 100;

  const visibleEpisodes = hasKnownEpisodeCount
    ? Array.from(
        { length: Math.max(0, activeGroupEnd - activeGroupStart + 1) },
        (_, index) => activeGroupStart + index
      )
    : Array.from({ length: 100 }, (_, index) => index + 1);

  const handleWatchOrderSelect = (node) => {
    const savedEntry = addToLibrary(normalizeAnime(node), 'watching');
    setCurrentWatchId(savedEntry.id);
    setCurrentEpisode(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="watch-layout page-inner">
      <div className="watch-main">
        <div
          className={`watch-player ${loading ? 'is-resolving' : ''} ${watchPlayerError ? 'has-error' : ''}`}
        >
          {embedUrl ? (
            <iframe
              ref={iframeRef}
              src={embedUrl}
              title={`${getDisplayTitle(entry)} episode ${currentEpisode} on ${activeProvider.name}`}
              allow="autoplay; fullscreen"
              referrerPolicy="no-referrer"
              data-watch-iframe
            />
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
              <button
                className="btn btn--primary"
                onClick={() => {
                  setWatchPlayerError(null);
                  setRetryNonce((value) => value + 1);
                }}
              >
                Retry
              </button>
            </div>
          ) : null}
        </div>

        <div className="watch-meta">
          <h1 className="watch-meta__title">{getDisplayTitle(entry)}</h1>
          <div className="watch-meta__info">
            Episode {currentEpisode} of {totalLabel} / {currentLanguage.toUpperCase()} /{' '}
            {activeProvider.name}
          </div>
          <div className="watch-meta__info">
            If the player opens but stays blank, switch provider. Some embeds load an error page
            without reporting playback failure.
          </div>

          <div className="watch-actions">
            <div className="watch-actions__group">
              <button
                className="btn btn--glass btn--sm"
                onClick={() => {
                  setEpisodeGroupOverride(null);
                  setGroupMenuOpen(false);
                  setCurrentEpisode((prev) => Math.max(1, prev - 1));
                }}
                disabled={currentEpisode <= 1}
              >
                Previous
              </button>
              <button
                className="btn btn--glass btn--sm"
                onClick={() => {
                  setEpisodeGroupOverride(null);
                  setGroupMenuOpen(false);
                  setCurrentEpisode((prev) => prev + 1);
                }}
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
              <div className="provider-switcher" aria-label="Stream provider">
                {STREAM_PROVIDERS.map((provider, index) => (
                  <button
                    key={provider.name}
                    type="button"
                    className={`provider-switcher__btn ${index === currentProvider ? 'is-active' : ''}`}
                    onClick={() => {
                      autoFallbackAttemptsRef.current = 0;
                      setCurrentProvider(index);
                    }}
                  >
                    {provider.name}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn--glass btn--sm"
              onClick={() => {
                updateEntry(entry.id, {
                  episodesWatched: currentEpisode,
                  lastWatched: Date.now(),
                  ...getStatusTransitionPatch(
                    entry,
                    totalEpisodes !== 9999 && currentEpisode >= totalEpisodes ? 'completed' : 'watching'
                  ),
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
        {groupOptions.length > 1 ? (
          <div className="episode-group-selector">
            <button
              type="button"
              className={`episode-group-btn ${groupMenuOpen ? 'is-active' : ''}`}
              onClick={() => setGroupMenuOpen((open) => !open)}
            >
              <span>
                Episodes {activeGroupStart}-{activeGroupEnd}
              </span>
              <span className="chevron">⌄</span>
            </button>
            <div className={`episode-group-list ${groupMenuOpen ? 'is-open' : ''}`}>
              {groupOptions.map((group) => (
                <button
                  key={group.index}
                  type="button"
                  className={group.index === episodeGroup ? 'is-active' : ''}
                  onClick={() => {
                    setEpisodeGroupOverride(group.index);
                    setGroupMenuOpen(false);
                  }}
                >
                  Episodes {group.start}-{group.end}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div className="watch-sidebar__list">
          {visibleEpisodes.map((episode) => (
            <button
              key={episode}
              className={`ep-row ${episode === currentEpisode ? 'is-current' : ''} ${episode <= (entry.episodesWatched || 0) ? 'is-watched' : ''}`}
              onClick={() => setCurrentEpisode(episode)}
            >
              <span className="ep-row__number">{episode}</span>
              <span className="ep-row__label">Episode {episode}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
