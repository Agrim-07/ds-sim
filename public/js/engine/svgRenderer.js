import { svg } from '../core/dom.js';

const SHAPES = Object.freeze({ circle: { hw: 22, hh: 22 }, rect: { hw: 26, hh: 20 } });
const PADDING = 40;
const MIN_WIDTH = 520;
const MIN_HEIGHT = 300;

let instanceCount = 0;

const ease = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (from, to, t) => from + (to - from) * t;
const labelWidth = (text) => text.length * 7.6 + 16;
const shapeOf = (data) => SHAPES[data.shape] ?? SHAPES.circle;

/**
 * Draws scenes ({ nodes, edges, labels }) into an <svg> and animates between them.
 * Elements are matched by id, so a node that changes position glides to its new place,
 * new nodes fade in and removed nodes fade out. Edges are recomputed every animation
 * tick from the current node positions, so they follow moving nodes.
 */
export class SvgRenderer {
  #svg;
  #layers;
  #items = new Map();
  #edges = new Map();
  #view = { x: -MIN_WIDTH / 2, y: -MIN_HEIGHT / 2, w: MIN_WIDTH, h: MIN_HEIGHT };
  #viewFrom = this.#view;
  #viewTo = this.#view;
  #frameRequest = 0;
  #markerId;

  constructor(svgElement) {
    instanceCount += 1;
    this.#markerId = `ds-arrow-${instanceCount}`;
    this.#svg = svgElement;
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const marker = svg(
      'marker',
      { id: this.#markerId, viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' },
      svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'edge-arrow' }),
    );
    this.#layers = { edges: svg('g', { class: 'layer-edges' }), nodes: svg('g', { class: 'layer-nodes' }), labels: svg('g', { class: 'layer-labels' }) };
    svgElement.replaceChildren(svg('defs', {}, marker), this.#layers.edges, this.#layers.nodes, this.#layers.labels);
    this.#applyView();
  }

  render(scene, duration = 400) {
    cancelAnimationFrame(this.#frameRequest);

    const seen = new Set();
    for (const node of scene.nodes) this.#upsert(node, 'node', seen);
    for (const label of scene.labels ?? []) this.#upsert(label, 'label', seen);
    for (const [id, item] of this.#items) {
      if (seen.has(id)) continue;
      item.from = { ...item.current };
      item.to = { ...item.current, o: 0 };
      item.leaving = true;
    }

    this.#syncEdges(scene.edges ?? []);
    this.#viewFrom = { ...this.#view };
    this.#viewTo = this.#fit(scene);
    this.#animate(duration);
  }

  destroy() {
    cancelAnimationFrame(this.#frameRequest);
    this.#items.clear();
    this.#edges.clear();
  }

  #upsert(data, kind, seen) {
    seen.add(data.id);
    let item = this.#items.get(data.id);
    if (!item || item.kind !== kind || (kind === 'node' && item.data.shape !== data.shape)) {
      item?.element.remove();
      const element = kind === 'node' ? this.#createNode(data) : this.#createLabel();
      this.#layers[kind === 'node' ? 'nodes' : 'labels'].append(element);
      item = { kind, element, current: { x: data.x, y: data.y, o: 0 } };
      this.#items.set(data.id, item);
    }
    item.leaving = false;
    item.data = data;
    item.from = { ...item.current };
    item.to = { x: data.x, y: data.y, o: 1 };
    if (kind === 'node') this.#updateNode(item.element, data);
    else this.#updateLabel(item.element, data);
  }

  #createNode(data) {
    const { hw, hh } = shapeOf(data);
    const body =
      data.shape === 'rect'
        ? svg('rect', { class: 'node-body', x: -hw, y: -hh, width: hw * 2, height: hh * 2, rx: 8 })
        : svg('circle', { class: 'node-body', r: hw });
    return svg(
      'g',
      {},
      body,
      svg('text', { class: 'node-label', 'text-anchor': 'middle', 'dominant-baseline': 'central' }),
      svg('text', { class: 'node-caption', 'text-anchor': 'middle', y: hh + 15 }),
    );
  }

  #updateNode(element, data) {
    const classes = ['node', `shape-${data.shape}`, `state-${data.state}`];
    if (data.variant) classes.push(`variant-${data.variant}`);
    element.setAttribute('class', classes.join(' '));
    element.querySelector('.node-label').textContent = data.label;
    element.querySelector('.node-caption').textContent = data.caption;
  }

  #createLabel() {
    return svg(
      'g',
      {},
      svg('rect', { class: 'tag-bg', height: 24, y: -12, rx: 12 }),
      svg('text', { class: 'tag-text', 'text-anchor': 'middle', 'dominant-baseline': 'central' }),
    );
  }

  #updateLabel(element, data) {
    element.setAttribute('class', `tag kind-${data.kind}`);
    const width = labelWidth(data.text);
    const background = element.querySelector('.tag-bg');
    background.setAttribute('width', width);
    background.setAttribute('x', -width / 2);
    element.querySelector('.tag-text').textContent = data.text;
  }

  #syncEdges(edges) {
    const wanted = new Set();
    for (const edge of edges) {
      wanted.add(edge.id);
      let entry = this.#edges.get(edge.id);
      if (!entry) {
        entry = { element: svg('line', {}) };
        this.#layers.edges.append(entry.element);
        this.#edges.set(edge.id, entry);
      }
      entry.data = edge;
      entry.element.setAttribute('class', `edge state-${edge.state}`);
      if (edge.directed) entry.element.setAttribute('marker-end', `url(#${this.#markerId})`);
      else entry.element.removeAttribute('marker-end');
    }
    for (const [id, entry] of this.#edges) {
      if (!wanted.has(id)) {
        entry.element.remove();
        this.#edges.delete(id);
      }
    }
  }

  #animate(duration) {
    const start = performance.now();
    const step = (now) => {
      const t = duration > 0 ? Math.min(1, (now - start) / duration) : 1;
      const k = ease(t);
      for (const item of this.#items.values()) {
        item.current = {
          x: lerp(item.from.x, item.to.x, k),
          y: lerp(item.from.y, item.to.y, k),
          o: lerp(item.from.o, item.to.o, k),
        };
        item.element.setAttribute('transform', `translate(${item.current.x.toFixed(1)} ${item.current.y.toFixed(1)})`);
        item.element.setAttribute('opacity', item.current.o.toFixed(3));
      }
      this.#drawEdges();
      this.#view = {
        x: lerp(this.#viewFrom.x, this.#viewTo.x, k),
        y: lerp(this.#viewFrom.y, this.#viewTo.y, k),
        w: lerp(this.#viewFrom.w, this.#viewTo.w, k),
        h: lerp(this.#viewFrom.h, this.#viewTo.h, k),
      };
      this.#applyView();
      if (t < 1) this.#frameRequest = requestAnimationFrame(step);
      else this.#removeLeavingItems();
    };
    if (duration > 0) this.#frameRequest = requestAnimationFrame(step);
    else step(start);
  }

  #drawEdges() {
    for (const { element, data } of this.#edges.values()) {
      const from = this.#items.get(data.from);
      const to = this.#items.get(data.to);
      if (!from || !to) {
        element.setAttribute('opacity', '0');
        continue;
      }
      const dx = to.current.x - from.current.x;
      const dy = to.current.y - from.current.y;
      const start = this.#boundaryOffset(from.data, dx, dy);
      const end = this.#boundaryOffset(to.data, -dx, -dy);
      element.setAttribute('x1', (from.current.x + start.x).toFixed(1));
      element.setAttribute('y1', (from.current.y + start.y).toFixed(1));
      element.setAttribute('x2', (to.current.x + end.x).toFixed(1));
      element.setAttribute('y2', (to.current.y + end.y).toFixed(1));
      element.setAttribute('opacity', Math.min(from.current.o, to.current.o).toFixed(3));
    }
  }

  /** Point on the node's outline in the direction (dx, dy), relative to its centre. */
  #boundaryOffset(data, dx, dy) {
    const { hw, hh } = shapeOf(data);
    if (dx === 0 && dy === 0) return { x: 0, y: 0 };
    if (data.shape === 'rect') {
      const scale = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
      return { x: dx * scale, y: dy * scale };
    }
    const length = Math.hypot(dx, dy);
    return { x: (dx / length) * hw, y: (dy / length) * hw };
  }

  #fit(scene) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const node of scene.nodes) {
      const { hw, hh } = shapeOf(node);
      minX = Math.min(minX, node.x - hw);
      maxX = Math.max(maxX, node.x + hw);
      minY = Math.min(minY, node.y - hh);
      maxY = Math.max(maxY, node.y + hh + (node.caption ? 20 : 0));
    }
    for (const label of scene.labels ?? []) {
      const half = labelWidth(label.text) / 2;
      minX = Math.min(minX, label.x - half);
      maxX = Math.max(maxX, label.x + half);
      minY = Math.min(minY, label.y - 14);
      maxY = Math.max(maxY, label.y + 14);
    }
    if (!Number.isFinite(minX)) return { x: -MIN_WIDTH / 2, y: -MIN_HEIGHT / 2, w: MIN_WIDTH, h: MIN_HEIGHT };

    const width = Math.max(MIN_WIDTH, maxX - minX + PADDING * 2);
    const height = Math.max(MIN_HEIGHT, maxY - minY + PADDING * 2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    return { x: centerX - width / 2, y: centerY - height / 2, w: width, h: height };
  }

  #applyView() {
    const { x, y, w, h } = this.#view;
    this.#svg.setAttribute('viewBox', `${x.toFixed(1)} ${y.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
  }

  #removeLeavingItems() {
    for (const [id, item] of this.#items) {
      if (item.leaving) {
        item.element.remove();
        this.#items.delete(id);
      }
    }
  }
}
