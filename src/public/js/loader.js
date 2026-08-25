(function (global) {
  'use strict';

  const states = new WeakMap();

  function resolveTarget(target) {
    if (!target) return null;
    if (typeof target === 'string') {
      return document.querySelector(target);
    }
    if (target.nodeType === 1) {
      return target;
    }
    return null;
  }

  function getState(el) {
    let state = states.get(el);
    if (!state) {
      state = { count: 0, node: null, addedHostClass: false, addedInlineHostClass: false };
      states.set(el, state);
    }
    return state;
  }

  function createLoaderNode(variant, message) {
    const wrap = document.createElement('span');
    wrap.className = variant === 'inline'
      ? 'viewer-loader viewer-loader--inline no-print'
      : 'viewer-loader viewer-loader--overlay no-print bg-white/70 text-gray-700 dark:bg-gray-950/70 dark:text-gray-300';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('data-viewer-loader', variant);

    const spinner = document.createElement('span');
    spinner.className = 'viewer-loader-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    wrap.appendChild(spinner);

    const label = document.createElement('span');
    label.className = variant === 'inline' ? 'viewer-loader-sr-only' : 'viewer-loader-message';
    label.textContent = message || 'Loading…';
    wrap.appendChild(label);
    return wrap;
  }

  function ensureLoaderNode(target, state, variant, message) {
    let node = state.node;
    if (!node || !target.contains(node)) {
      node = target.querySelector(`[data-viewer-loader="${variant}"]`);
    }
    if (!node || !target.contains(node)) {
      node = createLoaderNode(variant, message);
      target.appendChild(node);
    } else {
      const label = node.querySelector('.viewer-loader-message, .viewer-loader-sr-only');
      if (label) {
        label.textContent = message || 'Loading…';
      }
    }
    state.node = node;
    return node;
  }

  function show(target, options) {
    const el = resolveTarget(target);
    if (!el) return;
    const variant = options && options.variant === 'inline' ? 'inline' : 'overlay';
    const message = options && options.message ? String(options.message) : 'Loading…';
    const state = getState(el);

    state.count += 1;
    if (variant === 'overlay') {
      if (!el.classList.contains('viewer-loader-host')) {
        el.classList.add('viewer-loader-host');
        state.addedHostClass = true;
      }
    } else if (el.tagName === 'BUTTON' && !el.classList.contains('viewer-loader-inline-host')) {
      el.classList.add('viewer-loader-inline-host');
      state.addedInlineHostClass = true;
    }

    ensureLoaderNode(el, state, variant, message);
    el.setAttribute('aria-busy', 'true');
  }

  function hide(target) {
    const el = resolveTarget(target);
    if (!el) return;
    const state = states.get(el);
    if (!state || state.count <= 0) {
      cleanup(el, state);
      return;
    }

    state.count -= 1;
    if (state.count > 0) {
      if (state.node && !el.contains(state.node)) {
        const variant = state.node.getAttribute('data-viewer-loader') || 'overlay';
        ensureLoaderNode(el, state, variant, 'Loading…');
      }
      return;
    }

    state.count = 0;
    cleanup(el, state);
  }

  function cleanup(el, state) {
    if (!el) return;
    const node = state && state.node && el.contains(state.node)
      ? state.node
      : el.querySelector('[data-viewer-loader]');
    if (node) {
      node.remove();
    }
    el.removeAttribute('aria-busy');
    if (state) {
      if (state.addedHostClass) {
        el.classList.remove('viewer-loader-host');
        state.addedHostClass = false;
      }
      if (state.addedInlineHostClass) {
        el.classList.remove('viewer-loader-inline-host');
        state.addedInlineHostClass = false;
      }
      state.node = null;
      state.count = 0;
    }
  }

  global.ViewerLoader = {
    show,
    hide,
  };
})(typeof window !== 'undefined' ? window : globalThis);
