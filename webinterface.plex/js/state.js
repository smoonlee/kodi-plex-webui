/**
 * Shared application state and configuration.
 * Every module imports from here — no circular dependencies.
 */

export const CONFIG = {
  POLL_INTERVAL: 3000,
  POLL_INTERVAL_IDLE: 10000,
  SEARCH_DEBOUNCE: 400,
  HOME_ITEMS: 12,
  CAST_LIMIT: 12,
  TOAST_DURATION: 3000,
};

export const state = {
  currentView: "home",
  pollingTimer: null,
  currentTVShow: null,
  currentSeason: null,
  currentArtist: null,
  activePlayerId: null,
  navGeneration: 0,
  navController: null,
  _connectionFails: 0,
  _scrollPositions: new Map(),
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
