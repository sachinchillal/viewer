(function (global) {
  'use strict';

  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const ZOOM_STEP = 1.18;
  const DOUBLE_TAP_MS = 280;
  const DRAG_THRESHOLD_PX = 4;

  const CLOSE_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';
  const PREV_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const NEXT_SVG =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';

  let contentRootSelector = '#file-content';
  let overlay = null;
  let stage = null;
  let imageEl = null;
  let captionEl = null;
  let closeBtn = null;
  let prevBtn = null;
  let nextBtn = null;
  let scale = 1;
  let tx = 0;
  let ty = 0;
  let currentIndex = -1;
  let restoreFocus = null;
  let lastTap = { time: 0, x: 0, y: 0 };
  const pointers = new Map();
  let pinchStartDist = 0;
  let pinchStartScale = 1;
  let dragOrigin = null;
  let dragMoved = false;
  let pointerStartedOnImage = false;

  function isOpen() {
    return Boolean(overlay && !overlay.classList.contains('hidden'));
  }

  function contentRoot() {
    return document.querySelector(contentRootSelector);
  }

  function collectImages() {
    const root = contentRoot();
    if (!root) return [];
    return Array.from(root.querySelectorAll('img.viewer-zoomable')).filter((img) => {
      if (!img || img.classList.contains('app-brand-logo')) return false;
      if (img.closest('button')) return false;
      return Boolean(img.getAttribute('src'));
    });
  }

  function injectMarkup() {
    if (document.getElementById('viewer-lightbox')) {
      overlay = document.getElementById('viewer-lightbox');
      stage = overlay.querySelector('.viewer-lightbox-stage');
      imageEl = overlay.querySelector('.viewer-lightbox-image');
      captionEl = overlay.querySelector('.viewer-lightbox-caption');
      closeBtn = overlay.querySelector('.viewer-lightbox-close');
      prevBtn = overlay.querySelector('.viewer-lightbox-prev');
      nextBtn = overlay.querySelector('.viewer-lightbox-next');
      return;
    }

    overlay = document.createElement('div');
    overlay.id = 'viewer-lightbox';
    overlay.className = 'viewer-lightbox no-print hidden';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image viewer');
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML =
      '<button type="button" class="viewer-lightbox-btn viewer-lightbox-close" aria-label="Close">' +
      CLOSE_SVG +
      '</button>' +
      '<button type="button" class="viewer-lightbox-btn viewer-lightbox-nav viewer-lightbox-prev hidden" aria-label="Previous image">' +
      PREV_SVG +
      '</button>' +
      '<button type="button" class="viewer-lightbox-btn viewer-lightbox-nav viewer-lightbox-next hidden" aria-label="Next image">' +
      NEXT_SVG +
      '</button>' +
      '<div class="viewer-lightbox-stage">' +
      '<img class="viewer-lightbox-image" alt="" draggable="false">' +
      '</div>' +
      '<p class="viewer-lightbox-caption"></p>';

    document.body.appendChild(overlay);
    stage = overlay.querySelector('.viewer-lightbox-stage');
    imageEl = overlay.querySelector('.viewer-lightbox-image');
    captionEl = overlay.querySelector('.viewer-lightbox-caption');
    closeBtn = overlay.querySelector('.viewer-lightbox-close');
    prevBtn = overlay.querySelector('.viewer-lightbox-prev');
    nextBtn = overlay.querySelector('.viewer-lightbox-next');
  }

  function applyTransform() {
    if (!imageEl) return;
    imageEl.style.transform = 'translate(' + tx + 'px, ' + ty + 'px) scale(' + scale + ')';
    overlay.classList.toggle('is-zoomed', scale > 1);
  }

  function resetTransform() {
    scale = 1;
    tx = 0;
    ty = 0;
    applyTransform();
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function clampPan() {
    if (scale <= 1 || !stage) {
      tx = 0;
      ty = 0;
      return;
    }
    const rect = stage.getBoundingClientRect();
    const maxX = (rect.width * (scale - 1)) / 2 + rect.width * 0.25;
    const maxY = (rect.height * (scale - 1)) / 2 + rect.height * 0.25;
    tx = clamp(tx, -maxX, maxX);
    ty = clamp(ty, -maxY, maxY);
  }

  function setScale(next, point) {
    const prev = scale;
    const clamped = clamp(next, MIN_SCALE, MAX_SCALE);
    if (clamped === prev) {
      if (clamped === MIN_SCALE) {
        tx = 0;
        ty = 0;
        applyTransform();
      }
      return;
    }
    if (clamped === MIN_SCALE) {
      scale = MIN_SCALE;
      tx = 0;
      ty = 0;
      applyTransform();
      return;
    }
    if (point && stage && prev > 0) {
      const rect = stage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const ratio = clamped / prev;
      tx = point.x - cx - (point.x - cx - tx) * ratio;
      ty = point.y - cy - (point.y - cy - ty) * ratio;
    }
    scale = clamped;
    clampPan();
    applyTransform();
  }

  function focusables() {
    return [closeBtn, prevBtn, nextBtn].filter((btn) => btn && !btn.classList.contains('hidden') && !btn.disabled);
  }

  function showImageAt(index) {
    const images = collectImages();
    if (!images.length) {
      close();
      return;
    }
    currentIndex = ((index % images.length) + images.length) % images.length;
    const source = images[currentIndex];
    const caption = (source.getAttribute('alt') || source.getAttribute('title') || '').trim();
    imageEl.src = source.currentSrc || source.src;
    imageEl.alt = caption;
    captionEl.textContent = caption;
    resetTransform();
    updateNav(images.length);
  }

  function updateNav(count) {
    const many = count > 1;
    prevBtn.classList.toggle('hidden', !many);
    nextBtn.classList.toggle('hidden', !many);
    prevBtn.disabled = !many;
    nextBtn.disabled = !many;
  }

  function open(sourceImg) {
    const images = collectImages();
    const index = images.indexOf(sourceImg);
    if (index < 0) return;

    restoreFocus = document.activeElement;
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('viewer-lightbox-open');
    showImageAt(index);
    closeBtn.focus();
  }

  function close() {
    if (!isOpen()) return;
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('viewer-lightbox-open', 'is-panning');
    overlay.classList.remove('is-panning', 'is-zoomed');
    pointers.clear();
    pinchStartDist = 0;
    dragOrigin = null;
    imageEl.removeAttribute('src');
    captionEl.textContent = '';
    currentIndex = -1;
    resetTransform();
    if (restoreFocus && typeof restoreFocus.focus === 'function') {
      restoreFocus.focus();
    }
    restoreFocus = null;
  }

  function showPrevious() {
    if (!isOpen()) return;
    showImageAt(currentIndex - 1);
  }

  function showNext() {
    if (!isOpen()) return;
    showImageAt(currentIndex + 1);
  }

  function isZoomableImg(img) {
    if (!img || img.tagName !== 'IMG') return false;
    if (!img.classList.contains('viewer-zoomable')) return false;
    if (img.classList.contains('app-brand-logo') || img.closest('.app-brand-logo')) return false;
    if (img.closest('button')) return false;
    const root = contentRoot();
    return Boolean(root && root.contains(img));
  }

  function onContentClick(e) {
    const img = e.target.closest && e.target.closest('img');
    if (!isZoomableImg(img)) return;
    e.preventDefault();
    e.stopPropagation();
    open(img);
  }

  function pointerList() {
    return Array.from(pointers.values());
  }

  function pointerDistance() {
    const pts = pointerList();
    if (pts.length < 2) return 0;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  }

  function pointerMidpoint() {
    const pts = pointerList();
    if (pts.length < 2) return null;
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  }

  function onPointerDown(e) {
    if (!isOpen()) return;
    if (e.button != null && e.button !== 0) return;
    if (e.target.closest && e.target.closest('button')) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (stage && stage.setPointerCapture) {
      try {
        stage.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    }
    dragMoved = false;
    if (pointers.size === 1) {
      dragOrigin = { x: e.clientX, y: e.clientY };
      pointerStartedOnImage = e.target === imageEl;
    } else if (pointers.size === 2) {
      pinchStartDist = pointerDistance();
      pinchStartScale = scale;
      dragOrigin = null;
    }
  }

  function onPointerMove(e) {
    const prev = pointers.get(e.pointerId);
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2 && pinchStartDist > 0) {
      const dist = pointerDistance();
      if (dist > 0) {
        setScale(pinchStartScale * (dist / pinchStartDist), pointerMidpoint());
        dragMoved = true;
      }
      return;
    }

    if (pointers.size === 1 && dragOrigin && scale > 1) {
      if (Math.abs(e.clientX - dragOrigin.x) > DRAG_THRESHOLD_PX || Math.abs(e.clientY - dragOrigin.y) > DRAG_THRESHOLD_PX) {
        dragMoved = true;
        overlay.classList.add('is-panning');
      }
      if (dragMoved) {
        tx += dx;
        ty += dy;
        clampPan();
        applyTransform();
      }
    } else if (pointers.size === 1 && dragOrigin) {
      if (Math.abs(e.clientX - dragOrigin.x) > DRAG_THRESHOLD_PX || Math.abs(e.clientY - dragOrigin.y) > DRAG_THRESHOLD_PX) {
        dragMoved = true;
      }
    }
  }

  function maybeToggleZoom(point) {
    if (scale > 1) {
      setScale(MIN_SCALE, point);
    } else {
      setScale(2, point);
    }
  }

  function onPointerUp(e) {
    if (!pointers.has(e.pointerId)) return;
    const point = { x: e.clientX, y: e.clientY };
    pointers.delete(e.pointerId);
    overlay.classList.remove('is-panning');

    if (pointers.size < 2) {
      pinchStartDist = 0;
    }
    if (pointers.size === 1) {
      const remaining = pointers.values().next().value;
      dragOrigin = remaining ? { x: remaining.x, y: remaining.y } : null;
      return;
    }

    if (pointers.size === 0) {
      if (!dragMoved) {
        if (e.pointerType !== 'mouse' && pointerStartedOnImage) {
          const now = Date.now();
          const isDoubleTap =
            now - lastTap.time < DOUBLE_TAP_MS &&
            Math.hypot(point.x - lastTap.x, point.y - lastTap.y) < 24;
          lastTap = { time: now, x: point.x, y: point.y };
          if (isDoubleTap) {
            maybeToggleZoom(point);
            dragOrigin = null;
            return;
          }
        }
        if (!pointerStartedOnImage) {
          close();
        }
      }
      dragOrigin = null;
    }
  }

  function onDblClick(e) {
    if (!isOpen()) return;
    e.preventDefault();
    maybeToggleZoom({ x: e.clientX, y: e.clientY });
  }

  function onWheel(e) {
    if (!isOpen()) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
    setScale(scale * factor, { x: e.clientX, y: e.clientY });
  }

  function onKeyDown(e) {
    if (!isOpen()) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      showPrevious();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      showNext();
      return;
    }
    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      setScale(scale * ZOOM_STEP, stageCenter());
      return;
    }
    if (e.key === '-' || e.key === '_') {
      e.preventDefault();
      setScale(scale / ZOOM_STEP, stageCenter());
      return;
    }
    if (e.key === '0') {
      e.preventDefault();
      setScale(MIN_SCALE);
      return;
    }
    if (e.key === 'Tab') {
      const items = focusables();
      if (!items.length) return;
      const current = items.indexOf(document.activeElement);
      let next = current;
      if (e.shiftKey) {
        next = current <= 0 ? items.length - 1 : current - 1;
      } else {
        next = current === items.length - 1 || current < 0 ? 0 : current + 1;
      }
      e.preventDefault();
      items[next].focus();
    }
  }

  function stageCenter() {
    if (!stage) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const rect = stage.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function bindEvents() {
    const root = contentRoot();
    if (root) {
      root.addEventListener('click', onContentClick);
    }

    closeBtn.addEventListener('click', close);
    prevBtn.addEventListener('click', showPrevious);
    nextBtn.addEventListener('click', showNext);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === captionEl) {
        close();
      }
    });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    imageEl.addEventListener('dblclick', onDblClick);
    overlay.addEventListener('wheel', onWheel, { passive: false });
    imageEl.addEventListener('dragstart', (e) => e.preventDefault());
    document.addEventListener('keydown', onKeyDown, true);
  }

  function init(options) {
    contentRootSelector =
      typeof options?.contentRootSelector === 'string' && options.contentRootSelector
        ? options.contentRootSelector
        : '#file-content';
    injectMarkup();
    bindEvents();
  }

  global.ViewerLightbox = {
    init,
    isOpen,
    close,
  };
})(typeof window !== 'undefined' ? window : globalThis);
