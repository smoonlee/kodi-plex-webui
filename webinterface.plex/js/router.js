/**
 * Client-side routing with compound route support.
 * Uses a route registry to avoid circular imports with view modules.
 */
import { $, $$, state } from "./state.js";
import { stopPolling, startPolling } from "./player.js";

// ── Valid top-level views ──────────────────────────────────────────────

export const VALID_VIEWS = new Set([
  "home",
  "watchlist",
  "movies",
  "tvshows",
  "music",
  "livetv",
  "search",
]);

// ── Route registry ─────────────────────────────────────────────────────

const _viewHandlers = {};
const _detailHandlers = {};

/** Register a top-level view handler (e.g. "home" → loadHome) */
export function registerView(name, handler) {
  _viewHandlers[name] = handler;
}

/** Register a detail route handler (e.g. "movie" → fn(params)) */
export function registerDetail(name, handler) {
  _detailHandlers[name] = handler;
}

// ── Hash parsing ───────────────────────────────────────────────────────

export function parseHash(hash) {
  const parts = (hash || "").replace(/^#/, "").split("/");
  return { base: parts[0] || "home", params: parts.slice(1) };
}

// ── Navigation ─────────────────────────────────────────────────────────

export function navigate(view, opts) {
  opts = opts || {};
  const content = $("#content");

  // Save scroll position of current view
  if (state.currentView && content) {
    state._scrollPositions.set(state.currentView, content.scrollTop);
  }

  state.navGeneration++;
  if (state.navController) state.navController.abort();
  state.navController = new AbortController();

  // Support compound routes like movie/123, tvshow/123/2, etc.
  const { base, params } = parseHash(view);
  const topView = VALID_VIEWS.has(base)
    ? base
    : base === "movie"
      ? "movies"
      : base === "tvshow"
        ? "tvshows"
        : base === "artist" || base === "album"
          ? "music"
          : base === "channel"
            ? "livetv"
            : "home";
  state.currentView = topView;

  // Update URL hash for browser back/forward support
  if (!opts._popstate) {
    history.pushState({ view }, "", "#" + view);
  }

  $$(".topbar-nav a").forEach((a) =>
    a.classList.toggle("active", a.dataset.view === topView),
  );

  if (!opts.keepDrill && !params.length) {
    state.currentTVShow = null;
    state.currentSeason = null;
    state.currentArtist = null;
  }

  // Close mobile dropdown nav
  $("#topbar-nav").classList.remove("open");

  // Pause polling during navigation
  stopPolling();
  const resume = () => startPolling();

  // Page transition
  if (content) content.classList.add("view-enter");
  const clearTransition = () => {
    if (content) content.classList.remove("view-enter");
  };
  setTimeout(clearTransition, 250);

  // Restore scroll position for top-level views
  const restoreScroll = () => {
    if (content && state._scrollPositions.has(view)) {
      content.scrollTop = state._scrollPositions.get(view);
    } else if (content) {
      content.scrollTop = 0;
    }
  };

  // Handle compound detail routes via registry
  if (params.length && _detailHandlers[base]) {
    const result = _detailHandlers[base](params);
    if (result && result.then) {
      result.then(resume, resume);
    } else {
      resume();
    }
    return;
  }

  // Handle top-level views via registry
  const handler = _viewHandlers[topView];
  if (handler) {
    const result = handler();
    if (result && result.then) {
      result.then(() => {
        restoreScroll();
        resume();
      }, resume);
    } else {
      restoreScroll();
      resume();
    }
  } else {
    // Fallback to home
    const home = _viewHandlers["home"];
    if (home) {
      home().then(() => {
        restoreScroll();
        resume();
      }, resume);
    } else {
      resume();
    }
  }
}
