/* eslint-disable react-refresh/only-export-components -- context + hook pair */
import { createContext, useContext, useState, useCallback } from 'react';
import { getStatusTransitionPatch, normalizeAnime } from '../utils/animeUtils';


const AnimeContext = createContext();

function readStoredUserData() {
  try {
    return JSON.parse(localStorage.getItem('ember_data')) || {};
  } catch {
    return {};
  }
}

export function AnimeProvider({ children }) {
  const [userData, setUserData] = useState(readStoredUserData);
  const [anilistCache, setAnilistCache] = useState({});
  const [homeTrending, setHomeTrending] = useState({ results: [], loading: false, error: null, page: 0, hasMore: true });
  const [currentTab, setCurrentTab] = useState("home");
  const [libraryFilter, setLibraryFilter] = useState("all");
  
  const [browseData, setBrowseData] = useState({ 
    results: [], loading: false, error: null, page: 0, mode: "trending", hasMore: true 
  });
  
  const [seasonalData, setSeasonalData] = useState({ 
    results: [], loading: false, error: null, page: 0, season: null, year: null, hasMore: true 
  });

  const [currentWatchId, setCurrentWatchId] = useState(null);
  const [currentEpisode, setCurrentEpisode] = useState(1);
  const [currentProvider, setCurrentProvider] = useState(0);
  const [currentLanguage, setCurrentLanguage] = useState("sub");
  const [watchPlayerError, setWatchPlayerError] = useState(null);

  // Save to LocalStorage
  const saveData = useCallback((newData) => {
    localStorage.setItem("ember_data", JSON.stringify(newData));
    setUserData(newData);
  }, []);

  const getEntry = useCallback((id) => userData[String(id)] || null, [userData]);

  const updateEntry = useCallback((id, updates) => {
    const newData = { ...userData };
    newData[String(id)] = { ...newData[String(id)], ...updates };
    saveData(newData);
  }, [userData, saveData]);

  const addToLibrary = useCallback((anime, status = "untracked", extraUpdates = {}) => {
    const source = normalizeAnime(anime) || anime;
    const id = String(source.id || source.anilistId);
    const existing = userData[id];
    const isUpdate = !!existing;
    const transitionPatch = getStatusTransitionPatch(existing, status);

    const entryData = {
      id:              id,
      anilistId:       Number(id),
      title:           source.title || "",
      titleEnglish:    source.titleEnglish || "",
      cover:           source.cover || "",
      banner:          source.banner || "",
      episodes:        source.episodes || 0,
      episodesWatched: isUpdate ? existing.episodesWatched : 0,
      status:          transitionPatch.status,
      language:        isUpdate ? existing.language : "sub",
      rating:          isUpdate ? existing.rating : 0,
      genres:          source.genres || [],
      averageScore:    source.averageScore || 0,
      format:          source.format || "",
      notes:           isUpdate ? existing.notes : "",
      dateAdded:       isUpdate ? existing.dateAdded : Date.now(),
      lastWatched:     isUpdate ? existing.lastWatched : 0,
      completedAt:     transitionPatch.completedAt,
      year:            source.year || 0,
      ...extraUpdates,
    };

    const newData = { ...userData, [id]: entryData };
    saveData(newData);
    return entryData;
  }, [userData, saveData]);

  const value = {
    userData, setUserData,
    anilistCache, setAnilistCache,
    homeTrending, setHomeTrending,
    currentTab, setCurrentTab,
    libraryFilter, setLibraryFilter,
    browseData, setBrowseData,
    seasonalData, setSeasonalData,
    currentWatchId, setCurrentWatchId,
    currentEpisode, setCurrentEpisode,
    currentProvider, setCurrentProvider,
    currentLanguage, setCurrentLanguage,
    watchPlayerError, setWatchPlayerError,
    getEntry, updateEntry, addToLibrary, saveData
  };

  return <AnimeContext.Provider value={value}>{children}</AnimeContext.Provider>;
}

export function useAnimeData() {
  const context = useContext(AnimeContext);
  if (!context) throw new Error("useAnimeData must be used within an AnimeProvider");
  return context;
}
