/**
 * Settings flyout — system info, library stats, OMDB key, shortcuts link.
 */
import { $ } from "../state.js";
import { escapeHtml, toast } from "../helpers.js";
import {
  clearRecentSearches,
  getRecentSearches,
  getTheme,
  getWatchlist,
  setTheme,
  THEMES,
} from "../preferences.js";

let _settingsReturnFocus = null;

// ── Settings flyout ────────────────────────────────────────────────────

export function openSettings(showKeyboardShortcutsFn) {
  // Close mobile nav dropdown if open
  const nav = $("#topbar-nav");
  if (nav) nav.classList.remove("open");
  _settingsReturnFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  $("#settings-flyout").classList.add("open");
  $("#settings-overlay").classList.add("active");
  requestAnimationFrame(() => {
    $("#settings-close")?.focus({ preventScroll: true });
  });
  populateSettings(showKeyboardShortcutsFn);
}

export function closeSettings() {
  $("#settings-flyout").classList.remove("open");
  $("#settings-overlay").classList.remove("active");
  if (_settingsReturnFocus && document.contains(_settingsReturnFocus)) {
    requestAnimationFrame(() => {
      _settingsReturnFocus.focus({ preventScroll: true });
    });
  }
}

async function populateSettings(showKeyboardShortcutsFn) {
  const body = $("#settings-flyout-body");
  body.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const info = await Kodi.getSystemProperties();

    let html = `
        <div class="settings-section">
          <h2>System Info</h2>
          <table class="settings-table">
            <tr><td>Name</td><td>${escapeHtml(info["System.FriendlyName"] || "N/A")}</td></tr>
            <tr><td>Version</td><td>${escapeHtml(info["System.BuildVersion"] || "N/A")}</td></tr>
            <tr><td>Uptime</td><td>${escapeHtml(info["System.Uptime"] || "N/A")}</td></tr>
            <tr><td>Free Space</td><td>${escapeHtml(info["System.FreeSpace"] || "N/A")}</td></tr>
          </table>
        </div>
        <div class="settings-section">
          <h2>Appearance</h2>
          <div class="settings-row">
            <select id="theme-select" class="settings-input" aria-label="Theme selection">
              ${THEMES.map((theme) => `<option value="${theme.id}"${theme.id === getTheme() ? " selected" : ""}>${escapeHtml(theme.label)}</option>`).join("")}
            </select>
            <span class="settings-status" id="theme-status"></span>
          </div>
        </div>
        <div class="settings-section">
          <h2>Library Statistics</h2>
          <div class="stats-grid" id="settings-stats"><div class="loading-spinner"></div></div>
        </div>
        <div class="settings-section">
          <h2>Personalisation</h2>
          <table class="settings-table">
            <tr><td>Watchlist items</td><td>${getWatchlist().length}</td></tr>
            <tr><td>Recent searches</td><td>${getRecentSearches().length}</td></tr>
          </table>
          <div class="settings-actions">
            <button class="btn btn-secondary" id="settings-clear-searches">Clear recent searches</button>
          </div>
        </div>
        <div class="settings-section">
          <h2>OMDB / IMDb Integration</h2>
          <p class="settings-desc">Enter your free <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noopener noreferrer">OMDB API key</a> to show IMDb, Rotten Tomatoes, and Metacritic ratings on movie and TV show detail pages.</p>
          <p class="settings-desc">To share the key across all devices, edit <code>config.json</code> in the addon folder and set <code>"omdbApiKey"</code>. Browser-saved keys override the shared config.</p>
          <div class="settings-row">
            <input type="text" id="omdb-key-input" placeholder="e.g. a1b2c3d4" autocomplete="off"
                   value="${escapeHtml(OMDB.getApiKey())}" class="settings-input" />
            <button class="btn btn-secondary" id="omdb-key-save">Save</button>
            <span id="omdb-key-status" class="settings-status"></span>
          </div>
        </div>
        <div class="settings-section">
          <h2>Library</h2>
          <div class="settings-actions">
            <button class="btn btn-secondary" data-action="scan-video">Scan Video Library</button>
            <button class="btn btn-secondary" data-action="scan-audio">Scan Audio Library</button>
          </div>
        </div>
        <div class="settings-section">
          <h2>Keyboard Shortcuts</h2>
          <div class="settings-actions">
            <button class="btn btn-secondary" id="settings-show-shortcuts">View Shortcuts</button>
          </div>
        </div>
        <div class="settings-section">
          <h2>About</h2>
          <p>Kodi Plex Web UI v1.14.1 — A modern, Plex-inspired web interface for Kodi.</p>
        </div>`;

    body.innerHTML = html;

    // Fetch library stats asynchronously
    (async () => {
      try {
        const [moviesData, showsData, artistsData, albumsData] =
          await Promise.all([
            Kodi.getMovies(
              { method: "title", order: "ascending" },
              { start: 0, end: 0 },
            ).catch(() => ({ limits: { total: 0 } })),
            Kodi.getTVShows(
              { method: "title", order: "ascending" },
              { start: 0, end: 0 },
            ).catch(() => ({ limits: { total: 0 } })),
            Kodi.getArtists(
              { method: "artist", order: "ascending" },
              { start: 0, end: 0 },
            ).catch(() => ({ limits: { total: 0 } })),
            Kodi.getAlbums(
              undefined,
              { method: "title", order: "ascending" },
              { start: 0, end: 0 },
            ).catch(() => ({ limits: { total: 0 } })),
          ]);
        const statsEl = $("#settings-stats");
        if (statsEl) {
          statsEl.innerHTML =
            `<div class="stat-card"><div class="stat-value">${(moviesData.limits || {}).total || 0}</div><div class="stat-label">Movies</div></div>` +
            `<div class="stat-card"><div class="stat-value">${(showsData.limits || {}).total || 0}</div><div class="stat-label">TV Shows</div></div>` +
            `<div class="stat-card"><div class="stat-value">${(artistsData.limits || {}).total || 0}</div><div class="stat-label">Artists</div></div>` +
            `<div class="stat-card"><div class="stat-value">${(albumsData.limits || {}).total || 0}</div><div class="stat-label">Albums</div></div>`;
        }
      } catch {
        /* stats are supplementary */
      }
    })();

    // Wire up shortcuts button
    const shortcutsBtn = $("#settings-show-shortcuts");
    if (shortcutsBtn && showKeyboardShortcutsFn) {
      shortcutsBtn.addEventListener("click", () => {
        closeSettings();
        showKeyboardShortcutsFn();
      });
    }

    const themeSelect = $("#theme-select");
    const themeStatus = $("#theme-status");
    themeSelect?.addEventListener("change", () => {
      const applied = setTheme(themeSelect.value);
      themeStatus.textContent = `Applied ${THEMES.find((theme) => theme.id === applied)?.label || "theme"}`;
      themeStatus.className = "settings-status is-success";
      setTimeout(() => {
        themeStatus.textContent = "";
        themeStatus.className = "settings-status";
      }, 2000);
    });

    const clearSearchBtn = $("#settings-clear-searches");
    clearSearchBtn?.addEventListener("click", () => {
      clearRecentSearches();
      toast("Recent searches cleared");
      clearSearchBtn.disabled = true;
      clearSearchBtn.textContent = "Cleared";
    });

    // Wire up OMDB key save
    $("#omdb-key-save").addEventListener("click", () => {
      const input = $("#omdb-key-input");
      const status = $("#omdb-key-status");
      const key = input.value.trim();
      OMDB.setApiKey(key);
      if (key) {
        status.textContent = "✓ Saved";
        status.className = "settings-status is-success";
        toast("OMDB API key saved");
      } else {
        status.textContent = "Cleared";
        status.className = "settings-status is-muted";
        toast("OMDB API key removed");
      }
      setTimeout(() => {
        status.textContent = "";
        status.className = "settings-status";
      }, 2000);
    });
  } catch (err) {
    body.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p></div>`;
  }
}
