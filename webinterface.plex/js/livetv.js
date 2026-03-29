/**
 * Plex-style Kodi Web Interface — Live TV, Channels, EPG
 */
(function (app) {
  "use strict";

  const { $, dom, kodi, escapeHtml, escapeAttr, showToast } = app;

  let liveTvChannels = [];
  let liveTvGroups = [];
  let liveTvBound = false;

  async function loadLiveTV() {
    if (!app.state.connected) return;

    dom.channelsList.innerHTML = "";
    dom.liveTvNow.innerHTML = "";
    dom.liveTvNowSection.classList.add("hidden");
    dom.epgPanel.classList.add("hidden");

    // Check PVR availability
    try {
      const pvrProps = await kodi.getPVRProperties();
      if (!pvrProps.available) {
        dom.channelsList.innerHTML = `
          <div class="error-message">
            <svg viewBox="0 0 24 24" width="48" height="48"><path fill="#E5A00D" d="M21 6h-7.59l3.29-3.29L16 2l-4 4-4-4-.71.71L10.59 6H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 14H3V8h18v12z"/></svg>
            <h2>PVR Not Available</h2>
            <p>Make sure TVHeadend is running and the pvr.hts client addon<br>is installed and enabled in Kodi.</p>
          </div>
        `;
        dom.pvrStatus.textContent = "Unavailable";
        dom.pvrStatus.className = "pvr-status pvr-offline";
        return;
      }
      dom.pvrStatus.textContent = pvrProps.recording ? "Recording" : "Ready";
      dom.pvrStatus.className = pvrProps.recording
        ? "pvr-status pvr-recording"
        : "pvr-status pvr-online";
    } catch {
      dom.channelsList.innerHTML = `
        <div class="error-message">
          <h2>PVR Not Configured</h2>
          <p>No PVR backend found. Install the TVHeadend addon from<br>Settings → Add-ons → Install from repository → PVR clients.</p>
        </div>
      `;
      dom.pvrStatus.textContent = "Unavailable";
      dom.pvrStatus.className = "pvr-status pvr-offline";
      return;
    }

    // Load channel groups
    try {
      const groupResult = await kodi.getChannelGroups("tv");
      liveTvGroups = groupResult.channelgroups || [];
      populateGroupSelect(liveTvGroups);
    } catch {
      liveTvGroups = [];
    }

    await loadChannels();

    if (!liveTvBound) {
      liveTvBound = true;
      dom.channelGroupSelect.addEventListener("change", () => {
        loadChannels();
      });

      dom.epgClose.addEventListener("click", () => {
        dom.epgPanel.classList.add("hidden");
        document.body.classList.remove("scroll-locked");
      });
    }
  }

  function populateGroupSelect(groups) {
    dom.channelGroupSelect.innerHTML =
      '<option value="all">All Channels</option>';
    groups.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g.channelgroupid;
      opt.textContent = g.label;
      dom.channelGroupSelect.appendChild(opt);
    });
  }

  async function loadChannels() {
    dom.channelsList.innerHTML =
      '<div class="loading-spinner"><div class="spinner"></div></div>';

    const selectedGroup = dom.channelGroupSelect.value;

    try {
      let channels = [];

      if (selectedGroup === "all" && liveTvGroups.length > 0) {
        const result = await kodi.getChannels(liveTvGroups[0].channelgroupid);
        channels = result.channels || [];
      } else if (selectedGroup !== "all") {
        const result = await kodi.getChannels(parseInt(selectedGroup, 10));
        channels = result.channels || [];
      } else {
        dom.channelsList.innerHTML =
          '<p class="empty-message">No channel groups found</p>';
        return;
      }

      liveTvChannels = channels.filter((ch) => !ch.hidden);
      renderChannels(liveTvChannels);
      renderNowPlaying(liveTvChannels);
    } catch (err) {
      console.error("Failed to load channels:", err);
      dom.channelsList.innerHTML =
        '<p class="empty-message">Failed to load channels</p>';
    }
  }

  function renderChannels(channels) {
    dom.channelsList.innerHTML = "";

    if (channels.length === 0) {
      dom.channelsList.innerHTML =
        '<p class="empty-message">No channels available</p>';
      return;
    }

    channels.forEach((ch) => {
      const logo = ch.thumbnail ? kodi.getImageUrl(ch.thumbnail) : "";
      const now = ch.broadcastnow || {};
      const next = ch.broadcastnext || {};
      const nowTitle = now.title || "No data";
      const nextTitle = next.title || "";

      let progress = 0;
      if (now.starttime && now.endtime) {
        const start = new Date(now.starttime).getTime();
        const end = new Date(now.endtime).getTime();
        const current = Date.now();
        if (end > start) {
          progress = Math.min(
            100,
            Math.max(0, ((current - start) / (end - start)) * 100),
          );
        }
      }

      const nowTime = now.starttime ? formatBroadcastTime(now.starttime) : "";
      const endTime = now.endtime ? formatBroadcastTime(now.endtime) : "";

      const row = document.createElement("div");
      row.className = "channel-row";
      if (ch.isrecording) row.classList.add("channel-recording");

      row.innerHTML = `
        <div class="channel-number">${escapeHtml(String(ch.channelid))}</div>
        <div class="channel-logo">
          ${logo ? `<img src="${escapeAttr(logo)}" alt="${escapeAttr(ch.label)}" loading="lazy">` : `<div class="channel-logo-placeholder">${escapeHtml(ch.label.substring(0, 2))}</div>`}
        </div>
        <div class="channel-info">
          <div class="channel-name">
            ${escapeHtml(ch.label)}
            ${ch.isrecording ? '<span class="rec-badge">● REC</span>' : ""}
          </div>
          <div class="channel-now">
            <span class="channel-now-title">${escapeHtml(nowTitle)}</span>
            ${nowTime ? `<span class="channel-now-time">${nowTime} - ${endTime}</span>` : ""}
          </div>
          <div class="channel-progress-bar">
            <div class="channel-progress-fill" style="width:${progress}%"></div>
          </div>
          ${nextTitle ? `<div class="channel-next">Next: ${escapeHtml(nextTitle)}</div>` : ""}
        </div>
        <div class="channel-actions">
          <button class="btn-channel-play" data-channelid="${ch.channelid}" title="Watch">
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>
          </button>
          <button class="btn-channel-epg" data-channelid="${ch.channelid}" data-label="${escapeAttr(ch.label)}" data-logo="${escapeAttr(logo)}" title="TV Guide">
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/></svg>
          </button>
        </div>
      `;

      row.querySelector(".btn-channel-play").addEventListener("click", (e) => {
        e.stopPropagation();
        const channelId = parseInt(e.currentTarget.dataset.channelid, 10);
        kodi.playChannel(channelId);
        showToast(`Tuning to ${ch.label}...`);
      });

      row.querySelector(".btn-channel-epg").addEventListener("click", (e) => {
        e.stopPropagation();
        const btn = e.currentTarget;
        openEPG(
          parseInt(btn.dataset.channelid, 10),
          btn.dataset.label,
          btn.dataset.logo,
        );
      });

      row.addEventListener("click", () => {
        kodi.playChannel(ch.channelid);
        showToast(`Tuning to ${ch.label}...`);
      });

      dom.channelsList.appendChild(row);
    });
  }

  function renderNowPlaying(channels) {
    const withNow = channels.filter(
      (ch) => ch.broadcastnow && ch.broadcastnow.title,
    );
    if (withNow.length === 0) {
      dom.liveTvNowSection.classList.add("hidden");
      return;
    }

    dom.liveTvNowSection.classList.remove("hidden");
    dom.liveTvNow.innerHTML = "";

    withNow.slice(0, 20).forEach((ch) => {
      const logo = ch.thumbnail ? kodi.getImageUrl(ch.thumbnail) : "";
      const now = ch.broadcastnow;

      const card = document.createElement("div");
      card.className = "livetv-now-card";
      card.innerHTML = `
        <div class="livetv-now-logo">
          ${logo ? `<img src="${escapeAttr(logo)}" alt="">` : `<span>${escapeHtml(ch.label.substring(0, 3))}</span>`}
        </div>
        <div class="livetv-now-info">
          <div class="livetv-now-channel">${escapeHtml(ch.label)}</div>
          <div class="livetv-now-title">${escapeHtml(now.title)}</div>
        </div>
      `;

      card.addEventListener("click", () => {
        kodi.playChannel(ch.channelid);
        showToast(`Tuning to ${ch.label}...`);
      });

      dom.liveTvNow.appendChild(card);
    });
  }

  async function openEPG(channelId, label, logo) {
    dom.epgPanel.classList.remove("hidden");
    document.body.classList.add("scroll-locked");
    dom.epgChannelName.textContent = label;
    dom.epgChannelLogo.src = logo || "";
    dom.epgChannelLogo.style.display = logo ? "block" : "none";
    dom.epgSchedule.innerHTML =
      '<div class="loading-spinner"><div class="spinner"></div></div>';

    try {
      const result = await kodi.getBroadcasts(channelId, {
        start: 0,
        end: 50,
      });
      const broadcasts = result.broadcasts || [];

      if (broadcasts.length === 0) {
        dom.epgSchedule.innerHTML =
          '<p class="empty-message">No EPG data available</p>';
        return;
      }

      dom.epgSchedule.innerHTML = broadcasts
        .map((b) => {
          const startTime = formatBroadcastTime(b.starttime);
          const endTime = formatBroadcastTime(b.endtime);
          const genres = Array.isArray(b.genre) ? b.genre.join(", ") : "";
          const runtime = b.runtime ? `${b.runtime} min` : "";
          const isNow = b.isactive;

          return `
          <div class="epg-item ${isNow ? "epg-item-active" : ""} ${b.wasactive ? "epg-item-past" : ""}">
            <div class="epg-time">
              <span class="epg-start">${startTime}</span>
              <span class="epg-end">${endTime}</span>
            </div>
            <div class="epg-details">
              <div class="epg-title">
                ${escapeHtml(b.title)}
                ${isNow ? '<span class="live-badge">LIVE</span>' : ""}
                ${b.hastimer ? '<span class="timer-badge">⏺ Timer</span>' : ""}
              </div>
              ${runtime || genres ? `<div class="epg-meta">${runtime}${runtime && genres ? " · " : ""}${escapeHtml(genres)}</div>` : ""}
              ${b.plot ? `<div class="epg-plot">${escapeHtml(b.plot)}</div>` : ""}
            </div>
          </div>
        `;
        })
        .join("");
    } catch (err) {
      console.error("Failed to load EPG:", err);
      dom.epgSchedule.innerHTML =
        '<p class="error-text">Failed to load programme guide</p>';
    }
  }

  function formatBroadcastTime(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.loadLiveTV = loadLiveTV;
})(window.KodiApp);
