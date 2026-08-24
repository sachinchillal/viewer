(function (global) {
  'use strict';

  const VOICE_STORAGE_KEY = 'viewer-voice';
  const SKIP_CODE_BLOCKS_KEY = 'viewer-skip-code-blocks';
  const SPEECH_RATE_KEY = 'viewer-speech-rate';
  const SPEECH_RATE_MIN = 0.5;
  const SPEECH_RATE_MAX = 2;
  const CODEBLOCK_ALTERNATIVE_TEXT = 'See the code block for more details.';
  const SPEECH_GAP_AFTER_HEADING_MS = 300;
  const SPEECH_GAP_AFTER_BLOCK_MS = 40;

  const SECTION_PLAY_SVG =
    '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/></svg>';

  const SECTION_PLAY_TO_END_SVG =
    '<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/><path d="M19 5h2v14h-2V5z"/></svg>';

  const HEADING_AUDIO_BTN_CLASS =
    'heading-audio-btn no-print p-2 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors';

  const VOICE_CONTROLLER_CLASS =
    'mt-6 no-print flex flex-wrap items-center gap-2 justify-start';

  let contentRootSelector = '#file-content';
  let speakSession = 0;
  let voiceSelect = null;
  let speechRateInput = null;
  let speechRateValueEl = null;
  let skipCodeBlocksCheckbox = null;

  function clampSpeechRate(n) {
    const x = Number(n);
    if (!Number.isFinite(x)) return 1;
    return Math.min(SPEECH_RATE_MAX, Math.max(SPEECH_RATE_MIN, x));
  }

  function escapeHtmlAttr(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function injectMarkup() {
    if (document.getElementById('voice-controller')) return;
    const mount = document.getElementById('voice-mount');
    if (!mount) return;

    const controller = document.createElement('div');
    controller.id = 'voice-controller';
    controller.className = VOICE_CONTROLLER_CLASS;
    controller.innerHTML = `
          <label for="voice-select" class="font-medium text-gray-700 dark:text-gray-400 shrink-0">Voice</label>
          <select id="voice-select"
            class="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:focus:ring-blue-400 dark:focus:border-blue-400 outline-none transition-colors"
            style="width: stretch;">
            <option value="">Select voice…</option>
            <option value="default">Default</option>
          </select>
          <label
            class="w-full flex items-center gap-1.5 cursor-pointer select-none text-gray-700 dark:text-gray-300 shrink-0">
            <input type="checkbox" id="skip-code-blocks"
              class="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 dark:bg-gray-800">
            <span>Skip code blocks</span>
          </label>
          <div class="w-full flex flex-col gap-1.5 mt-1">
            <div class="flex items-center justify-between gap-2">
              <label for="speech-rate" class="font-medium text-gray-700 dark:text-gray-400 text-xs shrink-0">Speech
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
          <button type="button" id="btn-play" title="Play"
            class="p-2 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5z" />
            </svg>
          </button>
          <button type="button" id="btn-pause" title="Pause"
            class="p-2 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>
          <button type="button" id="btn-resume" title="Resume"
            class="p-2 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7L8 5z" />
              <circle cx="18" cy="4" r="2" />
            </svg>
          </button>
          <button type="button" id="btn-stop" title="Stop"
            class="p-2 rounded text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>`;
    mount.replaceWith(controller);
  }

  function bindControls() {
    voiceSelect = document.getElementById('voice-select');
    speechRateInput = document.getElementById('speech-rate');
    speechRateValueEl = document.getElementById('speech-rate-value');
    skipCodeBlocksCheckbox = document.getElementById('skip-code-blocks');
    const btnPlay = document.getElementById('btn-play');
    const btnPause = document.getElementById('btn-pause');
    const btnResume = document.getElementById('btn-resume');
    const btnStop = document.getElementById('btn-stop');

    function populateVoices() {
      if (!voiceSelect) return;
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

    if (speechSynthesis.getVoices().length) {
      populateVoices();
    } else {
      speechSynthesis.addEventListener('voiceschanged', populateVoices);
    }

    if (voiceSelect) {
      voiceSelect.addEventListener('change', () => {
        const value = voiceSelect.value;
        if (value) localStorage.setItem(VOICE_STORAGE_KEY, value);
      });
    }

    const savedSkipCode = localStorage.getItem(SKIP_CODE_BLOCKS_KEY);
    if (skipCodeBlocksCheckbox) {
      skipCodeBlocksCheckbox.checked = savedSkipCode === 'true';
      skipCodeBlocksCheckbox.addEventListener('change', () => {
        localStorage.setItem(SKIP_CODE_BLOCKS_KEY, String(skipCodeBlocksCheckbox.checked));
      });
    }

    function formatSpeechRateDisplay(v) {
      const x = clampSpeechRate(v);
      return (Math.round(x * 10) / 10).toFixed(1) + '×';
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

    if (btnPlay) {
      btnPlay.addEventListener('click', () => {
        const chunks = getSpeakableContent();
        if (!chunks.length) return;
        speakText(chunks);
      });
    }

    if (btnPause) {
      btnPause.addEventListener('click', () => {
        if (speechSynthesis.speaking) speechSynthesis.pause();
      });
    }

    if (btnResume) {
      btnResume.addEventListener('click', () => {
        speechSynthesis.resume();
      });
    }

    if (btnStop) {
      btnStop.addEventListener('click', () => {
        stop();
      });
    }
  }

  function headingNeedsSpokenPeriod(text) {
    const t = String(text || '').trim();
    if (!t) return false;
    return !/[.!?…:;]$/.test(t);
  }

  function appendSpokenPeriodToHeading(heading) {
    const textEl = heading.querySelector('.md-heading-text') || heading;
    const t = (textEl.innerText || '').trim();
    if (headingNeedsSpokenPeriod(t)) {
      textEl.append('.');
    }
  }

  function prepareSpeakableClone(rootEl) {
    if (!rootEl) return null;
    const clone = rootEl.cloneNode(true);
    clone.querySelectorAll('.md-heading-actions').forEach((w) => w.remove());
    if (skipCodeBlocksCheckbox && skipCodeBlocksCheckbox.checked) {
      clone.querySelectorAll('pre').forEach((pre) => {
        pre.innerText = CODEBLOCK_ALTERNATIVE_TEXT;
      });
    }
    clone.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      appendSpokenPeriodToHeading(heading);
    });
    return clone;
  }

  function shouldSkipSpeakableEl(el) {
    if (!el || el.nodeType !== 1) return true;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'BUTTON' || tag === 'SVG' || tag === 'NOSCRIPT') return true;
    if (el.hasAttribute('hidden')) return true;
    if (el.classList.contains('hidden') || el.classList.contains('md-heading-actions')) return true;
    return false;
  }

  function pushSpeakableChunk(chunks, el, kind) {
    const text = (el.innerText || '').trim();
    if (text) chunks.push({ text, kind });
  }

  function collectSpeakableChunks(el, chunks) {
    if (shouldSkipSpeakableEl(el)) return;
    const tag = el.tagName;

    if (/^H[1-6]$/.test(tag)) {
      pushSpeakableChunk(chunks, el, 'heading');
      return;
    }

    if (tag === 'TABLE') {
      pushSpeakableChunk(chunks, el, 'block');
      return;
    }

    if (tag === 'LI') {
      if (el.querySelector('ul, ol, p')) {
        for (const child of el.childNodes) {
          if (child.nodeType === 3) {
            const t = String(child.textContent || '').trim();
            if (t) chunks.push({ text: t, kind: 'block' });
          } else if (child.nodeType === 1) {
            collectSpeakableChunks(child, chunks);
          }
        }
        return;
      }
      pushSpeakableChunk(chunks, el, 'block');
      return;
    }

    if (
      tag === 'P' ||
      tag === 'PRE' ||
      tag === 'BLOCKQUOTE' ||
      tag === 'FIGCAPTION' ||
      tag === 'CAPTION' ||
      tag === 'DT' ||
      tag === 'DD'
    ) {
      pushSpeakableChunk(chunks, el, 'block');
      return;
    }

    for (const child of el.children) {
      collectSpeakableChunks(child, chunks);
    }
  }

  function getSpeakableChunksFromRoot(rootEl) {
    const clone = prepareSpeakableClone(rootEl);
    if (!clone) return [];
    const chunks = [];
    collectSpeakableChunks(clone, chunks);
    return chunks;
  }

  function getSpeakableContent() {
    const el = document.querySelector(contentRootSelector);
    return getSpeakableChunksFromRoot(el);
  }

  function getHeadingLevel(tagName) {
    const m = /^H([1-6])$/i.exec(tagName || '');
    return m ? parseInt(m[1], 10) : 0;
  }

  /** Siblings after `heading` until the next heading of same or higher outline level. */
  function getSectionElementsAfterHeading(heading) {
    const level = getHeadingLevel(heading.tagName);
    const nodes = [];
    let n = heading.nextElementSibling;
    while (n) {
      const nextLevel = getHeadingLevel(n.tagName);
      if (nextLevel > 0 && nextLevel <= level) break;
      nodes.push(n);
      n = n.nextElementSibling;
    }
    return nodes;
  }

  function getSpeakableTextForHeadingSection(heading) {
    const wrap = document.createElement('div');
    wrap.appendChild(heading.cloneNode(true));
    getSectionElementsAfterHeading(heading).forEach((el) => {
      wrap.appendChild(el.cloneNode(true));
    });
    return getSpeakableChunksFromRoot(wrap);
  }

  /** Heading plus all following siblings inside the document (to end of article). */
  function getSpeakableTextFromHeadingToEnd(heading) {
    const wrap = document.createElement('div');
    wrap.appendChild(heading.cloneNode(true));
    let n = heading.nextElementSibling;
    while (n) {
      wrap.appendChild(n.cloneNode(true));
      n = n.nextElementSibling;
    }
    return getSpeakableChunksFromRoot(wrap);
  }

  function stop() {
    speakSession += 1;
    speechSynthesis.cancel();
  }

  function normalizeSpeakableChunks(textOrChunks) {
    if (Array.isArray(textOrChunks)) {
      return textOrChunks
        .map((c) => {
          if (c && typeof c === 'object' && 'text' in c) {
            const text = String(c.text || '').trim();
            return text ? { text, kind: c.kind === 'heading' ? 'heading' : 'block' } : null;
          }
          const text = String(c || '').trim();
          return text ? { text, kind: 'block' } : null;
        })
        .filter(Boolean);
    }
    const text = String(textOrChunks || '').trim();
    return text ? [{ text, kind: 'block' }] : [];
  }

  function speakText(textOrChunks) {
    const chunks = normalizeSpeakableChunks(textOrChunks);
    if (!chunks.length) return;
    stop();
    const session = speakSession;
    let i = 0;

    function speakNext() {
      if (session !== speakSession) return;
      if (i >= chunks.length) return;
      const chunk = chunks[i++];
      const u = new SpeechSynthesisUtterance(chunk.text);
      const voices = speechSynthesis.getVoices();
      const chosen = voiceSelect && voiceSelect.value && voices.find((v) => v.name === voiceSelect.value);
      if (chosen) u.voice = chosen;
      u.lang = 'en';
      if (speechRateInput) {
        u.rate = clampSpeechRate(parseFloat(speechRateInput.value));
      }
      u.onend = () => {
        if (session !== speakSession) return;
        const gap = chunk.kind === 'heading' ? SPEECH_GAP_AFTER_HEADING_MS : SPEECH_GAP_AFTER_BLOCK_MS;
        if (gap > 0) {
          setTimeout(speakNext, gap);
        } else {
          speakNext();
        }
      };
      u.onerror = () => {
        // Interrupted/cancelled utterances must not start the next chunk.
      };
      speechSynthesis.speak(u);
    }

    speakNext();
  }

  function enhance(container) {
    if (!container) return;
    container.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((heading) => {
      if (heading.querySelector('.md-heading-actions')) return;
      heading.classList.add('md-heading-with-play');

      const textWrap = document.createElement('span');
      textWrap.className = 'md-heading-text';
      while (heading.firstChild) {
        textWrap.appendChild(heading.firstChild);
      }

      const actions = document.createElement('span');
      actions.className = 'md-heading-actions';
      actions.setAttribute('role', 'group');
      actions.setAttribute('aria-label', 'Speech playback for this heading');

      const btnSection = document.createElement('button');
      btnSection.type = 'button';
      btnSection.className = HEADING_AUDIO_BTN_CLASS;
      btnSection.setAttribute('aria-label', 'Play section from this heading');
      btnSection.title = 'Play this section';
      btnSection.innerHTML = SECTION_PLAY_SVG;
      btnSection.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        speakText(getSpeakableTextForHeadingSection(heading));
      });

      const btnToEnd = document.createElement('button');
      btnToEnd.type = 'button';
      btnToEnd.className = HEADING_AUDIO_BTN_CLASS;
      btnToEnd.setAttribute('aria-label', 'Play from this heading to end of document');
      btnToEnd.title = 'Play from here to end';
      btnToEnd.innerHTML = SECTION_PLAY_TO_END_SVG;
      btnToEnd.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        speakText(getSpeakableTextFromHeadingToEnd(heading));
      });

      actions.appendChild(btnSection);
      actions.appendChild(btnToEnd);
      heading.appendChild(textWrap);
      heading.appendChild(actions);
    });
  }

  function init(options) {
    contentRootSelector =
      typeof options?.contentRootSelector === 'string' && options.contentRootSelector
        ? options.contentRootSelector
        : '#file-content';
    injectMarkup();
    bindControls();
  }

  global.ViewerVoice = {
    init,
    enhance,
    stop,
  };
})(typeof window !== 'undefined' ? window : globalThis);
