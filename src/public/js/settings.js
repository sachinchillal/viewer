(function (global) {
  'use strict';

  const THEME_KEY = 'viewer-theme';
  const THEME_AUTO = 'auto';
  const THEME_DARK = 'dark';
  const THEME_LIGHT = 'light';
  const TWO_COLUMN_PRINT_KEY = 'viewer-two-column-print';

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
      <label for="is-two-column-print"
        class="w-full flex items-center gap-1.5 cursor-pointer select-none text-gray-700 dark:text-gray-300 shrink-0">
        <input type="checkbox" id="is-two-column-print"
          class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800">
        <span>Is Two Column Print</span>
      </label>
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
    initTwoColumnPrint();
    initSettingsPanel(options || {});
  }

  global.ViewerSettings = {
    init,
    applyTheme,
  };
})(typeof window !== 'undefined' ? window : globalThis);
