import { Structure, emptyLabel, makeLabel, makeNode } from '../engine/structure.js';

const CAPACITY = 8;
const GAP = 48;

export class StackStructure extends Structure {
  static descriptor = {
    id: 'stack',
    name: 'Stack',
    tier: 'Novice',
    summary: 'Last in, first out. You only ever touch the top.',
    seed: [['push', 4], ['push', 9], ['push', 2]],
  };

  #items = [];

  operations() {
    return [
      {
        id: 'push',
        label: 'Push',
        params: [{ name: 'value', label: 'Value', kind: 'int', min: -99, max: 999 }],
        complexity: 'O(1)',
        summary: 'Place a value on top.',
      },
      { id: 'pop', label: 'Pop', params: [], complexity: 'O(1)', summary: 'Remove and return the top value.' },
      { id: 'peek', label: 'Peek', params: [], complexity: 'O(1)', summary: 'Look at the top value without removing it.' },
    ];
  }

  push(value) {
    if (this.#items.length >= CAPACITY) {
      this.capture(`Stack overflow! The stack already holds ${CAPACITY} items.`, { [this.#top().id]: 'removed' });
      return false;
    }
    const item = { id: this.nextId('s'), value };
    this.#items.push(item);
    this.capture(`Push ${value}. It becomes the new top.`, { [item.id]: 'new' });
    return true;
  }

  pop() {
    if (this.#items.length === 0) {
      this.capture('Stack underflow! There is nothing to pop.');
      return null;
    }
    const top = this.#top();
    this.capture(`Pop takes ${top.value} from the top.`, { [top.id]: 'removed' });
    this.#items.pop();
    this.capture(this.#items.length ? `${this.#top().value} is the top now.` : 'The stack is empty again.');
    return top.value;
  }

  peek() {
    if (this.#items.length === 0) {
      this.capture('The stack is empty, so there is no top to peek at.');
      return null;
    }
    const top = this.#top();
    this.capture(`The top is ${top.value}. Peek looks without removing it.`, { [top.id]: 'found' });
    return top.value;
  }

  scene(marks) {
    const nodes = this.#items.map((item, index) => makeNode(item.id, 0, -index * GAP, item.value, marks, { shape: 'rect' }));
    const labels = [];
    if (this.#items.length) labels.push(makeLabel('top', 74, -(this.#items.length - 1) * GAP, 'top', 'pointer'));
    else labels.push(emptyLabel('empty stack'));
    labels.push(makeLabel('base', 0, 38, 'bottom', 'muted'));
    return { nodes, edges: [], labels };
  }

  state() {
    return { values: this.#items.map((item) => item.value), size: this.#items.length };
  }

  #top() {
    return this.#items[this.#items.length - 1];
  }
}
