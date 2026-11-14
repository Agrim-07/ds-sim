import { Structure, emptyLabel, makeEdge, makeLabel, makeNode } from '../engine/structure.js';

const CAPACITY = 9;
const GAP = 96;
const VALUE = { name: 'value', label: 'Value', kind: 'int', min: -99, max: 999 };

export class LinkedListStructure extends Structure {
  static descriptor = {
    id: 'linked-list',
    name: 'Singly Linked List',
    tier: 'Apprentice',
    summary: 'Nodes scattered in memory, each holding a value and a pointer to the next node.',
    seed: [['insertTail', 3], ['insertTail', 8], ['insertTail', 1]],
  };

  #nodes = new Map();
  #head = null;
  #order = [];
  #pointers = {};

  operations() {
    return [
      { id: 'insertHead', label: 'Insert at head', params: [VALUE], complexity: 'O(1)', summary: 'New node points at the old head, then becomes the head.' },
      { id: 'insertTail', label: 'Insert at tail', params: [VALUE], complexity: 'O(n)', summary: 'Walk to the last node and link the new one after it.' },
      { id: 'remove', label: 'Remove value', params: [VALUE], complexity: 'O(n)', summary: 'Find the node, then make its predecessor skip over it.' },
      { id: 'search', label: 'Search', params: [VALUE], complexity: 'O(n)', summary: 'Follow next pointers from the head.' },
      { id: 'reverse', label: 'Reverse', params: [], complexity: 'O(n)', summary: 'Flip every next pointer using prev / curr / next.' },
    ];
  }

  insertHead(value) {
    if (this.#isFull()) return false;
    const node = this.#create(value);
    node.next = this.#head;
    this.#order = [node.id, ...this.#order];
    this.capture(`Create node ${value} and point its next at the current head${this.#head ? ` (${this.#head.value})` : ''}.`, {
      [node.id]: 'new',
    });
    this.#head = node;
    this.capture(`Move head to the new node. No other node was touched.`, { [node.id]: 'found' });
    return true;
  }

  insertTail(value) {
    if (this.#isFull()) return false;
    if (!this.#head) return this.insertHead(value);

    let current = this.#head;
    while (current.next) {
      this.capture(`${current.value} has a next node, keep walking.`, { [current.id]: 'active' });
      current = current.next;
    }
    this.capture(`${current.value}.next is null, so it is the tail.`, { [current.id]: 'found' });

    const node = this.#create(value);
    current.next = node;
    this.#order.push(node.id);
    this.capture(`Link ${current.value}.next to the new node ${value}.`, { [node.id]: 'new' });
    return true;
  }

  remove(value) {
    let previous = null;
    let current = this.#head;
    while (current && current.value !== value) {
      this.capture(`${current.value} is not ${value}, move on.`, { [current.id]: 'compare' });
      previous = current;
      current = current.next;
    }
    if (!current) {
      this.capture(`Reached null - ${value} is not in the list.`);
      return false;
    }

    this.capture(`Found ${value}.`, { [current.id]: 'removed' });
    if (!previous) {
      this.#head = current.next;
      this.capture(`It was the head, so head moves to ${this.#head ? this.#head.value : 'null'}.`, { [current.id]: 'removed' });
    } else {
      previous.next = current.next;
      this.capture(`Point ${previous.value}.next past it, straight to ${current.next ? current.next.value : 'null'}.`, {
        [previous.id]: 'active',
        [current.id]: 'removed',
      });
    }
    this.#nodes.delete(current.id);
    this.#relayout();
    this.capture(`Nothing points at ${value} any more, so it is gone.`);
    return true;
  }

  search(value) {
    let index = 0;
    for (let current = this.#head; current; current = current.next, index += 1) {
      if (current.value === value) {
        this.capture(`Found ${value} after following ${index} pointer(s).`, { [current.id]: 'found' });
        return index;
      }
      this.capture(`${current.value} is not ${value}, follow next.`, { [current.id]: 'compare' });
    }
    this.capture(`Reached null - ${value} is not in the list.`);
    return -1;
  }

  reverse() {
    if (!this.#head || !this.#head.next) {
      this.capture('A list with fewer than two nodes is already reversed.');
      return false;
    }
    let previous = null;
    let current = this.#head;
    while (current) {
      const next = current.next;
      this.#pointers = { prev: previous?.id, curr: current.id, next: next?.id };
      this.capture(`Save next = ${next ? next.value : 'null'} so the rest of the list is not lost.`, { [current.id]: 'active' });
      current.next = previous;
      this.capture(`Flip ${current.value}.next to point back at ${previous ? previous.value : 'null'}.`, { [current.id]: 'active' });
      previous = current;
      current = next;
    }
    this.#head = previous;
    this.#pointers = {};
    this.#relayout();
    this.capture(`head = ${this.#head.value}. Reversed in one pass with only three extra pointers.`, { [this.#head.id]: 'found' });
    return true;
  }

  scene(marks) {
    const nodes = [];
    const edges = [];
    const labels = [];
    const x = (id) => this.#order.indexOf(id) * GAP;

    for (const id of this.#order) {
      const node = this.#nodes.get(id);
      if (!node) continue;
      nodes.push(makeNode(id, x(id), 0, node.value, marks, { caption: node.next ? '' : 'next: null' }));
      if (node.next) edges.push(makeEdge(id, node.next.id, marks));
    }
    if (this.#head) labels.push(makeLabel('head', x(this.#head.id), -50, 'head', 'pointer'));
    else if (this.#order.length === 0) labels.push(emptyLabel('empty list, head = null'));

    for (const [name, id] of Object.entries(this.#pointers)) {
      if (id) labels.push(makeLabel(`ptr-${name}`, x(id), 66, name, 'accent'));
    }
    return { nodes, edges, labels };
  }

  state() {
    const values = [];
    for (let node = this.#head; node; node = node.next) values.push(node.value);
    return { values, size: values.length };
  }

  #create(value) {
    const node = { id: this.nextId('l'), value, next: null };
    this.#nodes.set(node.id, node);
    return node;
  }

  #isFull() {
    if (this.#nodes.size < CAPACITY) return false;
    this.capture(`This simulator keeps lists to ${CAPACITY} nodes so they fit on screen.`);
    return true;
  }

  #relayout() {
    const order = [];
    const seen = new Set();
    for (let node = this.#head; node && !seen.has(node.id); node = node.next) {
      seen.add(node.id);
      order.push(node.id);
    }
    this.#order = order;
  }
}
