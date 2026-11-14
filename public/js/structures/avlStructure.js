import { BinaryTreeStructure, TREE_VALUE } from './binaryTreeStructure.js';

const heightOf = (node) => (node ? node.height : 0);
const balanceOf = (node) => (node ? heightOf(node.left) - heightOf(node.right) : 0);
const signed = (number) => (number > 0 ? `+${number}` : String(number));

export class AvlStructure extends BinaryTreeStructure {
  static descriptor = {
    id: 'avl',
    name: 'AVL Tree',
    tier: 'Master',
    summary: 'A self-balancing BST. Rotations keep every balance factor between -1 and +1.',
    seed: [['insert', 30], ['insert', 20], ['insert', 40], ['insert', 10]],
  };

  operations() {
    return [
      { id: 'insert', label: 'Insert', params: [TREE_VALUE], complexity: 'O(log n)', summary: 'BST insert, then rebalance on the way back up.' },
      { id: 'delete', label: 'Delete', params: [TREE_VALUE], complexity: 'O(log n)', summary: 'BST delete, then rebalance on the way back up.' },
      { id: 'search', label: 'Search', params: [TREE_VALUE], complexity: 'O(log n)', summary: 'Height stays logarithmic, so search is always fast.' },
      { id: 'inorder', label: 'In-order', params: [], complexity: 'O(n)', summary: 'Rotations never break the sorted order.' },
    ];
  }

  caption(node) {
    return `bf ${signed(balanceOf(node))}`;
  }

  insert(value) {
    if (this.isFull()) return false;
    const { path, found } = this.locate(value);
    if (found) {
      this.capture(`${value} is already in the tree.`, { [found.id]: 'found' });
      return false;
    }
    const node = this.attach(value, path);
    this.#refreshHeights(path, path.length - 1);
    this.capture(`Insert ${value} as in a normal BST. Now check balance factors on the way back up.`, { [node.id]: 'new' });
    if (this.#rebalance(path) === 0) {
      this.capture('Every balance factor is between -1 and +1, so no rotation is needed.', { [node.id]: 'found' });
    }
    return true;
  }

  delete(value) {
    const ancestors = this.removeValue(value);
    if (ancestors === null) return false;
    this.#refreshHeights(ancestors, ancestors.length - 1);
    if (this.#rebalance(ancestors) === 0) this.capture('The tree is still balanced, so no rotation is needed.');
    return true;
  }

  /** Walks from the deepest changed node to the root, rotating wherever |balance| reaches 2. Returns the number of fixes. */
  #rebalance(path) {
    let fixes = 0;
    for (let i = path.length - 1; i >= 0; i -= 1) {
      const node = path[i];
      this.#updateHeight(node);
      const balance = balanceOf(node);
      if (Math.abs(balance) < 2) continue;

      const parent = i > 0 ? path[i - 1] : null;
      let pivot;
      if (balance > 1) {
        if (balanceOf(node.left) < 0) {
          this.capture(`${node.value} is left-heavy (bf ${signed(balance)}) and its left child leans right: Left-Right case. First rotate ${node.left.value} left.`, {
            [node.id]: 'removed',
            [node.left.id]: 'active',
          });
          node.left = this.#rotateLeft(node.left);
          this.capture('Now it is a plain Left-Left case.', { [node.id]: 'removed' });
        } else {
          this.capture(`${node.value} is left-heavy (bf ${signed(balance)}): Left-Left case. Rotate right at ${node.value}.`, { [node.id]: 'removed' });
        }
        pivot = this.#rotateRight(node);
      } else {
        if (balanceOf(node.right) > 0) {
          this.capture(`${node.value} is right-heavy (bf ${signed(balance)}) and its right child leans left: Right-Left case. First rotate ${node.right.value} right.`, {
            [node.id]: 'removed',
            [node.right.id]: 'active',
          });
          node.right = this.#rotateRight(node.right);
          this.capture('Now it is a plain Right-Right case.', { [node.id]: 'removed' });
        } else {
          this.capture(`${node.value} is right-heavy (bf ${signed(balance)}): Right-Right case. Rotate left at ${node.value}.`, { [node.id]: 'removed' });
        }
        pivot = this.#rotateLeft(node);
      }

      this.replaceChild(parent, node, pivot);
      this.#refreshHeights(path, i - 1);
      fixes += 1;
      this.capture(`Rotation done. ${pivot.value} now roots this subtree and it is balanced again.`, { [pivot.id]: 'found' });
    }
    return fixes;
  }

  #refreshHeights(path, fromIndex) {
    for (let i = fromIndex; i >= 0; i -= 1) this.#updateHeight(path[i]);
  }

  #rotateRight(node) {
    const pivot = node.left;
    node.left = pivot.right;
    pivot.right = node;
    this.#updateHeight(node);
    this.#updateHeight(pivot);
    return pivot;
  }

  #rotateLeft(node) {
    const pivot = node.right;
    node.right = pivot.left;
    pivot.left = node;
    this.#updateHeight(node);
    this.#updateHeight(pivot);
    return pivot;
  }

  #updateHeight(node) {
    node.height = 1 + Math.max(heightOf(node.left), heightOf(node.right));
  }
}
