/**
 * Now-playing bar, transport polling, and player state management.
 */
import { $, CONFIG, state } from "./state.js";
import {
  formatTime,
  episodeLabel,
  hideConnectionBanner,
  showConnectionBanner,
} from "./helpers.js";

// ── Cached DOM refs ────────────────────────────────────────────────────

let _np = null;
function np() {
  if (!_np) {
    _np = {
      bar: $("#now-playing"),
      thumb: $("#np-thumb"),
      title: $("#np-title"),
      subtitle: $("#np-subtitle"),
      timeCurrent: $("#np-time-current"),
      timeTotal: $("#np-time-total"),
      progress: $("#np-progress"),
      playPause: $("#btn-playpause"),
      volume: $("#np-volume"),
      mute: $("#btn-mute"),
    };
  }
  return _np;
}

// ── Now Playing info (used by Home hero) ───────────────────────────────

export async function getNowPlayingInfo() {
  const players = await Kodi.getActivePlayers();
  if (!players || !players.length) return null;

  const pid = players[0].playerid;
  const [itemData, props] = await Promise.all([
    Kodi.getPlayerItem(pid),
    Kodi.getPlayerProperties(pid),
  ]);

  const item = itemData.item;
  let title = item.title || item.label || "Unknown";
  let subtitle = "";
  if (item.showtitle) {
    subtitle = `${item.showtitle} — ${episodeLabel(item.season, item.episode)}`;
  } else if (item.artist && item.artist.length) {
    subtitle = item.artist.join(", ");
    if (item.album) subtitle += ` — ${item.album}`;
  }

  const totalSecs =
    (props.totaltime.hours || 0) * 3600 +
    (props.totaltime.minutes || 0) * 60 +
    (props.totaltime.seconds || 0);
  const elapsedSecs =
    (props.time.hours || 0) * 3600 +
    (props.time.minutes || 0) * 60 +
    (props.time.seconds || 0);
  const now = new Date();
  const startedAt = new Date(now.getTime() - elapsedSecs * 1000);
  const endsAt = new Date(now.getTime() + (totalSecs - elapsedSecs) * 1000);
  const timeFmt = { hour: "2-digit", minute: "2-digit" };
  const { formatRuntime } = await import("./helpers.js");

  // Live TV channel info
  const isLiveTV = item.type === "channel";
  const channelName = isLiveTV ? item.channel || item.label || "" : "";
  const channelId = isLiveTV ? item.channelid || 0 : 0;

  return {
    title,
    subtitle,
    thumbnail: item.thumbnail || null,
    fanart: item.fanart || null,
    year: item.year || 0,
    genres: (item.genre || []).join(", "),
    percentage: props.percentage || 0,
    speed: props.speed,
    currentTime: formatTime(props.time),
    totalTime: formatTime(props.totaltime),
    startTime: totalSecs ? startedAt.toLocaleTimeString([], timeFmt) : "",
    endTime: totalSecs ? endsAt.toLocaleTimeString([], timeFmt) : "",
    timeStr: item.runtime ? formatRuntime(item.runtime) : "",
    playerId: pid,
    isLiveTV,
    channelName,
    channelId,
  };
}

// ── Polling ────────────────────────────────────────────────────────────

let _pollingInFlight = false;

export async function updateNowPlaying() {
  if (_pollingInFlight) return;
  _pollingInFlight = true;
  const els = np();
  try {
    const players = await Kodi.getActivePlayers();
    if (!players || !players.length) {
      els.bar.classList.remove("active");
      state.activePlayerId = null;
      hideConnectionBanner();
      return;
    }

    const pid = players[0].playerid;
    state.activePlayerId = pid;
    hideConnectionBanner();

    const [itemData, props, volData] = await Promise.all([
      Kodi.getPlayerItem(pid),
      Kodi.getPlayerProperties(pid),
      Kodi.getVolume(),
    ]);

    const item = itemData.item;
    els.bar.classList.add("active");

    if (item.thumbnail) {
      els.thumb.innerHTML = `<img src="${Kodi.imageUrl(item.thumbnail)}" alt="">`;
    } else {
      els.thumb.innerHTML = '<div class="np-icon">🎵</div>';
    }

    let title = item.title || item.label || "Unknown";
    let subtitle = "";
    if (item.type === "channel") {
      subtitle = item.channel || item.label || "";
    } else if (item.showtitle) {
      subtitle = `${item.showtitle} — ${episodeLabel(item.season, item.episode)}`;
    } else if (item.artist && item.artist.length) {
      subtitle = item.artist.join(", ");
      if (item.album) subtitle += ` — ${item.album}`;
    }
    els.title.textContent = title;
    els.subtitle.textContent = subtitle;

    els.timeCurrent.textContent = formatTime(props.time);
    els.timeTotal.textContent = formatTime(props.totaltime);
    els.progress.value = props.percentage || 0;

    els.playPause.innerHTML =
      props.speed > 0
        ? '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg class="icon-play" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';

    els.volume.value = volData.volume;
    els.mute.classList.toggle("muted", volData.muted);
  } catch {
    els.bar.classList.remove("active");
    state.activePlayerId = null;
    state._connectionFails++;
    if (state._connectionFails >= 3) showConnectionBanner();
  } finally {
    _pollingInFlight = false;
  }
}

export function startPolling() {
  stopPolling();
  updateNowPlaying().finally(() => {
    const interval = state.activePlayerId
      ? CONFIG.POLL_INTERVAL
      : CONFIG.POLL_INTERVAL_IDLE;
    state.pollingTimer = setInterval(() => {
      updateNowPlaying().then(() => {
        const newInterval = state.activePlayerId
          ? CONFIG.POLL_INTERVAL
          : CONFIG.POLL_INTERVAL_IDLE;
        if (state.pollingTimer && newInterval !== interval) {
          startPolling();
        }
      });
    }, interval);
  });
}

export function stopPolling() {
  if (state.pollingTimer) {
    clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }
}
