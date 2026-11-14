import { Structure, makeEdge, makeNode } from '../engine/structure.js';
import { layoutForest } from '../engine/treeLayout.js';

const MAX_ELEMENTS = 10;
const ELEMENT = { name: 'element', label: 'Element', kind: 'int', min: 0, max: MAX_ELEMENTS - 1 };

const nodeId = (i) => `u${i}`;

export class UnionFindStructure extends Structure {
  static descriptor = {
    id: 'union-find',
    name: 'Union-Find',
    tier: 'Master',
    summary: 'Disjoint sets as a forest of parent pointers, with union by rank and path compression.',
    seed: [['makeSets', 8], ['union', 0, 1], ['union', 2, 3], ['union', 4, 5]],
  };

  #parent = [];
  #rank = [];

  constructor() {
    super();
    this.#reset(8);
  }

  operations() {
    return [
      { id: 'union', label: 'Union', params: [{ ...ELEMENT, name: 'a', label: 'A' }, { ...ELEMENT, name: 'b', label: 'B' }], complexity: 'O(α(n))', summary: 'Find both roots and hang the shorter tree under the taller one.' },
      { id: 'find', label: 'Find', params: [ELEMENT], complexity: 'O(α(n))', summary: 'Climb to the root, then point the path straight at it.' },
      { id: 'connected', label: 'Connected?', params: [{ ...ELEMENT, name: 'a', label: 'A' }, { ...ELEMENT, name: 'b', label: 'B' }], complexity: 'O(α(n))', summary: 'Two elements are connected when they share a root.' },
      { id: 'makeSets', label: 'Reset', params: [{ name: 'count', label: 'Count', kind: 'int', min: 2, max: MAX_ELEMENTS }], complexity: 'O(n)', summary: 'Start over with every element in its own set.' },
    ];
  }

  makeSets(count) {
    this.#reset(count);
    this.capture(`${count} separate sets. Every element is its own root.`);
    return count;
  }

  find(element) {
    if (!this.#exists(element)) return null;
    const path = [element];
    let current = element;
    while (this.#parent[current] !== current) {
      this.capture(`${current}'s parent is ${this.#parent[current]}. Climb up.`, { [nodeId(current)]: 'active' });
      current = this.#parent[current];
      path.push(current);
    }
    const root = current;
    this.capture(`${root} is its own parent, so it is the root - the set's representative.`, { [nodeId(root)]: 'found' });

    const moved = path.filter((node) => node !== root && this.#parent[node] !== root);
    if (moved.length) {
      for (const node of moved) this.#parent[node] = root;
      const marks = Object.fromEntries(moved.map((node) => [nodeId(node), 'new']));
      this.capture(`Path compression: ${moved.join(', ')} now point straight at ${root}, so the next find is faster.`, {
        ...marks,
        [nodeId(root)]: 'found',
      });
    }
    return root;
  }

  union(a, b) {
    if (!this.#exists(a) || !this.#exists(b)) return false;
    let rootA = this.find(a);
    let rootB = this.find(b);
    if (rootA === rootB) {
      this.capture(`${a} and ${b} already share root ${rootA}. Nothing to do.`, { [nodeId(rootA)]: 'found' });
      return false;
    }
    if (this.#rank[rootA] < this.#rank[rootB]) [rootA, rootB] = [rootB, rootA];
    this.#parent[rootB] = rootA;
    const grew = this.#rank[rootA] === this.#rank[rootB];
    if (grew) this.#rank[rootA] += 1;
    this.capture(
      `Union by rank: hang root ${rootB} under root ${rootA}${grew ? `, and ${rootA}'s rank grows to ${this.#rank[rootA]}` : ''}.`,
      { [nodeId(rootA)]: 'found', [nodeId(rootB)]: 'new' },
    );
    return true;
  }

  connected(a, b) {
    if (!this.#exists(a) || !this.#exists(b)) return false;
    const rootA = this.find(a);
    const rootB = this.find(b);
    const same = rootA === rootB;
    this.capture(same ? `Same root (${rootA}): ${a} and ${b} are connected.` : `Different roots (${rootA} vs ${rootB}): not connected.`, {
      [nodeId(a)]: same ? 'found' : 'removed',
      [nodeId(b)]: same ? 'found' : 'removed',
    });
    return same;
  }

  scene(marks) {
    const elements = this.#parent.map((_, i) => i);
    const roots = elements.filter((i) => this.#parent[i] === i);
    const children = (i) => elements.filter((j) => j !== i && this.#parent[j] === i);
    const { positions } = layoutForest(roots, children);

    const nodes = [];
    const edges = [];
    for (const [i, position] of positions) {
      const isRoot = this.#parent[i] === i;
      nodes.push(makeNode(nodeId(i), position.x, position.y, i, marks, { caption: isRoot ? `rank ${this.#rank[i]}` : '' }));
      if (!isRoot) edges.push(makeEdge(nodeId(i), nodeId(this.#parent[i]), marks));
    }
    return { nodes, edges, labels: [] };
  }

  state() {
    return { parent: [...this.#parent], sets: this.#parent.filter((p, i) => p === i).length };
  }

  #reset(count) {
    this.#parent = Array.from({ length: count }, (_, i) => i);
    this.#rank = new Array(count).fill(0);
  }

  #exists(element) {
    if (element < this.#parent.length) return true;
    this.capture(`There is no element ${element}. Elements go from 0 to ${this.#parent.length - 1}.`);
    return false;
  }
}
