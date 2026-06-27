import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CoverArt from '../components/CoverArt';
import { useAnimeData } from '../hooks/useAnimeData';
import { fetchWatchOrder, STREAM_PROVIDERS } from '../utils/api';
import {
  formatSortRank,
  getDisplayTitle,
  getStatusTransitionPatch,
  normalizeAnime,
  parseFranchise,
} from '../utils/animeUtils';

const EPISODE_GROUP_SIZE = 40;
const PROVIDER_FALLBACK_TIMEOUT_MS = 30000;

// Only relation types that belong to the same story/franchise watch order.
// Excludes OTHER/CHARACTER/etc., which surface unrelated crossover specials
// (e.g. the Toriko x One Piece x Dragon Ball Z special on One Piece).
const WATCH_ORDER_RELATIONS = new Set([
  'PREQUEL',
  'SEQUEL',
  'PARENT',
  'SIDE_STORY',
  'ALTERNATIVE',
  'SUMMARY',
  'SPIN_OFF',
]);

function getNodeYear(node) {
  return node?.year || node?.seasonYear || node?.startDate?.year || 0;
}

function getNodeFormat(node) {
  return String(node?.format || 'ANIME').replace(/_/g, ' ');
}

function getNodeEpisodeCount(node) {
  const episodes = Number(node?.episodes || 0);
  if (!episodes) return 'Episodes unknown';
  return `${episodes} ${episodes === 1 ? 'ep' : 'eps'}`;
}

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
  const [watchOrderMode, setWatchOrderMode] = useState('recommended');
  const [episodeGroupOverride, setEpisodeGroupOverride] = useState(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [toastMessage, setToastMessage] = useState('');

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

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(''), 2500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

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

        setResolvingMessage(`Loading from ${provider.name}...`);
        const url = provider.buildUrl(entry.anilistId, currentEpisode, currentLanguage, entry);
        if (typeof url !== 'string' || url.trim() === '') {
          cycleProvider(`${provider.name} returned an empty URL`);
          return;
        }
        setEmbedUrl(url.trim());
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
        setWatchOrder(
          edges.filter(
            (edge) =>
              edge?.node?.type === 'ANIME' && WATCH_ORDER_RELATIONS.has(edge.relationType)
          )
        );
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

  const watchOrderItems = useMemo(() => {
    if (!entry) return [];

    const current = {
      node: {
        ...entry,
        id: entry.anilistId || entry.id,
        type: 'ANIME',
      },
      relationType: 'CURRENT',
    };
    const related = watchOrder.filter((edge) => String(edge?.node?.id) !== String(entry.anilistId));
    const items = [current, ...related];

    // Derive sort keys from whatever fields the node exposes (the current
    // entry and AniList relation nodes have slightly different shapes).
    const withKeys = items.map((item) => {
      const node = item.node || {};
      const date = node.startDate || {};
      const year = date.year || node.seasonYear || node.year || 0;
      const release = year
        ? year * 10000 + (date.month || 0) * 100 + (date.day || 0)
        : Number.MAX_SAFE_INTEGER;
      const title = getDisplayTitle(node);
      return {
        item,
        release,
        season: parseFranchise(title)?.season || 0,
        format: formatSortRank(node),
        title,
      };
    });

    withKeys.sort((a, b) => {
      if (watchOrderMode === 'release') {
        if (a.release !== b.release) return a.release - b.release;
        if (a.format !== b.format) return a.format - b.format;
        return a.title.localeCompare(b.title);
      }
      // Recommended: seasons/parts in order, TV before movies/specials, then by date.
      if (a.season !== b.season) return a.season - b.season;
      if (a.format !== b.format) return a.format - b.format;
      if (a.release !== b.release) return a.release - b.release;
      return a.title.localeCompare(b.title);
    });

    return withKeys.map((entryKey) => entryKey.item);
  }, [entry, watchOrder, watchOrderMode]);

  if (!entry) return null;

  const activeProvider = STREAM_PROVIDERS[currentProvider % STREAM_PROVIDERS.length];
  const derivedEpisodeGroup = hasKnownEpisodeCount
    ? Math.floor((Math.max(1, currentEpisode) - 1) / EPISODE_GROUP_SIZE)
    : 0;
  const episodeGroup = episodeGroupOverride ?? derivedEpisodeGroup;
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

  // Episodes tick green automatically from saved progress, and every episode
  // ticks once the series is marked completed.
  const isCompleted = entry.status === 'completed';
  const watchedEpisodes = new Set((entry.watchedEpisodes || []).map(Number));
  const isEpisodeWatched = (episode) =>
    isCompleted ||
    watchedEpisodes.has(Number(episode)) ||
    episode <= (entry.episodesWatched || 0);

  const handleEpisodeGroupChange = (event) => {
    const nextGroup = parseInt(event.target.value, 10);
    const nextStart = nextGroup * EPISODE_GROUP_SIZE + 1;

    // [FIX] Bug 1 - the old override was ignored unless the current episode was
    // already in that range, so selecting another group never changed the list.
    setEpisodeGroupOverride(nextGroup);
    setCurrentEpisode(nextStart);
  };

  const markEpisodeWatched = (episode) => {
    const watched = new Set((entry.watchedEpisodes || []).map(Number));
    watched.add(Number(episode));

    // [FIX] Bug 2 - persist watched state, then render ticks/dimming from state
    // so the visual feedback survives episode group and watch view re-renders.
    updateEntry(entry.id, {
      episodesWatched: Math.max(entry.episodesWatched || 0, episode),
      watchedEpisodes: [...watched].sort((a, b) => a - b),
      lastWatched: Date.now(),
      ...getStatusTransitionPatch(
        entry,
        totalEpisodes !== 9999 && episode >= totalEpisodes ? 'completed' : 'watching'
      ),
    });
    setToastMessage(`Episode ${episode} marked as watched`);
  };

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
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="origin"
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
          <details className="watch-help">
            <summary className="watch-help__summary">Video not playing in the player?</summary>
            <div className="watch-help__body">
              <p>
                Sources are embedded from third-party sites. The player loads, but your
                browser&apos;s tracking protection usually blocks the video <em>inside</em> the
                frame. Turning it off for this site makes playback work right here in the page:
              </p>
              <ul>
                <li>
                  <strong>Firefox:</strong> click the shield icon in the address bar &rarr; turn{' '}
                  <strong>Enhanced Tracking Protection OFF</strong> for this site &rarr; reload.
                </li>
                <li>
                  <strong>Safari:</strong> Settings &rarr; Privacy &rarr; turn off{' '}
                  <strong>Prevent Cross-Site Tracking</strong>.
                </li>
                <li>Pause ad-block / wallet extensions, or try a private window.</li>
                <li>
                  Still blank? Switch <strong>Server</strong> above — some sources don&apos;t carry
                  every title.
                </li>
              </ul>
              {embedUrl && !loading && !watchPlayerError ? (
                <a
                  className="watch-open-link"
                  href={embedUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Last resort: open this source in a new tab &#8599;
                </a>
              ) : null}
            </div>
          </details>

          <div className="watch-actions">
            <div className="watch-control">
              <span className="watch-control__label">Episode</span>
              <div className="watch-seg">
                <button
                  type="button"
                  className="watch-seg__btn"
                  onClick={() => {
                    setEpisodeGroupOverride(null);
                    setCurrentEpisode((prev) => Math.max(1, prev - 1));
                  }}
                  disabled={currentEpisode <= 1}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Prev
                </button>
                <span className="watch-seg__divider" aria-hidden="true" />
                <button
                  type="button"
                  className="watch-seg__btn"
                  onClick={() => {
                    setEpisodeGroupOverride(null);
                    setCurrentEpisode((prev) => prev + 1);
                  }}
                  disabled={totalEpisodes !== 9999 && currentEpisode >= totalEpisodes}
                >
                  Next
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="watch-control">
              <span className="watch-control__label">Audio</span>
              <div className="watch-toggle" role="group" aria-label="Audio language">
                <button
                  type="button"
                  className={`watch-toggle__opt ${currentLanguage === 'sub' ? 'is-active' : ''}`}
                  aria-pressed={currentLanguage === 'sub'}
                  onClick={() => setCurrentLanguage('sub')}
                >
                  Subbed
                </button>
                <button
                  type="button"
                  className={`watch-toggle__opt ${currentLanguage === 'dub' ? 'is-active' : ''}`}
                  aria-pressed={currentLanguage === 'dub'}
                  onClick={() => setCurrentLanguage('dub')}
                >
                  Dubbed
                </button>
              </div>
            </div>

            <div className="watch-control">
              <span className="watch-control__label">Server</span>
              <div className="watch-select">
                <select
                  className="watch-select__input"
                  value={currentProvider % STREAM_PROVIDERS.length}
                  onChange={(event) => {
                    autoFallbackAttemptsRef.current = 0;
                    setCurrentProvider(Number(event.target.value));
                  }}
                  aria-label="Streaming server"
                >
                  {STREAM_PROVIDERS.map((provider, index) => (
                    <option key={provider.name} value={index}>
                      {provider.name}
                    </option>
                  ))}
                </select>
                <svg className="watch-select__caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                  <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="watch-actions__end">
              <button
                type="button"
                className="btn btn--glass btn--sm"
                onClick={() => markEpisodeWatched(currentEpisode)}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true" style={{ width: 16, height: 16 }}>
                  <path d="m5 12.5 4.5 4.5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Mark Watched
              </button>

              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => {
                  setCurrentWatchId(null);
                  setCurrentTab('home');
                }}
              >
                Close Player
              </button>
            </div>
          </div>
        </div>

        {watchOrderItems.length > 1 ? (
          <div className="wo-panel">
            <div className="wo-panel__head">
              <div className="wo-panel__title">Watch Order</div>
              <div className="watch-toggle watch-toggle--sm" role="group" aria-label="Watch order">
                <button
                  type="button"
                  className={`watch-toggle__opt ${watchOrderMode === 'recommended' ? 'is-active' : ''}`}
                  aria-pressed={watchOrderMode === 'recommended'}
                  onClick={() => setWatchOrderMode('recommended')}
                >
                  Recommended
                </button>
                <button
                  type="button"
                  className={`watch-toggle__opt ${watchOrderMode === 'release' ? 'is-active' : ''}`}
                  aria-pressed={watchOrderMode === 'release'}
                  onClick={() => setWatchOrderMode('release')}
                >
                  Release
                </button>
              </div>
            </div>
            <div className="wo-cards">
              {watchOrderItems.map((edge, index) => {
                const node = normalizeAnime(edge.node) || edge.node;
                const isCurrent = String(node.id || node.anilistId) === String(entry.anilistId);

                // [FIX] Bug 3 - each row now has order, year, type, episode
                // count, and a single current-title indicator.
                return (
                  <button
                    key={`${edge.relationType}-${node.id || index}`}
                    type="button"
                    className={`wo-card ${isCurrent ? 'is-current' : ''}`}
                    onClick={() => handleWatchOrderSelect(edge.node)}
                  >
                    <div className="wo-card__cover">
                      <CoverArt anime={node} className="cover-media cover-media--fill" />
                    </div>
                    <div className="wo-card__body">
                      <div className="wo-card__topline">
                        <span className="wo-card__index">{index + 1}</span>
                        <span className="wo-card__badge">{getNodeFormat(node)}</span>
                        {getNodeYear(node) ? (
                          <span className="wo-card__year">{getNodeYear(node)}</span>
                        ) : null}
                      </div>
                      <div className="wo-card__title">{getDisplayTitle(node)}</div>
                      <div className="wo-card__meta">
                        <span>{getNodeEpisodeCount(node)}</span>
                        {isCurrent ? <span className="wo-card__now">Now Watching</span> : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>

      <div className="watch-sidebar">
        <div className="watch-sidebar__title">Episodes ({totalLabel})</div>
        {groupOptions.length > 1 ? (
          <div className="episode-group-selector">
            <select
              className="episode-group-select"
              value={episodeGroup}
              onChange={handleEpisodeGroupChange}
              aria-label="Episode group"
            >
              {groupOptions.map((group) => (
                <option key={group.index} value={group.index}>
                  Episodes {group.start}-{group.end}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="watch-sidebar__list" id="episode-list">
          {visibleEpisodes.map((episode) => {
            const watched = isEpisodeWatched(episode);
            return (
              <button
                key={episode}
                className={`ep-row ${episode === currentEpisode ? 'is-current' : ''} ${watched ? 'episode--watched is-watched' : ''}`}
                onClick={() => setCurrentEpisode(episode)}
              >
                <span className="ep-row__number">{episode}</span>
                <span className="ep-row__label">Episode {episode}</span>
                <span className="ep-row__state">
                  {watched ? (
                    <svg className="ep-row__check" viewBox="0 0 16 16" aria-hidden="true">
                      <path d="M13.5 4.5 6.5 11.5 2.5 7.5" />
                    </svg>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {toastMessage ? (
        <div className="watch-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
