/**
 * Kodi JSON-RPC API wrapper
 * Communicates with Kodi over HTTP JSON-RPC
 */
const Kodi = (() => {
  "use strict";

  const JSONRPC_URL = "/jsonrpc";
  const DEFAULT_TIMEOUT = 30000; // 30 seconds
  let _requestId = 0;

  // ── Low-level transport ──────────────────────────────────────────────

  async function sendRequest(method, params = {}, opts = {}) {
    const body = {
      jsonrpc: "2.0",
      id: ++_requestId,
      method,
      params,
    };

    // Combine caller signal + timeout into a single abort signal
    const timeout = opts.timeout != null ? opts.timeout : DEFAULT_TIMEOUT;
    const timeoutCtrl = timeout > 0 ? new AbortController() : null;
    let timer = null;
    let signal = opts.signal || null;

    if (timeoutCtrl && signal) {
      // Combine both signals
      const combined = new AbortController();
      signal.addEventListener("abort", () => combined.abort(), { once: true });
      timeoutCtrl.signal.addEventListener("abort", () => combined.abort(), {
        once: true,
      });
      signal = combined.signal;
    } else if (timeoutCtrl) {
      signal = timeoutCtrl.signal;
    }

    if (timeoutCtrl) {
      timer = setTimeout(() => timeoutCtrl.abort(), timeout);
    }

    const fetchOpts = {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    };
    if (signal) fetchOpts.signal = signal;

    try {
      const resp = await fetch(JSONRPC_URL, fetchOpts);
      if (!resp.ok) {
        throw new Error(`Kodi RPC error ${resp.status}: ${resp.statusText}`);
      }
      const json = await resp.json();
      if (json.error) {
        throw new Error(`Kodi RPC: ${json.error.message} (${json.error.code})`);
      }
      return json.result;
    } catch (err) {
      if (
        err.name === "AbortError" &&
        timeoutCtrl &&
        timeoutCtrl.signal.aborted
      ) {
        throw new Error(`Kodi RPC timeout after ${timeout / 1000}s: ${method}`);
      }
      throw err;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  // ── Image helpers ────────────────────────────────────────────────────

  function imageUrl(kodiPath) {
    if (!kodiPath) return "";
    return `/image/${encodeURIComponent(kodiPath)}`;
  }

  // ── Player ───────────────────────────────────────────────────────────

  async function getActivePlayers() {
    return sendRequest("Player.GetActivePlayers");
  }

  async function getPlayerItem(playerId) {
    return sendRequest("Player.GetItem", {
      playerid: playerId,
      properties: [
        "title",
        "artist",
        "album",
        "year",
        "thumbnail",
        "fanart",
        "showtitle",
        "season",
        "episode",
        "duration",
        "runtime",
        "file",
        "genre",
        "rating",
        "channel",
        "channelid",
      ],
    });
  }

  async function getPlayerProperties(playerId) {
    return sendRequest("Player.GetProperties", {
      playerid: playerId,
      properties: [
        "time",
        "totaltime",
        "percentage",
        "speed",
        "repeat",
        "shuffled",
        "canseek",
      ],
    });
  }

  async function playPause(playerId) {
    return sendRequest("Player.PlayPause", { playerid: playerId });
  }

  async function stop(playerId) {
    return sendRequest("Player.Stop", { playerid: playerId });
  }

  async function goNext(playerId) {
    return sendRequest("Player.GoTo", { playerid: playerId, to: "next" });
  }

  async function goPrevious(playerId) {
    return sendRequest("Player.GoTo", { playerid: playerId, to: "previous" });
  }

  async function seek(playerId, percentage) {
    return sendRequest("Player.Seek", {
      playerid: playerId,
      value: { percentage: Math.round(percentage) },
    });
  }

  async function openFile(file) {
    return sendRequest("Player.Open", { item: { file } });
  }

  async function openMovieId(movieid) {
    return sendRequest("Player.Open", { item: { movieid } });
  }

  async function openEpisodeId(episodeid) {
    return sendRequest("Player.Open", { item: { episodeid } });
  }

  async function openSongId(songid) {
    return sendRequest("Player.Open", { item: { songid } });
  }

  async function openAlbumId(albumid) {
    return sendRequest("Player.Open", { item: { albumid } });
  }

  // ── Application ──────────────────────────────────────────────────────

  async function getVolume() {
    const result = await sendRequest("Application.GetProperties", {
      properties: ["volume", "muted"],
    });
    return result;
  }

  async function setVolume(volume) {
    return sendRequest("Application.SetVolume", { volume: Math.round(volume) });
  }

  async function toggleMute() {
    return sendRequest("Application.SetMute", { mute: "toggle" });
  }

  // ── Library — Movies ─────────────────────────────────────────────────

  async function getMovies(
    sort = { method: "title", order: "ascending" },
    limits = {},
  ) {
    return sendRequest("VideoLibrary.GetMovies", {
      properties: [
        "title",
        "year",
        "rating",
        "thumbnail",
        "fanart",
        "art",
        "genre",
        "runtime",
        "playcount",
        "plot",
        "director",
        "tagline",
        "file",
        "resume",
      ],
      sort,
      limits,
    });
  }

  async function getMovieDetails(movieid) {
    return sendRequest("VideoLibrary.GetMovieDetails", {
      movieid,
      properties: [
        "title",
        "year",
        "rating",
        "thumbnail",
        "fanart",
        "art",
        "genre",
        "runtime",
        "playcount",
        "plot",
        "director",
        "tagline",
        "studio",
        "cast",
        "mpaa",
        "file",
        "trailer",
        "imdbnumber",
        "resume",
        "streamdetails",
      ],
    });
  }

  async function getRecentMovies(limits = { start: 0, end: 20 }) {
    return sendRequest("VideoLibrary.GetRecentlyAddedMovies", {
      properties: [
        "title",
        "year",
        "rating",
        "thumbnail",
        "fanart",
        "art",
        "genre",
        "runtime",
        "playcount",
        "plot",
      ],
      limits,
    });
  }

  async function getInProgressMovies(limits = { start: 0, end: 20 }) {
    return sendRequest("VideoLibrary.GetMovies", {
      properties: [
        "title",
        "year",
        "rating",
        "thumbnail",
        "fanart",
        "art",
        "genre",
        "runtime",
        "playcount",
        "plot",
        "resume",
      ],
      filter: { field: "inprogress", operator: "true", value: "" },
      sort: { method: "lastplayed", order: "descending" },
      limits,
    });
  }

  // ── Library — TV Shows ───────────────────────────────────────────────

  async function getTVShows(
    sort = { method: "title", order: "ascending" },
    limits = {},
  ) {
    return sendRequest("VideoLibrary.GetTVShows", {
      properties: [
        "title",
        "year",
        "rating",
        "thumbnail",
        "fanart",
        "art",
        "genre",
        "episode",
        "watchedepisodes",
        "plot",
      ],
      sort,
      limits,
    });
  }

  async function getTVShowDetails(tvshowid) {
    return sendRequest("VideoLibrary.GetTVShowDetails", {
      tvshowid,
      properties: [
        "title",
        "year",
        "rating",
        "thumbnail",
        "fanart",
        "art",
        "genre",
        "episode",
        "watchedepisodes",
        "plot",
        "studio",
        "cast",
        "mpaa",
        "imdbnumber",
      ],
    });
  }

  async function getSeasons(tvshowid) {
    return sendRequest("VideoLibrary.GetSeasons", {
      tvshowid,
      properties: [
        "season",
        "showtitle",
        "thumbnail",
        "art",
        "episode",
        "watchedepisodes",
      ],
      sort: { method: "season", order: "ascending" },
    });
  }

  async function getEpisodes(tvshowid, season) {
    const params = {
      tvshowid,
      properties: [
        "title",
        "season",
        "episode",
        "thumbnail",
        "art",
        "rating",
        "runtime",
        "playcount",
        "plot",
        "file",
        "firstaired",
      ],
      sort: { method: "episode", order: "ascending" },
    };
    if (season !== undefined) params.season = season;
    return sendRequest("VideoLibrary.GetEpisodes", params);
  }

  async function getRecentEpisodes(limits = { start: 0, end: 20 }) {
    return sendRequest("VideoLibrary.GetRecentlyAddedEpisodes", {
      properties: [
        "title",
        "season",
        "episode",
        "thumbnail",
        "art",
        "showtitle",
        "rating",
        "runtime",
        "playcount",
        "plot",
        "file",
      ],
      limits,
    });
  }

  async function getInProgressEpisodes(limits = { start: 0, end: 20 }) {
    return sendRequest("VideoLibrary.GetEpisodes", {
      properties: [
        "title",
        "season",
        "episode",
        "thumbnail",
        "art",
        "showtitle",
        "rating",
        "runtime",
        "playcount",
        "plot",
        "file",
        "resume",
      ],
      filter: { field: "inprogress", operator: "true", value: "" },
      sort: { method: "lastplayed", order: "descending" },
      limits,
    });
  }

  // ── Library — Music ──────────────────────────────────────────────────

  async function getArtists(
    sort = { method: "artist", order: "ascending" },
    limits = {},
  ) {
    return sendRequest("AudioLibrary.GetArtists", {
      properties: ["thumbnail", "fanart", "genre", "description"],
      sort,
      limits,
    });
  }

  async function getAlbums(
    artistid,
    sort = { method: "year", order: "descending" },
    limits = {},
  ) {
    const params = {
      properties: [
        "title",
        "artist",
        "year",
        "thumbnail",
        "genre",
        "rating",
        "playcount",
      ],
      sort,
      limits,
    };
    if (artistid !== undefined) {
      params.filter = { artistid };
    }
    return sendRequest("AudioLibrary.GetAlbums", params);
  }

  async function getSongs(
    albumid,
    sort = { method: "track", order: "ascending" },
  ) {
    const params = {
      properties: [
        "title",
        "artist",
        "album",
        "track",
        "duration",
        "thumbnail",
        "file",
        "playcount",
        "genre",
      ],
      sort,
    };
    if (albumid !== undefined) {
      params.filter = { albumid };
    }
    return sendRequest("AudioLibrary.GetSongs", params);
  }

  async function getRecentAlbums(limits = { start: 0, end: 20 }) {
    return sendRequest("AudioLibrary.GetRecentlyAddedAlbums", {
      properties: ["title", "artist", "year", "thumbnail", "genre", "rating"],
      limits,
    });
  }

  async function getAlbumDetails(albumid) {
    return sendRequest("AudioLibrary.GetAlbumDetails", {
      albumid,
      properties: [
        "title",
        "artist",
        "year",
        "thumbnail",
        "genre",
        "rating",
        "playcount",
        "description",
        "art",
      ],
    });
  }

  // ── PVR / Live TV ──────────────────────────────────────────────────

  async function getChannelGroups(channeltype = "tv") {
    return sendRequest("PVR.GetChannelGroups", { channeltype });
  }

  async function getChannels(channelgroupid) {
    return sendRequest("PVR.GetChannels", {
      channelgroupid,
      properties: [
        "thumbnail",
        "channeltype",
        "channel",
        "channelnumber",
        "icon",
        "broadcastnow",
        "broadcastnext",
        "isrecording",
        "hidden",
        "locked",
        "uniqueid",
      ],
    });
  }

  async function getChannelDetails(channelid) {
    return sendRequest("PVR.GetChannelDetails", {
      channelid,
      properties: [
        "thumbnail",
        "channeltype",
        "channel",
        "channelnumber",
        "icon",
        "broadcastnow",
        "broadcastnext",
        "isrecording",
      ],
    });
  }

  async function getBroadcasts(channelid, limits = {}) {
    return sendRequest("PVR.GetBroadcasts", {
      channelid,
      properties: [
        "title",
        "plot",
        "starttime",
        "endtime",
        "runtime",
        "progress",
        "progresspercentage",
        "genre",
        "episodename",
        "isactive",
        "hastimer",
      ],
      limits,
    });
  }

  async function openChannelId(channelid) {
    return sendRequest("Player.Open", { item: { channelid } });
  }

  async function addTimer(broadcastid) {
    return sendRequest("PVR.AddTimer", {
      broadcastid,
      timerrule: false,
    });
  }

  async function addTimerRule(broadcastid) {
    return sendRequest("PVR.AddTimer", {
      broadcastid,
      timerrule: true,
    });
  }

  async function deleteTimer(timerid) {
    return sendRequest("PVR.DeleteTimer", { timerid });
  }

  async function toggleTimer(broadcastid, timerrule) {
    return sendRequest("PVR.ToggleTimer", {
      broadcastid,
      timerrule: timerrule || false,
    });
  }

  async function getTimers(limits = {}) {
    return sendRequest("PVR.GetTimers", {
      properties: [
        "title",
        "starttime",
        "endtime",
        "state",
        "channelid",
        "istimerule",
        "istimerrule",
      ],
      limits,
    });
  }

  // ── Library Scan ─────────────────────────────────────────────────────

  async function scanVideoLibrary() {
    return sendRequest("VideoLibrary.Scan");
  }

  async function scanAudioLibrary() {
    return sendRequest("AudioLibrary.Scan");
  }

  // ── Input ────────────────────────────────────────────────────────────

  async function inputBack() {
    return sendRequest("Input.Back");
  }

  async function inputHome() {
    return sendRequest("Input.Home");
  }

  async function inputSelect() {
    return sendRequest("Input.Select");
  }

  const VALID_DIRECTIONS = new Set(["Up", "Down", "Left", "Right"]);
  async function inputDirection(direction) {
    if (!VALID_DIRECTIONS.has(direction)) {
      throw new Error("Invalid direction: " + direction);
    }
    return sendRequest(`Input.${direction}`);
  }

  async function sendText(text, done = true) {
    return sendRequest("Input.SendText", { text, done });
  }

  // ── System ───────────────────────────────────────────────────────────

  async function getSystemProperties() {
    return sendRequest("XBMC.GetInfoLabels", {
      labels: [
        "System.BuildVersion",
        "System.FriendlyName",
        "System.Uptime",
        "System.FreeSpace",
      ],
    });
  }

  async function quit() {
    return sendRequest("Application.Quit");
  }

  // ── Search ───────────────────────────────────────────────────────────

  async function searchMovies(query) {
    return sendRequest("VideoLibrary.GetMovies", {
      properties: [
        "title",
        "year",
        "thumbnail",
        "art",
        "genre",
        "rating",
        "runtime",
        "file",
      ],
      filter: { field: "title", operator: "contains", value: query },
      sort: { method: "title", order: "ascending" },
    });
  }

  async function searchTVShows(query) {
    return sendRequest("VideoLibrary.GetTVShows", {
      properties: [
        "title",
        "year",
        "thumbnail",
        "art",
        "genre",
        "rating",
        "episode",
      ],
      filter: { field: "title", operator: "contains", value: query },
      sort: { method: "title", order: "ascending" },
    });
  }

  async function searchArtists(query) {
    return sendRequest("AudioLibrary.GetArtists", {
      properties: ["thumbnail", "art", "genre"],
      filter: { field: "artist", operator: "contains", value: query },
      sort: { method: "artist", order: "ascending" },
    });
  }

  // ── Public API ───────────────────────────────────────────────────────

  return {
    sendRequest,
    imageUrl,
    // Player
    getActivePlayers,
    getPlayerItem,
    getPlayerProperties,
    playPause,
    stop,
    goNext,
    goPrevious,
    seek,
    openFile,
    openMovieId,
    openEpisodeId,
    openSongId,
    openAlbumId,
    // Application
    getVolume,
    setVolume,
    toggleMute,
    // Movies
    getMovies,
    getMovieDetails,
    getRecentMovies,
    getInProgressMovies,
    // TV Shows
    getTVShows,
    getTVShowDetails,
    getSeasons,
    getEpisodes,
    getRecentEpisodes,
    getInProgressEpisodes,
    // Music
    getArtists,
    getAlbums,
    getSongs,
    getRecentAlbums,
    getAlbumDetails,
    // PVR / Live TV
    getChannelGroups,
    getChannels,
    getChannelDetails,
    getBroadcasts,
    openChannelId,
    addTimer,
    addTimerRule,
    deleteTimer,
    toggleTimer,
    getTimers,
    // Library scan
    scanVideoLibrary,
    scanAudioLibrary,
    // Input
    inputBack,
    inputHome,
    inputSelect,
    inputDirection,
    sendText,
    // System
    getSystemProperties,
    quit,
    // Search
    searchMovies,
    searchTVShows,
    searchArtists,
  };
})();
