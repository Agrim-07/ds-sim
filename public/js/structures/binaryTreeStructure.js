import { Structure, emptyLabel, makeEdge, makeLabel, makeNode } from '../engine/structure.js';
import { LEVEL_GAP, layoutBinary } from '../engine/treeLayout.js';

const MAX_NODES = 15;

export const TREE_VALUE = Object.freeze({ name: 'value', label: 'Value', kind: 'int', min: 0, max: 999 });

export const TRAVERSAL_OPERATIONS = Object.freeze([
  { id: 'inorder', label: 'In-order', params: [], complexity: 'O(n)', summary: 'Left subtree, node, right subtree. Gives sorted output.' },
  { id: 'preorder', label: 'Pre-order', params: [], complexity: 'O(n)', summary: 'Node first, then left and right. Useful for copying a tree.' },
  { id: 'postorder', label: 'Post-order', params: [], complexity: 'O(n)', summary: 'Children before the node. Useful for deleting a tree.' },
  { id: 'levelorder', label: 'Level-order', params: [], complexity: 'O(n)', summary: 'Row by row, using a queue.' },
]);

/**
 * Shared behaviour for binary search trees: locating values, deletion, traversals and layout.
 * Subclasses decide how insertion and deletion keep the tree in shape.
 */
export class BinaryTreeStructure extends Structure {
  root = null;
  size = 0;
  #output = null;

  beforeOperation() {
    this.#output = null;
  }

  caption() {
    return '';
  }

  createNode(value) {
    return { id: this.nextId('t'), value, left: null, right: null, height: 1 };
  }

  isFull() {
    if (this.size < MAX_NODES) return false;
    this.capture(`This simulator keeps trees to ${MAX_NODES} nodes so they fit on screen.`);
    return true;
  }

  /** Walks down from the root comparing values. path ends at the match, or at the would-be parent. */
  locate(value) {
    const path = [];
    let node = this.root;
    while (node) {
      path.push(node);
      if (value === node.value) return { path, found: node };
      const direction = value < node.value ? 'left' : 'right';
      this.capture(`${value} ${direction === 'left' ? '<' : '>'} ${node.value}, so go ${direction}.`, { [node.id]: 'compare' });
      node = node[direction];
    }
    return { path, found: null };
  }

  attach(value, path) {
    const node = this.createNode(value);
    const parent = path[path.length - 1];
    if (!parent) this.root = node;
    else parent[value < parent.value ? 'left' : 'right'] = node;
    this.size += 1;
    return node;
  }

  replaceChild(parent, child, replacement) {
    if (!parent) this.root = replacement;
    else if (parent.left === child) parent.left = replacement;
    else parent.right = replacement;
  }

  search(value) {
    const { found } = this.locate(value);
    if (found) this.capture(`Found ${value}.`, { [found.id]: 'found' });
    else this.capture(`Fell off the tree - ${value} is not here.`);
    return Boolean(found);
  }

  /**
   * Standard BST deletion. Returns the ancestors of the node that was physically removed,
   * deepest last, so a balancing subclass can walk back up and repair them.
   */
  removeValue(value) {
    const { path, found } = this.locate(value);
    if (!found) {
      this.capture(`${value} is not in the tree, so there is nothing to delete.`);
      return null;
    }

    let target = found;
    let targetPath = path;
    if (found.left && found.right) {
      this.capture(`${value} has two children. Replace it with its in-order successor: the smallest value in its right subtree.`, {
        [found.id]: 'removed',
      });
      let successor = found.right;
      targetPath = [...path, successor];
      while (successor.left) {
        this.capture(`${successor.value} has a left child, keep going left.`, { [found.id]: 'removed', [successor.id]: 'compare' });
        successor = successor.left;
        targetPath.push(successor);
      }
      found.value = successor.value;
      this.capture(`Copy the successor ${successor.value} up, then delete the old successor node.`, {
        [found.id]: 'new',
        [successor.id]: 'removed',
      });
      target = successor;
    } else {
      this.capture(`${value} has ${found.left || found.right ? 'one child' : 'no children'}.`, { [found.id]: 'removed' });
    }

    const child = target.left ?? target.right;
    const parent = targetPath[targetPath.length - 2] ?? null;
    this.replaceChild(parent, target, child);
    this.size -= 1;
    this.capture(child ? `Its only child takes its place.` : `It was a leaf, so it is simply cut off.`);
    return targetPath.slice(0, -1);
  }

  inorder() {
    const order = [];
    const visit = (node) => {
      if (!node) return;
      visit(node.left);
      order.push(node);
      visit(node.right);
    };
    visit(this.root);
    return this.#playTraversal('In-order', order);
  }

  preorder() {
    const order = [];
    const visit = (node) => {
      if (!node) return;
      order.push(node);
      visit(node.left);
      visit(node.right);
    };
    visit(this.root);
    return this.#playTraversal('Pre-order', order);
  }

  postorder() {
    const order = [];
    const visit = (node) => {
      if (!node) return;
      visit(node.left);
      visit(node.right);
      order.push(node);
    };
    visit(this.root);
    return this.#playTraversal('Post-order', order);
  }

  levelorder() {
    const order = [];
    const queue = this.root ? [this.root] : [];
    while (queue.length) {
      const node = queue.shift();
      order.push(node);
      if (node.left) queue.push(node.left);
      if (node.right) queue.push(node.right);
    }
    return this.#playTraversal('Level-order', order);
  }

  scene(marks) {
    const { positions, width, depth } = layoutBinary(this.root, (node) => node.left, (node) => node.right);
    const nodes = [];
    const edges = [];
    for (const [node, position] of positions) {
      nodes.push(makeNode(node.id, position.x, position.y, node.value, marks, { caption: this.caption(node) }));
      for (const child of [node.left, node.right]) {
        if (child) edges.push(makeEdge(node.id, child.id, marks, { directed: false }));
      }
    }
    const labels = [];
    if (!this.root) labels.push(emptyLabel('empty tree'));
    if (this.#output) labels.push(makeLabel('output', width / 2, (depth + 1) * LEVEL_GAP, this.#output, 'info'));
    return { nodes, edges, labels };
  }

  values() {
    const values = [];
    const visit = (node) => {
      if (!node) return;
      visit(node.left);
      values.push(node.value);
      visit(node.right);
    };
    visit(this.root);
    return values;
  }

  levels(node = this.root) {
    return node ? 1 + Math.max(this.levels(node.left), this.levels(node.right)) : 0;
  }

  state() {
    return { values: this.values(), size: this.size, height: this.levels(), root: this.root?.value ?? null };
  }

  #playTraversal(name, order) {
    if (order.length === 0) {
      this.capture('The tree is empty, so there is nothing to visit.');
      return [];
    }
    const visited = [];
    const marks = {};
    for (const node of order) {
      visited.push(node.value);
      this.#output = `${name}: ${visited.join(', ')}`;
      this.capture(`Visit ${node.value}.`, { ...marks, [node.id]: 'active' });
      marks[node.id] = 'visited';
    }
    this.capture(`${name} traversal finished.`, marks);
    return visited;
  }
}
