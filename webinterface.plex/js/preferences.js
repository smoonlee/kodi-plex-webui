/**
 * Persistent client preferences: theme, watchlist, and recent searches.
 */

const STORAGE_KEY = "kodi-plex-preferences";
const MAX_RECENT_SEARCHES = 6;
const DEFAULT_THEME = "midnight";

const THEME_META = {
  midnight: "#141414",
  amethyst: "#191627",
  forest: "#10211c",
  azure: "#0f1c2f",
};

export const THEMES = [
  { id: "midnight", label: "Midnight Gold" },
  { id: "amethyst", label: "Amethyst Glow" },
  { id: "forest", label: "Forest Night" },
  { id: "azure", label: "Azure Blue" },
];

const DEFAULTS = {
  theme: DEFAULT_THEME,
  watchlist: [],
  recentSearches: [],
};

let _prefs = loadPreferences();

function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    return {
      ...DEFAULTS,
      ...(stored || {}),
      watchlist: Array.isArray(stored?.watchlist) ? stored.watchlist : [],
      recentSearches: Array.isArray(stored?.recentSearches)
        ? stored.recentSearches
        : [],
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function savePreferences() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(_prefs));
}

function watchlistKey(type, id) {
  return `${type}:${id}`;
}

export function getTheme() {
  return _prefs.theme || DEFAULT_THEME;
}

export function applyTheme(theme = getTheme()) {
  const safeTheme = THEMES.some((item) => item.id === theme)
    ? theme
    : DEFAULT_THEME;
  document.documentElement.dataset.theme = safeTheme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta)
    meta.setAttribute(
      "content",
      THEME_META[safeTheme] || THEME_META[DEFAULT_THEME],
    );
}

export function setTheme(theme) {
  _prefs.theme = THEMES.some((item) => item.id === theme)
    ? theme
    : DEFAULT_THEME;
  savePreferences();
  applyTheme(_prefs.theme);
  return _prefs.theme;
}

export function getWatchlist() {
  return [..._prefs.watchlist].sort(
    (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
  );
}

export function isInWatchlist(type, id) {
  return _prefs.watchlist.some((item) => item.key === watchlistKey(type, id));
}

export function toggleWatchlist(entry) {
  const key = watchlistKey(entry.type, entry.id);
  const existingIndex = _prefs.watchlist.findIndex((item) => item.key === key);

  if (existingIndex >= 0) {
    _prefs.watchlist.splice(existingIndex, 1);
    savePreferences();
    return false;
  }

  _prefs.watchlist.unshift({
    key,
    type: entry.type,
    id: entry.id,
    addedAt: Date.now(),
  });
  savePreferences();
  return true;
}

export function addRecentSearch(query) {
  const normalized = String(query || "").trim();
  if (!normalized) return;

  _prefs.recentSearches = [
    normalized,
    ..._prefs.recentSearches.filter(
      (item) => item.toLowerCase() !== normalized.toLowerCase(),
    ),
  ].slice(0, MAX_RECENT_SEARCHES);

  savePreferences();
}

export function getRecentSearches() {
  return [..._prefs.recentSearches];
}

export function clearRecentSearches() {
  _prefs.recentSearches = [];
  savePreferences();
}
