(function (global) {
  'use strict';

  const READ_WPM = 220;
  const STUDY_WPM = 75;

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function toPlainText(text) {
    return String(text || '')
      .replace(/```[\s\S]*?```/g, (block) => ' ' + block.replace(/```[^\n]*\n?|\n?```/g, ' ') + ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[#*_~>|=]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function countWords(text) {
    const plain = toPlainText(text);
    if (!plain) return 0;
    const words = plain.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g);
    return words ? words.length : 0;
  }

  function minutesFromWords(words, wpm) {
    if (words <= 0) return 0;
    return Math.max(1, Math.round(words / wpm));
  }

  function formatMinutes(mins) {
    const n = Number(mins);
    if (!Number.isFinite(n) || n <= 0) return '0 min';
    if (n < 60) return n + ' min';
    const hours = Math.floor(n / 60);
    const rem = n % 60;
    const hourLabel = hours === 1 ? '1 hr' : hours + ' hrs';
    if (rem === 0) return hourLabel;
    return hourLabel + ' ' + rem + ' min';
  }

  function estimate(text) {
    const words = countWords(text);
    const readMinutes = minutesFromWords(words, READ_WPM);
    const studyMinutes = minutesFromWords(words, STUDY_WPM);
    return {
      words,
      readMinutes,
      studyMinutes,
      readLabel: formatMinutes(readMinutes),
      studyLabel: formatMinutes(studyMinutes),
    };
  }

  function estimateMany(texts) {
    return estimate((texts || []).join('\n'));
  }

  function renderHtml(est, options) {
    const stats = est && typeof est === 'object' ? est : estimate(est);
    if (!stats.words) return '';
    const compact = options && options.compact;
    const readSuffix = (options && options.readSuffix) || 'to read';
    const studySuffix = (options && options.studySuffix) || 'to study';
    const className = compact ? 'reading-time reading-time--compact' : 'reading-time';

    return (
      '<div class="' + className + '" role="group" aria-label="Estimated reading and study time">' +
        '<span class="reading-time-item">' +
          '<span class="reading-time-value">' + escapeHtml(stats.readLabel) + '</span>' +
          '<span class="reading-time-label">' + escapeHtml(readSuffix) + '</span>' +
        '</span>' +
        '<span class="reading-time-sep" aria-hidden="true"></span>' +
        '<span class="reading-time-item">' +
          '<span class="reading-time-value">' + escapeHtml(stats.studyLabel) + '</span>' +
          '<span class="reading-time-label">' + escapeHtml(studySuffix) + '</span>' +
        '</span>' +
      '</div>'
    );
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') return document.querySelector(target);
    if (target.nodeType === 1) return target;
    return null;
  }

  function fill(target, text, options) {
    const el = resolveTarget(target);
    if (!el) return null;
    const stats = text && typeof text === 'object' && 'words' in text ? text : estimate(text);
    const html = renderHtml(stats, options);
    if (!html) {
      el.innerHTML = '';
      el.classList.add('hidden');
      el.setAttribute('hidden', '');
      return stats;
    }
    el.innerHTML = html;
    el.classList.remove('hidden');
    el.removeAttribute('hidden');
    return stats;
  }

  global.ViewerReadingTime = {
    estimate,
    estimateMany,
    formatMinutes,
    renderHtml,
    fill,
  };
})(typeof window !== 'undefined' ? window : globalThis);
