import { Structure, emptyLabel, makeLabel, makeNode } from '../engine/structure.js';

const CAPACITY = 8;
const GAP = 64;

export class QueueStructure extends Structure {
  static descriptor = {
    id: 'queue',
    name: 'Queue',
    tier: 'Novice',
    summary: 'First in, first out. Join at the rear, leave from the front.',
    seed: [['enqueue', 5], ['enqueue', 12], ['enqueue', 7]],
  };

  #items = [];

  operations() {
    return [
      {
        id: 'enqueue',
        label: 'Enqueue',
        params: [{ name: 'value', label: 'Value', kind: 'int', min: -99, max: 999 }],
        complexity: 'O(1)',
        summary: 'Add a value at the rear.',
      },
      { id: 'dequeue', label: 'Dequeue', params: [], complexity: 'O(1)', summary: 'Remove the value at the front.' },
      { id: 'peek', label: 'Peek', params: [], complexity: 'O(1)', summary: 'Look at the front value.' },
    ];
  }

  enqueue(value) {
    if (this.#items.length >= CAPACITY) {
      this.capture(`The queue is full (${CAPACITY} items). ${value} has to wait.`);
      return false;
    }
    const item = { id: this.nextId('q'), value };
    this.#items.push(item);
    this.capture(`${value} joins at the rear.`, { [item.id]: 'new' });
    return true;
  }

  dequeue() {
    if (this.#items.length === 0) {
      this.capture('The queue is empty, so there is nobody to serve.');
      return null;
    }
    const front = this.#items[0];
    this.capture(`${front.value} has waited longest, so it leaves from the front.`, { [front.id]: 'removed' });
    this.#items.shift();
    this.capture(this.#items.length ? `Everyone moves up. ${this.#items[0].value} is at the front now.` : 'The queue is empty.');
    return front.value;
  }

  peek() {
    if (this.#items.length === 0) {
      this.capture('The queue is empty.');
      return null;
    }
    this.capture(`${this.#items[0].value} is at the front.`, { [this.#items[0].id]: 'found' });
    return this.#items[0].value;
  }

  scene(marks) {
    const nodes = this.#items.map((item, index) => makeNode(item.id, index * GAP, 0, item.value, marks, { shape: 'rect' }));
    const labels = [];
    if (this.#items.length) {
      labels.push(makeLabel('front', 0, -44, 'front', 'pointer'));
      labels.push(makeLabel('rear', (this.#items.length - 1) * GAP, 44, 'rear', 'pointer'));
    } else {
      labels.push(emptyLabel('empty queue'));
    }
    return { nodes, edges: [], labels };
  }

  state() {
    return { values: this.#items.map((item) => item.value), size: this.#items.length };
  }
}
