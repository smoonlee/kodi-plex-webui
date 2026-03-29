/**
 * Plex-style Kodi Web Interface — Shared State, Config, i18n, DOM refs, Utilities
 */
window.KodiApp = (function () {
  "use strict";

  // ─── Configuration ────────────────────────────────────────────────────
  let OMDB_API_KEY = localStorage.getItem("omdbApiKey") || "";

  // ─── State ───────────────────────────────────────────────────────────
  const state = {
    connected: false,
    currentView: "home",
    activePlayerId: null,
    playerPollInterval: null,
    wsActive: false,
    movies: [],
    tvshows: [],
    searchTimeout: null,
    photosPath: "",
    photoFiles: [],
    lightboxIndex: 0,
    lang: localStorage.getItem("lang") || "en",
  };

  // ─── Internationalization (i18n) ──────────────────────────────────────
  const i18n = {
    en: {
      home: "Home",
      movies: "Movies",
      tvShows: "TV Shows",
      liveTV: "Live TV",
      music: "Music",
      playlists: "Playlists",
      search: "Search...",
      settings: "Settings",
      back: "Back",
      play: "Play",
      playAll: "Play All",
      playing: "Playing",
      genre: "Genre",
      director: "Director",
      studio: "Studio",
      tracks: "Tracks",
      noResults: "No results found",
      loading: "Loading your library...",
      sortTitle: "Title",
      sortYear: "Year",
      sortRating: "Rating",
      sortDateAdded: "Date Added",
      sortArtist: "Artist",
      genres: "Genres",
      tags: "Tags",
      photos: "Photos",
      movieGenres: "Movie Genres",
      tvShowGenres: "TV Show Genres",
      musicGenres: "Music Genres",
      movieTags: "Movie Tags",
      tvShowTags: "TV Show Tags",
      recentMovies: "Recently Added Movies",
      recentTV: "Recently Added TV",
      recentMusic: "Recently Added Music",
      nowPlaying: "Now Playing",
      keyboardShortcuts: "Keyboard Shortcuts",
      language: "Language",
      castAndCrew: "Cast & Crew",
      externalLinks: "External Links",
      premiered: "Premiered",
      searchResults: "Search Results",
      movie: "Movie",
      tvShow: "TV Show",
      episode: "Episode",
      trailer: "Trailer",
      label: "Label",
      style: "Style",
      season: "Season",
      seasons: "seasons",
      episodes: "episodes",
      watched: "watched",
      specials: "Specials",
      upNext: "Up Next",
      shuffle: "Shuffle",
      repeat: "Repeat",
      queueEmpty: "Queue is empty",
      unwatched: "Unwatched",
      all: "All",
      refresh: "Refresh",
    },
    de: {
      home: "Startseite",
      movies: "Filme",
      tvShows: "Serien",
      liveTV: "Live-TV",
      music: "Musik",
      playlists: "Wiedergabelisten",
      search: "Suchen...",
      settings: "Einstellungen",
      back: "Zurück",
      play: "Abspielen",
      playAll: "Alle abspielen",
      playing: "Spielt",
      genre: "Genre",
      director: "Regisseur",
      studio: "Studio",
      tracks: "Titel",
      noResults: "Keine Ergebnisse gefunden",
      loading: "Bibliothek wird geladen...",
      sortTitle: "Titel",
      sortYear: "Jahr",
      sortRating: "Bewertung",
      sortDateAdded: "Hinzugefügt",
      sortArtist: "Künstler",
      genres: "Genres",
      tags: "Tags",
      photos: "Fotos",
      movieGenres: "Film-Genres",
      tvShowGenres: "Serien-Genres",
      musicGenres: "Musik-Genres",
      movieTags: "Film-Tags",
      tvShowTags: "Serien-Tags",
      recentMovies: "Kürzlich hinzugefügte Filme",
      recentTV: "Kürzlich hinzugefügte Serien",
      recentMusic: "Kürzlich hinzugefügte Musik",
      nowPlaying: "Läuft gerade",
      keyboardShortcuts: "Tastenkürzel",
      language: "Sprache",
      castAndCrew: "Besetzung & Crew",
      externalLinks: "Externe Links",
      premiered: "Premiere",
      searchResults: "Suchergebnisse",
      movie: "Film",
      tvShow: "Serie",
      episode: "Folge",
      trailer: "Trailer",
      label: "Label",
      style: "Stil",
      season: "Staffel",
      seasons: "Staffeln",
      episodes: "Folgen",
      watched: "gesehen",
      specials: "Specials",
      upNext: "Als Nächstes",
      shuffle: "Zufällig",
      repeat: "Wiederholen",
      queueEmpty: "Warteschlange ist leer",
      unwatched: "Ungesehen",
      all: "Alle",
      refresh: "Aktualisieren",
    },
    fr: {
      home: "Accueil",
      movies: "Films",
      tvShows: "Séries TV",
      liveTV: "TV en direct",
      music: "Musique",
      playlists: "Listes de lecture",
      search: "Rechercher...",
      settings: "Paramètres",
      back: "Retour",
      play: "Lire",
      playAll: "Tout lire",
      playing: "Lecture",
      genre: "Genre",
      director: "Réalisateur",
      studio: "Studio",
      tracks: "Pistes",
      noResults: "Aucun résultat trouvé",
      loading: "Chargement de votre bibliothèque...",
      sortTitle: "Titre",
      sortYear: "Année",
      sortRating: "Note",
      sortDateAdded: "Date d'ajout",
      sortArtist: "Artiste",
      genres: "Genres",
      tags: "Tags",
      photos: "Photos",
      movieGenres: "Genres de films",
      tvShowGenres: "Genres de séries",
      musicGenres: "Genres musicaux",
      movieTags: "Tags de films",
      tvShowTags: "Tags de séries",
      recentMovies: "Films récemment ajoutés",
      recentTV: "Séries récemment ajoutées",
      recentMusic: "Musique récemment ajoutée",
      nowPlaying: "En cours de lecture",
      keyboardShortcuts: "Raccourcis clavier",
      language: "Langue",
      castAndCrew: "Distribution & Équipe",
      externalLinks: "Liens externes",
      premiered: "Première diffusion",
      searchResults: "Résultats de recherche",
      movie: "Film",
      tvShow: "Série TV",
      episode: "Épisode",
      trailer: "Bande-annonce",
      label: "Label",
      style: "Style",
      season: "Saison",
      seasons: "saisons",
      episodes: "épisodes",
      watched: "vus",
      specials: "Hors-série",
      upNext: "À suivre",
      shuffle: "Aléatoire",
      repeat: "Répéter",
      queueEmpty: "File d'attente vide",
      unwatched: "Non vus",
      all: "Tous",
      refresh: "Actualiser",
    },
    es: {
      home: "Inicio",
      movies: "Películas",
      tvShows: "Series",
      liveTV: "TV en vivo",
      music: "Música",
      playlists: "Listas",
      search: "Buscar...",
      settings: "Ajustes",
      back: "Volver",
      play: "Reproducir",
      playAll: "Reproducir todo",
      playing: "Reproduciendo",
      genre: "Género",
      director: "Director",
      studio: "Estudio",
      tracks: "Pistas",
      noResults: "Sin resultados",
      loading: "Cargando tu biblioteca...",
      sortTitle: "Título",
      sortYear: "Año",
      sortRating: "Puntuación",
      sortDateAdded: "Fecha",
      sortArtist: "Artista",
      genres: "Géneros",
      tags: "Etiquetas",
      photos: "Fotos",
      movieGenres: "Géneros de películas",
      tvShowGenres: "Géneros de series",
      musicGenres: "Géneros musicales",
      movieTags: "Etiquetas de películas",
      tvShowTags: "Etiquetas de series",
      recentMovies: "Películas añadidas recientemente",
      recentTV: "Series añadidas recientemente",
      recentMusic: "Música añadida recientemente",
      nowPlaying: "Reproduciendo ahora",
      keyboardShortcuts: "Atajos de teclado",
      language: "Idioma",
      castAndCrew: "Reparto y Equipo",
      externalLinks: "Enlaces externos",
      premiered: "Estreno",
      searchResults: "Resultados de búsqueda",
      movie: "Película",
      tvShow: "Serie",
      episode: "Episodio",
      trailer: "Tráiler",
      label: "Sello",
      style: "Estilo",
      season: "Temporada",
      seasons: "temporadas",
      episodes: "episodios",
      watched: "vistos",
      specials: "Especiales",
      upNext: "A continuación",
      shuffle: "Aleatorio",
      repeat: "Repetir",
      queueEmpty: "Cola vacía",
      unwatched: "No vistos",
      all: "Todos",
      refresh: "Actualizar",
    },
    nl: {
      home: "Startpagina",
      movies: "Films",
      tvShows: "TV-series",
      liveTV: "Live TV",
      music: "Muziek",
      playlists: "Afspeellijsten",
      search: "Zoeken...",
      settings: "Instellingen",
      back: "Terug",
      play: "Afspelen",
      playAll: "Alles afspelen",
      playing: "Speelt af",
      genre: "Genre",
      director: "Regisseur",
      studio: "Studio",
      tracks: "Nummers",
      noResults: "Geen resultaten gevonden",
      loading: "Bibliotheek laden...",
      sortTitle: "Titel",
      sortYear: "Jaar",
      sortRating: "Beoordeling",
      sortDateAdded: "Toegevoegd",
      sortArtist: "Artiest",
      genres: "Genres",
      tags: "Tags",
      photos: "Foto's",
      movieGenres: "Film genres",
      tvShowGenres: "TV-serie genres",
      musicGenres: "Muziek genres",
      movieTags: "Film tags",
      tvShowTags: "TV-serie tags",
      recentMovies: "Recent toegevoegde films",
      recentTV: "Recent toegevoegde series",
      recentMusic: "Recent toegevoegde muziek",
      nowPlaying: "Nu aan het afspelen",
      keyboardShortcuts: "Sneltoetsen",
      language: "Taal",
      castAndCrew: "Cast & Crew",
      externalLinks: "Externe links",
      premiered: "Première",
      searchResults: "Zoekresultaten",
      movie: "Film",
      tvShow: "TV-serie",
      episode: "Aflevering",
      trailer: "Trailer",
      label: "Label",
      style: "Stijl",
      season: "Seizoen",
      seasons: "seizoenen",
      episodes: "afleveringen",
      watched: "bekeken",
      specials: "Specials",
      upNext: "Hierna",
      shuffle: "Willekeurig",
      repeat: "Herhalen",
      queueEmpty: "Wachtrij is leeg",
      unwatched: "Niet bekeken",
      all: "Alle",
      refresh: "Vernieuwen",
    },
  };

  function t(key) {
    return (i18n[state.lang] && i18n[state.lang][key]) || i18n.en[key] || key;
  }

  // ─── DOM References ──────────────────────────────────────────────────
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const dom = {
    // Views
    views: () => $$(".view"),
    home: $("#view-home"),
    homeLoading: $("#home-loading"),
    homeContent: $("#home-content"),

    // Home hubs
    recentMovies: $("#recent-movies"),
    recentEpisodes: $("#recent-episodes"),
    recentMusic: $("#recent-music"),
    nowPlayingSection: $("#now-playing-section"),
    nowPlayingBar: $("#now-playing-bar"),
    continueWatchingSection: $("#continue-watching-section"),
    continueWatching: $("#continue-watching"),

    // Library grids
    moviesGrid: $("#movies-grid"),
    tvshowsGrid: $("#tvshows-grid"),
    musicGrid: $("#music-grid"),
    moviesEmpty: $("#movies-empty"),
    tvshowsEmpty: $("#tvshows-empty"),
    musicEmpty: $("#music-empty"),
    moviesCount: $("#movies-count"),
    tvshowsCount: $("#tvshows-count"),
    musicCount: $("#music-count"),
    moviesGenreChips: $("#movies-genre-chips"),
    tvshowsGenreChips: $("#tvshows-genre-chips"),
    searchResults: $("#search-results"),
    searchTitle: $("#search-title"),

    // Playlists
    playlistsContainer: $("#playlists-container"),
    btnRefreshPlaylists: $("#btn-refresh-playlists"),

    // Genres / Tags
    genresTitle: $("#genres-title"),
    genreTypeSelect: $("#genre-type-select"),
    genreChips: $("#genre-chips"),
    genreResults: $("#genre-results"),

    // Photos
    photosGrid: $("#photos-grid"),
    btnPhotosBack: $("#btn-photos-back"),
    photoLightbox: $("#photo-lightbox"),
    lightboxImg: $("#lightbox-img"),
    lightboxCaption: $("#lightbox-caption"),
    lightboxClose: $("#lightbox-close"),
    lightboxPrev: $("#lightbox-prev"),
    lightboxNext: $("#lightbox-next"),

    // Live TV
    channelGroupSelect: $("#channel-group-select"),
    channelsList: $("#channels-list"),
    liveTvNowSection: $("#livetv-now-section"),
    liveTvNow: $("#livetv-now"),
    pvrStatus: $("#pvr-status"),
    epgPanel: $("#epg-panel"),
    epgChannelLogo: $("#epg-channel-logo"),
    epgChannelName: $("#epg-channel-name"),
    epgSchedule: $("#epg-schedule"),
    epgClose: $("#epg-close"),

    // Detail
    detailBackdrop: $("#detail-backdrop"),
    detailContent: $("#detail-content"),

    // Nav
    navLinks: () => $$(".nav-link"),
    navLinksContainer: $("#nav-links"),
    btnHamburger: $("#btn-hamburger"),
    searchInput: $("#search-input"),
    connectionStatus: $("#connection-status"),

    // Player
    playerBar: $("#player-bar"),
    playerThumb: $("#player-thumb"),
    playerTitle: $("#player-title"),
    playerSubtitle: $("#player-subtitle"),
    playerTime: $("#player-time"),
    playerDuration: $("#player-duration"),
    progressBar: $("#progress-bar"),
    progressFill: $("#progress-fill"),
    iconPlay: $("#icon-play"),
    iconPause: $("#icon-pause"),
    volumeSlider: $("#volume-slider"),

    // Toast
    toast: $("#toast"),

    // Settings
    btnSettings: $("#btn-settings"),
    settingsOverlay: $("#settings-overlay"),
    settingsPanel: $("#settings-panel"),
    settingsClose: $("#settings-close"),
    settingOmdbKey: $("#setting-omdb-key"),
    toggleOmdbKey: $("#toggle-omdb-key"),
    settingAccentColor: $("#setting-accent-color"),
    settingCardsPerRow: $("#setting-cards-per-row"),
    settingLanguage: $("#setting-language"),
    settingWsEnabled: $("#setting-ws-enabled"),
    wsStatus: $("#ws-status"),
    btnScanVideo: $("#btn-scan-video"),
    btnScanAudio: $("#btn-scan-audio"),
    systemInfo: $("#system-info"),
    systemUptime: $("#system-uptime"),
    addonVersion: $("#addon-version"),
  };

  // ─── Utilities ───────────────────────────────────────────────────────
  function getArtwork(art, type) {
    if (!art) return "";
    const path = art[`${type}`];
    if (!path) return "";
    return kodi.getImageUrl(path);
  }

  function formatTime(t) {
    if (!t) return "0:00";
    const h = t.hours || 0;
    const m = t.minutes || 0;
    const s = t.seconds || 0;
    if (h > 0) {
      return `${h}:${pad(m)}:${pad(s)}`;
    }
    return `${m}:${pad(s)}`;
  }

  function formatRuntime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function normalizeImdbId(id) {
    if (!id) return "";
    if (id.startsWith("tt")) return id;
    const num = id.replace(/\D/g, "");
    if (!num) return "";
    return "tt" + num.padStart(7, "0");
  }

  function extractImdbId(item) {
    if (item.uniqueid && item.uniqueid.imdb) return item.uniqueid.imdb;
    const id = item.imdbnumber;
    if (!id) return "";
    if (typeof id === "string" && id.startsWith("tt")) return id;
    if (!item.uniqueid) return normalizeImdbId(id);
    return "";
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.remove("hidden");
    setTimeout(() => dom.toast.classList.add("hidden"), 3000);
  }

  // ─── Public API ──────────────────────────────────────────────────────
  return {
    $,
    state,
    t,
    dom,
    kodi, // global from kodi-api.js
    get OMDB_API_KEY() {
      return OMDB_API_KEY;
    },
    set OMDB_API_KEY(val) {
      OMDB_API_KEY = val;
    },
    getArtwork,
    formatTime,
    formatRuntime,
    pad,
    normalizeImdbId,
    extractImdbId,
    escapeHtml,
    escapeAttr,
    showToast,
  };
})();
