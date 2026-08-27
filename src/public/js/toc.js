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

  function headingLevel(h) {
    return parseInt(h.tagName.charAt(1), 10) - 1;
  }

  function build(contentEl) {
    const tocSidebar = document.getElementById('toc-sidebar');
    if (!tocSidebar) return;

    const headings = contentEl ? contentEl.querySelectorAll('h1, h2, h3, h4, h5, h6') : [];
    if (headings.length === 0) {
      tocSidebar.innerHTML = '';
      tocSidebar.classList.add('hidden');
      return;
    }

    assignHeadingIds(contentEl);

    let minLevel = 5;
    headings.forEach((h) => {
      const level = headingLevel(h);
      if (level < minLevel) minLevel = level;
    });

    const counters = [0, 0, 0, 0, 0, 0];
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Table of contents');
    headings.forEach((h) => {
      const id = h.id;
      const level = headingLevel(h);
      counters[level]++;
      for (let i = level + 1; i < 6; i++) counters[i] = 0;
      const number = counters.slice(minLevel, level + 1).join('.');

      const a = document.createElement('a');
      a.href = '#' + id;
      const num = document.createElement('span');
      num.className = 'toc-num';
      num.textContent = number + ' ';
      const label = document.createElement('span');
      label.textContent = h.textContent;
      a.appendChild(num);
      a.appendChild(label);
      a.classList.add('toc-' + h.tagName.toLowerCase(), 'hover:text-blue-600', 'dark:hover:text-blue-400');
      a.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
        history.replaceState(null, '', window.location.pathname + window.location.search + '#' + id);
        onHashChange(id);
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
  };
})(typeof window !== 'undefined' ? window : globalThis);
