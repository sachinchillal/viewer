(function (global) {
  'use strict';

  const EXPLORER_VIEW_KEY = 'explorerViewMode';
  const TOOLBAR_BTN_CLASS =
    'p-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors';
  const EXPLORER_MODE_ACTIVE_CLASSES = [
    '!bg-gray-200',
    '!border-gray-400',
    'dark:!bg-gray-700',
    'dark:!border-gray-500',
  ];

  let apiBaseUrl = '';
  let onNavigate = () => { };
  let onFileData = () => { };
  let onEmpty = () => { };

  let explorerViewMode = localStorage.getItem(EXPLORER_VIEW_KEY) === 'tree' ? 'tree' : 'list';
  let treeData = [];
  let treeBase = '';
  let expandedPaths = new Set();
  let activeTreePath = null;
  let currentRootDirectory = '';
  let viewingFile = false;

  function escapeHtmlAttr(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeHtmlText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatApiError(data, status) {
    if (data?.error && data?.path) {
      return `${data.error}: ${data.path}`;
    }
    if (data?.error) {
      return data.error;
    }
    if (data?.message) {
      return data.message;
    }
    return `Request failed (${status})`;
  }

  function showExplorerError(message) {
    const el = document.getElementById('explorer-error');
    if (!el) return;
    if (!message) {
      el.textContent = '';
      el.classList.add('hidden');
      return;
    }
    el.textContent = message;
    el.classList.remove('hidden');
  }

  function injectMarkup() {
    const mount = document.getElementById('explorer-mount');
    if (!mount || document.getElementById('directories-list')) return;

    mount.innerHTML = `
      <div class="flex items-center gap-2">
        <label for="directories-list" class="font-medium text-gray-700 dark:text-gray-400 shrink-0">File Explorer</label>
        <span id="explorer-loading" class="no-print text-gray-500 dark:text-gray-400" aria-hidden="true"></span>
      </div>
      <div class="mt-1 mb-1 flex flex-wrap gap-1 no-print" role="toolbar" aria-label="File explorer controls">
        <button type="button" id="btn-explorer-list" title="List view" aria-label="List view" class="${TOOLBAR_BTN_CLASS}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <button type="button" id="btn-explorer-tree" title="Tree view" aria-label="Tree view" class="${TOOLBAR_BTN_CLASS}">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h6M4 12h6M4 18h6M14 6v12M14 12h6" />
          </svg>
        </button>
        <button type="button" id="btn-expand-all" title="Expand all" aria-label="Expand all" class="${TOOLBAR_BTN_CLASS} hidden">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8l8-5 8 5M4 16l8 5 8-5M4 12h16" />
          </svg>
        </button>
        <button type="button" id="btn-collapse-all" title="Collapse all" aria-label="Collapse all" class="${TOOLBAR_BTN_CLASS} hidden">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 8l8 5 8-5M4 16l8-5 8 5" />
          </svg>
        </button>
      </div>
      <p id="explorer-error" class="mt-1 text-sm text-red-600 dark:text-red-400 hidden no-print" role="alert"></p>
      <div id="directories-list" class="no-print overflow-x-auto"></div>`;
  }

  function updateExplorerModeUI() {
    const listBtn = document.getElementById('btn-explorer-list');
    const treeBtn = document.getElementById('btn-explorer-tree');
    const expandBtn = document.getElementById('btn-expand-all');
    const collapseBtn = document.getElementById('btn-collapse-all');
    const isTree = explorerViewMode === 'tree';
    function toggleModeActive(el, isActive) {
      if (!el) return;
      EXPLORER_MODE_ACTIVE_CLASSES.forEach((cls) => el.classList.toggle(cls, isActive));
    }
    if (listBtn) {
      toggleModeActive(listBtn, explorerViewMode === 'list');
      listBtn.setAttribute('aria-pressed', explorerViewMode === 'list' ? 'true' : 'false');
    }
    if (treeBtn) {
      toggleModeActive(treeBtn, isTree);
      treeBtn.setAttribute('aria-pressed', isTree ? 'true' : 'false');
    }
    if (expandBtn) {
      expandBtn.classList.toggle('hidden', !isTree);
    }
    if (collapseBtn) {
      collapseBtn.classList.toggle('hidden', !isTree);
    }
  }

  function setExplorerViewMode(mode) {
    if (mode !== 'list' && mode !== 'tree') return;
    if (explorerViewMode === mode) return;
    explorerViewMode = mode;
    localStorage.setItem(EXPLORER_VIEW_KEY, mode);
    updateExplorerModeUI();
    load(currentRootDirectory);
  }

  function joinTreePath(prefix, name) {
    return prefix ? `${prefix}/${name}` : name;
  }

  function collectDirectoryPaths(nodes, prefix, into) {
    if (!Array.isArray(nodes)) return;
    for (const node of nodes) {
      const nodePath = joinTreePath(prefix, node.name);
      if (node.type === 'directory') {
        into.add(nodePath);
        collectDirectoryPaths(node.children, nodePath, into);
      }
    }
  }

  function expandAncestorsOf(filePath) {
    const parts = String(filePath || '').split('/').filter(Boolean);
    let acc = '';
    for (let i = 0; i < parts.length - 1; i++) {
      acc = acc ? `${acc}/${parts[i]}` : parts[i];
      expandedPaths.add(acc);
    }
  }

  function expandAllTree() {
    const all = new Set();
    collectDirectoryPaths(treeData, treeBase, all);
    expandedPaths = all;
    renderTree(treeData, activeTreePath);
  }

  function collapseAllTree() {
    expandedPaths = new Set();
    renderTree(treeData, activeTreePath);
  }

  function toggleTreePath(path) {
    if (!path) return;
    if (expandedPaths.has(path)) {
      expandedPaths.delete(path);
    } else {
      expandedPaths.add(path);
    }
    renderTree(treeData, activeTreePath);
  }

  function renderDirectories(directories, activeName = null) {
    const directoriesList = document.getElementById('directories-list');
    if (!directoriesList) return;
    const items = directories.map((directory) => {
      const isParent = directory === '..';
      const displayName = isParent ? '.. (go back)' : directory;
      const isActive = activeName && directory === activeName;
      const activeClass = isActive
        ? ' font-semibold text-blue-600 dark:text-blue-400'
        : '';
      const escapedDirectory = escapeHtmlAttr(directory);
      return `<li class="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline py-1 text-inherit${activeClass}" data-directory="${escapedDirectory}">${escapeHtmlText(displayName)}</li>`;
    }).join('');
    directoriesList.innerHTML = `<ol class="explorer-list marker:text-gray-400">${items}</ol>`;
  }

  function renderTreeNodes(nodes, prefix, activePath) {
    if (!Array.isArray(nodes) || nodes.length === 0) return '';
    return nodes.map((node) => {
      const nodePath = joinTreePath(prefix, node.name);
      const isDir = node.type === 'directory';
      const isExpanded = isDir && expandedPaths.has(nodePath);
      const isActive = activePath && nodePath === activePath;
      const chevron = isDir
        ? `<span class="explorer-tree-chevron text-gray-500 dark:text-gray-400" data-tree-toggle="${escapeHtmlAttr(nodePath)}" aria-hidden="true">${isExpanded ? '▼' : '▶'}</span>`
        : '<span class="explorer-tree-spacer" aria-hidden="true"></span>';
      const childrenHtml = isDir && isExpanded
        ? `<ul class="explorer-tree">${renderTreeNodes(node.children || [], nodePath, activePath)}</ul>`
        : '';
      const labelClass = isActive
        ? 'explorer-tree-label font-semibold text-blue-600 dark:text-blue-400'
        : 'explorer-tree-label group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline';
      return `<li>
          <div class="explorer-tree-item group" data-tree-path="${escapeHtmlAttr(nodePath)}" data-tree-type="${isDir ? 'directory' : 'file'}" title="${escapeHtmlAttr(node.name)}">
            ${chevron}
            <span class="${labelClass}">${escapeHtmlText(node.name)}</span>
          </div>
          ${childrenHtml}
        </li>`;
    }).join('');
  }

  function renderTree(nodes, activePath = null) {
    const directoriesList = document.getElementById('directories-list');
    if (!directoriesList) return;
    const parentRow = `<li>
        <div class="explorer-tree-item group" data-directory=".." title="Go back">
          <span class="explorer-tree-spacer" aria-hidden="true"></span>
          <span class="explorer-tree-label group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">.. (go back)</span>
        </div>
      </li>`;
    directoriesList.innerHTML = `<ul class="explorer-tree">${parentRow}${renderTreeNodes(nodes, treeBase, activePath)}</ul>`;
  }

  function navigateToRoot(nextRoot) {
    return load(nextRoot).then((ok) => {
      if (ok) {
        currentRootDirectory = nextRoot;
        onNavigate(nextRoot);
      }
      return ok;
    });
  }

  function handleTreeFileClick(path) {
    load(path, { preserveTree: true }).then((ok) => {
      if (ok) {
        currentRootDirectory = path;
        onNavigate(path);
      }
    });
  }

  function handleDirectoryClick(directory) {
    let nextRoot;
    if (directory === '..') {
      if (currentRootDirectory === '') {
        nextRoot = '..';
      } else {
        const pathParts = currentRootDirectory.split('/').filter((p) => p);
        if (pathParts.length > 0 && pathParts[pathParts.length - 1] !== '..') {
          pathParts.pop();
          nextRoot = pathParts.length > 0 ? pathParts.join('/') : '';
        } else {
          nextRoot = currentRootDirectory ? `${currentRootDirectory}/..` : '..';
        }
      }
    } else if (viewingFile) {
      const pathParts = currentRootDirectory.split('/').filter((p) => p);
      pathParts.pop();
      const parent = pathParts.length > 0 ? pathParts.join('/') : '';
      nextRoot = parent ? `${parent}/${directory}` : directory;
    } else {
      nextRoot = currentRootDirectory
        ? `${currentRootDirectory}/${directory}`
        : directory;
    }
    navigateToRoot(nextRoot);
  }

  function showLoaders() {
    if (!global.ViewerLoader) return;
    global.ViewerLoader.show('#explorer-loading', { variant: 'inline' });
    global.ViewerLoader.show('#file-content');
  }

  function hideLoaders() {
    if (!global.ViewerLoader) return;
    global.ViewerLoader.hide('#explorer-loading');
    global.ViewerLoader.hide('#file-content');
  }

  function load(root = '', options = {}) {
    const preserveTree = Boolean(options.preserveTree)
      && explorerViewMode === 'tree'
      && treeData.length > 0;
    const wantTree = explorerViewMode === 'tree' && !preserveTree;
    let url = `${apiBaseUrl}/directories`;
    const params = [];
    if (root) params.push(`root=${encodeURIComponent(root)}`);
    if (wantTree) params.push('tree=1');
    if (params.length) url += '?' + params.join('&');

    showLoaders();
    return fetch(url, { cache: 'no-store' })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          showExplorerError(formatApiError(data, response.status));
          return false;
        }
        showExplorerError('');
        viewingFile = Boolean(data.fileContent);

        if (explorerViewMode === 'tree') {
          const keepTree = preserveTree && viewingFile;
          if (!keepTree) {
            treeData = Array.isArray(data.tree) ? data.tree : [];
            treeBase = typeof data.treeBase === 'string' ? data.treeBase : '';
          }
          activeTreePath = viewingFile ? root : null;
          if (activeTreePath) {
            expandAncestorsOf(activeTreePath);
          }
          renderTree(treeData, activeTreePath);
        } else {
          const list = Array.isArray(data.list) ? data.list : [];
          const directories = ['..', ...list];
          const activeName = viewingFile
            ? root.split('/').filter(Boolean).pop() || null
            : null;
          renderDirectories(directories, activeName);
        }

        if (data.fileContent) {
          onFileData(data, root);
        } else {
          onEmpty();
        }
        return true;
      })
      .catch((error) => {
        showExplorerError('Failed to fetch directories');
        console.error('Error fetching directories:', error);
        return false;
      })
      .finally(() => {
        hideLoaders();
      });
  }

  function bindEvents() {
    const directoriesList = document.getElementById('directories-list');
    if (directoriesList && !directoriesList.dataset.explorerBound) {
      directoriesList.dataset.explorerBound = 'true';
      directoriesList.addEventListener('click', (e) => {
        const treeToggle = e.target.closest('[data-tree-toggle]');
        if (treeToggle) {
          e.preventDefault();
          e.stopPropagation();
          toggleTreePath(treeToggle.getAttribute('data-tree-toggle'));
          return;
        }
        const treeItem = e.target.closest('[data-tree-path]');
        if (treeItem) {
          const path = treeItem.getAttribute('data-tree-path');
          const type = treeItem.getAttribute('data-tree-type');
          if (type === 'directory') {
            toggleTreePath(path);
          } else {
            handleTreeFileClick(path);
          }
          return;
        }
        const listItem = e.target.closest('[data-directory]');
        if (listItem && listItem.dataset.directory) {
          handleDirectoryClick(listItem.dataset.directory);
        }
      });
    }

    document.getElementById('btn-explorer-list')?.addEventListener('click', () => {
      setExplorerViewMode('list');
    });
    document.getElementById('btn-explorer-tree')?.addEventListener('click', () => {
      setExplorerViewMode('tree');
    });
    document.getElementById('btn-expand-all')?.addEventListener('click', () => {
      expandAllTree();
    });
    document.getElementById('btn-collapse-all')?.addEventListener('click', () => {
      collapseAllTree();
    });
  }

  function init(options) {
    apiBaseUrl = options?.apiBaseUrl || apiBaseUrl;
    onNavigate = typeof options?.onNavigate === 'function' ? options.onNavigate : () => { };
    onFileData = typeof options?.onFileData === 'function' ? options.onFileData : () => { };
    onEmpty = typeof options?.onEmpty === 'function' ? options.onEmpty : () => { };

    injectMarkup();
    bindEvents();
    updateExplorerModeUI();
  }

  function getCurrentRoot() {
    return currentRootDirectory;
  }

  function setCurrentRoot(root) {
    currentRootDirectory = root || '';
  }

  global.ViewerExplorer = {
    init,
    load,
    getCurrentRoot,
    setCurrentRoot,
  };
})(typeof window !== 'undefined' ? window : globalThis);
