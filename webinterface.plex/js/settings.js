/**
 * Plex-style Kodi Web Interface — Settings Panel
 */
(function (app) {
  "use strict";

  const { $, state, dom, kodi, escapeHtml, showToast } = app;

  function bindSettings() {
    loadSavedSettings();

    dom.btnSettings.addEventListener("click", openSettings);
    dom.settingsClose.addEventListener("click", closeSettings);
    dom.settingsOverlay.addEventListener("click", closeSettings);

    // OMDb key — debounced save
    let omdbSaveTimer = null;
    function saveOmdbKey() {
      clearTimeout(omdbSaveTimer);
      const val = dom.settingOmdbKey.value.trim();
      if (val === app.OMDB_API_KEY) return;
      localStorage.setItem("omdbApiKey", val);
      app.OMDB_API_KEY = val;
      // Also persist to addon settings for all browsers
      kodi.setAddonSettingVFS("omdb_api_key", val).catch(() => {});
      showToast(val ? "OMDb API key saved" : "OMDb API key cleared");
      const ratingsContainer = $("#external-ratings");
      if (val && ratingsContainer) {
        const imdbLink = document.querySelector(".rating-link.imdb-rating");
        if (imdbLink) {
          const href = imdbLink.getAttribute("href") || "";
          const m = href.match(/title\/(tt\d+)/);
          if (m) app.fetchExternalRatings(m[1]);
        }
      }
    }
    dom.settingOmdbKey.addEventListener("input", () => {
      clearTimeout(omdbSaveTimer);
      omdbSaveTimer = setTimeout(saveOmdbKey, 800);
    });
    dom.settingOmdbKey.addEventListener("change", saveOmdbKey);
    dom.toggleOmdbKey.addEventListener("click", () => {
      const inp = dom.settingOmdbKey;
      inp.type = inp.type === "password" ? "text" : "password";
    });

    // Accent colour swatches
    document.querySelectorAll(".color-swatch").forEach((btn) => {
      btn.addEventListener("click", () => {
        const color = btn.dataset.color;
        applyAccentColor(color);
        dom.settingAccentColor.value = color;
        document
          .querySelectorAll(".color-swatch")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });
    dom.settingAccentColor.addEventListener("input", (e) => {
      applyAccentColor(e.target.value);
      document
        .querySelectorAll(".color-swatch")
        .forEach((b) => b.classList.remove("active"));
    });

    // Cards per row
    dom.settingCardsPerRow.addEventListener("change", () => {
      const val = dom.settingCardsPerRow.value;
      localStorage.setItem("cardsMinWidth", val);
      document.documentElement.style.setProperty("--card-width", val + "px");
      showToast("Home row size updated");
    });

    // Language
    if (dom.settingLanguage) {
      dom.settingLanguage.value = state.lang;
      dom.settingLanguage.addEventListener("change", () => {
        state.lang = dom.settingLanguage.value;
        localStorage.setItem("lang", state.lang);
        showToast(
          `Language: ${dom.settingLanguage.options[dom.settingLanguage.selectedIndex].text}`,
        );
      });
    }

    // WebSocket toggle
    dom.settingWsEnabled.checked =
      localStorage.getItem("wsEnabled") !== "false";
    dom.settingWsEnabled.addEventListener("change", () => {
      const enabled = dom.settingWsEnabled.checked;
      localStorage.setItem("wsEnabled", enabled ? "true" : "false");
      if (enabled) {
        kodi.connectWebSocket();
        app.bindWebSocketEvents();
      } else {
        kodi.disconnectWebSocket();
        state.wsActive = false;
        app.startPlayerPolling();
      }
      app.updateWsStatusDisplay();
    });

    // Library scan buttons
    dom.btnScanVideo.addEventListener("click", async () => {
      await kodi.request("VideoLibrary.Scan");
      showToast("Video library scan started");
    });
    dom.btnScanAudio.addEventListener("click", async () => {
      await kodi.request("AudioLibrary.Scan");
      showToast("Audio library scan started");
    });

    // Keyboard shortcut to close
    document.addEventListener("keydown", (e) => {
      if (
        e.key === "Escape" &&
        !dom.settingsPanel.classList.contains("hidden")
      ) {
        closeSettings();
      }
    });
  }

  function loadSavedSettings() {
    dom.settingOmdbKey.value = app.OMDB_API_KEY;

    const savedColor = localStorage.getItem("accentColor");
    if (savedColor) {
      applyAccentColor(savedColor);
      dom.settingAccentColor.value = savedColor;
      const match = document.querySelector(
        `.color-swatch[data-color="${savedColor}"]`,
      );
      if (match) {
        document
          .querySelectorAll(".color-swatch")
          .forEach((b) => b.classList.remove("active"));
        match.classList.add("active");
      } else {
        document
          .querySelectorAll(".color-swatch")
          .forEach((b) => b.classList.remove("active"));
      }
    }

    const savedWidth = localStorage.getItem("cardsMinWidth");
    if (savedWidth) {
      dom.settingCardsPerRow.value = savedWidth;
      document.documentElement.style.setProperty(
        "--card-width",
        savedWidth + "px",
      );
    }

    dom.settingWsEnabled.checked =
      localStorage.getItem("wsEnabled") !== "false";

    if (dom.settingLanguage) {
      dom.settingLanguage.value = state.lang;
    }
  }

  function applyAccentColor(color) {
    document.documentElement.style.setProperty("--color-accent", color);
    localStorage.setItem("accentColor", color);
  }

  function openSettings() {
    dom.settingsOverlay.classList.remove("hidden");
    dom.settingsPanel.classList.remove("hidden");
    document.body.classList.add("scroll-locked");
    loadSystemInfo();
    app.updateWsStatusDisplay();
    // Focus the close button so keyboard users land inside the panel
    dom.settingsClose.focus();
    // Trap focus within the settings panel
    dom.settingsPanel.addEventListener("keydown", trapSettingsFocus);
  }

  function closeSettings() {
    dom.settingsOverlay.classList.add("hidden");
    dom.settingsPanel.classList.add("hidden");
    document.body.classList.remove("scroll-locked");
    dom.settingsPanel.removeEventListener("keydown", trapSettingsFocus);
    // Return focus to the settings button
    dom.btnSettings.focus();
  }

  function trapSettingsFocus(e) {
    if (e.key !== "Tab") return;
    const focusable = dom.settingsPanel.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])',
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  async function loadSystemInfo() {
    try {
      const props = await kodi.request("Application.GetProperties", {
        properties: ["version", "name"],
      });
      const v = props.version;
      dom.systemInfo.innerHTML = `${escapeHtml(props.name)} v${v.major}.${v.minor}.${v.revision}`;
    } catch {
      dom.systemInfo.textContent = "Could not retrieve system info";
    }

    try {
      const labels = await kodi.getSystemProperties();
      dom.systemUptime.textContent = labels["System.Uptime"] || "N/A";
    } catch {
      dom.systemUptime.textContent = "N/A";
    }

    try {
      const resp = await fetch("addon.xml?_=" + Date.now());
      const text = await resp.text();
      const match = text.match(/<addon[^>]+version="(\d+\.\d+\.\d+)"/);
      if (match) {
        dom.addonVersion.textContent = "v" + match[1];
      }
    } catch {
      dom.addonVersion.textContent = "";
    }
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindSettings = bindSettings;
  app.openSettings = openSettings;
  app.closeSettings = closeSettings;
})(window.KodiApp);
