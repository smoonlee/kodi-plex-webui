/**
 * Spatial navigation helpers for TV / remote-friendly focus movement.
 */

const FOCUSABLE_SELECTOR = [
  "#topbar-nav a",
  "#hamburger",
  "#btn-settings",
  "#topbar-search-input",
  "#topbar-search-clear:not([hidden])",
  "#settings-flyout button",
  "#settings-flyout .settings-input",
  "#settings-flyout select",
  "#settings-flyout [data-action]",
  "#content button",
  "#content a[href]",
  "#content a[data-action]",
  "#content [role='button']",
  "#content [data-action]",
  "#content select",
  "#content input:not([type='hidden'])",
  "#now-playing button",
  "#now-playing input[type='range']",
  ".modal-overlay:not([hidden]) button",
  ".modal-overlay:not([hidden]) [data-action]",
].join(", ");

const NATURALLY_FOCUSABLE = /^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/;

function isVisible(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hidden || el.closest("[hidden]")) return false;
  const style = window.getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  return el.getClientRects().length > 0;
}

function ensureFocusableTargets(scope) {
  scope.querySelectorAll("[data-action], a[data-action]").forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (!NATURALLY_FOCUSABLE.test(el.tagName) && !el.hasAttribute("tabindex")) {
      el.tabIndex = 0;
    }
    if (el.tagName === "A" && !el.hasAttribute("href")) {
      el.setAttribute("role", "button");
    }
  });
}

function getNavigationScope() {
  const modal = document.querySelector(".modal-overlay:not([hidden])");
  if (modal) return modal;

  const settingsFlyout = document.querySelector("#settings-flyout.open");
  if (settingsFlyout) return settingsFlyout;

  const expandedNowPlaying = document.querySelector("#now-playing.np-expanded");
  if (expandedNowPlaying) return expandedNowPlaying;

  return document;
}

function getCandidates(scope = getNavigationScope()) {
  ensureFocusableTargets(scope === document ? document.body : scope);

  return [...scope.querySelectorAll(FOCUSABLE_SELECTOR)].filter(
    (el) =>
      el instanceof HTMLElement &&
      !el.disabled &&
      el.getAttribute("aria-hidden") !== "true" &&
      isVisible(el),
  );
}

function getCenter(rect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) <= Math.min(aEnd, bEnd);
}

function focusElement(el) {
  if (!(el instanceof HTMLElement)) return false;
  document.body.classList.add("tv-nav-active");
  el.focus({ preventScroll: true });
  el.scrollIntoView({
    block: "nearest",
    inline: "nearest",
    behavior: "smooth",
  });
  return true;
}

function getSortedCandidates(candidates) {
  return [...candidates].sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    if (Math.abs(aRect.top - bRect.top) > 12) {
      return aRect.top - bRect.top;
    }
    return aRect.left - bRect.left;
  });
}

function findDirectionalCandidate(current, candidates, direction) {
  const currentRect = current.getBoundingClientRect();
  const currentCenter = getCenter(currentRect);

  let best = null;
  let bestScore = Number.POSITIVE_INFINITY;

  candidates.forEach((candidate) => {
    if (candidate === current) return;

    const rect = candidate.getBoundingClientRect();
    const center = getCenter(rect);
    const dx = center.x - currentCenter.x;
    const dy = center.y - currentCenter.y;

    if (direction === "left" && dx >= -8) return;
    if (direction === "right" && dx <= 8) return;
    if (direction === "up" && dy >= -8) return;
    if (direction === "down" && dy <= 8) return;

    const primary =
      direction === "left" || direction === "right"
        ? Math.abs(dx)
        : Math.abs(dy);
    const secondary =
      direction === "left" || direction === "right"
        ? Math.abs(dy)
        : Math.abs(dx);
    const aligned =
      direction === "left" || direction === "right"
        ? overlaps(currentRect.top, currentRect.bottom, rect.top, rect.bottom)
        : overlaps(currentRect.left, currentRect.right, rect.left, rect.right);

    const score = primary * 4 + secondary + (aligned ? 0 : 180);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
    }
  });

  return best;
}

export function moveTVFocus(direction) {
  const candidates = getCandidates();
  if (!candidates.length) return false;

  const current =
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  const sorted = getSortedCandidates(candidates);

  if (!current || !candidates.includes(current)) {
    const fallback =
      direction === "left" || direction === "up"
        ? sorted[sorted.length - 1]
        : sorted[0];
    return focusElement(fallback);
  }

  const next = findDirectionalCandidate(current, candidates, direction);
  if (next) return focusElement(next);

  const currentIndex = sorted.indexOf(current);
  if (currentIndex === -1) return focusElement(sorted[0]);

  if (direction === "left" || direction === "up") {
    return focusElement(
      sorted[(currentIndex - 1 + sorted.length) % sorted.length],
    );
  }

  return focusElement(sorted[(currentIndex + 1) % sorted.length]);
}

export function initTVNavigation() {
  const disableTVMode = () => document.body.classList.remove("tv-nav-active");

  ["pointerdown", "mousemove", "touchstart"].forEach((eventName) => {
    document.addEventListener(eventName, disableTVMode, { passive: true });
  });
}
