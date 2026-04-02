/**
 * Cached Kodi data access helpers.
 * Reduces duplicate JSON-RPC calls for list-heavy views and instant search.
 */

const CACHE_TTL = {
  library: 60_000,
  detail: 60_000,
  search: 20_000,
  home: 30_000,
};

const _cache = new Map();
const _inFlight = new Map();

function cacheKey(scope, value) {
  return `${scope}:${value}`;
}

function normaliseSort(sort) {
  if (!sort) return "default";
  return `${sort.method || "title"}:${sort.order || "ascending"}`;
}

async function withCache(key, ttl, fetcher) {
  const now = Date.now();
  const cached = _cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (_inFlight.has(key)) {
    return _inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      _cache.set(key, {
        value,
        expiresAt: now + ttl,
      });
      _inFlight.delete(key);
      return value;
    })
    .catch((error) => {
      _inFlight.delete(key);
      throw error;
    });

  _inFlight.set(key, promise);
  return promise;
}

export function invalidateDataCache(scopePrefix = "") {
  [..._cache.keys()].forEach((key) => {
    if (!scopePrefix || key.startsWith(scopePrefix)) {
      _cache.delete(key);
    }
  });
}

export function getMoviesCached(sort) {
  return withCache(
    cacheKey("movies", normaliseSort(sort)),
    CACHE_TTL.library,
    () => Kodi.getMovies(sort),
  );
}

export function getMovieDetailsCached(movieid) {
  return withCache(cacheKey("movie-detail", movieid), CACHE_TTL.detail, () =>
    Kodi.getMovieDetails(movieid),
  );
}

export function getTVShowsCached(sort) {
  return withCache(
    cacheKey("tvshows", normaliseSort(sort)),
    CACHE_TTL.library,
    () => Kodi.getTVShows(sort),
  );
}

export function getTVShowDetailsCached(tvshowid) {
  return withCache(cacheKey("tvshow-detail", tvshowid), CACHE_TTL.detail, () =>
    Kodi.getTVShowDetails(tvshowid),
  );
}

export function getSeasonsCached(tvshowid) {
  return withCache(cacheKey("tvshow-seasons", tvshowid), CACHE_TTL.detail, () =>
    Kodi.getSeasons(tvshowid),
  );
}

export function getEpisodesCached(tvshowid, season) {
  return withCache(
    cacheKey("tvshow-episodes", `${tvshowid}:${season ?? "all"}`),
    CACHE_TTL.detail,
    () => Kodi.getEpisodes(tvshowid, season),
  );
}

export function getArtistsCached(sort) {
  return withCache(
    cacheKey("artists", normaliseSort(sort)),
    CACHE_TTL.library,
    () => Kodi.getArtists(sort),
  );
}

export function getAlbumsCached(artistid, sort) {
  return withCache(
    cacheKey("albums", `${artistid ?? "all"}:${normaliseSort(sort)}`),
    CACHE_TTL.library,
    () => Kodi.getAlbums(artistid, sort),
  );
}

export function getAlbumDetailsCached(albumid) {
  return withCache(cacheKey("album-detail", albumid), CACHE_TTL.detail, () =>
    Kodi.getAlbumDetails(albumid),
  );
}

export function getSongsCached(albumid) {
  return withCache(cacheKey("album-songs", albumid), CACHE_TTL.detail, () =>
    Kodi.getSongs(albumid),
  );
}

export function getRecentMoviesCached(limits) {
  return withCache(
    cacheKey("recent-movies", JSON.stringify(limits || {})),
    CACHE_TTL.home,
    () => Kodi.getRecentMovies(limits),
  );
}

export function getRecentEpisodesCached(limits) {
  return withCache(
    cacheKey("recent-episodes", JSON.stringify(limits || {})),
    CACHE_TTL.home,
    () => Kodi.getRecentEpisodes(limits),
  );
}

export function getRecentAlbumsCached(limits) {
  return withCache(
    cacheKey("recent-albums", JSON.stringify(limits || {})),
    CACHE_TTL.home,
    () => Kodi.getRecentAlbums(limits),
  );
}

export function getInProgressMoviesCached(limits) {
  return withCache(
    cacheKey("progress-movies", JSON.stringify(limits || {})),
    CACHE_TTL.home,
    () => Kodi.getInProgressMovies(limits),
  );
}

export function getInProgressEpisodesCached(limits) {
  return withCache(
    cacheKey("progress-episodes", JSON.stringify(limits || {})),
    CACHE_TTL.home,
    () => Kodi.getInProgressEpisodes(limits),
  );
}

export function searchAllCached(query, channelGroupId) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLowerCase();
  return withCache(
    cacheKey("search", `${normalizedQuery}:${channelGroupId || 0}`),
    CACHE_TTL.search,
    async () => {
      const [movies, shows, artists, channelData] = await Promise.all([
        Kodi.searchMovies(query).catch(() => ({})),
        Kodi.searchTVShows(query).catch(() => ({})),
        Kodi.searchArtists(query).catch(() => ({})),
        (channelGroupId
          ? Kodi.getChannels(channelGroupId)
          : Kodi.getChannelGroups("tv").then((groups) =>
              groups.channelgroups && groups.channelgroups.length
                ? Kodi.getChannels(groups.channelgroups[0].channelgroupid)
                : {},
            )
        ).catch(() => ({})),
      ]);

      return { movies, shows, artists, channelData };
    },
  );
}
