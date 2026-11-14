import { BinaryTreeStructure, TRAVERSAL_OPERATIONS, TREE_VALUE } from './binaryTreeStructure.js';

export class BstStructure extends BinaryTreeStructure {
  static descriptor = {
    id: 'bst',
    name: 'Binary Search Tree',
    tier: 'Adept',
    summary: 'Smaller values go left, larger go right, so every comparison halves the search.',
    seed: [['insert', 50], ['insert', 30], ['insert', 70], ['insert', 20], ['insert', 40], ['insert', 60], ['insert', 80]],
  };

  operations() {
    return [
      { id: 'insert', label: 'Insert', params: [TREE_VALUE], complexity: 'O(h)', summary: 'Walk down comparing, attach at the empty spot.' },
      { id: 'search', label: 'Search', params: [TREE_VALUE], complexity: 'O(h)', summary: 'Go left or right at each node.' },
      { id: 'delete', label: 'Delete', params: [TREE_VALUE], complexity: 'O(h)', summary: 'Leaf, one child or two children: three cases.' },
      ...TRAVERSAL_OPERATIONS,
    ];
  }

  insert(value) {
    if (this.isFull()) return false;
    if (!this.root) {
      const node = this.attach(value, []);
      this.capture(`The tree was empty, so ${value} becomes the root.`, { [node.id]: 'new' });
      return true;
    }
    const { path, found } = this.locate(value);
    if (found) {
      this.capture(`${value} is already in the tree. This BST keeps values unique.`, { [found.id]: 'found' });
      return false;
    }
    const node = this.attach(value, path);
    const parent = path[path.length - 1];
    this.capture(`Empty spot found: ${value} becomes the ${value < parent.value ? 'left' : 'right'} child of ${parent.value}.`, {
      [node.id]: 'new',
    });
    return true;
  }

  delete(value) {
    return this.removeValue(value) !== null;
  }
}
