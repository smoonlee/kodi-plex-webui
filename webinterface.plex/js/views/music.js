/**
 * Music view — artists, albums, album detail with track list.
 */
import { $, state } from "../state.js";
import { escapeHtml } from "../helpers.js";
import {
  mountIncrementalGrid,
  updateCollectionSummary,
} from "../collections.js";
import {
  getAlbumDetailsCached,
  getAlbumsCached,
  getArtistsCached,
  getSongsCached,
} from "../data.js";
import { isInWatchlist } from "../preferences.js";
import { renderCard, skeletonCards, getPoster, posterImg } from "../ui.js";

let _cleanupArtistGrid = null;

// ── Load Music (Artists) ───────────────────────────────────────────────

export async function loadMusic() {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = skeletonCards();

  try {
    const data = await getArtistsCached();
    if (gen !== state.navGeneration) return;

    let html = '<div class="page-header"><h1 class="page-title">Music</h1>';
    html += `<select id="sort-artists" class="group-select" aria-label="Sort artists">
      <option value="artist-asc">Name A–Z</option>
      <option value="artist-desc">Name Z–A</option>
    </select></div>`;

    if (data.artists && data.artists.length) {
      html +=
        '<div class="collection-toolbar collection-toolbar--compact"><div class="collection-toolbar-meta" id="artist-summary"></div></div>';
      html += '<div class="grid" id="artist-grid">';
      html += "</div>";
    } else {
      html +=
        '<div class="empty-state"><p>No artists found in your library.</p><div class="empty-actions"><button class="btn btn-secondary" data-action="scan-audio">Scan Library</button></div></div>';
    }

    content.innerHTML = html;

    const artistGrid = $("#artist-grid");
    const artistSummary = $("#artist-summary");

    const renderArtists = (artists) => {
      updateCollectionSummary(
        artistSummary,
        artists.length,
        artists.length,
        "artists",
      );
      _cleanupArtistGrid?.();
      _cleanupArtistGrid = mountIncrementalGrid(
        artistGrid,
        artists,
        (artist) =>
          renderCard({
            action: "show-artist",
            id: artist.artistid,
            thumbnail: getPoster(artist),
            title: artist.artist,
            meta: escapeHtml((artist.genre || []).join(", ")),
            variant: "card-round",
          }),
        { batchSize: 24 },
      );
    };

    renderArtists(data.artists || []);

    const sortSelect = $("#sort-artists");
    if (sortSelect) {
      sortSelect.addEventListener("change", async () => {
        const [method, order] = sortSelect.value.split("-");
        const sortGen = state.navGeneration;
        try {
          const sorted = await getArtistsCached({
            method,
            order: order === "asc" ? "ascending" : "descending",
          });
          if (sortGen !== state.navGeneration) return;
          renderArtists(sorted.artists || []);
        } catch {
          /* keep existing grid */
        }
      });
    }
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error loading music: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}

// ── Artist Albums ──────────────────────────────────────────────────────

export async function showArtistAlbums(artistid) {
  const gen = state.navGeneration;
  state.currentArtist = artistid;
  const content = $("#content");
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const data = await getAlbumsCached(artistid);
    if (gen !== state.navGeneration) return;

    let html = `
      <div class="detail-actions detail-back">
        <button class="btn btn-secondary" data-action="back-music">← Back to Artists</button>
      </div>
      <h1 class="page-title">Albums</h1>`;

    if (data.albums && data.albums.length) {
      html += '<div class="grid">';
      for (const a of data.albums) {
        html += renderCard({
          action: "show-album",
          id: a.albumid,
          thumbnail: getPoster(a),
          title: a.title,
          meta: a.year || "",
          mediaType: "album",
          watchlisted: isInWatchlist("album", a.albumid),
        });
      }
      html += "</div>";
    }

    content.innerHTML = html;
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}

// ── Album Detail ───────────────────────────────────────────────────────

export async function showAlbumDetail(albumid) {
  const gen = state.navGeneration;
  const content = $("#content");
  content.innerHTML = '<div class="loading-spinner"></div>';

  try {
    const [albumData, songData] = await Promise.all([
      getAlbumDetailsCached(albumid),
      getSongsCached(albumid),
    ]);
    if (gen !== state.navGeneration) return;

    const album = albumData.albumdetails;
    const songs = songData.songs || [];

    const watchlisted = isInWatchlist("album", album.albumid);

    let html = `
      <div class="detail-actions detail-back">
        <button class="btn btn-secondary" data-action="back-artist">← Back to Albums</button>
      </div>
      <div class="album-hero">
        <div class="album-hero-art">
          ${posterImg(getPoster(album), album.title)}
        </div>
        <div class="album-hero-copy">
          <h1 class="page-title page-title--compact">${escapeHtml(album.title)}</h1>
          <p class="album-hero-meta">${escapeHtml((album.artist || []).join(", "))}${album.year ? ` · ${album.year}` : ""}</p>
          ${album.description ? `<p class="album-hero-description">${escapeHtml(album.description)}</p>` : ""}
          <div class="detail-actions album-hero-actions">
            <button class="btn btn-primary" data-action="play-album" data-id="${albumid}">▶ Play Album</button>
            <button class="btn btn-secondary watchlist-toggle${watchlisted ? " is-active" : ""}" data-action="toggle-watchlist" data-id="${album.albumid}" data-media-type="album" data-title="${escapeHtml(album.title)}" data-add-label="☆ Save Album" data-remove-label="★ Saved Album">${watchlisted ? "★ Saved Album" : "☆ Save Album"}</button>
          </div>
        </div>
      </div>`;

    if (songs.length) {
      html += '<div class="track-list">';
      for (const s of songs) {
        const dur = s.duration
          ? `${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(2, "0")}`
          : "";
        html += `
          <div class="track-row" tabindex="0" role="button" data-action="play-song" data-id="${s.songid}">
            <div class="track-number">${s.track || ""}</div>
            <div class="track-title">${escapeHtml(s.title)}</div>
            <div class="track-duration">${dur}</div>
            <div class="track-play" aria-hidden="true">▶</div>
          </div>`;
      }
      html += "</div>";
    }

    content.innerHTML = html;
  } catch (err) {
    if (gen !== state.navGeneration) return;
    content.innerHTML = `<div class="empty-state"><p>Error: ${escapeHtml(err.message)}</p><div class="empty-actions"><button class="btn btn-primary" data-action="retry-view">Retry</button></div></div>`;
  }
}
