/**
 * OMDB API wrapper
 * Fetches extended metadata (ratings, awards, box office) from the Open Movie Database.
 * Requires a free API key from https://www.omdbapi.com/apikey.aspx
 */
const OMDB = (() => {
  "use strict";

  const API_URL = "https://www.omdbapi.com/";
  const STORAGE_KEY = "omdb_api_key";
  const CONFIG_PATH = "config.json";
  const _cache = new Map();
  let _configLoaded = false;

  // ── API key management ───────────────────────────────────────────────

  /** Load API key from shared config.json (falls back to localStorage) */
  async function loadConfig() {
    if (_configLoaded) return;
    _configLoaded = true;
    try {
      const resp = await fetch(CONFIG_PATH);
      if (!resp.ok) return;
      const cfg = await resp.json();
      if (cfg.omdbApiKey && !localStorage.getItem(STORAGE_KEY)) {
        localStorage.setItem(STORAGE_KEY, cfg.omdbApiKey);
      }
    } catch {
      // config.json missing or unreadable — rely on localStorage
    }
  }

  function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || "";
  }

  function setApiKey(key) {
    const sanitised = String(key || "").trim();
    if (sanitised) {
      localStorage.setItem(STORAGE_KEY, sanitised);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
    _cache.clear();
  }

  function hasApiKey() {
    return getApiKey().length > 0;
  }

  // ── Low-level fetch ──────────────────────────────────────────────────

  async function _fetch(params) {
    const key = getApiKey();
    if (!key) return null;

    const cacheKey = JSON.stringify(params);
    if (_cache.has(cacheKey)) return _cache.get(cacheKey);

    const url = new URL(API_URL);
    url.searchParams.set("apikey", key);
    url.searchParams.set("r", "json");
    for (const [k, v] of Object.entries(params)) {
      if (v != null && v !== "") url.searchParams.set(k, v);
    }

    try {
      const resp = await fetch(url.toString());
      if (!resp.ok) return null;
      const data = await resp.json();
      if (data.Response === "False") {
        _cache.set(cacheKey, null);
        return null;
      }
      _cache.set(cacheKey, data);
      return data;
    } catch {
      return null;
    }
  }

  // ── Public lookup methods ────────────────────────────────────────────

  /**
   * Fetch by IMDb ID (preferred — exact match)
   * @param {string} imdbId  e.g. "tt1285016"
   * @returns {Promise<object|null>}
   */
  async function fetchByImdbId(imdbId) {
    if (!imdbId || !imdbId.startsWith("tt")) return null;
    return _fetch({ i: imdbId, plot: "short" });
  }

  /**
   * Fetch by title + optional year (fallback)
   * @param {string}  title
   * @param {number}  [year]
   * @param {string}  [type]  "movie" | "series" | "episode"
   * @returns {Promise<object|null>}
   */
  async function fetchByTitle(title, year, type) {
    if (!title) return null;
    const params = { t: title, plot: "short" };
    if (year) params.y = year;
    if (type) params.type = type;
    return _fetch(params);
  }

  /**
   * Smart lookup: try IMDb ID first, fall back to title+year
   */
  async function lookup(imdbId, title, year, type) {
    await loadConfig();
    const byId = await fetchByImdbId(imdbId);
    if (byId) return byId;
    return fetchByTitle(title, year, type);
  }

  /**
   * Extract a clean ratings summary from an OMDB response
   * @param {object} data  Raw OMDB response
   * @returns {{ imdb: string|null, rt: string|null, meta: string|null, awards: string|null, boxOffice: string|null, imdbUrl: string|null }}
   */
  function extractRatings(data) {
    if (!data)
      return {
        imdb: null,
        rt: null,
        meta: null,
        awards: null,
        boxOffice: null,
        imdbUrl: null,
      };

    const ratings = data.Ratings || [];
    const findSource = (src) => {
      const r = ratings.find((r) => r.Source === src);
      return r ? r.Value : null;
    };

    return {
      imdb:
        findSource("Internet Movie Database") ||
        (data.imdbRating && data.imdbRating !== "N/A"
          ? data.imdbRating + "/10"
          : null),
      rt: findSource("Rotten Tomatoes"),
      meta: findSource("Metacritic"),
      awards: data.Awards && data.Awards !== "N/A" ? data.Awards : null,
      boxOffice:
        data.BoxOffice && data.BoxOffice !== "N/A" ? data.BoxOffice : null,
      imdbUrl: data.imdbID
        ? "https://www.imdb.com/title/" + data.imdbID + "/"
        : null,
    };
  }

  return {
    loadConfig,
    getApiKey,
    setApiKey,
    hasApiKey,
    fetchByImdbId,
    fetchByTitle,
    lookup,
    extractRatings,
  };
})();
