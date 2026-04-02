/**
 * Utility functions, toast notifications, and connection banner helpers.
 */
import { $, $$, CONFIG, state } from "./state.js";

const FOCUSABLE_MODAL_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ── HTML escaping ──────────────────────────────────────────────────────

const _escMap = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(str) {
  if (str == null) return "";
  return String(str).replace(/[&<>"']/g, (ch) => _escMap[ch]);
}

// ── Time / formatting helpers ──────────────────────────────────────────

export function formatTime(t) {
  if (!t) return "0:00";
  const h = t.hours || 0;
  const m = t.minutes || 0;
  const s = t.seconds || 0;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatRuntime(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function stars(rating) {
  if (!rating) return "";
  const out = Math.round(rating) / 2;
  return "★".repeat(Math.floor(out)) + (out % 1 >= 0.5 ? "½" : "");
}

export function episodeLabel(season, episode) {
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

// ── Toast notifications ────────────────────────────────────────────────

export function toast(message, duration, actionLabel, actionFn) {
  duration = duration || CONFIG.TOAST_DURATION;
  const container = $("#toast-container");
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  if (actionLabel && actionFn) {
    const a = document.createElement("span");
    a.className = "toast-action";
    a.textContent = actionLabel;
    a.addEventListener("click", (e) => {
      e.stopPropagation();
      actionFn();
      el.classList.remove("show");
      setTimeout(() => {
        if (el.parentNode) el.remove();
      }, 300);
    });
    el.appendChild(a);
  }
  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    const cleanup = () => {
      if (el.parentNode) el.remove();
    };
    el.addEventListener("transitionend", cleanup, { once: true });
    setTimeout(cleanup, 500);
  }, duration);
}

// ── Connection status banner ───────────────────────────────────────────

export function showConnectionBanner() {
  const banner = $("#connection-banner");
  if (banner) banner.hidden = false;
}

export function hideConnectionBanner() {
  const banner = $("#connection-banner");
  if (banner) banner.hidden = true;
  state._connectionFails = 0;
}

// ── Modal helpers ──────────────────────────────────────────────────────

export function openModal(target) {
  const modal = typeof target === "string" ? $(target) : target;
  if (!modal) return;
  modal._returnFocus =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  modal.hidden = false;
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("has-modal");
  requestAnimationFrame(() => {
    modal.querySelector(FOCUSABLE_MODAL_SELECTOR)?.focus({
      preventScroll: true,
    });
  });
}

export function closeModal(target) {
  const modal = typeof target === "string" ? $(target) : target;
  if (!modal) return;
  modal.hidden = true;
  modal.setAttribute("aria-hidden", "true");
  if ($$(".modal-overlay").every((item) => item.hidden)) {
    document.body.classList.remove("has-modal");
    if (modal._returnFocus && document.contains(modal._returnFocus)) {
      requestAnimationFrame(() => {
        modal._returnFocus.focus({ preventScroll: true });
      });
    }
  }
  delete modal._returnFocus;
}

// ── Detail skeleton loading ────────────────────────────────────────────

export function detailSkeleton() {
  return '<div class="detail-skeleton"><div class="detail-skeleton-poster"></div><div class="detail-skeleton-info"><div class="detail-skeleton-title"></div><div class="detail-skeleton-line detail-skeleton-line--medium"></div><div class="detail-skeleton-line detail-skeleton-line--short"></div><div class="detail-skeleton-line detail-skeleton-line--long"></div><div class="detail-skeleton-line detail-skeleton-line--long"></div></div></div>';
}
