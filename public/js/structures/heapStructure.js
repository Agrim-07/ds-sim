import { Structure, emptyLabel, makeEdge, makeLabel, makeNode } from '../engine/structure.js';
import { LEVEL_GAP, layoutBinary } from '../engine/treeLayout.js';

const CAPACITY = 15;
const CELL_GAP = 58;

const parentOf = (index) => (index - 1) >> 1;
const arrayId = (id) => `array-${id}`;

export class HeapStructure extends Structure {
  static descriptor = {
    id: 'heap',
    name: 'Min-Heap',
    tier: 'Adept',
    summary: 'A complete binary tree where every parent is smaller than its children, stored in a plain array.',
    seed: [['insert', 5], ['insert', 9], ['insert', 3], ['insert', 12], ['insert', 7]],
  };

  #items = [];

  operations() {
    return [
      {
        id: 'insert',
        label: 'Insert',
        params: [{ name: 'value', label: 'Value', kind: 'int', min: 0, max: 999 }],
        complexity: 'O(log n)',
        summary: 'Add at the end, then sift up.',
      },
      { id: 'extractMin', label: 'Extract min', params: [], complexity: 'O(log n)', summary: 'Take the root, move the last item up, sift down.' },
      { id: 'peek', label: 'Peek min', params: [], complexity: 'O(1)', summary: 'The minimum is always at index 0.' },
    ];
  }

  insert(value) {
    if (this.#items.length >= CAPACITY) {
      this.capture(`The simulator keeps heaps to ${CAPACITY} items.`);
      return false;
    }
    const item = { id: this.nextId('p'), value };
    this.#items.push(item);
    const index = this.#items.length - 1;
    this.capture(`Put ${value} in the next free spot (index ${index}) so the tree stays complete.`, { [item.id]: 'new' });
    this.#siftUp(index);
    return true;
  }

  extractMin() {
    if (this.#items.length === 0) {
      this.capture('The heap is empty.');
      return null;
    }
    const min = this.#items[0];
    this.capture(`The minimum always sits at the root: ${min.value}. Take it out.`, { [min.id]: 'removed' });
    const last = this.#items.pop();
    if (this.#items.length === 0) {
      this.capture('That was the only item. The heap is empty now.');
      return min.value;
    }
    this.#items[0] = last;
    this.capture(`Move the last item, ${last.value}, into the root's place.`, { [last.id]: 'active' });
    this.#siftDown(0);
    return min.value;
  }

  peek() {
    if (this.#items.length === 0) {
      this.capture('The heap is empty.');
      return null;
    }
    this.capture(`The minimum is ${this.#items[0].value}, right at index 0.`, { [this.#items[0].id]: 'found' });
    return this.#items[0].value;
  }

  scene(marks) {
    const count = this.#items.length;
    const child = (index) => (index < count ? index : null);
    const { positions, width, depth } = layoutBinary(count ? 0 : null, (i) => child(2 * i + 1), (i) => child(2 * i + 2));

    const nodes = [];
    const edges = [];
    const labels = [];
    for (const [index, position] of positions) {
      const item = this.#items[index];
      nodes.push(makeNode(item.id, position.x, position.y, item.value, marks));
      if (index > 0) edges.push(makeEdge(this.#items[parentOf(index)].id, item.id, marks, { directed: false }));
    }

    const rowY = (depth + 1) * LEVEL_GAP + 10;
    const rowStart = width / 2 - ((count - 1) * CELL_GAP) / 2;
    this.#items.forEach((item, index) => {
      const x = rowStart + index * CELL_GAP;
      nodes.push(makeNode(arrayId(item.id), x, rowY, item.value, { [arrayId(item.id)]: marks[item.id] }, { shape: 'rect' }));
      labels.push(makeLabel(`heap-index-${index}`, x, rowY + 38, index, 'index'));
    });
    if (count) labels.push(makeLabel('array-title', rowStart - 72, rowY, 'array', 'muted'));
    else labels.push(emptyLabel('empty heap'));
    return { nodes, edges, labels };
  }

  state() {
    return { values: this.#items.map((item) => item.value), size: this.#items.length };
  }

  #siftUp(index) {
    let current = index;
    while (current > 0) {
      const parent = parentOf(current);
      const [child, above] = [this.#items[current], this.#items[parent]];
      if (above.value <= child.value) {
        this.capture(`${above.value} <= ${child.value}: the parent is smaller, so the heap property holds. Stop.`, {
          [child.id]: 'found',
          [above.id]: 'compare',
        });
        return;
      }
      this.capture(`${child.value} is smaller than its parent ${above.value}: swap them.`, { [child.id]: 'active', [above.id]: 'compare' });
      this.#swap(current, parent);
      current = parent;
    }
    this.capture(`${this.#items[0].value} reached the root.`, { [this.#items[0].id]: 'found' });
  }

  #siftDown(index) {
    let current = index;
    for (;;) {
      const left = 2 * current + 1;
      const right = left + 1;
      let smallest = current;
      if (left < this.#items.length && this.#items[left].value < this.#items[smallest].value) smallest = left;
      if (right < this.#items.length && this.#items[right].value < this.#items[smallest].value) smallest = right;
      if (smallest === current) {
        this.capture(`${this.#items[current].value} is not larger than its children. Heap restored.`, { [this.#items[current].id]: 'found' });
        return;
      }
      this.capture(`${this.#items[current].value} is larger than its smaller child ${this.#items[smallest].value}: swap them.`, {
        [this.#items[current].id]: 'active',
        [this.#items[smallest].id]: 'compare',
      });
      this.#swap(current, smallest);
      current = smallest;
    }
  }

  #swap(a, b) {
    [this.#items[a], this.#items[b]] = [this.#items[b], this.#items[a]];
  }
}
