import { Structure, emptyLabel, makeEdge, makeLabel, makeNode } from '../engine/structure.js';

const SLOTS = 8;
const RADIUS = 150;
const VERTEX = { name: 'vertex', label: 'Vertex', kind: 'int', min: 0, max: SLOTS - 1 };
const FROM = { ...VERTEX, name: 'from', label: 'From' };
const TO = { ...VERTEX, name: 'to', label: 'To' };

const vertexId = (v) => `v${v}`;
const edgeId = (a, b) => `e${Math.min(a, b)}-${Math.max(a, b)}`;

export class GraphStructure extends Structure {
  static descriptor = {
    id: 'graph',
    name: 'Graph',
    tier: 'Master',
    summary: 'Vertices joined by edges. Stored here as an adjacency list and explored with BFS and DFS.',
    seed: [
      ['addVertex', 0], ['addVertex', 1], ['addVertex', 2], ['addVertex', 3], ['addVertex', 4], ['addVertex', 5],
      ['addEdge', 0, 1], ['addEdge', 0, 2], ['addEdge', 1, 3], ['addEdge', 2, 3], ['addEdge', 3, 4], ['addEdge', 4, 5],
    ],
  };

  #adjacency = new Map();
  #footer = [];

  beforeOperation() {
    this.#footer = [];
  }

  operations() {
    return [
      { id: 'addVertex', label: 'Add vertex', params: [VERTEX], complexity: 'O(1)', summary: 'Create an empty neighbour list.' },
      { id: 'addEdge', label: 'Add edge', params: [FROM, TO], complexity: 'O(1)', summary: 'Add each vertex to the other\'s neighbour list.' },
      { id: 'removeEdge', label: 'Remove edge', params: [FROM, TO], complexity: 'O(deg)', summary: 'Remove each vertex from the other\'s list.' },
      { id: 'bfs', label: 'Breadth-first search', params: [{ ...VERTEX, label: 'Start' }], complexity: 'O(V + E)', summary: 'Explore in rings of distance using a queue.' },
      { id: 'dfs', label: 'Depth-first search', params: [{ ...VERTEX, label: 'Start' }], complexity: 'O(V + E)', summary: 'Go as deep as possible first using a stack.' },
      { id: 'shortestPath', label: 'Shortest path', params: [FROM, TO], complexity: 'O(V + E)', summary: 'BFS with parent links finds the fewest-edge path.' },
    ];
  }

  addVertex(v) {
    if (this.#adjacency.has(v)) {
      this.capture(`Vertex ${v} already exists.`, { [vertexId(v)]: 'found' });
      return false;
    }
    this.#adjacency.set(v, new Set());
    this.capture(`Added vertex ${v} with an empty neighbour list.`, { [vertexId(v)]: 'new' });
    return true;
  }

  addEdge(from, to) {
    if (!this.#requireVertices(from, to)) return false;
    if (from === to) {
      this.capture('This simulator does not use self-loops. Pick two different vertices.');
      return false;
    }
    if (this.#adjacency.get(from).has(to)) {
      this.capture(`${from} and ${to} are already connected.`, { [edgeId(from, to)]: 'found' });
      return false;
    }
    this.#adjacency.get(from).add(to);
    this.#adjacency.get(to).add(from);
    this.capture(`Connected ${from} and ${to}: each now lists the other as a neighbour.`, {
      [edgeId(from, to)]: 'path',
      [vertexId(from)]: 'new',
      [vertexId(to)]: 'new',
    });
    return true;
  }

  removeEdge(from, to) {
    if (!this.#requireVertices(from, to)) return false;
    if (!this.#adjacency.get(from).has(to)) {
      this.capture(`There is no edge between ${from} and ${to}.`);
      return false;
    }
    this.capture(`Remove the edge ${from} - ${to}.`, { [edgeId(from, to)]: 'removed' });
    this.#adjacency.get(from).delete(to);
    this.#adjacency.get(to).delete(from);
    this.capture('Edge removed from both neighbour lists.');
    return true;
  }

  bfs(start) {
    if (!this.#requireVertices(start)) return [];
    const visited = new Set([start]);
    const queue = [start];
    const order = [];
    const treeEdges = new Set();
    const marks = () => this.#marks({ visited, queued: queue, treeEdges });

    this.#setFooter(queue, 'Queue', order);
    this.capture(`Mark ${start} as seen and put it in the queue.`, { ...marks(), [vertexId(start)]: 'compare' });
    while (queue.length) {
      const v = queue.shift();
      order.push(v);
      this.#setFooter(queue, 'Queue', order);
      this.capture(`Dequeue ${v} and visit it.`, { ...marks(), [vertexId(v)]: 'active' });
      for (const n of this.#neighbours(v)) {
        if (visited.has(n)) continue;
        visited.add(n);
        queue.push(n);
        treeEdges.add(edgeId(v, n));
        this.#setFooter(queue, 'Queue', order);
        this.capture(`Discovered ${n} through ${v}. Enqueue it.`, { ...marks(), [vertexId(v)]: 'active' });
      }
    }
    this.#setFooter([], 'Queue', order);
    this.capture(`BFS finished. Vertices were visited in order of distance from ${start}.`, this.#marks({ visited, queued: [], treeEdges }));
    return order;
  }

  dfs(start) {
    if (!this.#requireVertices(start)) return [];
    const visited = new Set();
    const stack = [start];
    const order = [];
    const treeEdges = new Set();
    const cameFrom = new Map();
    const marks = () => this.#marks({ visited, queued: stack, treeEdges });

    this.#setFooter(stack, 'Stack', order);
    this.capture(`Push ${start} onto the stack.`, marks());
    while (stack.length) {
      const v = stack.pop();
      if (visited.has(v)) {
        this.#setFooter(stack, 'Stack', order);
        this.capture(`${v} was already visited. Skip it.`, marks());
        continue;
      }
      visited.add(v);
      order.push(v);
      if (cameFrom.has(v)) treeEdges.add(edgeId(cameFrom.get(v), v));
      const fresh = this.#neighbours(v).filter((n) => !visited.has(n));
      for (const n of [...fresh].reverse()) {
        stack.push(n);
        cameFrom.set(n, v);
      }
      this.#setFooter(stack, 'Stack', order);
      this.capture(
        fresh.length ? `Pop ${v}, visit it and push its unvisited neighbours: ${fresh.join(', ')}.` : `Pop ${v} and visit it. It has no unvisited neighbours, so backtrack.`,
        { ...marks(), [vertexId(v)]: 'active' },
      );
    }
    this.#setFooter([], 'Stack', order);
    this.capture('DFS finished. It dove deep along one branch before backtracking.', this.#marks({ visited, queued: [], treeEdges }));
    return order;
  }

  shortestPath(from, to) {
    if (!this.#requireVertices(from, to)) return null;
    const parent = new Map([[from, null]]);
    const queue = [from];
    while (queue.length && !parent.has(to)) {
      const v = queue.shift();
      this.capture(`Explore from ${v}.`, this.#marks({ visited: new Set(parent.keys()), queued: queue, treeEdges: new Set() }));
      for (const n of this.#neighbours(v)) {
        if (!parent.has(n)) {
          parent.set(n, v);
          queue.push(n);
        }
      }
    }
    if (!parent.has(to)) {
      this.capture(`${to} cannot be reached from ${from}: they are in different components.`);
      return null;
    }

    const path = [];
    for (let v = to; v !== null; v = parent.get(v)) path.unshift(v);
    const marks = {};
    path.forEach((v, i) => {
      marks[vertexId(v)] = 'found';
      if (i > 0) marks[edgeId(path[i - 1], v)] = 'path';
    });
    this.#footer = [`Path: ${path.join(' -> ')}  (${path.length - 1} edge(s))`];
    this.capture(`Follow the parent links back from ${to}. BFS guarantees this path uses the fewest edges.`, marks);
    return path;
  }

  scene(marks) {
    const nodes = [];
    const edges = [];
    for (const [v, neighbours] of this.#adjacency) {
      const angle = -Math.PI / 2 + (v * 2 * Math.PI) / SLOTS;
      nodes.push(makeNode(vertexId(v), Math.round(RADIUS * Math.cos(angle)), Math.round(RADIUS * Math.sin(angle)), v, marks));
      for (const n of neighbours) {
        if (v < n) edges.push(makeEdge(vertexId(v), vertexId(n), marks, { id: edgeId(v, n), directed: false }));
      }
    }
    const labels = this.#footer.map((text, index) => makeLabel(`footer-${index}`, 0, RADIUS + 58 + index * 32, text, 'info'));
    if (this.#adjacency.size === 0) labels.push(emptyLabel('no vertices yet'));
    return { nodes, edges, labels };
  }

  state() {
    let edgeCount = 0;
    for (const neighbours of this.#adjacency.values()) edgeCount += neighbours.size;
    return { vertices: [...this.#adjacency.keys()].sort((a, b) => a - b), edgeCount: edgeCount / 2 };
  }

  #neighbours(v) {
    return [...this.#adjacency.get(v)].sort((a, b) => a - b);
  }

  #requireVertices(...vertices) {
    const missing = vertices.find((v) => !this.#adjacency.has(v));
    if (missing === undefined) return true;
    this.capture(`Vertex ${missing} does not exist yet. Add it first.`);
    return false;
  }

  #setFooter(container, name, order) {
    this.#footer = [`${name}: [${container.join(', ')}]`, `Visited: ${order.length ? order.join(' -> ') : '-'}`];
  }

  #marks({ visited, queued, treeEdges }) {
    const marks = {};
    for (const v of visited) marks[vertexId(v)] = 'visited';
    for (const v of queued) marks[vertexId(v)] = 'compare';
    for (const id of treeEdges) marks[id] = 'path';
    return marks;
  }
}
