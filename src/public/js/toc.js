(function (global) {
  'use strict';

  const TOC_SIDEBAR_CLASS =
    'panel-drawer panel-drawer-left toc-sidebar no-print hidden fixed inset-y-0 left-0 z-50 w-[min(85vw,18rem)] p-4 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 shadow-lg lg:static lg:inset-auto lg:z-auto lg:w-48 lg:shrink-0 lg:p-0 lg:shadow-none lg:border-0';

  let closeMobilePanels = () => { };
  let onHashChange = () => { };

  function slugify(text) {
    return String(text || '')
      .trim()
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'section';
  }

  function assignHeadingIds(contentEl) {
    if (!contentEl) return;
    const used = Object.create(null);
    contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
      const base = (h.id && slugify(h.id)) || slugify(h.textContent);
      let n = used[base] || 0;
      const id = n === 0 ? base : base + '-' + n;
      used[base] = n + 1;
      h.id = id;
    });
  }

  function injectMarkup() {
    if (document.getElementById('toc-sidebar')) return;
    const mount = document.getElementById('toc-mount');
    if (!mount) return;

    const aside = document.createElement('aside');
    aside.id = 'toc-sidebar';
    aside.className = TOC_SIDEBAR_CLASS;
    mount.replaceWith(aside);
  }

  function headingsToItems(contentEl) {
    assignHeadingIds(contentEl);
    return Array.from(contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6')).map((h) => ({
      id: h.id,
      text: h.textContent,
      level: parseInt(h.tagName.charAt(1), 10),
    }));
  }

  function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items.map((item) => {
      const level = Math.min(6, Math.max(1, parseInt(item && item.level, 10) || 2));
      const text = String((item && item.text) || '');
      return {
        id: String((item && item.id) || slugify(text)),
        text,
        level,
        active: Boolean(item && item.active),
        onSelect: typeof item?.onSelect === 'function' ? item.onSelect : null,
      };
    });
  }

  function hideSidebar(tocSidebar) {
    tocSidebar.innerHTML = '';
    tocSidebar.classList.add('hidden');
  }

  function buildItems(rawItems) {
    const tocSidebar = document.getElementById('toc-sidebar');
    if (!tocSidebar) return;

    const items = normalizeItems(rawItems);
    if (items.length === 0) {
      hideSidebar(tocSidebar);
      return;
    }

    let minLevel = 6;
    items.forEach((item) => {
      if (item.level < minLevel) minLevel = item.level;
    });

    const counters = [0, 0, 0, 0, 0, 0];
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Table of contents');
    items.forEach((item) => {
      const index = item.level - 1;
      counters[index]++;
      for (let i = index + 1; i < 6; i++) counters[i] = 0;
      const number = counters.slice(minLevel - 1, index + 1).join('.');

      const a = document.createElement('a');
      a.href = '#' + item.id;
      const num = document.createElement('span');
      num.className = 'toc-num';
      num.textContent = number + ' ';
      const label = document.createElement('span');
      label.textContent = item.text;
      a.appendChild(num);
      a.appendChild(label);
      a.classList.add('toc-h' + item.level, 'hover:text-blue-600', 'dark:hover:text-blue-400');
      if (item.active) {
        a.classList.add('is-active');
        a.setAttribute('aria-current', 'true');
      }
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (item.onSelect) {
          item.onSelect(item);
          closeMobilePanels();
          return;
        }
        document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
        history.replaceState(null, '', window.location.pathname + window.location.search + '#' + item.id);
        onHashChange(item.id);
        closeMobilePanels();
      });
      nav.appendChild(a);
    });

    const title = document.createElement('div');
    title.className = 'font-medium mb-2 text-gray-700 dark:text-gray-400';
    title.textContent = 'Table of Contents';

    tocSidebar.innerHTML = '';
    tocSidebar.appendChild(title);
    tocSidebar.appendChild(nav);
    tocSidebar.classList.remove('hidden');
  }

  function build(contentEl) {
    if (!contentEl) {
      buildItems([]);
      return;
    }
    buildItems(headingsToItems(contentEl));
  }

  function init(options) {
    closeMobilePanels = typeof options?.closeMobilePanels === 'function'
      ? options.closeMobilePanels
      : () => { };
    onHashChange = typeof options?.onHashChange === 'function'
      ? options.onHashChange
      : () => { };
    injectMarkup();
  }

  global.ViewerToc = {
    init,
    build,
    buildItems,
  };
})(typeof window !== 'undefined' ? window : globalThis);
