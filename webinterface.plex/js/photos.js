/**
 * Plex-style Kodi Web Interface — Photos / Image Library
 */
(function (app) {
  "use strict";

  const { state, dom, kodi, escapeHtml, escapeAttr } = app;

  function bindPhotos() {
    if (dom.btnPhotosBack) {
      dom.btnPhotosBack.addEventListener("click", () => {
        if (state.photosPath) {
          const parts = state.photosPath.replace(/\/$/, "").split("/");
          parts.pop();
          state.photosPath = parts.length > 0 ? parts.join("/") + "/" : "";
          loadPhotos();
        }
      });
    }

    if (dom.lightboxClose) {
      dom.lightboxClose.addEventListener("click", closeLightbox);
    }
    if (dom.lightboxPrev) {
      dom.lightboxPrev.addEventListener("click", () => navigateLightbox(-1));
    }
    if (dom.lightboxNext) {
      dom.lightboxNext.addEventListener("click", () => navigateLightbox(1));
    }
  }

  async function loadPhotos() {
    if (!state.connected) return;
    const grid = dom.photosGrid;
    if (!grid) return;
    grid.innerHTML =
      '<div class="loading-spinner"><div class="spinner"></div></div>';

    const backBtn = dom.btnPhotosBack;
    if (backBtn) {
      backBtn.classList.toggle("hidden", !state.photosPath);
    }

    try {
      const path = state.photosPath || "";
      const result = await kodi.request("Files.GetDirectory", {
        directory: path || "sources://pictures/",
        media: "pictures",
        properties: ["title", "file", "mimetype", "thumbnail", "art"],
        sort: { method: "file", order: "ascending" },
      });

      const files = result.files || [];
      state.photoFiles = [];
      grid.innerHTML = "";

      if (files.length === 0) {
        grid.innerHTML = '<p class="empty-message">No photos found</p>';
        return;
      }

      files.forEach((file) => {
        const isDir = file.filetype === "directory";
        const thumb = file.thumbnail ? kodi.getImageUrl(file.thumbnail) : "";
        const label = file.label || file.file;

        if (
          !isDir &&
          /\.(jpe?g|png|gif|bmp|webp|tiff?|svg)$/i.test(file.file || "")
        ) {
          state.photoFiles.push(file);
        }

        const card = document.createElement("div");
        card.className = isDir ? "photo-card photo-folder" : "photo-card";
        card.innerHTML = `
          <div class="photo-thumb">
            ${
              isDir
                ? '<div class="photo-folder-icon"><svg viewBox="0 0 24 24" width="48" height="48"><path fill="#E5A00D" d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></div>'
                : thumb
                  ? `<img src="${escapeAttr(thumb)}" alt="${escapeAttr(label)}" loading="lazy" onerror="this.src='img/placeholder-landscape.svg'">`
                  : '<div class="photo-placeholder"><svg viewBox="0 0 24 24" width="48" height="48"><path fill="#666" d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>'
            }
          </div>
          <div class="photo-label">${escapeHtml(label)}</div>
        `;

        card.addEventListener("click", () => {
          if (isDir) {
            state.photosPath = file.file;
            loadPhotos();
          } else {
            const photoIndex = state.photoFiles.findIndex(
              (f) => f.file === file.file,
            );
            if (photoIndex >= 0) openLightbox(photoIndex);
          }
        });

        grid.appendChild(card);
      });
    } catch (err) {
      console.error("Failed to load photos:", err);
      grid.innerHTML =
        '<p class="empty-message">No picture sources configured.<br>Add picture sources in Kodi first.</p>';
    }
  }

  function openLightbox(index) {
    state.lightboxIndex = index;
    const file = state.photoFiles[index];
    if (!file) return;

    const url = kodi.getImageUrl(file.file);
    dom.lightboxImg.src = url;
    dom.lightboxCaption.textContent = file.label || file.file;
    dom.photoLightbox.classList.remove("hidden");
    document.body.classList.add("scroll-locked");
  }

  function closeLightbox() {
    dom.photoLightbox.classList.add("hidden");
    document.body.classList.remove("scroll-locked");
  }

  function navigateLightbox(delta) {
    const newIndex = state.lightboxIndex + delta;
    if (newIndex < 0 || newIndex >= state.photoFiles.length) return;
    openLightbox(newIndex);
  }

  // ─── Exports ─────────────────────────────────────────────────────────
  app.bindPhotos = bindPhotos;
  app.loadPhotos = loadPhotos;
  app.closeLightbox = closeLightbox;
})(window.KodiApp);
