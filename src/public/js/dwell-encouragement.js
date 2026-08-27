(function (global) {
  'use strict';

  const ENABLED_KEY = 'viewer-dwell-encouragement';
  const LOG_KEY = 'viewer-dwell-log';
  const WINDOW_MS = 24 * 60 * 60 * 1000;
  const TICK_MS = 15000;
  const THRESHOLD_MINUTES = 5;
  const TOAST_DISMISS_MS = 6000;

  let context = null;
  let segmentStart = null;
  let tickTimer = null;
  let toastHideTimer = null;
  let listenersBound = false;

  function isEnabled() {
    return localStorage.getItem(ENABLED_KEY) !== 'false';
  }

  function setEnabledFlag(enabled) {
    localStorage.setItem(ENABLED_KEY, enabled ? 'true' : 'false');
  }

  function contextKey(path, sectionId) {
    return String(path || '') + '::' + String(sectionId || '');
  }

  function emptyLog() {
    return { entries: [], notifiedMinutes: {} };
  }

  function loadLog() {
    try {
      const raw = localStorage.getItem(LOG_KEY);
      if (!raw) return emptyLog();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return emptyLog();
      const entries = Array.isArray(parsed.entries) ? parsed.entries : [];
      const notifiedMinutes =
        parsed.notifiedMinutes && typeof parsed.notifiedMinutes === 'object'
          ? parsed.notifiedMinutes
          : {};
      return prune({ entries, notifiedMinutes }, Date.now());
    } catch (e) {
      console.error('Failed to parse dwell log', e);
      return emptyLog();
    }
  }

  function saveLog(data) {
    try {
      localStorage.setItem(LOG_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save dwell log', e);
    }
  }

  function prune(data, now) {
    const cutoff = now - WINDOW_MS;
    const entries = (data.entries || []).filter((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const end = Number(entry.end);
      return Number.isFinite(end) && end >= cutoff;
    });

    const notifiedMinutes = {};
    const source = data.notifiedMinutes && typeof data.notifiedMinutes === 'object'
      ? data.notifiedMinutes
      : {};

    Object.keys(source).forEach((key) => {
      const totalMs = sumEntriesForKey(entries, key);
      const maxReached = Math.floor(totalMs / (THRESHOLD_MINUTES * 60 * 1000)) * THRESHOLD_MINUTES;
      const kept = (Array.isArray(source[key]) ? source[key] : [])
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0 && n <= maxReached);
      if (kept.length) {
        notifiedMinutes[key] = kept;
      }
    });

    return { entries, notifiedMinutes };
  }

  function entryKey(entry) {
    return contextKey(entry.path, entry.sectionId);
  }

  function sumEntriesForKey(entries, key) {
    let total = 0;
    for (let i = 0; i < entries.length; i += 1) {
      const entry = entries[i];
      if (entryKey(entry) !== key) continue;
      const start = Number(entry.start);
      const end = Number(entry.end);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
      total += end - start;
    }
    return total;
  }

  function isPageVisible() {
    return document.visibilityState !== 'hidden';
  }

  function ensureToastEl() {
    let el = document.getElementById('dwell-encouragement-toast');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'dwell-encouragement-toast';
    el.className = 'dwell-encouragement-toast no-print hidden';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-atomic', 'true');
    document.body.appendChild(el);
    return el;
  }

  function hideToast() {
    const el = document.getElementById('dwell-encouragement-toast');
    if (el) {
      el.classList.add('hidden');
      el.textContent = '';
    }
    if (toastHideTimer) {
      clearTimeout(toastHideTimer);
      toastHideTimer = null;
    }
  }
  const fastReadingMessages = {
    5: "⚡ Stay sharp and keep scrolling.",
    10: "📚 Focus on key points and keep moving.",
    15: "🚀 Faster progress means faster completion.",
    20: "🎯 Finish this topic before switching tasks.",
    25: "⏳ Don't get stuck. Keep the momentum going.",
    30: "✅ You're closer to the finish than when you started.",
    35: "🔥 Stay focused. Complete this section now.",
    40: "🏃 Quick reading, better progress.",
    45: "💡 Skim less important details and capture the essentials.",
    50: "📈 Keep going. The finish line is ahead."
  };

  function messageForMinutes(minutes) {
    if (fastReadingMessages[minutes]) {
      return fastReadingMessages[minutes] + ` ${minutes} mins`;
    }
    return "Time to wrap up — you've spent " + minutes + ' minutes here.';
  }

  function showToast(message) {
    const el = ensureToastEl();
    el.textContent = message;
    el.classList.remove('hidden');
    if (toastHideTimer) clearTimeout(toastHideTimer);
    toastHideTimer = setTimeout(hideToast, TOAST_DISMISS_MS);
  }

  function flushOpenSegment(now) {
    if (!context || segmentStart == null) return;
    const start = segmentStart;
    const end = now;
    segmentStart = null;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return;

    const data = loadLog();
    data.entries.push({
      path: context.path,
      sectionId: context.sectionId,
      start,
      end,
    });
    const pruned = prune(data, now);
    saveLog(pruned);
    checkThresholds(pruned, now);
  }

  function checkThresholds(data, now) {
    if (!context || !isEnabled()) return;
    const key = contextKey(context.path, context.sectionId);
    const totalMs = sumEntriesForKey(data.entries, key);
    const maxReached = Math.floor(totalMs / (THRESHOLD_MINUTES * 60 * 1000)) * THRESHOLD_MINUTES;
    if (maxReached < THRESHOLD_MINUTES) return;

    const notified = Array.isArray(data.notifiedMinutes[key])
      ? data.notifiedMinutes[key].map((n) => Number(n))
      : [];
    let highestNew = 0;
    for (let m = THRESHOLD_MINUTES; m <= maxReached; m += THRESHOLD_MINUTES) {
      if (!notified.includes(m)) {
        highestNew = m;
      }
    }
    if (!highestNew) return;

    const nextNotified = notified.slice();
    for (let m = THRESHOLD_MINUTES; m <= maxReached; m += THRESHOLD_MINUTES) {
      if (!nextNotified.includes(m)) nextNotified.push(m);
    }
    data.notifiedMinutes[key] = nextNotified;
    saveLog(data);
    showToast(messageForMinutes(highestNew));
  }

  function clearTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function startTick() {
    clearTick();
    if (!context || !isEnabled() || !isPageVisible()) return;
    tickTimer = setInterval(() => {
      if (!context || !isEnabled() || !isPageVisible()) {
        pauseTracking();
        return;
      }
      const now = Date.now();
      flushOpenSegment(now);
      segmentStart = now;
    }, TICK_MS);
  }

  function resumeTracking() {
    if (!context || !isEnabled() || !isPageVisible()) return;
    if (segmentStart == null) {
      segmentStart = Date.now();
    }
    startTick();
  }

  function pauseTracking() {
    clearTick();
    flushOpenSegment(Date.now());
  }

  function stop() {
    pauseTracking();
    context = null;
    hideToast();
  }

  function setContext(next) {
    const path = next && typeof next.path === 'string' ? next.path : '';
    const sectionId = next && next.sectionId != null && String(next.sectionId) !== ''
      ? String(next.sectionId)
      : '';
    if (!path || !sectionId) {
      stop();
      return;
    }

    const same =
      context &&
      context.path === path &&
      context.sectionId === sectionId;

    if (!same) {
      pauseTracking();
      context = { path, sectionId };
    }

    if (!isEnabled()) {
      clearTick();
      hideToast();
      return;
    }

    resumeTracking();
  }

  function setEnabled(enabled) {
    setEnabledFlag(Boolean(enabled));
    if (!enabled) {
      pauseTracking();
      hideToast();
      return;
    }
    if (context) {
      resumeTracking();
    }
  }

  function onVisibilityChange() {
    if (!context || !isEnabled()) return;
    if (isPageVisible()) {
      resumeTracking();
    } else {
      pauseTracking();
    }
  }

  function onBeforeUnload() {
    flushOpenSegment(Date.now());
  }

  function bindListeners() {
    if (listenersBound) return;
    listenersBound = true;
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
  }

  function init() {
    bindListeners();
    ensureToastEl();
    if (context && isEnabled()) {
      resumeTracking();
    }
  }

  global.ViewerDwellEncouragement = {
    init,
    setContext,
    stop,
    setEnabled,
    isEnabled,
    ENABLED_KEY,
  };
})(typeof window !== 'undefined' ? window : globalThis);
