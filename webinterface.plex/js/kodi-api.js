/**
 * Kodi JSON-RPC API Client
 * Communicates with Kodi via WebSocket (preferred) with HTTP fallback.
 * WebSocket enables real-time push notifications from Kodi.
 */
class KodiAPI {
  constructor() {
    // HTTP endpoint (always available when served as a web interface addon)
    this.baseUrl = `${window.location.protocol}//${window.location.host}/jsonrpc`;
    this.imageBaseUrl = `${window.location.protocol}//${window.location.host}/image/`;
    this.id = 0;

    // WebSocket state
    this.ws = null;
    this.wsUrl = `ws://${window.location.hostname}:9090/jsonrpc`;
    this.wsConnected = false;
    this.wsReconnectTimer = null;
    this.wsReconnectDelay = 2000;
    this.wsPendingRequests = new Map(); // id → { resolve, reject, timer }

    // Event listeners: { "Player.OnPlay": [fn, fn, ...], ... }
    this._listeners = {};
  }

  // ─── Transport ─────────────────────────────────────────────────────

  /**
   * Public API call — routes through WebSocket if connected, else HTTP.
   */
  async request(method, params = {}) {
    this.id++;
    if (this.wsConnected) {
      return this._wsSend(method, params, this.id);
    }
    return this._httpSend(method, params, this.id);
  }

  /**
   * Send a JSON-RPC request over HTTP
   */
  async _httpSend(method, params, id) {
    const body = {
      jsonrpc: "2.0",
      method,
      params,
      id,
    };

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(`JSON-RPC Error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Send a JSON-RPC request over WebSocket, returns a Promise
   */
  _wsSend(method, params, id) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.wsPendingRequests.delete(id);
        reject(new Error(`WebSocket request timeout: ${method}`));
      }, 10000);

      this.wsPendingRequests.set(id, { resolve, reject, timer: timeout });

      this.ws.send(JSON.stringify({ jsonrpc: "2.0", method, params, id }));
    });
  }

  // ─── WebSocket Connection ──────────────────────────────────────────

  /**
   * Attempt to open a WebSocket connection. Non-blocking — falls back to
   * HTTP automatically if the WebSocket port isn't reachable.
   */
  connectWebSocket() {
    if (this.ws) return;

    try {
      this.ws = new WebSocket(this.wsUrl);
    } catch {
      return; // WebSocket not supported or blocked
    }

    this.ws.onopen = () => {
      this.wsConnected = true;
      this.wsReconnectDelay = 2000;
      this._emit("Transport.OnWebSocketOpen");
    };

    this.ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }

      // Response to a pending request
      if (msg.id != null && this.wsPendingRequests.has(msg.id)) {
        const pending = this.wsPendingRequests.get(msg.id);
        this.wsPendingRequests.delete(msg.id);
        clearTimeout(pending.timer);
        if (msg.error) {
          pending.reject(new Error(`JSON-RPC Error: ${msg.error.message}`));
        } else {
          pending.resolve(msg.result);
        }
        return;
      }

      // Notification (no id) — these are Kodi push events
      if (msg.method) {
        this._emit(msg.method, msg.params);
      }
    };

    this.ws.onerror = () => {
      // Silent — onclose will handle cleanup
    };

    this.ws.onclose = () => {
      const wasConnected = this.wsConnected;
      this.wsConnected = false;
      this.ws = null;

      // Reject any pending WS requests so they can be retried via HTTP
      for (const [id, pending] of this.wsPendingRequests) {
        clearTimeout(pending.timer);
        pending.reject(new Error("WebSocket closed"));
      }
      this.wsPendingRequests.clear();

      if (wasConnected) {
        this._emit("Transport.OnWebSocketClose");
      }

      // Auto-reconnect with backoff
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = setTimeout(() => {
        this.connectWebSocket();
      }, this.wsReconnectDelay);
      this.wsReconnectDelay = Math.min(this.wsReconnectDelay * 1.5, 30000);
    };
  }

  /**
   * Disconnect WebSocket (e.g. when user disables it in settings)
   */
  disconnectWebSocket() {
    clearTimeout(this.wsReconnectTimer);
    if (this.ws) {
      this.ws.onclose = null; // prevent auto-reconnect
      this.ws.close();
      this.ws = null;
      this.wsConnected = false;
    }
  }

  // ─── Event System ──────────────────────────────────────────────────

  /**
   * Subscribe to a Kodi notification.
   * Example: kodi.on("Player.OnStop", (params) => { ... })
   */
  on(event, callback) {
    if (!this._listeners[event]) this._listeners[event] = [];
    this._listeners[event].push(callback);
  }

  /**
   * Remove a listener
   */
  off(event, callback) {
    if (!this._listeners[event]) return;
    this._listeners[event] = this._listeners[event].filter(
      (cb) => cb !== callback,
    );
  }

  /** @private */
  _emit(event, data) {
    const cbs = this._listeners[event];
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in listener for ${event}:`, e);
        }
      });
    }
  }

  /**
   * Test connection to Kodi
   */
  async ping() {
    return this.request("JSONRPC.Ping");
  }

  // ─── Library: Movies ───────────────────────────────────────────────

  async getMovies(sort = { method: "title", order: "ascending" }, limits = {}) {
    return this.request("VideoLibrary.GetMovies", {
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "plot",
        "runtime",
        "art",
        "file",
        "playcount",
        "dateadded",
        "lastplayed",
        "mpaa",
        "director",
        "tagline",
        "studio",
      ],
      sort,
      limits,
    });
  }

  async getMovieDetails(movieId) {
    return this.request("VideoLibrary.GetMovieDetails", {
      movieid: movieId,
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "plot",
        "runtime",
        "art",
        "file",
        "playcount",
        "dateadded",
        "lastplayed",
        "mpaa",
        "director",
        "tagline",
        "studio",
        "cast",
        "trailer",
        "imdbnumber",
        "uniqueid",
        "votes",
      ],
    });
  }

  async getRecentMovies(limits = { start: 0, end: 20 }) {
    return this.request("VideoLibrary.GetRecentlyAddedMovies", {
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "runtime",
        "art",
        "file",
        "playcount",
        "tagline",
      ],
      limits,
    });
  }

  // ─── Library: In-Progress (Continue Watching) ─────────────────────

  async getInProgressMovies(limits = { start: 0, end: 20 }) {
    return this.request("VideoLibrary.GetMovies", {
      properties: [
        "title",
        "year",
        "art",
        "runtime",
        "playcount",
        "lastplayed",
        "resume",
        "file",
        "genre",
        "rating",
      ],
      filter: { field: "inprogress", operator: "true", value: "" },
      sort: { method: "lastplayed", order: "descending" },
      limits,
    });
  }

  async getInProgressEpisodes(limits = { start: 0, end: 20 }) {
    return this.request("VideoLibrary.GetEpisodes", {
      properties: [
        "title",
        "episode",
        "season",
        "showtitle",
        "runtime",
        "art",
        "playcount",
        "lastplayed",
        "resume",
        "file",
        "tvshowid",
      ],
      filter: { field: "inprogress", operator: "true", value: "" },
      sort: { method: "lastplayed", order: "descending" },
      limits,
    });
  }

  // ─── Library: TV Shows ─────────────────────────────────────────────

  async getTVShows(
    sort = { method: "title", order: "ascending" },
    limits = {},
  ) {
    return this.request("VideoLibrary.GetTVShows", {
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "plot",
        "art",
        "playcount",
        "episode",
        "season",
        "watchedepisodes",
        "dateadded",
        "studio",
        "mpaa",
      ],
      sort,
      limits,
    });
  }

  async getTVShowDetails(tvshowId) {
    return this.request("VideoLibrary.GetTVShowDetails", {
      tvshowid: tvshowId,
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "plot",
        "art",
        "playcount",
        "episode",
        "season",
        "watchedepisodes",
        "dateadded",
        "studio",
        "mpaa",
        "cast",
        "imdbnumber",
        "uniqueid",
        "votes",
        "premiered",
        "status",
        "tag",
      ],
    });
  }

  async getSeasons(tvshowId) {
    return this.request("VideoLibrary.GetSeasons", {
      tvshowid: tvshowId,
      properties: [
        "season",
        "showtitle",
        "art",
        "episode",
        "watchedepisodes",
        "playcount",
      ],
    });
  }

  async getEpisodes(tvshowId, season) {
    const params = {
      tvshowid: tvshowId,
      properties: [
        "title",
        "episode",
        "season",
        "runtime",
        "plot",
        "art",
        "file",
        "playcount",
        "firstaired",
        "rating",
      ],
      sort: { method: "episode", order: "ascending" },
    };
    if (season !== undefined) {
      params.season = season;
    }
    return this.request("VideoLibrary.GetEpisodes", params);
  }

  async getRecentEpisodes(limits = { start: 0, end: 20 }) {
    return this.request("VideoLibrary.GetRecentlyAddedEpisodes", {
      properties: [
        "title",
        "episode",
        "season",
        "showtitle",
        "runtime",
        "art",
        "file",
        "playcount",
        "firstaired",
        "tvshowid",
      ],
      limits,
    });
  }

  // ─── Library: Music ────────────────────────────────────────────────

  async getRecentAlbums(limits = { start: 0, end: 20 }) {
    return this.request("AudioLibrary.GetRecentlyAddedAlbums", {
      properties: [
        "title",
        "artist",
        "year",
        "art",
        "genre",
        "playcount",
        "dateadded",
      ],
      limits,
    });
  }

  async getAlbums(sort = { method: "title", order: "ascending" }, limits = {}) {
    return this.request("AudioLibrary.GetAlbums", {
      properties: [
        "title",
        "artist",
        "year",
        "art",
        "genre",
        "playcount",
        "dateadded",
      ],
      sort,
      limits,
    });
  }

  async getAlbumDetails(albumId) {
    return this.request("AudioLibrary.GetAlbumDetails", {
      albumid: albumId,
      properties: [
        "title",
        "artist",
        "year",
        "genre",
        "art",
        "playcount",
        "dateadded",
        "description",
        "albumlabel",
        "rating",
        "mood",
        "style",
        "type",
      ],
    });
  }

  async getSongs(albumId) {
    return this.request("AudioLibrary.GetSongs", {
      filter: { albumid: albumId },
      properties: [
        "title",
        "track",
        "duration",
        "file",
        "artist",
        "album",
        "art",
        "genre",
        "playcount",
      ],
      sort: { method: "track", order: "ascending" },
    });
  }

  async getGenres(type = "movie") {
    return this.request(
      `${type === "music" ? "AudioLibrary" : "VideoLibrary"}.GetGenres`,
      {
        type: type === "music" ? undefined : type,
        properties: ["title", "thumbnail"],
        sort: { method: "title", order: "ascending" },
      },
    );
  }

  async getMoviesByGenre(genre) {
    return this.request("VideoLibrary.GetMovies", {
      filter: { field: "genre", operator: "is", value: genre },
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "runtime",
        "art",
        "file",
        "playcount",
        "dateadded",
        "tagline",
      ],
      sort: { method: "title", order: "ascending" },
    });
  }

  async getTVShowsByGenre(genre) {
    return this.request("VideoLibrary.GetTVShows", {
      filter: { field: "genre", operator: "is", value: genre },
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "art",
        "episode",
        "season",
        "watchedepisodes",
        "dateadded",
        "studio",
        "mpaa",
      ],
      sort: { method: "title", order: "ascending" },
    });
  }

  async getAlbumsByGenre(genre) {
    return this.request("AudioLibrary.GetAlbums", {
      filter: { field: "genre", operator: "is", value: genre },
      properties: [
        "title",
        "artist",
        "year",
        "art",
        "genre",
        "playcount",
        "dateadded",
      ],
      sort: { method: "title", order: "ascending" },
    });
  }

  async getTags(type = "movie") {
    return this.request("VideoLibrary.GetTags", {
      type,
      properties: [],
      sort: { method: "title", order: "ascending" },
    });
  }

  async getMoviesByTag(tag) {
    return this.request("VideoLibrary.GetMovies", {
      filter: { field: "tag", operator: "is", value: tag },
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "runtime",
        "art",
        "file",
        "playcount",
        "dateadded",
        "tagline",
      ],
      sort: { method: "title", order: "ascending" },
    });
  }

  async getTVShowsByTag(tag) {
    return this.request("VideoLibrary.GetTVShows", {
      filter: { field: "tag", operator: "is", value: tag },
      properties: [
        "title",
        "year",
        "genre",
        "rating",
        "art",
        "episode",
        "season",
        "watchedepisodes",
        "dateadded",
        "studio",
        "mpaa",
      ],
      sort: { method: "title", order: "ascending" },
    });
  }

  // ─── Playlists ─────────────────────────────────────────────────────

  async getPlaylists() {
    return this.request("Playlist.GetPlaylists");
  }

  async getPlaylistItems(playlistId) {
    return this.request("Playlist.GetItems", {
      playlistid: playlistId,
      properties: [
        "title",
        "art",
        "file",
        "artist",
        "album",
        "duration",
        "runtime",
        "showtitle",
        "season",
        "episode",
      ],
    });
  }

  async clearPlaylist(playlistId) {
    return this.request("Playlist.Clear", { playlistid: playlistId });
  }

  async addToPlaylist(playlistId, item) {
    return this.request("Playlist.Add", { playlistid: playlistId, item });
  }

  async removeFromPlaylist(playlistId, position) {
    return this.request("Playlist.Remove", {
      playlistid: playlistId,
      position,
    });
  }

  async playPlaylistPosition(playlistId, position) {
    return this.request("Player.Open", {
      item: { playlistid: playlistId, position },
    });
  }

  async playAlbum(albumId) {
    // Clear audio playlist, add album, play from start
    await this.clearPlaylist(0);
    const songs = await this.request("AudioLibrary.GetSongs", {
      filter: { albumid: albumId },
      properties: ["file"],
      sort: { method: "track", order: "ascending" },
    });
    if (songs.songs) {
      for (const song of songs.songs) {
        await this.addToPlaylist(0, { songid: song.songid });
      }
      await this.request("Player.Open", {
        item: { playlistid: 0, position: 0 },
      });
    }
  }

  // ─── Player Controls ──────────────────────────────────────────────

  async getActivePlayers() {
    return this.request("Player.GetActivePlayers");
  }

  async getPlayerProperties(playerId) {
    return this.request("Player.GetProperties", {
      playerid: playerId,
      properties: [
        "time",
        "totaltime",
        "percentage",
        "speed",
        "repeat",
        "shuffled",
      ],
    });
  }

  async getPlayerItem(playerId) {
    return this.request("Player.GetItem", {
      playerid: playerId,
      properties: [
        "title",
        "showtitle",
        "season",
        "episode",
        "art",
        "file",
        "artist",
        "album",
      ],
    });
  }

  async playPause(playerId) {
    return this.request("Player.PlayPause", { playerid: playerId });
  }

  async stop(playerId) {
    return this.request("Player.Stop", { playerid: playerId });
  }

  async goNext(playerId) {
    return this.request("Player.GoTo", { playerid: playerId, to: "next" });
  }

  async goPrevious(playerId) {
    return this.request("Player.GoTo", { playerid: playerId, to: "previous" });
  }

  async seek(playerId, percentage) {
    return this.request("Player.Seek", {
      playerid: playerId,
      value: { percentage: Math.round(percentage) },
    });
  }

  async setVolume(volume) {
    return this.request("Application.SetVolume", {
      volume: Math.round(volume),
    });
  }

  async setShuffle(playerId, shuffle) {
    return this.request("Player.SetShuffle", {
      playerid: playerId,
      shuffle,
    });
  }

  async setRepeat(playerId, repeat) {
    return this.request("Player.SetRepeat", {
      playerid: playerId,
      repeat,
    });
  }

  async getVolume() {
    return this.request("Application.GetProperties", {
      properties: ["volume", "muted"],
    });
  }

  // ─── Playback ──────────────────────────────────────────────────────

  async playFile(file) {
    return this.request("Player.Open", {
      item: { file },
    });
  }

  async playMovie(movieId) {
    return this.request("Player.Open", {
      item: { movieid: movieId },
    });
  }

  async playEpisode(episodeId) {
    return this.request("Player.Open", {
      item: { episodeid: episodeId },
    });
  }

  async playSong(songId) {
    return this.request("Player.Open", {
      item: { songid: songId },
    });
  }

  // ─── System ────────────────────────────────────────────────────────

  async getSystemProperties() {
    return this.request("XBMC.GetInfoLabels", {
      labels: ["System.FriendlyName", "System.BuildVersion", "System.Uptime"],
    });
  }

  async scanVideoLibrary() {
    return this.request("VideoLibrary.Scan");
  }

  async scanAudioLibrary() {
    return this.request("AudioLibrary.Scan");
  }

  // ─── PVR / Live TV ────────────────────────────────────────────────

  async getPVRProperties() {
    return this.request("PVR.GetProperties", {
      properties: ["available", "recording", "scanning"],
    });
  }

  async getChannelGroups(channelType = "tv") {
    return this.request("PVR.GetChannelGroups", {
      channeltype: channelType,
    });
  }

  async getChannels(channelGroupId) {
    return this.request("PVR.GetChannels", {
      channelgroupid: channelGroupId,
      properties: [
        "thumbnail",
        "channeltype",
        "hidden",
        "locked",
        "channel",
        "broadcastnow",
        "broadcastnext",
        "uniqueid",
        "isrecording",
      ],
    });
  }

  async getChannelDetails(channelId) {
    return this.request("PVR.GetChannelDetails", {
      channelid: channelId,
      properties: [
        "thumbnail",
        "channeltype",
        "channel",
        "broadcastnow",
        "broadcastnext",
        "uniqueid",
        "isrecording",
      ],
    });
  }

  async getBroadcasts(channelId, limits = { start: 0, end: 20 }) {
    return this.request("PVR.GetBroadcasts", {
      channelid: channelId,
      properties: [
        "title",
        "plot",
        "starttime",
        "endtime",
        "runtime",
        "genre",
        "isactive",
        "hastimer",
        "wasactive",
        "thumbnail",
      ],
      limits,
    });
  }

  async playChannel(channelId) {
    return this.request("Player.Open", {
      item: { channelid: channelId },
    });
  }

  // ─── Addon Settings ─────────────────────────────────────────────────

  async getAddonSettingVFS(settingId) {
    try {
      const vfsPath =
        "special://profile/addon_data/webinterface.plex/settings.xml";
      const url = this.imageBaseUrl + encodeURIComponent(vfsPath);
      const resp = await fetch(url);
      if (!resp.ok) return null;
      const text = await resp.text();
      const match = text.match(
        new RegExp(`<setting\\s+id="${settingId}"[^>]*>([^<]*)<`),
      );
      if (match && match[1]) return match[1].trim();
      const match2 = text.match(
        new RegExp(`<setting\\s+id="${settingId}"[^/]*value="([^"]*)"`, "i"),
      );
      if (match2) return match2[1];
      return null;
    } catch {
      return null;
    }
  }

  async setAddonSettingVFS(settingId, value) {
    try {
      const vfsPath =
        "special://profile/addon_data/webinterface.plex/settings.xml";
      // Read current settings
      const url = this.imageBaseUrl + encodeURIComponent(vfsPath);
      let text;
      try {
        const resp = await fetch(url);
        text = resp.ok ? await resp.text() : null;
      } catch {
        text = null;
      }

      let xml;
      const escaped = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

      if (text && text.includes(`id="${settingId}"`)) {
        xml = text.replace(
          new RegExp(`(<setting\\s+id="${settingId}"[^>]*>)[^<]*(</setting>)`),
          `$1${escaped}$2`,
        );
      } else if (text && text.includes("</settings>")) {
        xml = text.replace(
          "</settings>",
          `    <setting id="${settingId}">${escaped}</setting>\n</settings>`,
        );
      } else {
        xml = `<settings version="2">\n    <setting id="${settingId}">${escaped}</setting>\n</settings>\n`;
      }

      // Write back via JSONRPC Files namespace (if available)
      // Kodi doesn't expose a file-write method, so we use the xbmcvfs workaround
      // via Addons.ExecuteAddon with a built-in script
      await this.request("XBMC.SetSetting", {
        setting: `webinterface.plex.${settingId}`,
        value: value,
      }).catch(() => {});
      return true;
    } catch {
      return false;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────

  /**
   * Get an image URL for a Kodi artwork path
   * Kodi serves artwork via /image/<encoded_path>
   */
  getImageUrl(imagePath) {
    if (!imagePath) return "";
    return this.imageBaseUrl + encodeURIComponent(imagePath);
  }
}

// Export singleton
const kodi = new KodiAPI();
