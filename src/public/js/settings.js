(function (global) {
  'use strict';

  const THEME_KEY = 'viewer-theme';
  const THEME_AUTO = 'auto';
  const THEME_DARK = 'dark';
  const THEME_LIGHT = 'light';
  const DENSITY_KEY = 'viewer-density';
  const DENSITY_NORMAL = 'normal';
  const DENSITY_COMPACT = 'compact';
  const TWO_COLUMN_PRINT_KEY = 'viewer-two-column-print';
  const VOICE_STORAGE_KEY = 'viewer-voice';
  const SPEECH_RATE_KEY = 'viewer-speech-rate';
  const SPEECH_RATE_MIN = 0.5;
  const SPEECH_RATE_MAX = 2;

  const htmlElement = document.documentElement;
  const systemThemeMedia = window.matchMedia('(prefers-color-scheme: dark)');

  const THEME_BTN_CLASS =
    'px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors';

  function injectMarkup() {
    if (document.getElementById('btn-settings')) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
  <div id="settings-backdrop" class="hidden no-print" aria-hidden="true"></div>
  <div id="settings-panel" class="hidden no-print" role="dialog" aria-modal="false" aria-labelledby="settings-title">
    <div
      class="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl p-4 flex flex-col gap-4">
      <div class="flex items-center justify-between gap-3">
        <h2 id="settings-title" class="text-sm font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" id="btn-auto" class="${THEME_BTN_CLASS}">Auto</button>
          <button type="button" id="btn-dark" class="${THEME_BTN_CLASS}">Dark</button>
          <button type="button" id="btn-light" class="${THEME_BTN_CLASS}">Light</button>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-sm font-medium text-gray-700 dark:text-gray-300">Density</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" id="btn-density-normal" class="${THEME_BTN_CLASS}">Normal</button>
          <button type="button" id="btn-density-compact" class="${THEME_BTN_CLASS}">Compact</button>
        </div>
      </div>
      <label for="is-two-column-print"
        class="w-full flex items-center gap-1.5 cursor-pointer select-none text-gray-700 dark:text-gray-300 shrink-0">
        <input type="checkbox" id="is-two-column-print"
          class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800">
        <span>Is Two Column Print</span>
      </label>
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <label for="voice-select" class="text-sm font-medium text-gray-700 dark:text-gray-300">Voice</label>
          <button type="button" id="btn-refresh-voices" aria-label="Refresh voices" title="Refresh voices"
            class="${THEME_BTN_CLASS} inline-flex items-center justify-center p-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"
              aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        <select id="voice-select"
          class="w-full px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-colors">
          <option value="">Select voice…</option>
        </select>
      </div>
      <div class="w-full flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <label for="speech-rate" class="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">Speech
            rate</label>
          <span id="speech-rate-value"
            class="text-xs tabular-nums text-gray-600 dark:text-gray-400 shrink-0">1.0×</span>
        </div>
        <input type="range" id="speech-rate" min="0.5" max="2" step="0.1" value="1"
          class="w-full h-2 rounded-lg appearance-none bg-gray-200 dark:bg-gray-600 accent-blue-600 dark:accent-blue-500 cursor-pointer">
        <div class="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 leading-none">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>
    </div>
  </div>
  <button type="button" id="btn-settings" aria-label="Open settings" aria-controls="settings-panel" aria-expanded="false"
    class="no-print flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors">
    <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24" aria-hidden="true">
      <path stroke-linecap="round" stroke-linejoin="round"
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </button>`;

    while (wrapper.firstChild) {
      document.body.appendChild(wrapper.firstChild);
    }
  }

  function updateThemeButtonStates(mode) {
    document.getElementById('btn-auto')?.classList.toggle('theme-btn-active', mode === THEME_AUTO);
    document.getElementById('btn-dark')?.classList.toggle('theme-btn-active', mode === THEME_DARK);
    document.getElementById('btn-light')?.classList.toggle('theme-btn-active', mode === THEME_LIGHT);
  }

  function applyTheme(mode) {
    const requestedMode = mode === THEME_DARK || mode === THEME_LIGHT ? mode : THEME_AUTO;
    const effectiveMode = requestedMode === THEME_AUTO
      ? (systemThemeMedia.matches ? THEME_DARK : THEME_LIGHT)
      : requestedMode;

    if (effectiveMode === THEME_DARK) {
      htmlElement.classList.add(THEME_DARK);
      htmlElement.classList.remove(THEME_LIGHT);
    } else {
      htmlElement.classList.remove(THEME_DARK);
      htmlElement.classList.add(THEME_LIGHT);
    }
    localStorage.setItem(THEME_KEY, requestedMode);
    updateThemeButtonStates(requestedMode);

    const isDark = effectiveMode === THEME_DARK;
    const hljsDark = document.getElementById('hljs-dark');
    const hljsLight = document.getElementById('hljs-light');
    const markdownDark = document.getElementById('markdown-dark');
    const markdownLight = document.getElementById('markdown-light');
    if (hljsDark) hljsDark.media = isDark ? 'all' : 'none';
    if (hljsLight) hljsLight.media = isDark ? 'none' : 'all';
    if (markdownDark) markdownDark.media = isDark ? 'all' : 'none';
    if (markdownLight) markdownLight.media = isDark ? 'none' : 'all';
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    const initialMode = saved === THEME_AUTO || saved === THEME_DARK || saved === THEME_LIGHT
      ? saved
      : THEME_AUTO;
    applyTheme(initialMode);

    document.getElementById('btn-auto')?.addEventListener('click', () => applyTheme(THEME_AUTO));
    document.getElementById('btn-dark')?.addEventListener('click', () => applyTheme(THEME_DARK));
    document.getElementById('btn-light')?.addEventListener('click', () => applyTheme(THEME_LIGHT));
    systemThemeMedia.addEventListener('change', () => {
      if (localStorage.getItem(THEME_KEY) === THEME_AUTO) {
        applyTheme(THEME_AUTO);
      }
    });
  }

  function updateDensityButtonStates(mode) {
    document.getElementById('btn-density-normal')?.classList.toggle('theme-btn-active', mode === DENSITY_NORMAL);
    document.getElementById('btn-density-compact')?.classList.toggle('theme-btn-active', mode === DENSITY_COMPACT);
  }

  function applyDensity(mode) {
    const density = mode === DENSITY_COMPACT ? DENSITY_COMPACT : DENSITY_NORMAL;
    htmlElement.classList.toggle('density-compact', density === DENSITY_COMPACT);
    localStorage.setItem(DENSITY_KEY, density);
    updateDensityButtonStates(density);
  }

  function initDensity() {
    const saved = localStorage.getItem(DENSITY_KEY);
    const initialMode = saved === DENSITY_COMPACT ? DENSITY_COMPACT : DENSITY_NORMAL;
    applyDensity(initialMode);

    document.getElementById('btn-density-normal')?.addEventListener('click', () => applyDensity(DENSITY_NORMAL));
    document.getElementById('btn-density-compact')?.addEventListener('click', () => applyDensity(DENSITY_COMPACT));
  }

  function updateTwoColumnPrintClass(enabled) {
    document.body.classList.toggle('two-column-print', enabled);
  }

  function initTwoColumnPrint() {
    const checkbox = document.getElementById('is-two-column-print');
    if (!checkbox) return;
    const saved = localStorage.getItem(TWO_COLUMN_PRINT_KEY);
    const enabled = saved === 'true';
    checkbox.checked = enabled;
    updateTwoColumnPrintClass(enabled);

    checkbox.addEventListener('change', () => {
      const isChecked = checkbox.checked;
      localStorage.setItem(TWO_COLUMN_PRINT_KEY, String(isChecked));
      updateTwoColumnPrintClass(isChecked);
    });
  }

  function escapeHtmlAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function clampSpeechRate(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 1;
    return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, x));
  }

  function formatSpeechRateDisplay(v) {
    const x = clampSpeechRate(v);
    return (Math.round(x * 10) / 10).toFixed(1) + '×';
  }

  function populateVoices() {
    const voiceSelect = document.getElementById('voice-select');
    if (!voiceSelect || typeof speechSynthesis === 'undefined') return;
    const voices = speechSynthesis.getVoices();
    const englishVoices = voices.filter((v) => v.lang.startsWith('en'));
    voiceSelect.innerHTML =
      '<option value="">Select voice…</option>' +
      englishVoices
        .map(
          (v) =>
            `<option value="${escapeHtmlAttr(v.name)}">${escapeHtmlAttr(v.name)} (${escapeHtmlAttr(v.lang)})</option>`
        )
        .join('');

    const saved = localStorage.getItem(VOICE_STORAGE_KEY);
    if (saved && [...voiceSelect.options].some((o) => o.value === saved)) {
      voiceSelect.value = saved;
    }
  }

  function initVoiceSettings() {
    const voiceSelect = document.getElementById('voice-select');
    const speechRateInput = document.getElementById('speech-rate');
    const speechRateValueEl = document.getElementById('speech-rate-value');
    const btnRefreshVoices = document.getElementById('btn-refresh-voices');

    populateVoices();
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.addEventListener('voiceschanged', populateVoices);
    }

    if (voiceSelect) {
      voiceSelect.addEventListener('change', () => {
        const value = voiceSelect.value;
        if (value) localStorage.setItem(VOICE_STORAGE_KEY, value);
      });
    }

    if (btnRefreshVoices) {
      btnRefreshVoices.addEventListener('click', () => {
        if (typeof speechSynthesis !== 'undefined') {
          speechSynthesis.getVoices();
        }
        populateVoices();
      });
    }

    function syncSpeechRateUi() {
      if (!speechRateInput) return;
      const saved = localStorage.getItem(SPEECH_RATE_KEY);
      if (saved != null && saved !== '') {
        const r = clampSpeechRate(parseFloat(saved));
        speechRateInput.value = String(r);
      }
      if (speechRateValueEl) speechRateValueEl.textContent = formatSpeechRateDisplay(speechRateInput.value);
    }

    syncSpeechRateUi();
    if (speechRateInput) {
      speechRateInput.addEventListener('input', () => {
        const r = clampSpeechRate(parseFloat(speechRateInput.value));
        speechRateInput.value = String(r);
        localStorage.setItem(SPEECH_RATE_KEY, speechRateInput.value);
        if (speechRateValueEl) speechRateValueEl.textContent = formatSpeechRateDisplay(r);
      });
    }
  }

  function initSettingsPanel(options) {
    const closeMobilePanels = typeof options?.closeMobilePanels === 'function'
      ? options.closeMobilePanels
      : () => { };

    const settingsPanel = document.getElementById('settings-panel');
    const settingsBackdrop = document.getElementById('settings-backdrop');
    const btnSettings = document.getElementById('btn-settings');

    function setExpanded(expanded) {
      btnSettings?.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    }

    function closeSettingsPanel() {
      settingsPanel?.classList.add('hidden');
      settingsBackdrop?.classList.add('hidden');
      settingsBackdrop?.setAttribute('aria-hidden', 'true');
      setExpanded(false);
    }

    function openSettingsPanel() {
      closeMobilePanels();
      settingsPanel?.classList.remove('hidden');
      settingsBackdrop?.classList.remove('hidden');
      settingsBackdrop?.setAttribute('aria-hidden', 'false');
      setExpanded(true);
    }

    btnSettings?.addEventListener('click', () => {
      if (settingsPanel?.classList.contains('hidden')) {
        openSettingsPanel();
      } else {
        closeSettingsPanel();
      }
    });
    settingsBackdrop?.addEventListener('click', closeSettingsPanel);
    settingsPanel?.addEventListener('click', (e) => e.stopPropagation());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSettingsPanel();
    });
  }

  function init(options) {
    injectMarkup();
    initTheme();
    initDensity();
    initTwoColumnPrint();
    initVoiceSettings();
    initSettingsPanel(options || {});
  }

  global.ViewerSettings = {
    init,
    applyTheme,
  };
})(typeof window !== 'undefined' ? window : globalThis);
