/**
 * Kodi Plex Web UI — Entry Point (ES Module)
 * Thin bootstrap: imports all modules, registers routes, wires up DOM events.
 */
import { $, $$, state } from "./state.js";
import { closeModal, escapeHtml, hideConnectionBanner } from "./helpers.js";
import { navigate, registerView, registerDetail } from "./router.js";
import { updateNowPlaying, startPolling, stopPolling } from "./player.js";
import { applyTheme } from "./preferences.js";
import { initTVNavigation } from "./tv-navigation.js";
import {
  handleAction,
  handleKeyboard,
  showKeyboardShortcuts,
} from "./actions.js";
import { loadHome } from "./views/home.js";
import { loadWatchlist } from "./views/watchlist.js";
import { loadMovies, showMovieDetail } from "./views/movies.js";
import {
  loadTVShows,
  showTVShowSeasons,
  showSeasonEpisodes,
} from "./views/tvshows.js";
import { loadMusic, showArtistAlbums, showAlbumDetail } from "./views/music.js";
import { loadLiveTV } from "./views/livetv.js";
import { loadSearchResults, initTopbarSearch } from "./views/search.js";
import { openSettings, closeSettings } from "./views/settings.js";

// ── Route registration ─────────────────────────────────────────────────

registerView("home", loadHome);
registerView("watchlist", loadWatchlist);
registerView("movies", loadMovies);
registerView("tvshows", loadTVShows);
registerView("music", loadMusic);
registerView("livetv", loadLiveTV);
registerView("search", loadSearchResults);

registerDetail("movie", (params) => showMovieDetail(Number(params[0])));
registerDetail("tvshow", (params) =>
  params[1]
    ? showSeasonEpisodes(Number(params[0]), Number(params[1]))
    : showTVShowSeasons(Number(params[0])),
);
registerDetail("artist", (params) => showArtistAlbums(Number(params[0])));
registerDetail("album", (params) => showAlbumDetail(Number(params[0])));

// ── Init ───────────────────────────────────────────────────────────────

function init() {
  applyTheme();
  initTVNavigation();

  // Top bar navigation
  $$(".topbar-nav a").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigate(a.dataset.view);
    });
  });

  // Mobile hamburger toggle
  const hamburger = $("#hamburger");
  const topbarNav = $("#topbar-nav");

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      const isOpen = topbarNav.classList.toggle("open");
      hamburger.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (topbarNav && !e.target.closest("#topbar")) {
      topbarNav.classList.remove("open");
      hamburger?.setAttribute("aria-expanded", "false");
    }
  });

  // Topbar search
  initTopbarSearch();

  // Settings flyout
  $("#btn-settings").addEventListener("click", () =>
    openSettings(showKeyboardShortcuts),
  );
  $("#settings-close").addEventListener("click", closeSettings);
  $("#settings-overlay").addEventListener("click", closeSettings);

  // Close settings flyout on Escape
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      $("#settings-flyout").classList.contains("open")
    ) {
      closeSettings();
    }
  });

  // Delegate actions from settings flyout
  $("#settings-flyout-body").addEventListener("click", (e) => {
    const el = e.target.closest("[data-action]");
    if (el) handleAction(el.dataset.action, el);
  });

  // Content click delegation
  $("#content").addEventListener("click", (e) => {
    const card = e.target.closest("[data-action]");
    if (card) handleAction(card.dataset.action, card);
  });

  // Delegated image error handler (replaces unsafe inline onerror)
  $("#content").addEventListener(
    "error",
    (e) => {
      if (e.target.tagName === "IMG" && e.target.dataset.fallback) {
        const letter = escapeHtml(e.target.dataset.fallback);
        e.target.outerHTML = `<div class="poster-placeholder">${letter}</div>`;
      }
    },
    true,
  );

  // Transport controls
  $("#btn-prev").addEventListener("click", () => {
    if (state.activePlayerId != null) Kodi.goPrevious(state.activePlayerId);
  });
  $("#btn-playpause").addEventListener("click", () => {
    if (state.activePlayerId != null)
      Kodi.playPause(state.activePlayerId).then(updateNowPlaying);
  });
  $("#btn-next").addEventListener("click", () => {
    if (state.activePlayerId != null) Kodi.goNext(state.activePlayerId);
  });
  $("#btn-stop").addEventListener("click", () => {
    if (state.activePlayerId != null)
      Kodi.stop(state.activePlayerId).then(updateNowPlaying);
  });

  // Seek bar
  $("#np-progress").addEventListener("change", (e) => {
    if (state.activePlayerId != null)
      Kodi.seek(state.activePlayerId, Number(e.target.value));
  });

  // Volume — throttled
  let _volTimeout = null;
  $("#np-volume").addEventListener("input", (e) => {
    clearTimeout(_volTimeout);
    _volTimeout = setTimeout(() => Kodi.setVolume(Number(e.target.value)), 100);
  });
  $("#btn-mute").addEventListener("click", () => {
    Kodi.toggleMute().then(updateNowPlaying);
  });

  // Keyboard shortcuts
  document.addEventListener("keydown", handleKeyboard);

  // Connection banner retry
  const connRetry = $("#connection-retry");
  if (connRetry) {
    connRetry.addEventListener("click", () => {
      state._connectionFails = 0;
      hideConnectionBanner();
      updateNowPlaying();
    });
  }

  // Modal close handlers
  const shortcutsModal = $("#shortcuts-modal");
  if (shortcutsModal) {
    shortcutsModal.addEventListener("click", (e) => {
      if (e.target === shortcutsModal || e.target.closest(".modal-close")) {
        closeModal(shortcutsModal);
      }
    });
  }
  const randomModal = $("#random-pick-modal");
  if (randomModal) {
    randomModal.addEventListener("click", (e) => {
      if (e.target === randomModal || e.target.closest(".modal-close")) {
        closeModal(randomModal);
      }
      const actionEl = e.target.closest("[data-action]");
      if (actionEl) handleAction(actionEl.dataset.action, actionEl);
    });
  }

  // Mobile NP tap to expand
  const npThumb = $("#np-thumb");
  if (npThumb) {
    npThumb.addEventListener("click", () => {
      if (window.innerWidth <= 640) {
        $("#now-playing").classList.toggle("np-expanded");
      }
    });
  }

  // Browser back/forward support
  window.addEventListener("popstate", () => {
    const hash = window.location.hash.replace("#", "") || "home";
    navigate(hash, { _popstate: true });
  });

  // Visibility-aware polling
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopPolling();
    } else {
      startPolling();
    }
  });

  // Start polling & load initial view
  startPolling();
  const hashView = window.location.hash.replace("#", "") || "home";
  navigate(hashView, { _popstate: true });
}

document.addEventListener("DOMContentLoaded", init);

// ── Service Worker registration ────────────────────────────────────────

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch(() => {});
}
