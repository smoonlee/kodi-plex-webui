/**
 * Event delegation, keyboard shortcuts, and random pick modal.
 */
import { $, $$, state } from "./state.js";
import { closeModal, escapeHtml, openModal, toast } from "./helpers.js";
import { navigate } from "./router.js";
import { updateNowPlaying } from "./player.js";
import { invalidateDataCache } from "./data.js";
import { clearRecentSearches, toggleWatchlist } from "./preferences.js";
import { moveTVFocus } from "./tv-navigation.js";
import { showMovieDetail, _movieCache } from "./views/movies.js";
import { showTVShowSeasons, showSeasonEpisodes } from "./views/tvshows.js";
import { showArtistAlbums, showAlbumDetail } from "./views/music.js";
import {
  showChannelGuide,
  showChannelGroup,
  currentChannelGroup,
} from "./views/livetv.js";
import { cycleFeaturedHero, jumpFeaturedHero, loadHome } from "./views/home.js";
import { loadSearchResults } from "./views/search.js";
import { loadWatchlist } from "./views/watchlist.js";
import { closeSettings } from "./views/settings.js";

function isTextEntryTarget(target) {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.tagName === "TEXTAREA" || target.tagName === "SELECT") return true;
  if (target.tagName !== "INPUT") return false;

  return !["button", "checkbox", "radio", "range", "submit"].includes(
    (target.type || "text").toLowerCase(),
  );
}

function seekBy(offset) {
  if (state.activePlayerId == null) return;
  Kodi.getPlayerProperties(state.activePlayerId).then((props) => {
    const pct = Math.max(0, Math.min(100, (props.percentage || 0) + offset));
    Kodi.seek(state.activePlayerId, pct);
  });
}

function needsManualActivation(el) {
  if (!(el instanceof HTMLElement) || !el.dataset?.action) return false;
  if (el.tagName === "BUTTON" || el.tagName === "INPUT") return false;
  if (el.tagName === "A" && el.hasAttribute("href")) return false;
  return true;
}

function closeTransientUi() {
  const openModals = $$(".modal-overlay").filter((modal) => !modal.hidden);
  if (openModals.length) {
    openModals.forEach((modal) => closeModal(modal));
    return true;
  }

  if ($("#settings-flyout")?.classList.contains("open")) {
    closeSettings();
    return true;
  }

  if ($("#now-playing")?.classList.contains("np-expanded")) {
    $("#now-playing").classList.remove("np-expanded");
    return true;
  }

  return false;
}

// ── Event Delegation ───────────────────────────────────────────────────

export function handleAction(action, el) {
  const id = Number(el.dataset.id);
  switch (action) {
    case "play-movie":
      Kodi.openMovieId(id)
        .then(() => {
          toast("Playing movie");
          setTimeout(updateNowPlaying, 1000);
        })
        .catch(() => toast("Failed to play movie"));
      break;
    case "show-movie":
      showMovieDetail(id);
      break;
    case "play-episode":
      Kodi.openEpisodeId(id)
        .then(() => {
          toast("Playing episode");
          setTimeout(updateNowPlaying, 1000);
        })
        .catch(() => toast("Failed to play episode"));
      break;
    case "show-tvshow":
      showTVShowSeasons(id);
      break;
    case "show-season":
      showSeasonEpisodes(Number(el.dataset.tvshow), Number(el.dataset.season));
      break;
    case "show-artist":
      showArtistAlbums(id);
      break;
    case "play-album":
      Kodi.openAlbumId(id)
        .then(() => {
          toast("Playing album");
          setTimeout(updateNowPlaying, 1000);
        })
        .catch(() => toast("Failed to play album"));
      break;
    case "play-song":
      Kodi.openSongId(id)
        .then(() => setTimeout(updateNowPlaying, 1000))
        .catch(() => toast("Failed to play song"));
      break;
    case "back":
      navigate("movies");
      break;
    case "back-tvshows":
      navigate("tvshows");
      break;
    case "back-seasons":
      showTVShowSeasons(Number(el.dataset.tvshow));
      break;
    case "back-music":
      navigate("music");
      break;
    case "tune-channel":
      Kodi.openChannelId(id)
        .then(() => {
          toast("Tuning to channel");
          setTimeout(updateNowPlaying, 1000);
        })
        .catch(() => toast("Failed to tune channel"));
      break;
    case "show-channel-guide":
      showChannelGuide(id);
      break;
    case "record-broadcast":
      Kodi.addTimer(id)
        .then(() => {
          toast("Recording scheduled");
          const isSm = el.classList.contains("btn-rec--sm");
          el.className = isSm
            ? "btn-rec btn-rec--sm btn-rec--active"
            : "btn-rec btn-rec--active";
          el.dataset.action = "cancel-timer";
          el.title = "Cancel recording";
          el.innerHTML = isSm ? "🔴" : "🔴 REC";
        })
        .catch(() => toast("Failed to schedule recording"));
      break;
    case "cancel-timer": {
      const wasSm = el.classList.contains("btn-rec--sm");
      Kodi.toggleTimer(id)
        .then(() => {
          toast("Recording cancelled");
          el.className = wasSm ? "btn-rec btn-rec--sm" : "btn-rec";
          el.dataset.action = "record-broadcast";
          el.title = "Record this show";
          el.innerHTML = wasSm ? "⏺" : "⏺ Record";
        })
        .catch(() => toast("Failed to cancel recording"));
      break;
    }
    case "back-livetv":
      if (currentChannelGroup) {
        showChannelGroup(currentChannelGroup);
      } else {
        navigate("livetv");
      }
      break;
    case "scan-video":
      Kodi.scanVideoLibrary()
        .then(() => {
          invalidateDataCache();
          toast("Video library scan started");
        })
        .catch(() => toast("Failed to start scan"));
      break;
    case "scan-audio":
      Kodi.scanAudioLibrary()
        .then(() => {
          invalidateDataCache();
          toast("Audio library scan started");
        })
        .catch(() => toast("Failed to start scan"));
      break;
    case "np-playpause":
      if (state.activePlayerId != null) {
        Kodi.playPause(state.activePlayerId)
          .then(updateNowPlaying)
          .then(() => {
            if (state.currentView === "home") loadHome();
          });
      }
      break;
    case "np-stop":
      if (state.activePlayerId != null) {
        Kodi.stop(state.activePlayerId)
          .then(updateNowPlaying)
          .then(() => {
            if (state.currentView === "home") loadHome();
          });
      }
      break;
    case "imdb-person": {
      const name = el.dataset.name;
      if (name) {
        window.open(
          `https://www.imdb.com/find/?q=${encodeURIComponent(name)}&s=nm`,
          "_blank",
          "noopener,noreferrer",
        );
      }
      break;
    }
    case "show-album":
      showAlbumDetail(id);
      break;
    case "back-artist":
      if (state.currentArtist) {
        showArtistAlbums(state.currentArtist);
      } else {
        navigate("music");
      }
      break;
    case "play-movie-beginning":
      Kodi.openMovieId(id)
        .then(() => {
          toast("Playing from beginning");
          setTimeout(updateNowPlaying, 1000);
        })
        .catch(() => toast("Failed to play movie"));
      break;
    case "random-movie":
      showRandomPick();
      break;
    case "toggle-watchlist": {
      const mediaType = el.dataset.mediaType;
      const title = el.dataset.title || "Item";
      const addLabel = el.dataset.addLabel || "☆";
      const removeLabel = el.dataset.removeLabel || "★";
      if (!mediaType || !id) break;

      const added = toggleWatchlist({ type: mediaType, id });
      el.classList.toggle("is-active", added);
      el.textContent = added ? removeLabel : addLabel;
      el.setAttribute("aria-pressed", added ? "true" : "false");
      el.setAttribute(
        "aria-label",
        added ? "Remove from watchlist" : "Add to watchlist",
      );

      toast(
        added
          ? `${title} added to watchlist`
          : `${title} removed from watchlist`,
        undefined,
        added ? "View" : undefined,
        added ? () => navigate("watchlist") : undefined,
      );

      if (state.currentView === "watchlist") {
        loadWatchlist();
      }
      break;
    }
    case "retry-view": {
      const hash = window.location.hash.replace("#", "") || "home";
      navigate(hash, { _popstate: true });
      break;
    }
    case "goto-movies":
      navigate("movies");
      break;
    case "goto-tvshows":
      navigate("tvshows");
      break;
    case "goto-music":
      navigate("music");
      break;
    case "goto-watchlist":
      navigate("watchlist");
      break;
    case "run-recent-search": {
      const query = (el.dataset.query || "").trim();
      const input = $("#topbar-search-input");
      const clear = $("#topbar-search-clear");
      if (!query || !input) break;
      input.value = query;
      if (clear) clear.hidden = false;
      if (state.currentView === "search") {
        loadSearchResults();
      } else {
        navigate("search");
      }
      break;
    }
    case "clear-recent-searches":
      clearRecentSearches();
      if (state.currentView === "search") {
        loadSearchResults();
      }
      toast("Recent searches cleared");
      break;
    case "np-expand":
      $("#now-playing").classList.toggle("np-expanded");
      break;
    case "featured-hero-prev":
      cycleFeaturedHero(-1);
      break;
    case "featured-hero-next":
      cycleFeaturedHero(1);
      break;
    case "featured-hero-jump":
      jumpFeaturedHero(Number(el.dataset.featuredIndex));
      break;
  }
}

// ── Keyboard Shortcuts Modal ───────────────────────────────────────────

export function showKeyboardShortcuts() {
  openModal("#shortcuts-modal");
}

// ── Random Pick ────────────────────────────────────────────────────────

export function showRandomPick() {
  const body = $("#random-pick-body");
  const modal = $("#random-pick-modal");
  if (!body || !modal) return;

  const pool = _movieCache.length
    ? _movieCache.filter((m) => m.playcount === 0)
    : [];
  if (!pool.length) {
    body.innerHTML =
      '<p class="empty-inline-hint">No unwatched movies found. Load the Movies page first.</p>';
    openModal(modal);
    return;
  }

  const m = pool[Math.floor(Math.random() * pool.length)];
  const poster =
    m.art && m.art["poster"]
      ? `/image/${encodeURIComponent(m.art["poster"])}`
      : "";
  const year = m.year || "";
  const rating = m.rating ? m.rating.toFixed(1) : "";

  body.innerHTML = `
    <div class="random-pick-card">
      ${poster ? `<img src="${poster}" alt="" class="random-pick-poster">` : `<div class="poster-placeholder">${escapeHtml((m.label || "?")[0])}</div>`}
      <div class="random-pick-info">
        <h3 class="random-pick-title">${escapeHtml(m.label)}</h3>
        <div class="random-pick-meta">
          ${year ? `<p>${year}</p>` : ""}
          ${rating ? `<p>⭐ ${rating}</p>` : ""}
          ${m.genre ? `<p>${escapeHtml(m.genre.join(", "))}</p>` : ""}
        </div>
        <div class="random-pick-actions">
          <button class="btn btn-primary" data-action="play-movie" data-id="${m.movieid}">▶ Play</button>
          <button class="btn btn-secondary" data-action="show-movie" data-id="${m.movieid}">Details</button>
          <button class="btn btn-secondary" data-action="random-movie">🎲 Another</button>
        </div>
      </div>
    </div>`;
  openModal(modal);
}

// ── Keyboard Shortcuts ─────────────────────────────────────────────────

export function handleKeyboard(e) {
  if (isTextEntryTarget(e.target)) return;

  const activeEl =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;

  switch (e.key) {
    case " ": // Space — play/pause
      if (needsManualActivation(activeEl)) {
        e.preventDefault();
        handleAction(activeEl.dataset.action, activeEl);
        break;
      }

      e.preventDefault();
      if (state.activePlayerId != null) {
        Kodi.playPause(state.activePlayerId).then(updateNowPlaying);
      }
      break;
    case "/": // / — focus search bar
      e.preventDefault();
      {
        const searchInput = $("#topbar-search-input");
        if (searchInput) searchInput.focus();
      }
      break;
    case "m": // M — toggle mute
    case "M":
      if (state.activePlayerId != null) {
        Kodi.toggleMute().then(updateNowPlaying);
      }
      break;
    case "ArrowLeft":
      e.preventDefault();
      if (e.shiftKey) {
        seekBy(-5);
        break;
      }
      if (!moveTVFocus("left") && state.activePlayerId != null) {
        seekBy(-5);
      }
      break;
    case "ArrowRight":
      e.preventDefault();
      if (e.shiftKey) {
        seekBy(5);
        break;
      }
      if (!moveTVFocus("right") && state.activePlayerId != null) {
        seekBy(5);
      }
      break;
    case "ArrowUp":
      if (moveTVFocus("up")) {
        e.preventDefault();
      }
      break;
    case "ArrowDown":
      if (moveTVFocus("down")) {
        e.preventDefault();
      }
      break;
    case "Enter": // Enter — activate focused card
      if (needsManualActivation(activeEl)) {
        e.preventDefault();
        handleAction(activeEl.dataset.action, activeEl);
      }
      break;
    case "?": // ? — show keyboard shortcuts
      showKeyboardShortcuts();
      break;
    case "Escape": // Escape — close open modals
      if (closeTransientUi()) {
        e.preventDefault();
      }
      break;
    case "Backspace":
    case "BrowserBack":
    case "GoBack":
      e.preventDefault();
      if (closeTransientUi()) break;
      if ((window.location.hash || "#home") !== "#home") {
        history.back();
      }
      break;
  }
}
