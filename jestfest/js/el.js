// Jest Fest — tiny DOM helper.
//
// PROTOCOL.md §7: "api.el(tag, props, ...kids) -> tiny DOM helper the shell
// exposes; use it instead of innerHTML." Every renderer in this client
// (landing page, display, controller, and any future jestfest/games/*.js
// module) should build elements through this, never through innerHTML —
// player names and answers are attacker-controlled text and must only ever
// land in textContent. See Jest fest-spec.md §3.2 and the "Security"
// requirement in the build brief.

/**
 * @param {string} tag
 * @param {object|null} props  DOM properties/attributes/listeners. Keys
 *   starting with "on" + a function become addEventListener. "class" sets
 *   className. "style" as an object is Object.assign'd onto node.style.
 *   Anything else is set as a property when the property exists on the
 *   node, otherwise as an attribute (this is what makes `for`, aria-*, and
 *   svg-only attributes work without special-casing them here).
 * @param {...(Node|string|number|Array|null|false)} kids
 * @returns {HTMLElement}
 */
export function el(tag, props, ...kids) {
  const node = document.createElement(tag);
  applyProps(node, props);
  appendKids(node, kids);
  return node;
}

/** Same as el(), but builds inside the SVG namespace. */
export function svgEl(tag, props, ...kids) {
  const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
  applyProps(node, props);
  appendKids(node, kids);
  return node;
}

function applyProps(node, props) {
  if (!props) return;
  for (const key of Object.keys(props)) {
    const value = props[key];
    if (value == null || value === false) continue;
    if (key === 'class' || key === 'className') {
      node.setAttribute('class', value);
    } else if (key === 'style' && typeof value === 'object') {
      Object.assign(node.style, value);
    } else if (key === 'dataset' && typeof value === 'object') {
      for (const dk of Object.keys(value)) node.dataset[dk] = value[dk];
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node) {
      try { node[key] = value; } catch { node.setAttribute(key, value); }
    } else {
      node.setAttribute(key, value);
    }
  }
}

function appendKids(node, kids) {
  for (const kid of kids) {
    if (kid == null || kid === false) continue;
    if (Array.isArray(kid)) { appendKids(node, kid); continue; }
    node.appendChild(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
}

/** Removes every child of a node — the safe, innerHTML-free way to clear a mount point. */
export function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

// ---------------------------------------------------------------------
// Icons
//
// The design system is explicit: "No emoji. Ever. No unicode pictographs
// either." (readme.md, ICONOGRAPHY) — every glyph in this client is one of
// these inline 24x24 stroke icons (Lucide geometry, stroke-width 2, fill
// none, round caps/joins), never a unicode character standing in for one.
// ---------------------------------------------------------------------

const ICONS = {
  check: () => [svgEl('polyline', { points: '20 6 9 17 4 12' })],
  arrowRight: () => [
    svgEl('line', { x1: '5', y1: '12', x2: '19', y2: '12' }),
    svgEl('polyline', { points: '12 5 19 12 12 19' }),
  ],
};

/** Builds one inline stroke icon. `name` is one of ICONS above. */
export function icon(name, { size = 24, color = 'currentColor' } = {}) {
  const build = ICONS[name];
  if (!build) throw new Error(`el.js: unknown icon "${name}"`);
  return svgEl('svg', {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
    stroke: color, 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  }, ...build());
}
