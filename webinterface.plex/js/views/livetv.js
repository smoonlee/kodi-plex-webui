/**
 * Live TV view — channel groups, channel list, EPG guide.
 */
import { $, state } from "../state.js";
import { escapeHtml } from "../helpers.js";

// ── Module state ───────────────────────────────────────────────────────

export let currentChannelGroup = null;
export let _channelGroups = null;

// ── Load Live TV ───────────────────────────────────────────────────────

export async function loadLiveTV() {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await Kodi.getChannelGroups("tv");
    if (gen !== state.navGeneration) return;

    if (!data.channelgroups || !data.channelgroups.length) {
      content.innerHTML =
        '<h1 class="page-title">Live TV</h1>' +
        '<div class="empty-state"><div class="empty-icon">📡</div>' +
        "<p>No Live TV channel groups found.</p>" +
        "<p>Set up a PVR backend in Kodi to use Live TV.</p></div>";
      return;
    }

    _channelGroups = data.channelgroups;
    if (!currentChannelGroup) {
      currentChannelGroup = data.channelgroups[0].channelgroupid;
    }
    await showChannelGroup(currentChannelGroup);
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML =
      '<h1 class="page-title">Live TV</h1>' +
      `<div class="empty-state"><div class="empty-icon">📡</div>` +
      `<p>Could not load Live TV.</p>` +
      `<p class="error-detail">${escapeHtml(err.message)}</p></div>`;
  }
}

// ── Channel Group ──────────────────────────────────────────────────────

export async function showChannelGroup(groupid) {
  const gen = state.navGeneration;
  currentChannelGroup = groupid;
  const content = $("#content");
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await Kodi.getChannels(groupid);
    if (gen !== state.navGeneration) return;

    let html = '<div class="livetv-header"><h1 class="page-title">Live TV</h1>';

    if (_channelGroups && _channelGroups.length > 1) {
      html +=
        '<select id="channel-group-select" class="group-select" aria-label="Channel group">';
      for (const g of _channelGroups) {
        html += `<option value="${g.channelgroupid}"${g.channelgroupid === groupid ? " selected" : ""}>${escapeHtml(g.label)}</option>`;
      }
      html += "</select>";
    }
    html += "</div>";

    if (!data.channels || !data.channels.length) {
      html +=
        '<div class="empty-state"><p>No channels found in this group.</p></div>';
      content.innerHTML = html;
      return;
    }

    html += '<div class="channel-list">';
    for (const ch of data.channels) {
      if (ch.hidden) continue;
      const now = ch.broadcastnow;
      const next = ch.broadcastnext;
      const nowTitle = now ? now.title : "";
      const nowProgress = now ? Math.round(now.progresspercentage || 0) : 0;
      const nowStart =
        now && now.starttime
          ? new Date(now.starttime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      const nowEnd =
        now && now.endtime
          ? new Date(now.endtime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      const nowTimeStr = nowStart && nowEnd ? `${nowStart} – ${nowEnd}` : "";
      const nextTitle = next ? next.title : "";
      const nextStart =
        next && next.starttime
          ? new Date(next.starttime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      const nextEnd =
        next && next.endtime
          ? new Date(next.endtime).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
      const nextTimeStr =
        nextStart && nextEnd ? `${nextStart} – ${nextEnd}` : "";
      const icon = ch.icon || ch.thumbnail || "";
      const nowBroadcastId = now ? now.broadcastid : 0;
      const nowHasTimer = now ? now.hastimer : false;

      html += `
        <div class="channel-row" tabindex="0" role="button" data-action="tune-channel" data-id="${ch.channelid}" aria-label="${escapeHtml(ch.label)}">
          <div class="channel-icon">${icon ? `<img src="${Kodi.imageUrl(icon)}" alt="" loading="lazy">` : '<span class="channel-icon-placeholder">📺</span>'}</div>
          <div class="channel-number">${ch.channelnumber || ""}</div>
          <div class="channel-name">${escapeHtml(ch.label)}</div>
          <div class="channel-now">
            ${nowTitle ? `<div class="channel-now-title">${escapeHtml(nowTitle)}</div>` : '<div class="channel-now-title channel-off-air">No programme data</div>'}
            ${nowTimeStr ? `<div class="channel-now-time">${nowTimeStr}</div>` : ""}
            ${nowProgress > 0 ? `<div class="progress-bar channel-progress"><div class="progress-fill" style="width:${nowProgress}%"></div></div>` : ""}
          </div>
          <div class="channel-next">${nextTitle ? `Next: ${escapeHtml(nextTitle)}${nextTimeStr ? ` <span class="channel-next-time">(${nextTimeStr})</span>` : ""}` : ""}</div>
          ${ch.isrecording ? '<div class="channel-rec">🔴 REC</div>' : ""}
          ${nowBroadcastId && !ch.isrecording ? (nowHasTimer ? `<button class="btn-rec btn-rec--sm btn-rec--active" data-action="cancel-timer" data-id="${nowBroadcastId}" title="Cancel recording" aria-label="Cancel recording">🔴</button>` : `<button class="btn-rec btn-rec--sm" data-action="record-broadcast" data-id="${nowBroadcastId}" title="Record current show" aria-label="Record current show">⏺</button>`) : ""}
          <button class="btn btn-sm channel-guide-btn" data-action="show-channel-guide" data-id="${ch.channelid}" title="Programme guide" aria-label="Show guide for ${escapeHtml(ch.label)}">Guide</button>
        </div>`;
    }
    html += "</div>";

    content.innerHTML = html;

    const select = $("#channel-group-select");
    if (select) {
      select.addEventListener("change", () => {
        showChannelGroup(Number(select.value));
      });
    }
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error loading channels: ${escapeHtml(err.message)}</p></div>`;
  }
}

// ── Channel Guide (EPG) ────────────────────────────────────────────────

export async function showChannelGuide(channelid) {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const [chData, epgData] = await Promise.all([
      Kodi.getChannelDetails(channelid),
      Kodi.getBroadcasts(channelid, { start: 0, end: 50 }),
    ]);
    if (gen !== state.navGeneration) return;

    const ch = chData.channeldetails;

    let html = `
      <div class="detail-actions detail-back">
        <button class="btn btn-secondary" data-action="back-livetv">← Back to Channels</button>
        <button class="btn btn-primary" data-action="tune-channel" data-id="${ch.channelid}">▶ Watch ${escapeHtml(ch.label)}</button>
      </div>
      <h1 class="page-title">${escapeHtml(ch.label)} — Programme Guide</h1>`;

    if (epgData.broadcasts && epgData.broadcasts.length) {
      html += '<div class="epg-list">';
      for (const b of epgData.broadcasts) {
        const start = b.starttime ? new Date(b.starttime) : null;
        const end = b.endtime ? new Date(b.endtime) : null;
        const timeStr = start
          ? start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";
        const endStr = end
          ? end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : "";
        const genres = (b.genre || []).join(", ");
        const isNow = b.isactive;

        html += `
          <div class="epg-row${isNow ? " epg-row-active" : ""}">
            <div class="epg-time">${timeStr}${endStr ? " – " + endStr : ""}</div>
            <div class="epg-info">
              <div class="epg-title">${escapeHtml(b.title || "Untitled")}${isNow ? ' <span class="epg-live-badge">LIVE</span>' : ""}</div>
              ${b.episodename ? `<div class="epg-episode">${escapeHtml(b.episodename)}</div>` : ""}
              ${genres ? `<div class="epg-genre">${escapeHtml(genres)}</div>` : ""}
              ${b.plot ? `<div class="epg-plot">${escapeHtml(b.plot)}</div>` : ""}
            </div>
            ${isNow && b.progresspercentage ? `<div class="epg-progress"><div class="progress-bar"><div class="progress-fill" style="width:${Math.round(b.progresspercentage)}%"></div></div></div>` : ""}
            <div class="epg-actions">
              ${b.hastimer ? `<button class="btn-rec btn-rec--active" data-action="cancel-timer" data-id="${b.broadcastid}" title="Cancel recording" aria-label="Cancel recording for ${escapeHtml(b.title || "")}">🔴 REC</button>` : `<button class="btn-rec" data-action="record-broadcast" data-id="${b.broadcastid}" title="Record this show" aria-label="Record ${escapeHtml(b.title || "")}">⏺ Record</button>`}
            </div>
          </div>`;
      }
      html += "</div>";
    } else {
      html +=
        '<div class="empty-state"><p>No programme guide data available for this channel.</p></div>';
    }

    content.innerHTML = html;

    const activeRow = content.querySelector(".epg-row-active");
    if (activeRow) {
      activeRow.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error loading guide: ${escapeHtml(err.message)}</p></div>`;
  }
}
